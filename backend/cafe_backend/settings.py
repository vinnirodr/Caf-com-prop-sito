"""
Configurações do backend do Café com Propósito.
Valores sensíveis vêm de variáveis de ambiente (.env). Veja .env.example.
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def env(key, default=None):
    return os.environ.get(key, default)


SECRET_KEY = env("SECRET_KEY", "dev-inseguro-troque-em-producao")
DEBUG = env("DEBUG", "True") == "True"
ALLOWED_HOSTS = [h for h in env("ALLOWED_HOSTS", "*").split(",") if h]

# Segredo compartilhado com o cron (GitHub Actions) que dispara as notificações
# agendadas via /api/auth/interno/disparar-agendadas/. Sem valor, o endpoint fica
# fechado (403). Defina o MESMO valor no Render e no GitHub Secrets.
CRON_SECRET = env("CRON_SECRET", "")

GOOGLE_WEB_CLIENT_ID = env("GOOGLE_WEB_CLIENT_ID", "")

# E-mail (recuperação de senha via Resend). Com RESEND_API_KEY definido, o envio
# real vai pela API HTTP do Resend (ver accounts/reset_senha.py) — NÃO por SMTP,
# porque o Render bloqueia as portas de SMTP de saída (a conexão pendura até o
# worker morrer). Sem a chave (dev/testes), cai no backend de console do Django.
# O remetente (DEFAULT_FROM_EMAIL) exige um domínio verificado no Resend.
RESEND_API_KEY = env("RESEND_API_KEY", "")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", "onboarding@resend.dev")
if not RESEND_API_KEY:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Segredo compartilhado com o RevenueCat (header Authorization do webhook).
# Sem valor, o endpoint fica fechado (503) — ver accounts/assinaturas.py.
REVENUECAT_WEBHOOK_AUTH = env("REVENUECAT_WEBHOOK_AUTH", "")

# O Render injeta automaticamente o domínio público nesta variável.
RENDER_HOST = env("RENDER_EXTERNAL_HOSTNAME")
if RENDER_HOST:
    ALLOWED_HOSTS.append(RENDER_HOST)

# Necessário para o login do painel admin funcionar via HTTPS em produção.
CSRF_TRUSTED_ORIGINS = [f"https://{h}" for h in ALLOWED_HOSTS if h and h != "*"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "accounts",
    "content",
    "engagement",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "cafe_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "cafe_backend.wsgi.application"

# Banco de dados: SQLite por padrão (dev). Em produção, defina DATABASE_URL
# (ex.: Postgres no Render) e o dj-database-url assume automaticamente.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}
if env("DATABASE_URL"):
    try:
        import dj_database_url
        DATABASES["default"] = dj_database_url.parse(
            env("DATABASE_URL"), conn_max_age=600
        )
    except ImportError:
        pass

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

# Áudios e imagens dos capítulos. Em dev usamos o disco local; em produção, o
# Cloudflare R2 (S3-compatível) via django-storages — ativado automaticamente
# quando as variáveis R2_* estiverem definidas (não quebra o uso local).
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

_R2_KEYS = (
    "R2_BUCKET",
    "R2_ENDPOINT_URL",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_PUBLIC_DOMAIN",
)
_R2 = {k: env(k) for k in _R2_KEYS}
if any(_R2.values()):
    # Configuração parcial é sempre engano — falha rápido em vez de subir o R2
    # com credencial/endpoint vazios (ou cair no disco local sem avisar).
    _faltando = [k for k in _R2_KEYS if not _R2[k]]
    if _faltando:
        from django.core.exceptions import ImproperlyConfigured

        raise ImproperlyConfigured(
            "Configuração do Cloudflare R2 incompleta — defina TODAS as variáveis "
            "ou nenhuma (usa o disco local). Faltando: " + ", ".join(_faltando)
        )
    STORAGES["default"] = {
        "BACKEND": "storages.backends.s3.S3Storage",
        "OPTIONS": {
            "bucket_name": _R2["R2_BUCKET"],
            "endpoint_url": _R2["R2_ENDPOINT_URL"],       # https://<accountid>.r2.cloudflarestorage.com
            "access_key": _R2["R2_ACCESS_KEY_ID"],
            "secret_key": _R2["R2_SECRET_ACCESS_KEY"],
            "region_name": "auto",
            "custom_domain": _R2["R2_PUBLIC_DOMAIN"],     # URL pública do bucket
            "querystring_auth": False,                    # bucket público: URLs limpas
            "default_acl": None,                          # R2 não usa ACLs
            "file_overwrite": False,
        },
    }
    MEDIA_URL = f"https://{_R2['R2_PUBLIC_DOMAIN']}/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 25,
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
}

# JWT — tokens longos por ser app mobile (sessão persiste no aparelho).
from datetime import timedelta  # noqa: E402

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(days=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=60),
}

# CORS — o app nativo (Expo Go) não precisa, mas a versão web do Expo sim.
# Em dev liberamos tudo; em produção, defina CORS_ALLOWED_ORIGINS (lista de
# URLs separadas por vírgula, ex.: a URL do app web).
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOWED_ORIGINS = [
        o for o in env("CORS_ALLOWED_ORIGINS", "").split(",") if o
    ]
