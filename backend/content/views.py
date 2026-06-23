from rest_framework import generics

from .models import Chapter, SpecialPage
from .serializers import (
    ChapterListSerializer,
    ChapterDetailSerializer,
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
