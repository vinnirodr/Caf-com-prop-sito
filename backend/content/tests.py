"""Testes do admin de conteúdo.

Regressão do 500 na listagem de capítulos: no Django 6.0, `format_html()` sem
argumentos lança TypeError. `audio_status`/`imagem_thumb` (renderizados por linha)
usavam isso, derrubando a lista inteira. Também há guard para `.url` de mídia
inacessível (ex.: R2 não configurado).
"""
from django.contrib.admin.sites import AdminSite
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import SimpleTestCase, TestCase

from content.admin import ChapterAdmin
from content.models import Chapter, MusicaFundo, SpecialPage


class _MidiaQueFalha:
    """Simula um FieldFile cujo .url estoura (storage indisponível)."""

    def __bool__(self):
        return True

    @property
    def url(self):
        raise ValueError("This file is not accessible via a URL.")


class ChapterAdminGuardTests(SimpleTestCase):
    def setUp(self):
        self.admin = ChapterAdmin(Chapter, AdminSite())

    # --- causa real do 500: linhas SEM mídia (format_html sem args no Django 6) ---
    def test_audio_status_sem_audio_nao_quebra(self):
        class Obj:
            tem_audio = False

        self.assertIn("pendente", str(self.admin.audio_status(Obj())))

    def test_audio_status_com_audio_nao_quebra(self):
        class Obj:
            tem_audio = True

        self.assertIn("enviado", str(self.admin.audio_status(Obj())))

    def test_imagem_thumb_sem_imagem_nao_quebra(self):
        class Obj:
            imagem = None

        self.assertIn("—", str(self.admin.imagem_thumb(Obj())))

    # --- guard defensivo: mídia presente mas .url inacessível ---
    def test_imagem_thumb_nao_quebra_quando_url_falha(self):
        class Obj:
            imagem = _MidiaQueFalha()

        self.assertIn("—", str(self.admin.imagem_thumb(Obj())))

    def test_audio_player_nao_quebra_quando_url_falha(self):
        class Obj:
            audio = _MidiaQueFalha()

        self.assertIn("indisponível", str(self.admin.audio_player(Obj())))


class MusicaFundoApiTests(TestCase):
    def test_lista_so_ativas_com_url(self):
        MusicaFundo.objects.create(
            titulo="Piano suave",
            arquivo=SimpleUploadedFile("piano.mp3", b"fake-audio"),
            ativa=True,
            ordem=1,
        )
        MusicaFundo.objects.create(
            titulo="Inativa",
            arquivo=SimpleUploadedFile("x.mp3", b"fake"),
            ativa=False,
            ordem=2,
        )
        resp = self.client.get("/api/musicas-fundo/")
        self.assertEqual(resp.status_code, 200)
        results = resp.json()["results"]
        self.assertEqual(len(results), 1)
        item = results[0]
        self.assertEqual(item["titulo"], "Piano suave")
        self.assertIn("url", item)
        self.assertTrue(item["url"])
        self.assertEqual(item["ordem"], 1)


class SpecialPageApiTests(TestCase):
    def test_lista_traz_subtitulo_e_audio(self):
        SpecialPage.objects.create(
            titulo="Bem-vinda",
            subtitulo="Frase inspiradora",
            conteudo="Texto de abertura.",
            ordem=1,
            audio=SimpleUploadedFile("intro.mp3", b"fake-audio"),
        )
        SpecialPage.objects.create(
            titulo="Sem áudio",
            conteudo="Texto sem narração.",
            ordem=2,
        )
        resp = self.client.get("/api/paginas-especiais/")
        self.assertEqual(resp.status_code, 200)
        results = resp.json()["results"]
        self.assertEqual(len(results), 2)

        com_audio = next(r for r in results if r["titulo"] == "Bem-vinda")
        self.assertEqual(com_audio["subtitulo"], "Frase inspiradora")
        self.assertTrue(com_audio["audio"])

        sem_audio = next(r for r in results if r["titulo"] == "Sem áudio")
        self.assertIsNone(sem_audio["audio"])


class SeedIntroducaoCommandTests(TestCase):
    """Comando `seed_introducao`: garante a estrutura oficial da Introdução
    (5 páginas da autora), sem nunca sobrescrever conteúdo já editado."""

    OFICIAIS = [
        (1, "Boas-vindas", "Sua jornada com Deus começa com um simples passo de fé."),
        (2, "Sobre o Livro e a Autora", "Toda grande transformação começa com um encontro na presença de Deus."),
        (3, "Como Utilizar o Aplicativo", "Reserve alguns minutos. Deus pode transformar todo o seu dia."),
        (4, "Uma Palavra ao Seu Coração", "Nenhum coração chega até aqui por acaso."),
        (5, "Comece Sua Jornada", "Que hoje seja o primeiro de muitos encontros inesquecíveis com Deus."),
    ]

    def test_cria_as_5_paginas_oficiais_publicadas_em_ordem_com_subtitulos(self):
        call_command("seed_introducao")

        publicadas = SpecialPage.objects.filter(publicado=True).order_by("ordem")
        self.assertEqual(publicadas.count(), 5)

        for (ordem_esperada, titulo_esperado, subtitulo_esperado), pagina in zip(
            self.OFICIAIS, publicadas
        ):
            self.assertEqual(pagina.ordem, ordem_esperada)
            self.assertEqual(pagina.titulo, titulo_esperado)
            self.assertEqual(pagina.subtitulo, subtitulo_esperado)
            self.assertTrue(pagina.publicado)

    def test_rodar_2x_nao_duplica(self):
        call_command("seed_introducao")
        call_command("seed_introducao")

        self.assertEqual(SpecialPage.objects.filter(publicado=True).count(), 5)

    def test_idempotencia_preserva_edicao_da_autora(self):
        call_command("seed_introducao")

        pagina = SpecialPage.objects.get(titulo="Boas-vindas")
        pagina.conteudo = "TEXTO EDITADO PELA AUTORA"
        pagina.save(update_fields=["conteudo"])

        call_command("seed_introducao")

        pagina.refresh_from_db()
        self.assertEqual(pagina.conteudo, "TEXTO EDITADO PELA AUTORA")

    def test_pagina_publicada_fora_da_lista_oficial_e_despublicada(self):
        SpecialPage.objects.create(titulo="Contracapa", conteudo="x", publicado=True)

        call_command("seed_introducao")

        contracapa = SpecialPage.objects.get(titulo="Contracapa")
        self.assertFalse(contracapa.publicado)

    def test_sobre_o_livro_herda_conteudo_da_apresentacao_da_autora_existente(self):
        SpecialPage.objects.create(
            titulo="Apresentação da Autora",
            conteudo="TEXTO DA APRESENTACAO",
            publicado=True,
        )

        call_command("seed_introducao")

        pagina = SpecialPage.objects.get(titulo="Sobre o Livro e a Autora")
        self.assertEqual(pagina.conteudo, "TEXTO DA APRESENTACAO")


class LandingPageTests(TestCase):
    def test_landing_na_raiz(self):
        resp = self.client.get("/")
        self.assertEqual(resp.status_code, 200)
        html = resp.content.decode()
        self.assertIn("Um café com Deus", html)
        self.assertIn("play.google.com/store/apps/details?id=com.cafecomproposito.app", html)
        self.assertIn("/privacidade/", html)
