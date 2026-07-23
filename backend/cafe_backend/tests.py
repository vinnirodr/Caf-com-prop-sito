"""Testes do projeto (configuração + painel de status)."""
from django.conf import settings
from django.contrib.auth.models import User
from django.test import SimpleTestCase, TestCase


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
