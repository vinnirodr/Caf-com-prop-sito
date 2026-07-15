"""
Perfil do usuário do app. Mantemos o User padrão do Django (nome, sobrenome,
e-mail, senha) e guardamos aqui os campos extras do cadastro (telefone e data
de nascimento). O e-mail é usado como login (gravado também em `username`).
"""
from datetime import date

from django.conf import settings
from django.db import models
from django.utils import timezone


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
    avatar = models.ImageField("foto", upload_to="avatars/", null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    premium_manual = models.BooleanField(
        "premium (concedido)", default=False,
        help_text="Liga o Premium manualmente (comp/brinde), sem pagamento.",
    )
    premium_manual_ate = models.DateField(
        "premium manual até", null=True, blank=True,
        help_text="Opcional. Vazio = permanente; com data = expira nesse dia.",
    )
    premium_pago_ate = models.DateTimeField(
        "premium pago até", null=True, blank=True,
        help_text="Validade da assinatura paga (sincronizada do RevenueCat).",
    )
    rc_ultimo_evento = models.CharField("último evento RevenueCat", max_length=60, blank=True, default="")

    class Meta:
        verbose_name = "perfil"
        verbose_name_plural = "perfis"

    def __str__(self):
        return f"Perfil de {self.usuario}"

    @property
    def premium_ativo(self):
        manual = self.premium_manual and (
            self.premium_manual_ate is None or self.premium_manual_ate >= date.today()
        )
        pago = self.premium_pago_ate is not None and self.premium_pago_ate >= timezone.now()
        return bool(manual or pago)

    @property
    def premium_ate(self):
        """Data efetiva mais distante (manual/pago) enquanto premium; senão None."""
        from datetime import datetime, time
        candidatos = []
        if self.premium_manual and self.premium_manual_ate:
            candidatos.append(timezone.make_aware(datetime.combine(self.premium_manual_ate, time.max)))
        if self.premium_pago_ate:
            candidatos.append(self.premium_pago_ate)
        return max(candidatos) if candidatos else None


class Assinatura(Profile):
    class Meta:
        proxy = True
        verbose_name = "assinatura"
        verbose_name_plural = "assinaturas"


class Notificacao(models.Model):
    """Notificação push criada pela autora no admin e enviada a todos os usuários."""

    class Status(models.TextChoices):
        RASCUNHO = "rascunho", "Rascunho"
        AGENDADA = "agendada", "Agendada"
        ENVIADA = "enviada", "Enviada"
        ERRO = "erro", "Erro parcial"

    titulo = models.CharField("título", max_length=100)
    mensagem = models.TextField("mensagem")
    agendada_para = models.DateTimeField(
        "agendar para",
        null=True,
        blank=True,
        help_text="Deixe em branco para enviar na hora. Preencha e use a ação "
        "\"Agendar envio\" para disparar automaticamente nesta data/hora.",
    )
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


class PasswordResetCode(models.Model):
    """Código OTP de recuperação de senha. Guardado como hash, nunca em claro."""

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="codigos_reset"
    )
    code_hash = models.CharField(max_length=128)
    criado_em = models.DateTimeField(auto_now_add=True)
    expira_em = models.DateTimeField()
    usado = models.BooleanField(default=False)
    tentativas = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "código de recuperação"
        verbose_name_plural = "códigos de recuperação"
        ordering = ["-criado_em"]

    def __str__(self):
        return f"Código de {self.usuario} ({'usado' if self.usado else 'ativo'})"
