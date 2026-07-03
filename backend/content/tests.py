"""Testes do admin de conteúdo.

Regressão do 500 na listagem de capítulos: no Django 6.0, `format_html()` sem
argumentos lança TypeError. `audio_status`/`imagem_thumb` (renderizados por linha)
usavam isso, derrubando a lista inteira. Também há guard para `.url` de mídia
inacessível (ex.: R2 não configurado).
"""
from django.contrib.admin.sites import AdminSite
from django.test import SimpleTestCase

from content.admin import ChapterAdmin
from content.models import Chapter


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
