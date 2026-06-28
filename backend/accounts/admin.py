"""Admin de contas: usuário com perfil inline + painel de notificações push."""
import json
from datetime import timezone as dt_timezone

import requests
from django.contrib import admin, messages
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils import timezone

from .models import Notificacao, Profile

User = get_user_model()

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    verbose_name = "perfil"
    verbose_name_plural = "perfil"
    readonly_fields = ("push_token",)
    fields = ("telefone", "data_nascimento", "push_token", "notificacoes_ativas")


class UserAdmin(BaseUserAdmin):
    inlines = [ProfileInline]
    list_display = ("username", "email", "first_name", "last_name", "is_staff")


admin.site.unregister(User)
admin.site.register(User, UserAdmin)


def _enviar_lote(tokens: list[str], titulo: str, mensagem: str) -> tuple[int, int]:
    """Envia um lote de notificações via Expo Push API. Retorna (ok, erros)."""
    payload = [
        {"to": token, "title": titulo, "body": mensagem, "sound": "default"}
        for token in tokens
    ]
    try:
        resp = requests.post(
            EXPO_PUSH_URL,
            data=json.dumps(payload),
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json().get("data", [])
    except Exception:
        return 0, len(tokens)

    ok = sum(1 for r in data if r.get("status") == "ok")
    erros = len(data) - ok
    return ok, erros


@admin.action(description="📣 Enviar agora para todos os usuários ativos")
def enviar_notificacao(modeladmin, request, queryset):
    enviadas_total = 0
    erros_total = 0

    tokens = list(
        Profile.objects.filter(
            push_token__gt="", notificacoes_ativas=True
        ).values_list("push_token", flat=True)
    )

    if not tokens:
        messages.warning(request, "Nenhum usuário com notificações ativas encontrado.")
        return

    for notif in queryset:
        if notif.status == Notificacao.Status.ENVIADA:
            messages.warning(request, f'"{notif.titulo}" já foi enviada antes — pulada.')
            continue

        ok, erros = _enviar_lote(tokens, notif.titulo, notif.mensagem)
        notif.total_enviadas = ok
        notif.total_erros = erros
        notif.enviada_em = timezone.now()
        notif.status = Notificacao.Status.ENVIADA if erros == 0 else Notificacao.Status.ERRO
        notif.save(update_fields=["total_enviadas", "total_erros", "enviada_em", "status"])

        enviadas_total += ok
        erros_total += erros

    messages.success(
        request,
        f"Concluído: {enviadas_total} entrega(s) OK, {erros_total} erro(s).",
    )


@admin.register(Notificacao)
class NotificacaoAdmin(admin.ModelAdmin):
    list_display = ("titulo", "status", "total_enviadas", "total_erros", "criada_em", "enviada_em")
    list_filter = ("status",)
    search_fields = ("titulo", "mensagem")
    readonly_fields = ("status", "total_enviadas", "total_erros", "criada_em", "enviada_em")
    actions = [enviar_notificacao]
    save_on_top = True

    fieldsets = (
        ("Conteúdo", {"fields": ("titulo", "mensagem")}),
        ("Envio", {
            "fields": ("status", "total_enviadas", "total_erros", "criada_em", "enviada_em"),
            "classes": ("collapse",),
        }),
    )
