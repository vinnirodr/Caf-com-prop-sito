"""
Dados do usuário no app: anotações, favoritos e progresso de leitura/escuta.
Usa o usuário padrão do Django (settings.AUTH_USER_MODEL).
"""
from django.conf import settings
from django.db import models

from content.models import Chapter


class Note(models.Model):
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notas")
    capitulo = models.ForeignKey(Chapter, on_delete=models.CASCADE, related_name="notas")
    texto = models.TextField("texto")
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "anotação"
        verbose_name_plural = "anotações"
        ordering = ["-criado_em"]

    def __str__(self):
        return f"Nota de {self.usuario} — Cap. {self.capitulo.numero}"


class Favorite(models.Model):
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favoritos")
    capitulo = models.ForeignKey(Chapter, on_delete=models.CASCADE, related_name="favoritos")
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "favorito"
        verbose_name_plural = "favoritos"
        unique_together = ("usuario", "capitulo")
        ordering = ["-criado_em"]

    def __str__(self):
        return f"Favorito de {self.usuario} — Cap. {self.capitulo.numero}"


class ReadingProgress(models.Model):
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="progresso")
    capitulo = models.ForeignKey(Chapter, on_delete=models.CASCADE, related_name="progresso")
    lido = models.BooleanField("lido", default=False)
    ouvido = models.BooleanField("ouvido", default=False)
    posicao_audio_seg = models.PositiveIntegerField("posição no áudio (segundos)", default=0)
    ultimo_acesso = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "progresso"
        verbose_name_plural = "progresso"
        unique_together = ("usuario", "capitulo")
        ordering = ["-ultimo_acesso"]

    def __str__(self):
        return f"Progresso de {self.usuario} — Cap. {self.capitulo.numero}"
