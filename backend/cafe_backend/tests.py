"""Testes do projeto (configuração + painel de status)."""
from django.conf import settings
from django.test import SimpleTestCase


class SentryConfigTests(SimpleTestCase):
    def test_sem_dsn_o_projeto_sobe_e_sentry_fica_desligado(self):
        """Em dev/CI não há SENTRY_DSN: o projeto carrega e o Sentry fica inerte."""
        self.assertEqual(getattr(settings, "SENTRY_DSN", None), "")
