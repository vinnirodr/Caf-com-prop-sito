"""
Painel administrativo — pensado para edição de conteúdo por uma pessoa
não-técnica (a autora). Rótulos e ajudas em português.
"""
from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from .models import Banner, Chapter, LembreteTexto, Produto, SpecialPage

admin.site.site_header = "Café com Propósito — Administração"
admin.site.site_title = "Café com Propósito"
admin.site.index_title = "Gerenciar conteúdo do aplicativo"


def thumb(imagem):
    """Miniatura segura para o admin. obj.imagem.url pode lançar se a mídia estiver
    inacessível (ex.: R2 não configurado) — sem o guard, derruba a lista com 500."""
    if not imagem:
        return mark_safe('<span style="color:#b9a999;">—</span>')
    try:
        url = imagem.url
    except Exception:
        return mark_safe('<span style="color:#b9a999;" title="mídia indisponível">—</span>')
    return format_html(
        '<img src="{}" style="height:32px;border-radius:4px;object-fit:cover;">', url
    )


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
        return thumb(obj.imagem)

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


@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin):
    list_display = ("nome", "imagem_thumb", "categoria", "preco", "destaque", "publicado", "ordem")
    list_display_links = ("nome",)
    list_editable = ("destaque", "publicado", "ordem")
    list_filter = ("categoria", "publicado", "destaque")
    search_fields = ("nome", "descricao")
    ordering = ("-destaque", "ordem", "id")

    fieldsets = (
        ("Produto", {"fields": ("nome", "descricao", "categoria", "preco")}),
        ("Imagem", {"fields": ("imagem",)}),
        ("Venda", {
            "fields": ("link_compra",),
            "description": "Opcional. Enquanto vazio, o app mostra 'Em breve'.",
        }),
        ("Exibição", {"fields": ("destaque", "publicado", "ordem")}),
    )

    @admin.display(description="imagem")
    def imagem_thumb(self, obj):
        return thumb(obj.imagem)


@admin.register(Banner)
class BannerAdmin(admin.ModelAdmin):
    list_display = ("__str__", "imagem_thumb", "destino", "ativo", "ordem")
    list_editable = ("ativo", "ordem")
    list_filter = ("ativo", "destino")
    search_fields = ("titulo", "subtitulo")
    ordering = ("ordem", "id")

    fieldsets = (
        ("Conteúdo (usado quando NÃO há imagem)", {"fields": ("titulo", "subtitulo")}),
        ("Imagem personalizada", {
            "fields": ("imagem",),
            "description": "Opcional. Se enviar uma arte, ela substitui o texto acima.",
        }),
        ("Destino do toque", {
            "fields": ("destino", "link_externo", "capitulo_numero"),
            "description": "Para onde o banner leva. 'Link externo' usa o campo de link; "
            "'Abrir um capítulo' usa o número do capítulo.",
        }),
        ("Exibição", {"fields": ("ativo", "ordem")}),
    )

    @admin.display(description="imagem")
    def imagem_thumb(self, obj):
        return thumb(obj.imagem)
