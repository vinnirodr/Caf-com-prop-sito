"""Recuperação de senha por código OTP: geração, envio e verificação.

Isolado para facilitar teste. O código nunca é salvo em claro (só o hash).
"""
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password, make_password
from django.core.mail import send_mail
from django.utils import timezone

from .models import PasswordResetCode

User = get_user_model()

EXPIRACAO = timedelta(minutes=20)
COOLDOWN = timedelta(seconds=40)  # casado com a contagem de reenvio no app
MAX_TENTATIVAS = 5


class CodigoInvalido(Exception):
    """Código ausente, errado, expirado, já usado ou tentativas esgotadas."""


def _gerar_codigo():
    return f"{secrets.randbelow(1_000_000):06d}"


def _enviar_email(user, codigo):
    send_mail(
        subject="Seu código de recuperação — Café com Propósito",
        message=(
            f"Olá!\n\nSeu código para redefinir a senha é: {codigo}\n\n"
            "Ele vale por 20 minutos. Se você não pediu isso, pode ignorar este e-mail.\n\n"
            "Com carinho,\nCafé com Propósito ☕"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )


def solicitar(email):
    """Cria e envia um código, se houver conta. Silencioso se não houver (anti-enumeração)."""
    email = (email or "").strip().lower()
    user = User.objects.filter(email__iexact=email).order_by("id").first()
    if not user:
        return
    agora = timezone.now()
    # cooldown: não recria se houver um código ativo recente
    if PasswordResetCode.objects.filter(
        usuario=user, usado=False, criado_em__gt=agora - COOLDOWN
    ).exists():
        return
    PasswordResetCode.objects.filter(usuario=user, usado=False).update(usado=True)
    codigo = _gerar_codigo()
    PasswordResetCode.objects.create(
        usuario=user, code_hash=make_password(codigo), expira_em=agora + EXPIRACAO
    )
    _enviar_email(user, codigo)


def redefinir(email, codigo, nova_senha):
    """Valida o código e troca a senha. Lança CodigoInvalido nos casos ruins."""
    email = (email or "").strip().lower()
    generico = CodigoInvalido("Código inválido ou expirado.")
    user = User.objects.filter(email__iexact=email).order_by("id").first()
    if not user:
        raise generico
    reg = (
        PasswordResetCode.objects.filter(usuario=user, usado=False)
        .order_by("-criado_em")
        .first()
    )
    if not reg or reg.expira_em < timezone.now():
        raise generico
    if reg.tentativas >= MAX_TENTATIVAS:
        reg.usado = True
        reg.save(update_fields=["usado"])
        raise generico
    if not check_password(codigo, reg.code_hash):
        reg.tentativas += 1
        reg.save(update_fields=["tentativas"])
        raise generico
    user.set_password(nova_senha)
    user.save(update_fields=["password"])
    reg.usado = True
    reg.save(update_fields=["usado"])
