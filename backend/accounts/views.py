"""Views de autenticação: cadastro, login e dados do usuário logado."""
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    AtualizarPerfilSerializer,
    LoginSerializer,
    PushTokenSerializer,
    RegisterSerializer,
    TrocarSenhaSerializer,
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


class MeView(generics.RetrieveUpdateAPIView):
    """GET: dados do usuário logado. PATCH: edita os dados básicos."""

    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method == "PATCH":
            return AtualizarPerfilSerializer
        return UserSerializer

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(instance).data)


class TrocarSenhaView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = TrocarSenhaSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"ok": True})


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
