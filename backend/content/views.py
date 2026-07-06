from rest_framework import generics

from .models import Chapter, LembreteTexto, Produto, SpecialPage
from .serializers import (
    ChapterListSerializer,
    ChapterDetailSerializer,
    LembreteTextoSerializer,
    ProdutoSerializer,
    SpecialPageSerializer,
)


class ChapterList(generics.ListAPIView):
    serializer_class = ChapterListSerializer

    def get_queryset(self):
        return Chapter.objects.filter(publicado=True).order_by("numero")


class ChapterDetail(generics.RetrieveAPIView):
    serializer_class = ChapterDetailSerializer
    lookup_field = "numero"

    def get_queryset(self):
        return Chapter.objects.filter(publicado=True)


class SpecialPageList(generics.ListAPIView):
    serializer_class = SpecialPageSerializer

    def get_queryset(self):
        return SpecialPage.objects.filter(publicado=True).order_by("ordem")


class LembreteList(generics.ListAPIView):
    """Frases de lembrete ativas — o app baixa e agenda localmente. Público, sem paginação."""

    serializer_class = LembreteTextoSerializer
    pagination_class = None

    def get_queryset(self):
        return LembreteTexto.objects.filter(ativo=True).order_by("ordem", "id")


class ProdutoList(generics.ListAPIView):
    """Produtos publicados da loja. Público, sem paginação (a lista é curta)."""

    serializer_class = ProdutoSerializer
    pagination_class = None

    def get_queryset(self):
        return Produto.objects.filter(publicado=True)
