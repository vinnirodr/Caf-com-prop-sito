"""
Endpoints de engajamento do usuário logado (favoritos, anotações, progresso).
Tudo é escopado ao `request.user` e exige autenticação.
"""
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from content.models import Chapter
from .models import Note, Favorite, ReadingProgress
from .serializers import FavoriteSerializer, NoteSerializer, ProgressSerializer


class FavoriteList(generics.ListCreateAPIView):
    """Lista os favoritos do usuário; POST {capitulo: numero} adiciona (idempotente)."""

    serializer_class = FavoriteSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Favorite.objects.filter(usuario=self.request.user).select_related("capitulo")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        capitulo = serializer.validated_data["capitulo"]
        fav, _ = Favorite.objects.get_or_create(usuario=request.user, capitulo=capitulo)
        return Response(self.get_serializer(fav).data, status=status.HTTP_201_CREATED)


class FavoriteDetail(generics.DestroyAPIView):
    """Remove um favorito pelo número do capítulo."""

    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return get_object_or_404(
            Favorite, usuario=self.request.user, capitulo__numero=self.kwargs["numero"]
        )


class NoteList(generics.ListCreateAPIView):
    """Lista anotações do usuário (?capitulo=numero filtra) e cria novas."""

    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = Note.objects.filter(usuario=self.request.user).select_related("capitulo")
        cap = self.request.query_params.get("capitulo")
        if cap:
            qs = qs.filter(capitulo__numero=cap)
        return qs

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)


class NoteDetail(generics.RetrieveUpdateDestroyAPIView):
    """Edita/exclui uma anotação do próprio usuário."""

    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Note.objects.filter(usuario=self.request.user)


class ProgressList(generics.ListAPIView):
    serializer_class = ProgressSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return ReadingProgress.objects.filter(usuario=self.request.user).select_related("capitulo")


class ProgressDetail(APIView):
    """Upsert do progresso de um capítulo (por número). PUT com lido/ouvido/posição."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, numero):
        prog = ReadingProgress.objects.filter(
            usuario=request.user, capitulo__numero=numero
        ).select_related("capitulo").first()
        if not prog:
            return Response({}, status=status.HTTP_200_OK)
        return Response(ProgressSerializer(prog).data)

    def put(self, request, numero):
        capitulo = get_object_or_404(Chapter, numero=numero, publicado=True)
        prog, _ = ReadingProgress.objects.get_or_create(usuario=request.user, capitulo=capitulo)
        if "lido" in request.data:
            prog.lido = bool(request.data["lido"])
        if "ouvido" in request.data:
            prog.ouvido = bool(request.data["ouvido"])
        if "posicao_audio_seg" in request.data:
            try:
                prog.posicao_audio_seg = max(0, int(request.data["posicao_audio_seg"]))
            except (TypeError, ValueError):
                return Response(
                    {"posicao_audio_seg": ["Valor inválido."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        prog.save()
        return Response(ProgressSerializer(prog).data)


class Resumo(APIView):
    """Resumo da jornada do usuário (para o Meu Espaço)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        u = request.user
        return Response({
            "total": Chapter.objects.filter(publicado=True).count(),
            "lidos": ReadingProgress.objects.filter(usuario=u, lido=True).count(),
            "favoritos": Favorite.objects.filter(usuario=u).count(),
            "anotacoes": Note.objects.filter(usuario=u).count(),
        })
