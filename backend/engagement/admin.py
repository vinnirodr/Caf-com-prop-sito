from django.contrib import admin
from .models import Note, Favorite, ReadingProgress


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ("usuario", "capitulo", "criado_em")
    search_fields = ("usuario__username", "texto")
    list_filter = ("criado_em",)


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ("usuario", "capitulo", "criado_em")
    list_filter = ("criado_em",)


@admin.register(ReadingProgress)
class ReadingProgressAdmin(admin.ModelAdmin):
    list_display = ("usuario", "capitulo", "lido", "ouvido", "ultimo_acesso")
    list_filter = ("lido", "ouvido")
