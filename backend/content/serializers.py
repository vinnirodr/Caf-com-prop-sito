from rest_framework import serializers

from .models import Banner, Chapter, LembreteTexto, MusicaFundo, Produto, SpecialPage


class ChapterListSerializer(serializers.ModelSerializer):
    tem_audio = serializers.BooleanField(read_only=True)

    class Meta:
        model = Chapter
        fields = ("numero", "titulo", "versiculo_ref", "audio_acesso", "tem_audio")


class ChapterDetailSerializer(serializers.ModelSerializer):
    tem_audio = serializers.BooleanField(read_only=True)
    referencias_lista = serializers.SerializerMethodField()

    class Meta:
        model = Chapter
        fields = (
            "numero", "titulo",
            "versiculo_texto", "versiculo_ref",
            "reflexao", "oracao", "aplicacao", "frase_guardar",
            "referencias", "referencias_lista",
            "audio", "imagem", "audio_acesso", "tem_audio",
        )

    def get_referencias_lista(self, obj):
        return [r.strip() for r in obj.referencias.splitlines() if r.strip()]


class SpecialPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpecialPage
        fields = ("id", "titulo", "conteudo", "ordem")


class LembreteTextoSerializer(serializers.ModelSerializer):
    class Meta:
        model = LembreteTexto
        fields = ("id", "texto")


class ProdutoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Produto
        fields = (
            "id", "nome", "descricao", "preco", "categoria",
            "imagem", "link_compra", "destaque",
        )


class BannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Banner
        fields = (
            "id", "titulo", "subtitulo", "imagem",
            "destino", "link_externo", "capitulo_numero",
        )


class MusicaFundoSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = MusicaFundo
        fields = ("id", "titulo", "url", "ordem")

    def get_url(self, obj):
        return obj.arquivo.url if obj.arquivo else None
