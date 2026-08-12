"""Garante as páginas especiais oficiais (Introdução + Testemunho). Idempotente."""
import os

from django.conf import settings
from django.core.management.base import BaseCommand
from content.models import SpecialPage

CARTA_BOAS_VINDAS = """Seja muito bem-vindo(a) ao Café com Propósito: Encontros Diários com Deus.

É uma alegria receber você neste espaço preparado com oração, carinho e amor pela Palavra de Deus. Meu desejo é que cada capítulo seja um momento de pausa em meio à correria da vida, onde você possa fortalecer sua fé, renovar sua esperança e experimentar a presença do Senhor.

O Café com Propósito nasceu do desejo de incentivar pessoas a separarem alguns minutos do dia para estar com Deus. Assim como uma xícara de café aquece o corpo, a Palavra de Deus fortalece a alma e renova o coração.

Este aplicativo foi criado para acompanhar você nessa jornada. Aqui, cada reflexão foi fundamentada nas Escrituras e preparada para aproximá-lo ainda mais de Cristo.

Não tenha pressa. Leia cada capítulo com calma, medite no versículo, faça a oração e permita que o Espírito Santo fale ao seu coração.

Minha oração é que este devocional seja um instrumento de Deus para fortalecer sua caminhada e lembrar, todos os dias, que o Senhor continua cuidando de você.

Seja bem-vindo(a). Que este seja o início de muitos encontros diários com Deus.

Com carinho,
Marinilde Rodrigues Gregório"""

COMECE = """"Não espere o momento perfeito. Deus pode falar com você hoje."

Que hoje seja o primeiro de muitos encontros inesquecíveis com Deus. Toque em Iniciar e comece pelo Capítulo 1 — no seu tempo, com calma e propósito."""

OFICIAIS = [
    (1, "Boas-vindas", "Sua jornada com Deus começa com um simples passo de fé.", CARTA_BOAS_VINDAS, None),
    (2, "Sobre o Livro e a Autora", "Toda grande transformação começa com um encontro na presença de Deus.", None, "Apresentação da Autora"),
    (3, "Como Utilizar o Aplicativo", "Reserve alguns minutos. Deus pode transformar todo o seu dia.", None, "Como Utilizar Este Livro"),
    (4, "Uma Palavra ao Seu Coração", "Nenhum coração chega até aqui por acaso.", None, None),
    (5, "Comece Sua Jornada", "Que hoje seja o primeiro de muitos encontros inesquecíveis com Deus.", COMECE, None),
]
PLACEHOLDER = "Conteúdo em preparo — a autora pode editá-lo aqui no painel. ☕"

# Testemunho de encerramento (vem no fim do manuscrito oficial). Conteúdo em
# dados/testemunho.txt; ordem alta para ficar após as páginas de introdução.
TESTEMUNHO_TITULO = "Quando Deus Trabalha em Silêncio"
TESTEMUNHO_SUB = "Um testemunho da autora"
TESTEMUNHO_ORDEM = 100


def _ler_testemunho():
    caminho = os.path.join(settings.BASE_DIR, "dados", "testemunho.txt")
    try:
        with open(caminho, encoding="utf-8") as fh:
            return fh.read().strip()
    except OSError:
        return ""


class Command(BaseCommand):
    help = "Garante as páginas oficiais (Introdução + Testemunho); não sobrescreve conteúdo editado."

    def _seed_testemunho(self):
        pagina = SpecialPage.objects.filter(titulo__iexact=TESTEMUNHO_TITULO).first()
        if pagina:
            pagina.ordem = TESTEMUNHO_ORDEM
            pagina.publicado = True
            if not pagina.subtitulo:
                pagina.subtitulo = TESTEMUNHO_SUB
            pagina.save(update_fields=["ordem", "publicado", "subtitulo"])
            self.stdout.write(f"= {TESTEMUNHO_TITULO} (atualizada)")
        else:
            SpecialPage.objects.create(
                titulo=TESTEMUNHO_TITULO, subtitulo=TESTEMUNHO_SUB,
                conteudo=_ler_testemunho() or PLACEHOLDER,
                ordem=TESTEMUNHO_ORDEM, publicado=True,
            )
            self.stdout.write(f"+ {TESTEMUNHO_TITULO} (criada)")

    def handle(self, *args, **options):
        titulos_oficiais = [t for _, t, _, _, _ in OFICIAIS]
        for ordem, titulo, subtitulo, conteudo, herdar_de in OFICIAIS:
            pagina = SpecialPage.objects.filter(titulo__iexact=titulo).first()
            if pagina:
                pagina.ordem = ordem
                pagina.publicado = True
                if not pagina.subtitulo:
                    pagina.subtitulo = subtitulo
                pagina.save(update_fields=["ordem", "publicado", "subtitulo"])
                self.stdout.write(f"= {titulo} (atualizada)")
                continue
            corpo = conteudo
            if corpo is None and herdar_de:
                origem = SpecialPage.objects.filter(titulo__iexact=herdar_de).first()
                corpo = origem.conteudo if origem else None
            SpecialPage.objects.create(
                titulo=titulo, subtitulo=subtitulo, conteudo=corpo or PLACEHOLDER,
                ordem=ordem, publicado=True,
            )
            self.stdout.write(f"+ {titulo} (criada)")
        self._seed_testemunho()
        # Despublica o que não é oficial (mantém a introdução E o testemunho).
        protegidas = titulos_oficiais + [TESTEMUNHO_TITULO]
        fora = SpecialPage.objects.filter(publicado=True).exclude(titulo__in=protegidas)
        n = fora.update(publicado=False)
        if n:
            self.stdout.write(f"- {n} página(s) fora da estrutura oficial despublicada(s)")
        self.stdout.write(self.style.SUCCESS("Páginas especiais oficiais garantidas."))
