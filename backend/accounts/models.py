"""
Perfil do usuário do app. Mantemos o User padrão do Django (nome, sobrenome,
e-mail, senha) e guardamos aqui os campos extras do cadastro (telefone e data
de nascimento). O e-mail é usado como login (gravado também em `username`).
"""
from django.conf import settings
from django.db import models


class Profile(models.Model):
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="perfil",
    )
    telefone = models.CharField("telefone", max_length=20, blank=True)
    data_nascimento = models.DateField("data de nascimento", null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "perfil"
        verbose_name_plural = "perfis"

    def __str__(self):
        return f"Perfil de {self.usuario}"
