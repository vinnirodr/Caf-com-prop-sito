"""Views de autenticação: cadastro, login e dados do usuário logado."""
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    LoginSerializer,
    PushTokenSerializer,
    RegisterSerializer,
    UserSerializer,
    tokens_para,
)


class RegisterView(generics.CreateAPIView):
    """Cria a conta e já devolve os tokens + o usuário (login automático)."""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {**tokens_para(user), "user": UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """Login por e-mail + senha. Devolve access, refresh e o usuário."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        return Response({**tokens_para(user), "user": UserSerializer(user).data})


class MeView(generics.RetrieveAPIView):
    """Dados do usuário autenticado."""

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class RegistrarTokenView(APIView):
    """Salva o Expo Push Token do dispositivo no perfil do usuário."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PushTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        perfil = request.user.perfil
        perfil.push_token = serializer.validated_data["push_token"]
        perfil.notificacoes_ativas = serializer.validated_data.get("notificacoes_ativas", True)
        perfil.save(update_fields=["push_token", "notificacoes_ativas"])
        return Response({"ok": True})
