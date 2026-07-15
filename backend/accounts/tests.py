import re
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import Profile

User = get_user_model()


def criar_usuario(email="dona.marta@example.com", senha="Cafe12345", **extra):
    user = User.objects.create_user(
        username=email, email=email, password=senha,
        first_name=extra.get("first_name", "Marta"),
        last_name=extra.get("last_name", "Silva"),
    )
    return user


class EditarPerfilTests(APITestCase):
    def setUp(self):
        self.user = criar_usuario()
        self.client.force_authenticate(user=self.user)

    def test_patch_atualiza_nome_e_perfil(self):
        resp = self.client.patch("/api/auth/eu/", {
            "nome": "Marta Regina",
            "telefone": "11999998888",
            "data_nascimento": "1968-03-10",
        }, format="json")
        self.assertEqual(resp.status_code, 200, resp.content)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Marta Regina")
        self.assertEqual(self.user.perfil.telefone, "11999998888")
        self.assertEqual(str(self.user.perfil.data_nascimento), "1968-03-10")
        self.assertEqual(resp.json()["telefone"], "11999998888")

    def test_patch_nao_edita_email(self):
        resp = self.client.patch("/api/auth/eu/", {"email": "hacker@x.com"}, format="json")
        self.assertEqual(resp.status_code, 200, resp.content)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "dona.marta@example.com")

    def test_patch_exige_autenticacao(self):
        self.client.force_authenticate(user=None)
        resp = self.client.patch("/api/auth/eu/", {"nome": "X"}, format="json")
        self.assertEqual(resp.status_code, 401)

    def test_patch_aceita_nome_vazio(self):
        resp = self.client.patch("/api/auth/eu/", {"nome": ""}, format="json")
        self.assertEqual(resp.status_code, 200, resp.content)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "")


class TrocarSenhaTests(APITestCase):
    def setUp(self):
        self.user = criar_usuario()
        self.client.force_authenticate(user=self.user)

    def test_troca_com_senha_correta(self):
        resp = self.client.post("/api/auth/trocar-senha/", {
            "senha_atual": "Cafe12345", "nova_senha": "NovaSenha987",
        }, format="json")
        self.assertEqual(resp.status_code, 200, resp.content)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NovaSenha987"))

    def test_rejeita_senha_atual_errada(self):
        resp = self.client.post("/api/auth/trocar-senha/", {
            "senha_atual": "errada", "nova_senha": "NovaSenha987",
        }, format="json")
        self.assertEqual(resp.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("Cafe12345"))

    def test_rejeita_nova_senha_fraca(self):
        resp = self.client.post("/api/auth/trocar-senha/", {
            "senha_atual": "Cafe12345", "nova_senha": "123",
        }, format="json")
        self.assertEqual(resp.status_code, 400)


