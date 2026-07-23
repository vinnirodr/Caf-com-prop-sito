"""Painel de status (staff-only): saúde do serviço e números do produto.

Mostra apenas AGREGADOS — nenhum dado pessoal de leitor aparece aqui.
"""
import time
from datetime import datetime, timedelta

from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth.models import User
from django.db import connection
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.shortcuts import render
from django.utils import timezone

from accounts.models import Profile
from content.models import Chapter, SpecialPage
from engagement.models import Favorite, Note, ReadingProgress


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


def _uso():
    """Agregados de uso. 'Ativo' = quem teve progresso de leitura no período.

    Usamos ReadingProgress.ultimo_acesso (auto_now) porque o login por JWT não
    atualiza o last_login do Django — esse campo daria um número falso.
    """
    agora = timezone.now()
    hoje_inicio = timezone.localtime(agora).replace(hour=0, minute=0, second=0, microsecond=0)
    d7 = agora - timedelta(days=7)
    d30 = agora - timedelta(days=30)

    def ativos_desde(corte):
        return (
            ReadingProgress.objects.filter(ultimo_acesso__gte=corte)
            .values("usuario")
            .distinct()
            .count()
        )

    return {
        "usuarios_total": User.objects.count(),
        "novos_hoje": User.objects.filter(date_joined__gte=hoje_inicio).count(),
        "novos_7d": User.objects.filter(date_joined__gte=d7).count(),
        "novos_30d": User.objects.filter(date_joined__gte=d30).count(),
        "ativos_hoje": ativos_desde(hoje_inicio),
        "ativos_7d": ativos_desde(d7),
        "ativos_30d": ativos_desde(d30),
        # Mesma regra do Profile.premium_ativo (atenção: premium_manual_ate é DateField
        # e premium_pago_ate é DateTimeField).
        "premium_ativos": Profile.objects.filter(
            Q(premium_manual=True, premium_manual_ate__isnull=True)
            | Q(premium_manual=True, premium_manual_ate__gte=timezone.localdate())
            | Q(premium_pago_ate__gte=agora)
        ).count(),
        "lidos_total": ReadingProgress.objects.filter(lido=True).count(),
        "lidos_7d": ReadingProgress.objects.filter(lido=True, ultimo_acesso__gte=d7).count(),
        "ouvidos_total": ReadingProgress.objects.filter(ouvido=True).count(),
        "ouvidos_7d": ReadingProgress.objects.filter(ouvido=True, ultimo_acesso__gte=d7).count(),
        "favoritos_total": Favorite.objects.count(),
        "favoritos_7d": Favorite.objects.filter(criado_em__gte=d7).count(),
        "anotacoes_total": Note.objects.count(),
        "anotacoes_7d": Note.objects.filter(criado_em__gte=d7).count(),
    }


def _tendencia(dias=14):
    """Série diária (cadastros e ativos) para as barras em CSS."""
    hoje = timezone.localdate()
    primeiro_dia = hoje - timedelta(days=dias - 1)
    inicio = timezone.make_aware(datetime.combine(primeiro_dia, datetime.min.time()))

    cadastros = dict(
        User.objects.filter(date_joined__gte=inicio)
        .annotate(d=TruncDate("date_joined"))
        .values("d")
        .annotate(n=Count("id"))
        .values_list("d", "n")
    )
    ativos = dict(
        ReadingProgress.objects.filter(ultimo_acesso__gte=inicio)
        .annotate(d=TruncDate("ultimo_acesso"))
        .values("d")
        .annotate(n=Count("usuario", distinct=True))
        .values_list("d", "n")
    )

    linhas = []
    for i in range(dias):
        dia = primeiro_dia + timedelta(days=i)
        linhas.append(
            {
                "dia": dia.strftime("%d/%m"),
                "cadastros": cadastros.get(dia, 0),
                "ativos": ativos.get(dia, 0),
            }
        )
    maximo = max([max(l["cadastros"], l["ativos"]) for l in linhas] + [1])
    for l in linhas:
        l["pct_cadastros"] = round(l["cadastros"] * 100 / maximo)
        l["pct_ativos"] = round(l["ativos"] * 100 / maximo)
    return linhas


@staff_member_required
def status(request):
    return render(
        request,
        "site/status.html",
        {
            "saude": _saude(),
            "conteudo": _conteudo(),
            "uso": _uso(),
            "tendencia": _tendencia(),
        },
    )
