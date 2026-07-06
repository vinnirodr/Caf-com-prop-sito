"""Admin de contas: usuário com perfil inline + painel de notificações push."""
from django.contrib import admin, messages
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils import timezone

from . import push
from .models import Notificacao, Profile

User = get_user_model()


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


@admin.action(description="📣 Enviar agora para todos os usuários ativos")
def enviar_notificacao(modeladmin, request, queryset):
    tokens = push.tokens_ativos()
    if not tokens:
        # "Notificações ligadas" e "token registrado" são coisas diferentes: o
        # token só é salvo quando o usuário abre o app (atualizado) e concede a
        # permissão. Se ninguém tem token ainda, avisamos com clareza.
        com_toggle = Profile.objects.filter(notificacoes_ativas=True).count()
        if com_toggle:
            messages.warning(
                request,
                f"{com_toggle} usuário(s) estão com as notificações ligadas, mas nenhum "
                "registrou o token do dispositivo ainda. O token é salvo quando a pessoa "
                "abre a versão mais recente do app e aceita a permissão de notificações.",
            )
        else:
            messages.warning(request, "Nenhum usuário com notificações ativas encontrado.")
        return

    enviadas_total = 0
    erros_total = 0
    for notif in queryset:
        if notif.status == Notificacao.Status.ENVIADA:
            messages.warning(request, f'"{notif.titulo}" já foi enviada antes — pulada.')
            continue

        ok, erros = push.entregar_notificacao(notif, tokens)
        enviadas_total += ok
        erros_total += erros

    messages.success(
        request,
        f"Concluído: {enviadas_total} entrega(s) OK, {erros_total} erro(s).",
    )


@admin.action(description="🕐 Agendar envio (usa a data/hora do campo 'agendar para')")
def agendar_notificacao(modeladmin, request, queryset):
    agora = timezone.now()
    agendadas = 0
    for notif in queryset:
        if notif.status == Notificacao.Status.ENVIADA:
            messages.warning(request, f'"{notif.titulo}" já foi enviada — pulada.')
            continue
        if not notif.agendada_para:
            messages.warning(request, f'"{notif.titulo}" não tem data/hora de envio — pulada.')
            continue
        if notif.agendada_para <= agora:
            messages.warning(
                request, f'"{notif.titulo}" tem data no passado — use "Enviar agora".'
            )
            continue
        notif.status = Notificacao.Status.AGENDADA
        notif.save(update_fields=["status"])
        agendadas += 1

    if agendadas:
        messages.success(
            request,
            f"{agendadas} notificação(ões) agendada(s). O envio acontece automaticamente "
            "na data/hora marcada (verificado a cada ~10 min).",
        )


@admin.register(Notificacao)
class NotificacaoAdmin(admin.ModelAdmin):
    list_display = ("titulo", "status", "agendada_para", "total_enviadas", "total_erros", "criada_em", "enviada_em")
    list_filter = ("status",)
    search_fields = ("titulo", "mensagem")
    readonly_fields = ("status", "total_enviadas", "total_erros", "criada_em", "enviada_em")
    actions = [enviar_notificacao, agendar_notificacao]
    save_on_top = True

    fieldsets = (
        ("Conteúdo", {"fields": ("titulo", "mensagem")}),
        ("Agendamento", {
            "fields": ("agendada_para",),
            "description": "Opcional. Preencha a data/hora e use a ação "
            "\"🕐 Agendar envio\". Para enviar na hora, deixe em branco e use "
            "\"📣 Enviar agora\".",
        }),
        ("Envio", {
            "fields": ("status", "total_enviadas", "total_erros", "criada_em", "enviada_em"),
            "classes": ("collapse",),
        }),
    )