class TrocarEmailTests(APITestCase):
    def setUp(self):
        self.user = criar_usuario()
        self.client.force_authenticate(user=self.user)

    def test_troca_email_e_sincroniza_username(self):
        resp = self.client.post("/api/auth/trocar-email/", {
            "novo_email": "Nova.Marta@Example.com", "senha_atual": "Cafe12345",
        }, format="json")
        self.assertEqual(resp.status_code, 200, resp.content)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "nova.marta@example.com")
        self.assertEqual(self.user.username, "nova.marta@example.com")

    def test_rejeita_senha_errada(self):
        resp = self.client.post("/api/auth/trocar-email/", {
            "novo_email": "outro@example.com", "senha_atual": "errada",
        }, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_rejeita_email_ja_em_uso(self):
        criar_usuario(email="ocupado@example.com")
        resp = self.client.post("/api/auth/trocar-email/", {
            "novo_email": "ocupado@example.com", "senha_atual": "Cafe12345",
        }, format="json")
        self.assertEqual(resp.status_code, 400)


class ExcluirContaTests(APITestCase):
    def setUp(self):
        self.user = criar_usuario()
        self.client.force_authenticate(user=self.user)

    def test_exclui_com_senha_correta_e_cascata(self):
        self.assertTrue(Profile.objects.filter(usuario_id=self.user.pk).exists())
        resp = self.client.post("/api/auth/excluir-conta/", {"senha": "Cafe12345"}, format="json")
        self.assertEqual(resp.status_code, 204, resp.content)
        self.assertFalse(User.objects.filter(pk=self.user.pk).exists())
        self.assertFalse(Profile.objects.filter(usuario_id=self.user.pk).exists())

    def test_rejeita_senha_errada(self):
        resp = self.client.post("/api/auth/excluir-conta/", {"senha": "errada"}, format="json")
        self.assertEqual(resp.status_code, 400)
        self.assertTrue(User.objects.filter(pk=self.user.pk).exists())


class GoogleLoginTests(APITestCase):
    URL = "/api/auth/google/"

    def _payload(self, **over):
        base = {
            "email": "ana.google@gmail.com",
            "email_verified": True,
            "given_name": "Ana",
            "family_name": "Souza",
        }
        base.update(over)
        return base

    @patch("accounts.google.google_id_token.verify_oauth2_token")
    def test_cria_novo_usuario(self, mock_verify):
        mock_verify.return_value = self._payload()
        resp = self.client.post(self.URL, {"id_token": "fake"}, format="json")
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertIn("access", resp.json())
        self.assertEqual(resp.json()["user"]["email"], "ana.google@gmail.com")
        self.assertTrue(User.objects.filter(email__iexact="ana.google@gmail.com").exists())

    @patch("accounts.google.google_id_token.verify_oauth2_token")
    def test_linka_usuario_existente_sem_duplicar(self, mock_verify):
        existente = criar_usuario(email="ana.google@gmail.com")
        mock_verify.return_value = self._payload()
        resp = self.client.post(self.URL, {"id_token": "fake"}, format="json")
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual(resp.json()["user"]["id"], existente.id)
        self.assertEqual(User.objects.filter(email__iexact="ana.google@gmail.com").count(), 1)

    @patch("accounts.google.google_id_token.verify_oauth2_token")
    def test_rejeita_token_invalido(self, mock_verify):
        mock_verify.side_effect = ValueError("token inválido")
        resp = self.client.post(self.URL, {"id_token": "fake"}, format="json")
        self.assertEqual(resp.status_code, 400)

    @patch("accounts.google.google_id_token.verify_oauth2_token")
    def test_rejeita_email_nao_verificado(self, mock_verify):
        mock_verify.return_value = self._payload(email_verified=False)
        resp = self.client.post(self.URL, {"id_token": "fake"}, format="json")
        self.assertEqual(resp.status_code, 400)


class PasswordResetModelTests(APITestCase):
    def test_cria_codigo_reset(self):
        from accounts.models import PasswordResetCode
        u = criar_usuario()
        c = PasswordResetCode.objects.create(
            usuario=u, code_hash="x", expira_em=timezone.now() + timedelta(minutes=20)
        )
        self.assertFalse(c.usado)
        self.assertEqual(c.tentativas, 0)
        self.assertEqual(u.codigos_reset.count(), 1)


class RecuperacaoSenhaTests(APITestCase):
    def setUp(self):
        self.user = criar_usuario(email="marta@example.com")  # senha "Cafe12345"

    def _pedir(self, email):
        return self.client.post("/api/auth/esqueci-senha/", {"email": email}, format="json")

    def _codigo_do_email(self):
        return re.search(r"\b(\d{6})\b", mail.outbox[-1].body).group(1)

    def _redefinir(self, codigo, nova="NovaSenha987", email="marta@example.com"):
        return self.client.post(
            "/api/auth/redefinir-senha/",
            {"email": email, "codigo": codigo, "nova_senha": nova},
            format="json",
        )

    def test_pedir_codigo_existente_envia(self):
        from accounts.models import PasswordResetCode
        resp = self._pedir("marta@example.com")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(PasswordResetCode.objects.filter(usuario=self.user).count(), 1)
        self.assertEqual(len(mail.outbox), 1)

    def test_pedir_codigo_inexistente_nao_envia(self):
        from accounts.models import PasswordResetCode
        resp = self._pedir("ninguem@example.com")
        self.assertEqual(resp.status_code, 200)  # anti-enumeração
        self.assertEqual(PasswordResetCode.objects.count(), 0)
        self.assertEqual(len(mail.outbox), 0)

    def test_redefinir_com_codigo_correto(self):
        self._pedir("marta@example.com")
        resp = self._redefinir(self._codigo_do_email())
        self.assertEqual(resp.status_code, 200, resp.content)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NovaSenha987"))

    def test_redefinir_codigo_errado_nao_troca(self):
        self._pedir("marta@example.com")
        resp = self._redefinir("111111")  # improvável ser o código real
        self.assertEqual(resp.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("Cafe12345"))

    def test_redefinir_codigo_expirado(self):
        from accounts.models import PasswordResetCode
        self._pedir("marta@example.com")
        codigo = self._codigo_do_email()
        PasswordResetCode.objects.filter(usuario=self.user).update(
            expira_em=timezone.now() - timedelta(minutes=1)
        )
        self.assertEqual(self._redefinir(codigo).status_code, 400)

    def test_redefinir_senha_fraca(self):
        self._pedir("marta@example.com")
        resp = self._redefinir(self._codigo_do_email(), nova="123")
        self.assertEqual(resp.status_code, 400)


@override_settings(RESEND_API_KEY="re_test_key", DEFAULT_FROM_EMAIL="no-reply@luminaflow.io")
class EnvioEmailResendTests(APITestCase):
    """Em produção (com RESEND_API_KEY) o envio vai pela API HTTP do Resend,
    NUNCA por SMTP — o Render bloqueia as portas de SMTP de saída."""

    def setUp(self):
        self.user = criar_usuario(email="marta@example.com")

    def _pedir(self):
        return self.client.post(
            "/api/auth/esqueci-senha/", {"email": "marta@example.com"}, format="json"
        )

    @patch("accounts.reset_senha.requests.post")
    def test_envia_pela_api_http_do_resend(self, mock_post):
        mock_post.return_value.status_code = 200
        resp = self._pedir()
        self.assertEqual(resp.status_code, 200)
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        self.assertEqual(args[0], "https://api.resend.com/emails")
        self.assertIn("Bearer re_test_key", kwargs["headers"]["Authorization"])
        self.assertEqual(kwargs["json"]["to"], ["marta@example.com"])
        self.assertEqual(kwargs["json"]["from"], "no-reply@luminaflow.io")
        self.assertIn("timeout", kwargs)  # nunca pode pendurar o worker

    @patch("accounts.reset_senha.requests.post")
    def test_falha_no_resend_nao_derruba_a_requisicao(self, mock_post):
        import requests as _requests

        mock_post.side_effect = _requests.RequestException("boom")
        from accounts.models import PasswordResetCode

        resp = self._pedir()
        self.assertEqual(resp.status_code, 200)  # anti-enumeração + não pode dar 500
        self.assertEqual(PasswordResetCode.objects.filter(usuario=self.user).count(), 1)


class PremiumProfileTests(TestCase):
    def test_premium_ativo_manual_e_pago(self):
        from datetime import date, timedelta
        from django.utils import timezone
        from accounts.models import Profile
        u = criar_usuario(email="prem@example.com")
        p = u.perfil
        self.assertFalse(p.premium_ativo)
        p.premium_manual = True
        self.assertTrue(p.premium_ativo)  # manual sem validade = permanente
        p.premium_manual_ate = date.today() - timedelta(days=1)
        self.assertFalse(p.premium_ativo)  # manual expirado
        p.premium_manual = False
        p.premium_pago_ate = timezone.now() + timedelta(days=5)
        self.assertTrue(p.premium_ativo)  # pago válido
        p.premium_pago_ate = timezone.now() - timedelta(days=1)
        self.assertFalse(p.premium_ativo)  # pago expirado


class EuPremiumTests(APITestCase):
    def test_eu_reflete_premium_manual(self):
        u = criar_usuario(email="eu@example.com")
        self.client.force_authenticate(user=u)
        resp = self.client.get("/api/auth/eu/")
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.json()["premium"])
        u.perfil.premium_manual = True
        u.perfil.save()
        resp = self.client.get("/api/auth/eu/")
        self.assertTrue(resp.json()["premium"])


