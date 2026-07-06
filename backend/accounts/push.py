"""
Envio de push notifications via Expo Push API.

Módulo compartilhado por: admin (envio manual), management command e o endpoint
interno que dispara as notificações agendadas. Envia em lotes de 100 (limite
recomendado pela Expo) e reporta os tokens mortos (apps desinstalados) para limpeza.
"""
import json

import requests
from django.utils import timezone

from .models import Notificacao, Profile

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
TAMANHO_LOTE = 100

# Erros da Expo que indicam token permanentemente inválido → limpar do banco.
ERROS_TOKEN_MORTO = {"DeviceNotRegistered", "InvalidCredentials"}


def tokens_ativos() -> list[str]:
    """Tokens dos usuários que têm push e não desativaram as notificações."""
    return list(
        Profile.objects.filter(push_token__gt="", notificacoes_ativas=True)
        .values_list("push_token", flat=True)
    )


def enviar_para_tokens(tokens: list[str], titulo: str, mensagem: str) -> tuple[int, int, list[str]]:
    """
    Envia a mesma mensagem para todos os tokens, em lotes de 100.
    Retorna (ok, erros, tokens_mortos).
    """
    ok = 0
    erros = 0
    mortos: list[str] = []

    for inicio in range(0, len(tokens), TAMANHO_LOTE):
        lote = tokens[inicio : inicio + TAMANHO_LOTE]
        payload = [
            {"to": token, "title": titulo, "body": mensagem, "sound": "default"}
            for token in lote
        ]
        try:
            resp = requests.post(
                EXPO_PUSH_URL,
                data=json.dumps(payload),
                headers={"Content-Type": "application/json", "Accept": "application/json"},
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json().get("data", [])
        except Exception:
            erros += len(lote)
            continue

        for token, resultado in zip(lote, data):
            if resultado.get("status") == "ok":
                ok += 1
            else:
                erros += 1
                erro = (resultado.get("details") or {}).get("error")
                if erro in ERROS_TOKEN_MORTO:
                    mortos.append(token)
        # Se a Expo devolver menos itens que o lote, conta o restante como erro.
        faltando = len(lote) - len(data)
        if faltando > 0:
            erros += faltando

    return ok, erros, mortos


def limpar_tokens_mortos(tokens_mortos: list[str]) -> None:
    if tokens_mortos:
        Profile.objects.filter(push_token__in=tokens_mortos).update(push_token="")


def entregar_notificacao(notif: Notificacao, tokens: list[str]) -> tuple[int, int]:
    """Entrega uma Notificacao para `tokens` e grava status/contadores. Retorna (ok, erros)."""
    ok, erros, mortos = enviar_para_tokens(tokens, notif.titulo, notif.mensagem)
    limpar_tokens_mortos(mortos)
    notif.total_enviadas = ok
    notif.total_erros = erros
    notif.enviada_em = timezone.now()
    notif.status = Notificacao.Status.ENVIADA if erros == 0 else Notificacao.Status.ERRO
    notif.save(update_fields=["total_enviadas", "total_erros", "enviada_em", "status"])
    return ok, erros


def disparar_agendadas() -> int:
    """
    Envia as notificações agendadas cujo horário já venceu. Chamado pelo endpoint
    interno (via cron do GitHub Actions) e pelo management command. Retorna quantas
    notificações foram disparadas.
    """
    pendentes = Notificacao.objects.filter(
        status=Notificacao.Status.AGENDADA,
        agendada_para__lte=timezone.now(),
    )
    enviadas = 0
    for notif in pendentes:
        # Recarrega os tokens a cada notificação (a limpeza de mortos altera o banco).
        entregar_notificacao(notif, tokens_ativos())
        enviadas += 1
    return enviadas
