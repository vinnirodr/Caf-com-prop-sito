from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

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