@override_settings(REVENUECAT_WEBHOOK_AUTH="segredo123")
class RevenueCatWebhookTests(APITestCase):
    def _evento(self, tipo, app_user_id, exp_ms=None):
        return {"event": {"type": tipo, "app_user_id": str(app_user_id), "expiration_at_ms": exp_ms}}

    def test_compra_ativa_premium_pago(self):
        import time
        u = criar_usuario(email="rc@example.com")
        exp = int((time.time() + 30 * 86400) * 1000)
        resp = self.client.post("/api/assinaturas/revenuecat-webhook/",
                                self._evento("INITIAL_PURCHASE", u.id, exp),
                                format="json", HTTP_AUTHORIZATION="segredo123")
        self.assertEqual(resp.status_code, 200)
        u.perfil.refresh_from_db()
        self.assertIsNotNone(u.perfil.premium_pago_ate)
        self.assertTrue(u.perfil.premium_ativo)

    def test_sem_segredo_rejeita(self):
        u = criar_usuario(email="rc2@example.com")
        resp = self.client.post("/api/assinaturas/revenuecat-webhook/",
                                self._evento("INITIAL_PURCHASE", u.id, 1),
                                format="json", HTTP_AUTHORIZATION="errado")
        self.assertEqual(resp.status_code, 401)

    def test_app_user_anonimo_ignora(self):
        resp = self.client.post("/api/assinaturas/revenuecat-webhook/",
                                self._evento("INITIAL_PURCHASE", "$RCAnonymousID:abc", 1),
                                format="json", HTTP_AUTHORIZATION="segredo123")
        self.assertEqual(resp.status_code, 200)
