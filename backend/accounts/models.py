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
    push_token = models.CharField(
        "token de notificação",
        max_length=200,
        blank=True,
        default="",
        help_text="Expo Push Token do dispositivo. Preenchido automaticamente pelo app.",
    )
    notificacoes_ativas = models.BooleanField(
        "notificações ativas",
        default=True,
        help_text="Quando desativado, o usuário não recebe push notifications.",
    )
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "perfil"
        verbose_name_plural = "perfis"

    def __str__(self):
        return f"Perfil de {self.usuario}"


class Notificacao(models.Model):
    """Notificação push criada pela autora no admin e enviada a todos os usuários."""

    class Status(models.TextChoices):
        RASCUNHO = "rascunho", "Rascunho"
        ENVIADA = "enviada", "Enviada"
        ERRO = "erro", "Erro parcial"

    titulo = models.CharField("título", max_length=100)
    mensagem = models.TextField("mensagem")
    criada_em = models.DateTimeField("criada em", auto_now_add=True)
    enviada_em = models.DateTimeField("enviada em", null=True, blank=True)
    status = models.CharField(
        "status", max_length=10, choices=Status.choices, default=Status.RASCUNHO
    )
    total_enviadas = models.PositiveIntegerField("entregas OK", default=0)
    total_erros = models.PositiveIntegerField("erros", default=0)

    class Meta:
        verbose_name = "notificação"
        verbose_name_plural = "notificações"
        ordering = ["-criada_em"]

    def __str__(self):
        return f"[{self.get_status_display()}] {self.titulo}"
