"""Painel de status (staff-only): saúde do serviço e números do produto.

Mostra apenas AGREGADOS — nenhum dado pessoal de leitor aparece aqui.
"""
import time

from django.contrib.admin.views.decorators import staff_member_required
from django.db import connection
from django.shortcuts import render
from django.utils import timezone

from content.models import Chapter, SpecialPage


def _saude():
    """Banco acessível? Quanto demora uma query trivial? O que já foi migrado?"""
    inicio = time.perf_counter()
    banco_ok = True
    migracoes_total = 0
    ultima_migracao = "—"
    try:
        with connection.cursor() as cur:
            cur.execute("SELECT 1")
            cur.fetchone()
            latencia_ms = round((time.perf_counter() - inicio) * 1000, 1)
            cur.execute("SELECT COUNT(*) FROM django_migrations")
            migracoes_total = cur.fetchone()[0]
            cur.execute("SELECT app, name FROM django_migrations ORDER BY id DESC LIMIT 1")
            linha = cur.fetchone()
            if linha:
                ultima_migracao = f"{linha[0]}.{linha[1]}"
    except Exception:
        banco_ok = False
        latencia_ms = round((time.perf_counter() - inicio) * 1000, 1)

    agora = timezone.now()
    return {
        "banco_ok": banco_ok,
        "latencia_ms": latencia_ms,
        "migracoes_total": migracoes_total,
        "ultima_migracao": ultima_migracao,
        "tabelas": len(connection.introspection.table_names()),
        "hora_local": timezone.localtime(agora).strftime("%d/%m/%Y %H:%M"),
        "hora_utc": agora.strftime("%H:%M UTC"),
    }


def _conteudo():
    """Números do livro — úteis também para a autora acompanhar."""
    return {
        "capitulos_publicados": Chapter.objects.filter(publicado=True).count(),
        "capitulos_total": Chapter.objects.count(),
        "capitulos_com_audio": Chapter.objects.exclude(audio="").exclude(audio__isnull=True).count(),
        "paginas_publicadas": SpecialPage.objects.filter(publicado=True).count(),
    }


@staff_member_required
def status(request):
    return render(
        request,
        "site/status.html",
        {"saude": _saude(), "conteudo": _conteudo()},
    )
