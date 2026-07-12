"""
Gera `dados/capitulos.json` a partir dos arquivos .docx do manuscrito do livro.

Comando **de desenvolvimento** — NÃO roda no build de produção. Serve para
regenerar o conteúdo quando o livro evolui (é "em evolução contínua"). Depois de
gerar/conferir o JSON, quem carrega no banco é `import_capitulos`.

Requer `python-docx` (não está no requirements de produção):
    pip install python-docx

Uso (a autora envia os .docx; coloque-os onde preferir e passe os caminhos, na ordem):
    python manage.py gerar_capitulos_json PARTE_1.docx PARTE_2.docx
    python manage.py gerar_capitulos_json PARTE_1.docx PARTE_2.docx --saida dados/capitulos.json

Os capítulos são concatenados na ordem dos arquivos e **renumerados 1..N**
(o manuscrito tem saltos/duplicações de numeração). Regra de áudio: caps. 1 e 2
`free`, do 3 em diante `premium`.
"""
import json
import re

from django.core.management.base import BaseCommand, CommandError

LABELS = [
    "Versículo-chave",
    "Reflexão",
    "Oração",
    "Aplicação Prática",
    "Frase para Guardar no Coração",
    "Anotação e Oração Pessoal",
]
# Palavras pequenas que ficam minúsculas no title-case (exceto na 1ª posição).
PEQ = {
    "de", "da", "do", "das", "dos", "e", "é", "a", "o", "as", "os", "que",
    "em", "no", "na", "nos", "nas", "para", "por", "com", "sem", "um", "uma",
    "à", "às", "ao", "aos",
}
HDR = re.compile(r"(?i)^\s*cap[íi]tulo\s+(\d+)\s*(.*)$")
REF_MARK = re.compile(r"refer[êe]ncias\s+b[íi]blicas", re.I)


def flat(s):
    return re.sub(r"\s+", " ", s).strip()


def titulo_case(s):
    s = flat(s)
    if not (s.isupper() or s.islower()):
        return s
    palavras = s.lower().split()
    out = [w if (i > 0 and w in PEQ) else (w[:1].upper() + w[1:]) for i, w in enumerate(palavras)]
    return " ".join(out)


def strip_aspas(s):
    return s.strip().strip("“”\"'").strip()


def is_ref_line(l):
    l = flat(l)
    return bool(re.search(r"\b\d+\s*:\s*\d+", l)) and len(l) < 60


def is_label(l):
    tt = flat(l)
    return tt if tt in LABELS else None


def parse_arquivo(docx, caminho):
    paras = [p.text for p in docx.Document(caminho).paragraphs]
    headers = [(i, flat(m.group(2))) for i, t in enumerate(paras) if (m := HDR.match(flat(t)))]
    caps = []
    for k, (i, resto) in enumerate(headers):
        fim = headers[k + 1][0] if k + 1 < len(headers) else len(paras)
        bloco = paras[i + 1:fim]
        titulo = resto or next((flat(l) for l in bloco if flat(l) and not is_label(l)), "")
        pos = {}
        for j, l in enumerate(bloco):
            lab = is_label(l)
            if lab and lab not in pos:
                pos[lab] = j
        order = [x for x in LABELS if x in pos]
        campos = {}
        for a, lab in enumerate(order):
            end = pos[order[a + 1]] if a + 1 < len(order) else len(bloco)
            campos[lab] = [l for l in bloco[pos[lab] + 1:end] if l.strip()]
        # versículo: última linha é a referência (se parece uma), o resto é o texto
        vlines = []
        for l in campos.get("Versículo-chave", []):
            vlines += [x for x in l.split("\n") if x.strip()]
        vref = vlines[-1].strip() if vlines and is_ref_line(vlines[-1]) else ""
        vtexto = " ".join(x.strip() for x in (vlines[:-1] if vref else vlines))
        # frase para guardar + referências complementares (separadas pelo marcador)
        fblk = campos.get("Frase para Guardar no Coração", [])
        mark = next((j for j, l in enumerate(fblk) if REF_MARK.search(l)), None)
        if mark is None:
            frase_lines, ref_lines = fblk, []
        else:
            frase_lines, ref_lines = fblk[:mark], fblk[mark + 1:]
        frase = strip_aspas(" ".join(flat(l) for l in frase_lines))
        refs = []
        for l in ref_lines:
            for x in l.split("\n"):
                x = re.sub(r"^[\s•\-\*📖·]+", "", x).strip()
                if x:
                    refs.append(x)

        def join(lab):
            return "\n\n".join(l.strip() for l in campos.get(lab, []))

        caps.append(dict(
            titulo=titulo_case(titulo),
            versiculo_texto=vtexto,
            versiculo_ref=vref,
            reflexao=join("Reflexão"),
            oracao=strip_aspas(join("Oração")),
            aplicacao=join("Aplicação Prática"),
            frase_guardar=frase,
            referencias="\n".join(refs),
        ))
    return caps


class Command(BaseCommand):
    help = "Gera dados/capitulos.json a partir dos .docx do manuscrito (dev-only)."

    def add_arguments(self, parser):
        parser.add_argument("arquivos", nargs="+", help="Arquivos .docx na ordem do livro.")
        parser.add_argument("--saida", default="dados/capitulos.json", help="Caminho de saída do JSON.")

    def handle(self, *args, **opts):
        try:
            import docx  # noqa: F401  (python-docx)
        except ImportError:
            raise CommandError("python-docx não instalado. Rode: pip install python-docx")

        caps = []
        for caminho in opts["arquivos"]:
            caps += parse_arquivo(docx, caminho)

        # renumera 1..N + regra de acesso ao áudio
        out = []
        for n, c in enumerate(caps, 1):
            out.append(dict(
                numero=n, **c,
                audio_acesso=("free" if n <= 2 else "premium"),
                publicado=True,
            ))

        with open(opts["saida"], "w", encoding="utf-8") as fh:
            json.dump(out, fh, ensure_ascii=False, indent=1)

        vazios = [c["numero"] for c in out if not (
            c["versiculo_texto"] and c["reflexao"] and c["oracao"] and c["aplicacao"] and c["frase_guardar"]
        )]
        semref = [c["numero"] for c in out if not c["versiculo_ref"]]
        self.stdout.write(self.style.SUCCESS(
            f"Gerado {opts['saida']} com {len(out)} capítulos. "
            f"Campos essenciais vazios: {len(vazios)} {vazios[:15]}. "
            f"Sem versiculo_ref: {len(semref)} {semref[:15]}."
        ))
