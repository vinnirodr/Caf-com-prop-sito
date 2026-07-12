"""
Carrega os capítulos a partir do arquivo `dados/capitulos.json` (fonte de conteúdo
já gerada a partir do manuscrito do livro).

Uso:
    python manage.py import_capitulos                      # usa dados/capitulos.json
    python manage.py import_capitulos caminho/para/arquivo.json

É idempotente: atualiza o capítulo se já existir (por número) e cria o que falta.
NUNCA toca nos campos `audio` e `imagem` — assim as narrações/imagens já enviadas
pela autora no painel são preservadas a cada deploy.
"""
import json
import os

from django.core.management.base import BaseCommand, CommandError

from content.models import Chapter

# Campos de texto vindos do JSON. `audio` e `imagem` ficam de fora de propósito.
CAMPOS = (
    "titulo",
    "versiculo_texto",
    "versiculo_ref",
    "reflexao",
    "oracao",
    "aplicacao",
    "frase_guardar",
    "referencias",
    "audio_acesso",
    "publicado",
)


class Command(BaseCommand):
    help = "Carrega os capítulos do arquivo dados/capitulos.json (idempotente)."

    def add_arguments(self, parser):
        parser.add_argument(
            "arquivo",
            nargs="?",
            default="dados/capitulos.json",
            help="Caminho do JSON de capítulos (padrão: dados/capitulos.json).",
        )

    def handle(self, *args, **opts):
        caminho = opts["arquivo"]
        if not os.path.exists(caminho):
            raise CommandError(f"Arquivo não encontrado: {caminho}")

        try:
            with open(caminho, encoding="utf-8") as fh:
                dados = json.load(fh)
        except (json.JSONDecodeError, OSError) as exc:
            raise CommandError(f"Não foi possível ler {caminho}: {exc}")

        if not isinstance(dados, list):
            raise CommandError("O JSON precisa ser uma lista de capítulos.")

        criados = atualizados = 0
        for item in dados:
            numero = item.get("numero")
            if numero in (None, ""):
                continue
            defaults = {campo: item.get(campo) for campo in CAMPOS if campo in item}
            _, created = Chapter.objects.update_or_create(
                numero=int(numero), defaults=defaults
            )
            if created:
                criados += 1
            else:
                atualizados += 1

        self.stdout.write(self.style.SUCCESS(
            f"Concluído. Capítulos: {criados} criados, {atualizados} atualizados "
            f"(total no banco: {Chapter.objects.count()})."
        ))
