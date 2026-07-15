"""Views de autenticação: cadastro, login e dados do usuário logado."""
from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import google as google_login
from . import push
from . import reset_senha
from .serializers import (
    AtualizarPerfilSerializer,
    EsqueciSenhaSerializer,
    ExcluirContaSerializer,
    GoogleLoginSerializer,
    LoginSerializer,
    PushTokenSerializer,
    RedefinirSenhaSerializer,
    RegisterSerializer,
    TrocarEmailSerializer,
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


class GoogleLoginView(APIView):
    """Login social: recebe o ID token do Google, verifica e devolve JWT."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = GoogleLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            info = google_login.verificar_id_token(
                serializer.validated_data["id_token"], settings.GOOGLE_WEB_CLIENT_ID
            )
        except google_login.GoogleTokenInvalido as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        user = google_login.obter_ou_criar_usuario(info)
        return Response({**tokens_para(user), "user": UserSerializer(user).data})


class EsqueciSenhaView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = EsqueciSenhaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reset_senha.solicitar(serializer.validated_data["email"])
        return Response({"detail": "Se o e-mail existir, enviamos um código."})


class RedefinirSenhaView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RedefinirSenhaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            reset_senha.redefinir(
                serializer.validated_data["email"],
                serializer.validated_data["codigo"],
                serializer.validated_data["nova_senha"],
            )
        except reset_senha.CodigoInvalido as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Senha redefinida com sucesso."})


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


class TrocarEmailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = TrocarEmailSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data)


class ExcluirContaView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ExcluirContaSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


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


class DispararAgendadasView(APIView):
    """
    Dispara as notificações agendadas que já venceram. Endpoint interno, chamado
    por um cron (GitHub Actions), protegido pelo header `X-Cron-Secret`. Não é
    para uso do app — sem o segredo correto, retorna 403.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        segredo = settings.CRON_SECRET
        enviado = request.headers.get("X-Cron-Secret", "")
        if not segredo or enviado != segredo:
            return Response(status=status.HTTP_403_FORBIDDEN)
        enviadas = push.disparar_agendadas()
        return Response({"enviadas": enviadas})


class AvatarView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        arquivo = request.FILES.get("avatar")
        if not arquivo:
            return Response({"detail": "Envie uma imagem em 'avatar'."}, status=status.HTTP_400_BAD_REQUEST)
        perfil = request.user.perfil
        perfil.avatar = arquivo
        perfil.save(update_fields=["avatar"])
        return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)
