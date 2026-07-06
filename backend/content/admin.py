"""
Painel administrativo — pensado para edição de conteúdo por uma pessoa
não-técnica (a autora). Rótulos e ajudas em português.
"""
from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from .models import Chapter, LembreteTexto, SpecialPage

admin.site.site_header = "Café com Propósito — Administração"
admin.site.site_title = "Café com Propósito"
admin.site.index_title = "Gerenciar conteúdo do aplicativo"


@admin.register(Chapter)
class ChapterAdmin(admin.ModelAdmin):
    list_display = ("numero", "titulo", "audio_status", "imagem_thumb", "audio_acesso", "publicado")
    list_display_links = ("numero", "titulo")
    list_editable = ("audio_acesso", "publicado")
    list_filter = ("publicado", "audio_acesso")
    search_fields = ("numero", "titulo", "versiculo_texto", "reflexao")
    ordering = ("numero",)
    list_per_page = 75
    save_on_top = True

    fieldsets = (
        ("Identificação", {"fields": ("numero", "titulo")}),
        ("Versículo-chave", {"fields": ("versiculo_texto", "versiculo_ref")}),
        ("Conteúdo devocional", {
            "fields": ("reflexao", "oracao", "aplicacao", "frase_guardar", "referencias"),
            "classes": ("wide",),
        }),
        ("Mídia", {"fields": ("audio", "audio_player", "imagem")}),
        ("Publicação", {"fields": ("audio_acesso", "publicado")}),
    )
    readonly_fields = ("audio_player",)

    @admin.display(description="áudio", ordering="audio")
    def audio_status(self, obj):
        if obj.tem_audio:
            return mark_safe('<span style="color:#2e7d32;">✓ enviado</span>')
        return mark_safe('<span style="color:#b9a999;">— pendente</span>')

    @admin.display(description="imagem")
    def imagem_thumb(self, obj):
        if obj.imagem:
            # obj.imagem.url pode lançar se o storage de mídia não estiver
            # acessível (ex.: R2 não configurado em produção). Sem este guard,
            # uma imagem inacessível derruba a LISTA inteira com 500.
            try:
                url = obj.imagem.url
            except Exception:
                return mark_safe('<span style="color:#b9a999;" title="mídia indisponível">—</span>')
            return format_html(
                '<img src="{}" style="height:32px;border-radius:4px;object-fit:cover;">',
                url,
            )
        return mark_safe('<span style="color:#b9a999;">—</span>')

    @admin.display(description="ouvir narração")
    def audio_player(self, obj):
        if obj.audio:
            try:
                url = obj.audio.url
            except Exception:
                return "Áudio enviado, mas a mídia está indisponível no momento."
            return format_html(
                '<audio controls style="width:100%;max-width:440px;">'
                '<source src="{}" type="audio/mpeg"></audio>',
                url,
            )
        return "Nenhuma narração enviada ainda."


@admin.register(SpecialPage)
class SpecialPageAdmin(admin.ModelAdmin):
    list_display = ("ordem", "titulo", "publicado")
    list_display_links = ("titulo",)
    list_editable = ("ordem", "publicado")
    search_fields = ("titulo", "conteudo")
    ordering = ("ordem",)


@admin.register(LembreteTexto)
class LembreteTextoAdmin(admin.ModelAdmin):
    list_display = ("texto", "ativo", "ordem")
    list_display_links = ("texto",)
    list_editable = ("ativo", "ordem")
    search_fields = ("texto",)
    ordering = ("ordem", "id")
