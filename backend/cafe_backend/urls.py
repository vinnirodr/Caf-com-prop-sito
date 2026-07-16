from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.urls import path, include
from django.views.generic import TemplateView

from accounts.assinaturas import RevenueCatWebhook


def healthz(request):
    """Health check leve para monitoramento e keep-warm (sem tocar no banco)."""
    return JsonResponse({"status": "ok"})


urlpatterns = [
    # Landing page pública (marketing → Google Play). Servida em
    # https://cafecomproposito.luminaflow.io/ via domínio customizado no Render.
    path("", TemplateView.as_view(template_name="site/landing.html"), name="landing"),
    path("healthz/", healthz, name="healthz"),
    # Páginas legais públicas (exigidas pela Play Store; linkadas no app).
    path(
        "privacidade/",
        TemplateView.as_view(template_name="legal/privacidade.html"),
        name="privacidade",
    ),
    path(
        "termos/",
        TemplateView.as_view(template_name="legal/termos.html"),
        name="termos",
    ),
    path(
        "excluir-conta/",
        TemplateView.as_view(template_name="legal/excluir-conta.html"),
        name="excluir-conta",
    ),
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/assinaturas/revenuecat-webhook/", RevenueCatWebhook.as_view(), name="revenuecat-webhook"),
    path("api/", include("content.urls")),
    path("api/", include("engagement.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
