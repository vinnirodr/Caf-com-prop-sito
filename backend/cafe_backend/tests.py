"""Testes do projeto (configuração + painel de status)."""
from unittest.mock import patch

from django.conf import settings
from django.contrib.auth.models import User
from django.test import SimpleTestCase, TestCase

from content.models import Chapter
from engagement.models import Favorite, Note, ReadingProgress


class SentryConfigTests(SimpleTestCase):
    def test_sem_dsn_o_projeto_sobe_e_sentry_fica_desligado(self):
        """Em dev/CI não há SENTRY_DSN: o projeto carrega e o Sentry fica inerte."""
        self.assertEqual(getattr(settings, "SENTRY_DSN", None), "")


class StatusAcessoTests(TestCase):
    def test_anonimo_e_mandado_para_o_login(self):
        resp = self.client.get("/status/")
        self.assertEqual(resp.status_code, 302)
        self.assertIn("/admin/login/", resp["Location"])

    def test_usuario_comum_nao_acessa(self):
        User.objects.create_user(username="leitor@x.com", email="leitor@x.com", password="s3nha123")
        self.client.login(username="leitor@x.com", password="s3nha123")
        resp = self.client.get("/status/")
        self.assertEqual(resp.status_code, 302)

    def test_staff_ve_saude_e_conteudo(self):
        User.objects.create_user(
            username="chefe@x.com", email="chefe@x.com", password="s3nha123", is_staff=True
        )
        self.client.login(username="chefe@x.com", password="s3nha123")
        resp = self.client.get("/status/")
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.context["saude"]["banco_ok"])
        self.assertIn("capitulos_publicados", resp.context["conteudo"])
        self.assertContains(resp, "Saúde")


class StatusUsoTests(TestCase):
    def setUp(self):
        User.objects.create_user(
            username="chefe2@x.com", email="chefe2@x.com", password="s3nha123", is_staff=True
        )
        self.client.login(username="chefe2@x.com", password="s3nha123")
        self.leitor = User.objects.create_user(
            username="leitor2@x.com", email="leitor2@x.com", password="s3nha123"
        )
        # Todos os campos obrigatórios do Chapter (os demais têm blank/default).
        self.capitulo = Chapter.objects.create(
            numero=1,
            titulo="Capítulo de teste",
            versiculo_texto="Versículo de teste.",
            reflexao="Reflexão de teste.",
            oracao="Oração de teste.",
            aplicacao="Aplicação de teste.",
            frase_guardar="Frase de teste.",
        )

    def test_uso_conta_ativos_lidos_e_favoritos(self):
        ReadingProgress.objects.create(usuario=self.leitor, capitulo=self.capitulo, lido=True)
        Favorite.objects.create(usuario=self.leitor, capitulo=self.capitulo)
        Note.objects.create(usuario=self.leitor, capitulo=self.capitulo, texto="oi")

        resp = self.client.get("/status/")
        uso = resp.context["uso"]
        self.assertEqual(uso["ativos_hoje"], 1)
        self.assertEqual(uso["lidos_total"], 1)
        self.assertEqual(uso["ouvidos_total"], 0)
        self.assertEqual(uso["favoritos_total"], 1)
        self.assertEqual(uso["anotacoes_total"], 1)
        self.assertEqual(uso["premium_ativos"], 0)
        self.assertEqual(uso["usuarios_total"], 2)

    def test_tendencia_tem_14_dias(self):
        resp = self.client.get("/status/")
        tendencia = resp.context["tendencia"]
        self.assertEqual(len(tendencia), 14)
        self.assertIn("pct_ativos", tendencia[0])


class StatusResilienciaTests(TestCase):
    """O painel precisa abrir JUSTAMENTE quando o banco está com problema."""

    def setUp(self):
        User.objects.create_user(
            username="chefe3@x.com", email="chefe3@x.com", password="s3nha123", is_staff=True
        )
        self.client.login(username="chefe3@x.com", password="s3nha123")

    def test_saude_nao_quebra_com_banco_fora(self):
        from cafe_backend.status import _saude

        with patch("cafe_backend.status.connection") as conexao:
            conexao.cursor.side_effect = Exception("banco fora")
            conexao.introspection.table_names.side_effect = Exception("banco fora")
            dados = _saude()

        self.assertFalse(dados["banco_ok"])
        self.assertEqual(dados["tabelas"], 0)

    def test_pagina_abre_mesmo_se_os_blocos_falharem(self):
        falha = Exception("consulta falhou")
        with patch("cafe_backend.status._conteudo", side_effect=falha), patch(
            "cafe_backend.status._uso", side_effect=falha
        ), patch("cafe_backend.status._tendencia", side_effect=falha):
            resp = self.client.get("/status/")

        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "Saúde")
        self.assertIsNone(resp.context["conteudo"])
