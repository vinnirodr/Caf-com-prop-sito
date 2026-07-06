"""Login com Google: verificação do ID token e find-or-create do usuário.

Isolado para facilitar teste (os testes mockam `google_id_token.verify_oauth2_token`).
"""
from django.contrib.auth import get_user_model
import google.auth.transport.requests
from google.oauth2 import id_token as google_id_token

User = get_user_model()


class GoogleTokenInvalido(Exception):
    """Token do Google ausente, inválido, expirado ou com e-mail não verificado."""


def verificar_id_token(token, client_id):
    """Verifica o ID token do Google e devolve o payload. Lança GoogleTokenInvalido."""
    try:
        info = google_id_token.verify_oauth2_token(
            token, google.auth.transport.requests.Request(), client_id
        )
    except Exception as e:  # ValueError, GoogleAuthError, etc.
        raise GoogleTokenInvalido("Token do Google inválido.") from e
    if not info.get("email_verified"):
        raise GoogleTokenInvalido("O e-mail desta conta Google não está verificado.")
    if not info.get("email"):
        raise GoogleTokenInvalido("O Google não devolveu um e-mail.")
    return info


def obter_ou_criar_usuario(info):
    """Find-or-create por e-mail (username=email). Novos usuários Google não têm senha usável."""
    email = info["email"].strip().lower()
    user = User.objects.filter(email__iexact=email).order_by("id").first()
    if user:
        return user
    user = User(
        username=email,
        email=email,
        first_name=(info.get("given_name") or "").strip(),
        last_name=(info.get("family_name") or "").strip(),
    )
    user.set_unusable_password()
    user.save()  # o signal cria o Profile
    return user
