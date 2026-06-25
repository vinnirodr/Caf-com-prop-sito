"""Serializers de engajamento: favoritos, anotações e progresso de leitura."""
from rest_framework import serializers

from content.models import Chapter
from .models import Note, Favorite, ReadingProgress


class FavoriteSerializer(serializers.ModelSerializer):
    capitulo = serializers.SlugRelatedField(
        slug_field="numero", queryset=Chapter.objects.filter(publicado=True)
    )
    titulo = serializers.CharField(source="capitulo.titulo", read_only=True)
    versiculo_ref = serializers.CharField(source="capitulo.versiculo_ref", read_only=True)
    tem_audio = serializers.BooleanField(source="capitulo.tem_audio", read_only=True)
    audio_acesso = serializers.CharField(source="capitulo.audio_acesso", read_only=True)

    class Meta:
        model = Favorite
        fields = ("capitulo", "titulo", "versiculo_ref", "tem_audio", "audio_acesso", "criado_em")


class NoteSerializer(serializers.ModelSerializer):
    capitulo = serializers.SlugRelatedField(
        slug_field="numero", queryset=Chapter.objects.filter(publicado=True)
    )
    capitulo_titulo = serializers.CharField(source="capitulo.titulo", read_only=True)
    versiculo_ref = serializers.CharField(source="capitulo.versiculo_ref", read_only=True)

    class Meta:
        model = Note
        fields = (
            "id", "capitulo", "capitulo_titulo", "versiculo_ref",
            "texto", "criado_em", "atualizado_em",
        )
        read_only_fields = ("criado_em", "atualizado_em")


class ProgressSerializer(serializers.ModelSerializer):
    capitulo = serializers.SlugRelatedField(slug_field="numero", read_only=True)
    titulo = serializers.CharField(source="capitulo.titulo", read_only=True)
    versiculo_ref = serializers.CharField(source="capitulo.versiculo_ref", read_only=True)

    class Meta:
        model = ReadingProgress
        fields = (
            "capitulo", "titulo", "versiculo_ref",
            "lido", "ouvido", "posicao_audio_seg", "ultimo_acesso",
        )
