"""Webhook do RevenueCat: sincroniza a assinatura paga no Profile."""
from datetime import datetime, timezone as dt_timezone

from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

User = get_user_model()

ATIVA = {"INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION"}
ENCERRA = {"EXPIRATION"}


class RevenueCatWebhook(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        segredo = settings.REVENUECAT_WEBHOOK_AUTH
        if not segredo:
            return Response({"detail": "webhook não configurado"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        if request.headers.get("Authorization") != segredo:
            return Response({"detail": "não autorizado"}, status=status.HTTP_401_UNAUTHORIZED)

        evento = (request.data or {}).get("event", {})
        tipo = evento.get("type", "")
        app_user_id = str(evento.get("app_user_id", ""))
        if not app_user_id or app_user_id.startswith("$RCAnonymousID"):
            return Response({"detail": "ignorado (anônimo)"}, status=status.HTTP_200_OK)
        try:
            user = User.objects.get(pk=int(app_user_id))
        except (User.DoesNotExist, ValueError):
            return Response({"detail": "ignorado (sem usuário)"}, status=status.HTTP_200_OK)

        perfil = user.perfil
        if tipo in ATIVA:
            exp_ms = evento.get("expiration_at_ms")
            if exp_ms:
                perfil.premium_pago_ate = datetime.fromtimestamp(int(exp_ms) / 1000, tz=dt_timezone.utc)
        elif tipo in ENCERRA:
            perfil.premium_pago_ate = None
        perfil.rc_ultimo_evento = tipo[:60]
        perfil.save(update_fields=["premium_pago_ate", "rc_ultimo_evento"])
        return Response({"detail": "ok"}, status=status.HTTP_200_OK)
