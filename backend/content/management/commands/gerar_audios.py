"""Gera as narrações dos capítulos com o ElevenLabs e anexa em `Chapter.audio`.

Comando **de operação** (não roda no build). Requer a env `ELEVENLABS_API_KEY`.
Feito para rodar **em lotes, retomável**: pula o que já tem áudio (a menos de
`--refazer`) e continua mesmo se um capítulo falhar (reporta os que falharam).

Exemplos:
    # PRÉVIA — gera arquivos MP3 numa pasta, NÃO toca no banco (para ouvir/aprovar):
    python manage.py gerar_audios --capitulos 1,2,3 --saida /tmp/previa

    # PRODUÇÃO — anexa ao capítulo (vai pro R2), em lote, regenerando desde o 1:
    python manage.py gerar_audios --de 1 --ate 30 --refazer

    # só os que ainda não têm áudio:
    python manage.py gerar_audios --faltando

Voz/modelo padrão: Mariana M + Eleven v3 (sobrescreva com --voz/--modelo ou
as envs ELEVENLABS_VOICE_ID / ELEVENLABS_MODEL).
"""
import os
import time

import requests
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q

from content.models import Chapter

VOZ_PADRAO = "0t7A9YvHlaUjp3Mon3X1"  # Mariana M
MODELO_PADRAO = "eleven_v3"
URL = "https://api.elevenlabs.io/v1/text-to-speech/{voz}?output_format=mp3_44100_128"


def narracao(c):
    """Monta o texto lido, na ordem natural do devocional."""
    partes = [
        c.titulo,
        f"{c.versiculo_texto} {c.versiculo_ref}".strip(),
        c.reflexao,
        c.oracao,
        c.aplicacao,
        c.frase_guardar,
    ]
    return "\n\n".join(p.strip() for p in partes if p and p.strip())


class Command(BaseCommand):
    help = "Gera narrações (ElevenLabs) e anexa aos capítulos."

    def add_arguments(self, p):
        p.add_argument("--de", type=int, help="número inicial (inclusive)")
        p.add_argument("--ate", type=int, help="número final (inclusive)")
        p.add_argument("--capitulos", type=str, help="lista específica, ex.: 1,2,3")
        p.add_argument("--faltando", action="store_true", help="só capítulos sem áudio")
        p.add_argument("--saida", type=str, help="pasta p/ salvar MP3 (prévia; NÃO toca no banco)")
        p.add_argument("--refazer", action="store_true", help="regenera mesmo se já tiver áudio")
        p.add_argument("--voz", default=os.environ.get("ELEVENLABS_VOICE_ID", VOZ_PADRAO))
        p.add_argument("--modelo", default=os.environ.get("ELEVENLABS_MODEL", MODELO_PADRAO))
        # Trava o idioma em português: sem isto o v3 (muito treinado em inglês) às
        # vezes escapa uma palavra em inglês. "" desliga o override.
        p.add_argument("--idioma", default="pt", help="language_code (padrão pt; vazio desliga)")
        p.add_argument("--pausa", type=float, default=1.0, help="segundos entre chamadas")

    def handle(self, *args, **o):
        chave = os.environ.get("ELEVENLABS_API_KEY")
        if not chave:
            raise CommandError("Defina a env ELEVENLABS_API_KEY.")

        qs = Chapter.objects.order_by("numero")
        if o["capitulos"]:
            nums = [int(x) for x in o["capitulos"].split(",") if x.strip()]
            qs = qs.filter(numero__in=nums)
        if o["de"] is not None:
            qs = qs.filter(numero__gte=o["de"])
        if o["ate"] is not None:
            qs = qs.filter(numero__lte=o["ate"])
        if o["faltando"]:
            qs = qs.filter(Q(audio="") | Q(audio__isnull=True))
        caps = list(qs)
        if not caps:
            raise CommandError("Nenhum capítulo selecionado com esses filtros.")

        previa = bool(o["saida"])
        if previa:
            os.makedirs(o["saida"], exist_ok=True)

        pular_existentes = (not o["refazer"]) and (not previa)
        url = URL.format(voz=o["voz"])
        headers = {"xi-api-key": chave, "Content-Type": "application/json"}

        gerados, pulados, chars_total = 0, 0, 0
        falhas = []
        self.stdout.write(
            f"{len(caps)} capítulo(s) | modelo {o['modelo']} | voz {o['voz']} | "
            f"{'PRÉVIA (arquivos)' if previa else 'PRODUÇÃO (anexa no capítulo)'}"
        )

        for c in caps:
            if pular_existentes and c.audio:
                pulados += 1
                self.stdout.write(f"  cap {c.numero}: já tem áudio — pulado")
                continue

            texto = narracao(c)
            corpo = {"text": texto, "model_id": o["modelo"]}
            if o["idioma"]:
                corpo["language_code"] = o["idioma"]
            try:
                r = requests.post(url, headers=headers, json=corpo, timeout=180)
            except requests.RequestException as e:
                falhas.append(c.numero)
                self.stderr.write(f"  cap {c.numero}: ERRO de rede — {e}")
                continue

            if r.status_code != 200:
                falhas.append(c.numero)
                self.stderr.write(f"  cap {c.numero}: HTTP {r.status_code} — {r.text[:180]}")
                # 401/402/429 costumam ser chave/cota/limite: aborta o lote
                if r.status_code in (401, 402):
                    raise CommandError("Chave inválida ou plano/cota — lote interrompido.")
                continue

            audio = r.content
            chars_total += len(texto)
            nome = f"cap_{c.numero:03d}.mp3"
            if previa:
                with open(os.path.join(o["saida"], nome), "wb") as fh:
                    fh.write(audio)
            else:
                # save=False + update_fields=["audio"]: grava SÓ a coluna de áudio.
                # Se salvássemos o modelo inteiro (save=True), a instância — carregada
                # em memória no início do lote — sobrescreveria os demais campos,
                # revertendo qualquer edição de conteúdo feita no banco durante o lote
                # (foi o que aconteceu com o cap 21 quando um deploy rodou junto).
                c.audio.save(nome, ContentFile(audio), save=False)
                c.save(update_fields=["audio"])
            gerados += 1
            self.stdout.write(
                f"  cap {c.numero}: OK ({len(audio)//1024} KB, ~{len(texto)} caracteres)"
            )
            time.sleep(o["pausa"])

        self.stdout.write(self.style.SUCCESS(
            f"\nGerados: {gerados} | pulados: {pulados} | falhas: {falhas or 'nenhuma'} "
            f"| ~{chars_total:,} caracteres (créditos)"
        ))
        if previa:
            self.stdout.write(f"Arquivos em: {o['saida']}")
