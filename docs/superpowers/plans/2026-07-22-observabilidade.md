# Observabilidade (Fase 1 — backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar visibilidade de saúde, erros, latência e uso do Café com Propósito sem depender de build do app: painel `/status/` staff-only + Sentry no Django + guia do UptimeRobot.

**Architecture:** Tudo no backend Django, já em produção no Render. O painel é uma view protegida que faz algumas queries agregadas e renderiza um template autocontido. O Sentry entra por inicialização condicional em `settings.py` (liga só com a env `SENTRY_DSN`), no mesmo padrão gracioso do R2/RevenueCat. O UptimeRobot é configuração externa do dono — entra como documentação.

**Tech Stack:** Django 6 + DRF, PostgreSQL (Neon), `sentry-sdk[django]`, template HTML/CSS puro (sem JS/libs).

## Global Constraints
- **Gate:** `cd backend && .venv/bin/python manage.py test` — tudo verde.
- **Privacidade:** o painel mostra **apenas agregados**. Nunca listar e-mail, nome ou qualquer dado de leitor. Sentry com `send_default_pii=False`.
- Textos em **português**, tom da marca. Admin/labels amigáveis (a autora usa).
- **Nunca cravar número de capítulos** — sempre contar do banco.
- Sem bibliotecas de gráfico: barras em CSS puro.
- Campos exatos (já verificados): `Chapter.publicado`, `Chapter.audio`; `SpecialPage.publicado`; `Profile.premium_manual` (Bool), `Profile.premium_manual_ate` (**DateField**), `Profile.premium_pago_ate` (**DateTimeField**); `ReadingProgress.usuario/capitulo/lido/ouvido/ultimo_acesso` (auto_now); `Note.criado_em`; `Favorite.criado_em`.
- `settings.py` tem o helper `env(key, default=None)` (linha ~11); `TIME_ZONE="America/Sao_Paulo"`, `USE_TZ=True`.
- Para criar `Chapter` em testes, **siga o padrão já usado em `backend/content/tests.py`** (não invente campos).

---

### Task 1: Sentry no Django (gracioso)

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/cafe_backend/settings.py` (fim do arquivo)
- Modify: `render.yaml` (bloco `envVars` do web service)
- Test: `backend/cafe_backend/tests.py` (CRIAR)

**Interfaces:**
- Consumes: helper `env()` já existente em `settings.py`.
- Produces: setting `SENTRY_DSN` (str, `""` quando ausente).

- [ ] **Step 1: Write the failing test**

Criar `backend/cafe_backend/tests.py`:

```python
"""Testes do projeto (configuração + painel de status)."""
from django.conf import settings
from django.test import SimpleTestCase


class SentryConfigTests(SimpleTestCase):
    def test_sem_dsn_o_projeto_sobe_e_sentry_fica_desligado(self):
        """Em dev/CI não há SENTRY_DSN: o projeto carrega e o Sentry fica inerte."""
        self.assertEqual(getattr(settings, "SENTRY_DSN", None), "")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && .venv/bin/python manage.py test cafe_backend -v 2`
Expected: FAIL — `AttributeError`/`None != ''` (o setting `SENTRY_DSN` ainda não existe).

- [ ] **Step 3: Add the dependency**

Em `backend/requirements.txt`, adicionar uma linha:

```
sentry-sdk[django]>=2.0,<3
```

Instalar: `cd backend && .venv/bin/pip install -r requirements.txt`

- [ ] **Step 4: Write minimal implementation**

No **fim** de `backend/cafe_backend/settings.py`:

```python
# ── Observabilidade ───────────────────────────────────────────────────────────
# Sentry: erros + amostra de performance. Gracioso — só liga se SENTRY_DSN existir,
# então dev e CI rodam sem nada configurado.
SENTRY_DSN = env("SENTRY_DSN", "") or ""
if SENTRY_DSN:
    import sentry_sdk

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment="development" if DEBUG else "production",
        # 10% das requisições viram trace de performance (o "está lento?").
        traces_sample_rate=0.1,
        # Privacidade: não enviar e-mail/IP dos leitores para o Sentry.
        send_default_pii=False,
    )
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && .venv/bin/python manage.py test cafe_backend -v 2`
Expected: PASS (1 teste).

- [ ] **Step 6: Expor a env no Render**

Em `render.yaml`, dentro de `envVars` do web service (perto de `CRON_SECRET`), adicionar:

```yaml
      # Observabilidade: cole o DSN do projeto Sentry aqui no painel do Render.
      # Sem ele, o Sentry fica desligado (a app funciona igual).
      - key: SENTRY_DSN
        sync: false
```

- [ ] **Step 7: Suíte completa + commit**

Run: `cd backend && .venv/bin/python manage.py test`
Expected: tudo verde.

```bash
git add backend/requirements.txt backend/cafe_backend/settings.py backend/cafe_backend/tests.py render.yaml
git commit -m "feat(observabilidade): Sentry no Django (gracioso, sem PII)"
```

---

### Task 2: Painel `/status/` — rota, acesso e blocos Saúde + Conteúdo

**Files:**
- Create: `backend/cafe_backend/status.py`
- Create: `backend/content/templates/site/status.html`
- Modify: `backend/cafe_backend/urls.py`
- Test: `backend/cafe_backend/tests.py` (adicionar classe)

**Interfaces:**
- Consumes: `Chapter`, `SpecialPage` de `content.models`.
- Produces: view `status(request)` (nome de rota `status`, path `/status/`), e o contexto do template com as chaves `saude` e `conteudo` (a Task 3 adiciona `uso` e `tendencia`).

- [ ] **Step 1: Write the failing test**

Adicionar em `backend/cafe_backend/tests.py`:

```python
from django.contrib.auth.models import User
from django.test import TestCase


class StatusAcessoTests(TestCase):
    def test_anonimo_e_mandado_para_o_login(self):
        resp = self.client.get("/status/")
        self.assertEqual(resp.status_code, 302)
        self.assertIn("/admin/login/", resp["Location"])

    def test_usuario_comum_nao_acessa(self):
        User.objects.create_user(username="leitor@x.com", email="leitor@x.com", password="s3nha123")
        self.client.login(username="leitor@x.com", password="s3nha123")
        resp = self.client.get("/status/")
        self.assertEqual(resp.status_code, 302)

    def test_staff_ve_saude_e_conteudo(self):
        User.objects.create_user(
            username="chefe@x.com", email="chefe@x.com", password="s3nha123", is_staff=True
        )
        self.client.login(username="chefe@x.com", password="s3nha123")
        resp = self.client.get("/status/")
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.context["saude"]["banco_ok"])
        self.assertIn("capitulos_publicados", resp.context["conteudo"])
        self.assertContains(resp, "Saúde")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && .venv/bin/python manage.py test cafe_backend.tests.StatusAcessoTests -v 2`
Expected: FAIL — 404 (a rota `/status/` não existe).

- [ ] **Step 3: Write the view**

Criar `backend/cafe_backend/status.py`:

```python
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
```

- [ ] **Step 4: Register the route**

Em `backend/cafe_backend/urls.py`, adicionar o import junto dos outros:

```python
from cafe_backend.status import status as status_view
```

E, dentro de `urlpatterns` (logo depois de `healthz`):

```python
    # Painel de status do serviço (staff-only).
    path("status/", status_view, name="status"),
```

- [ ] **Step 5: Write the template**

Criar `backend/content/templates/site/status.html`:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>Status · Café com Propósito</title>
  <style>
    :root { --cafe:#5B4636; --escuro:#3A2D22; --dourado:#C8924A; --bg:#FAF7F2;
            --texto:#2A2422; --suave:#6E625A; --linha:#EAE0D4; --ok:#4B7F52; --erro:#B3453A; }
    * { box-sizing: border-box; margin: 0; }
    body { background: var(--bg); color: var(--texto); line-height: 1.5;
           font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .wrap { max-width: 940px; margin: 0 auto; padding: 28px 20px 64px; }
    h1 { font-size: 24px; color: var(--escuro); }
    .sub { font-size: 13px; color: var(--suave); margin-top: 4px; }
    h2 { font-size: 13px; letter-spacing: .12em; text-transform: uppercase;
         color: var(--dourado); margin: 32px 0 12px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
    .card { background: #fff; border: 1px solid var(--linha); border-radius: 12px; padding: 14px 16px; }
    .rotulo { font-size: 12px; color: var(--suave); }
    .valor { font-size: 24px; color: var(--escuro); margin-top: 2px; }
    .valor small { font-size: 13px; color: var(--suave); }
    .pill { display: inline-block; font-size: 12px; font-weight: 600; padding: 3px 10px;
            border-radius: 999px; color: #fff; }
    .ok { background: var(--ok); } .erro { background: var(--erro); }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    td { padding: 5px 0; font-size: 12px; color: var(--suave); vertical-align: middle; }
    td.dia { width: 52px; } td.num { width: 34px; text-align: right; color: var(--escuro); }
    .barra { background: var(--linha); border-radius: 3px; height: 9px; }
    .barra i { display: block; height: 9px; border-radius: 3px; background: var(--dourado); }
    .barra.alt i { background: var(--cafe); }
    .legenda { font-size: 12px; color: var(--suave); margin-top: 10px; }
    .nota { font-size: 12px; color: var(--suave); margin-top: 28px;
            border-top: 1px solid var(--linha); padding-top: 12px; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Status · Café com Propósito</h1>
    <div class="sub">{{ saude.hora_local }} (Brasília) · {{ saude.hora_utc }}</div>

    <h2>Saúde</h2>
    <div class="grid">
      <div class="card">
        <div class="rotulo">Banco de dados</div>
        <div class="valor">
          {% if saude.banco_ok %}<span class="pill ok">no ar</span>
          {% else %}<span class="pill erro">falha</span>{% endif %}
        </div>
      </div>
      <div class="card"><div class="rotulo">Latência da consulta</div>
        <div class="valor">{{ saude.latencia_ms }}<small> ms</small></div></div>
      <div class="card"><div class="rotulo">Migrações aplicadas</div>
        <div class="valor">{{ saude.migracoes_total }}</div></div>
      <div class="card"><div class="rotulo">Tabelas</div>
        <div class="valor">{{ saude.tabelas }}</div></div>
    </div>
    <div class="legenda">Última migração: {{ saude.ultima_migracao }}</div>

    <h2>Conteúdo</h2>
    <div class="grid">
      <div class="card"><div class="rotulo">Capítulos publicados</div>
        <div class="valor">{{ conteudo.capitulos_publicados }}<small> de {{ conteudo.capitulos_total }}</small></div></div>
      <div class="card"><div class="rotulo">Com narração</div>
        <div class="valor">{{ conteudo.capitulos_com_audio }}</div></div>
      <div class="card"><div class="rotulo">Páginas da introdução</div>
        <div class="valor">{{ conteudo.paginas_publicadas }}</div></div>
    </div>

    {% include "site/_status_uso.html" %}

    <div class="nota">Somente números agregados — nenhum dado pessoal de leitor é exibido aqui.</div>
  </div>
</body>
</html>
```

Criar também `backend/content/templates/site/_status_uso.html` **vazio por enquanto** (a Task 3 preenche); assim o `include` não quebra:

```html
{# Preenchido na Task 3 (blocos Uso e Tendência). #}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && .venv/bin/python manage.py test cafe_backend -v 2`
Expected: PASS (4 testes: 1 do Sentry + 3 de acesso).

- [ ] **Step 7: Commit**

```bash
git add backend/cafe_backend/status.py backend/cafe_backend/urls.py backend/cafe_backend/tests.py backend/content/templates/site/status.html backend/content/templates/site/_status_uso.html
git commit -m "feat(observabilidade): painel /status/ com saúde e conteúdo (staff-only)"
```

---

### Task 3: Painel `/status/` — blocos Uso e Tendência (14 dias)

**Files:**
- Modify: `backend/cafe_backend/status.py`
- Modify: `backend/content/templates/site/_status_uso.html`
- Test: `backend/cafe_backend/tests.py` (adicionar classe)

**Interfaces:**
- Consumes: view `status()` e o contexto criados na Task 2.
- Produces: chaves de contexto `uso` (dict) e `tendencia` (lista de 14 dicts com `dia`, `cadastros`, `ativos`, `pct_cadastros`, `pct_ativos`).

- [ ] **Step 1: Write the failing test**

Adicionar em `backend/cafe_backend/tests.py`:

```python
from content.models import Chapter
from engagement.models import Favorite, Note, ReadingProgress


class StatusUsoTests(TestCase):
    def setUp(self):
        User.objects.create_user(
            username="chefe2@x.com", email="chefe2@x.com", password="s3nha123", is_staff=True
        )
        self.client.login(username="chefe2@x.com", password="s3nha123")
        self.leitor = User.objects.create_user(
            username="leitor2@x.com", email="leitor2@x.com", password="s3nha123"
        )
        # Todos os campos obrigatórios do Chapter (os demais têm blank/default).
        self.capitulo = Chapter.objects.create(
            numero=1,
            titulo="Capítulo de teste",
            versiculo_texto="Versículo de teste.",
            reflexao="Reflexão de teste.",
            oracao="Oração de teste.",
            aplicacao="Aplicação de teste.",
            frase_guardar="Frase de teste.",
        )

    def test_uso_conta_ativos_lidos_e_favoritos(self):
        ReadingProgress.objects.create(usuario=self.leitor, capitulo=self.capitulo, lido=True)
        Favorite.objects.create(usuario=self.leitor, capitulo=self.capitulo)
        Note.objects.create(usuario=self.leitor, capitulo=self.capitulo, texto="oi")

        resp = self.client.get("/status/")
        uso = resp.context["uso"]
        self.assertEqual(uso["ativos_hoje"], 1)
        self.assertEqual(uso["lidos_total"], 1)
        self.assertEqual(uso["ouvidos_total"], 0)
        self.assertEqual(uso["favoritos_total"], 1)
        self.assertEqual(uso["anotacoes_total"], 1)
        self.assertEqual(uso["premium_ativos"], 0)
        self.assertEqual(uso["usuarios_total"], 2)

    def test_tendencia_tem_14_dias(self):
        resp = self.client.get("/status/")
        tendencia = resp.context["tendencia"]
        self.assertEqual(len(tendencia), 14)
        self.assertIn("pct_ativos", tendencia[0])
```

Campos já verificados nos models: `Note(usuario, capitulo, texto)`, `Favorite(usuario, capitulo)`,
`ReadingProgress(usuario, capitulo, lido, ouvido)`. Não invente campos novos.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && .venv/bin/python manage.py test cafe_backend.tests.StatusUsoTests -v 2`
Expected: FAIL — `KeyError: 'uso'` (o contexto ainda não tem os blocos novos).

- [ ] **Step 3: Write the implementation**

Em `backend/cafe_backend/status.py`, trocar os imports do topo por:

```python
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
```

Adicionar as duas funções (antes da view):

```python
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
```

E trocar a view para incluir as chaves novas:

```python
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
```

- [ ] **Step 4: Write the template partial**

Substituir o conteúdo de `backend/content/templates/site/_status_uso.html` por:

```html
<h2>Uso</h2>
<div class="grid">
  <div class="card"><div class="rotulo">Usuários</div>
    <div class="valor">{{ uso.usuarios_total }}</div></div>
  <div class="card"><div class="rotulo">Novos (hoje / 7d / 30d)</div>
    <div class="valor">{{ uso.novos_hoje }}<small> / {{ uso.novos_7d }} / {{ uso.novos_30d }}</small></div></div>
  <div class="card"><div class="rotulo">Ativos (hoje / 7d / 30d)</div>
    <div class="valor">{{ uso.ativos_hoje }}<small> / {{ uso.ativos_7d }} / {{ uso.ativos_30d }}</small></div></div>
  <div class="card"><div class="rotulo">Premium ativos</div>
    <div class="valor">{{ uso.premium_ativos }}</div></div>
  <div class="card"><div class="rotulo">Capítulos lidos</div>
    <div class="valor">{{ uso.lidos_total }}<small> · {{ uso.lidos_7d }} em 7d</small></div></div>
  <div class="card"><div class="rotulo">Capítulos ouvidos</div>
    <div class="valor">{{ uso.ouvidos_total }}<small> · {{ uso.ouvidos_7d }} em 7d</small></div></div>
  <div class="card"><div class="rotulo">Favoritos</div>
    <div class="valor">{{ uso.favoritos_total }}<small> · {{ uso.favoritos_7d }} em 7d</small></div></div>
  <div class="card"><div class="rotulo">Anotações</div>
    <div class="valor">{{ uso.anotacoes_total }}<small> · {{ uso.anotacoes_7d }} em 7d</small></div></div>
</div>

<h2>Últimos 14 dias</h2>
<table>
  {% for linha in tendencia %}
  <tr>
    <td class="dia">{{ linha.dia }}</td>
    <td><div class="barra"><i style="width: {{ linha.pct_cadastros }}%"></i></div></td>
    <td class="num">{{ linha.cadastros }}</td>
    <td><div class="barra alt"><i style="width: {{ linha.pct_ativos }}%"></i></div></td>
    <td class="num">{{ linha.ativos }}</td>
  </tr>
  {% endfor %}
</table>
<div class="legenda">Barra dourada = novos cadastros · barra café = usuários ativos no dia.</div>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && .venv/bin/python manage.py test cafe_backend -v 2`
Expected: PASS (6 testes).

- [ ] **Step 6: Suíte completa + commit**

Run: `cd backend && .venv/bin/python manage.py test`
Expected: tudo verde.

```bash
git add backend/cafe_backend/status.py backend/cafe_backend/tests.py backend/content/templates/site/_status_uso.html
git commit -m "feat(observabilidade): blocos de uso e tendência de 14 dias no /status/"
```

---

### Task 4: Documentação (UptimeRobot + Sentry + como usar) e fechamento

**Files:**
- Create: `docs/observabilidade.md`
- Modify: `COORDENACAO.md`

**Interfaces:**
- Consumes: tudo das Tasks 1-3.
- Produces: documento de operação para o dono.

- [ ] **Step 1: Escrever `docs/observabilidade.md`**

```markdown
# Observabilidade — Café com Propósito

Três camadas, todas em plano gratuito.

## 1. Painel próprio — `/status/`
`https://cafe-com-proposito-api.onrender.com/status/` (ou pelo domínio da landing).
Exige login **staff** (o mesmo do `/admin/`). Mostra:
- **Saúde:** banco no ar, latência da consulta, migrações aplicadas, tabelas, hora do servidor.
- **Conteúdo:** capítulos publicados, quantos têm narração, páginas da introdução.
- **Uso:** usuários, novos e ativos (hoje/7d/30d), premium ativos, capítulos lidos/ouvidos,
  favoritos, anotações — e barras dos últimos 14 dias.
- Só agregados: nenhum dado pessoal de leitor aparece.

"Ativo" = usuário com progresso de leitura no período (o login por JWT não atualiza o
`last_login` do Django, então esse campo não serve de métrica).

## 2. Sentry — erros e latência do backend
1. Em sentry.io, crie um projeto **Django** e copie o **DSN**.
2. Render → serviço `cafe-com-proposito-api` → **Environment** → adicione
   `SENTRY_DSN` com esse valor → salvar (redeploy automático).
3. Pronto: exceções do backend chegam com stack trace, e 10% das requisições viram
   trace de performance (para achar lentidão).
- Sem a variável, o Sentry fica **desligado** e a aplicação funciona igual.
- Privacidade: enviamos os erros **sem PII** (`send_default_pii=False`).
- O plano gratuito ("Developer") vale para sempre; contas novas começam num teste de 14
  dias do plano pago e depois caem no gratuito.
- Sem lock-in: o DSN pode apontar para um GlitchTip (compatível com o SDK do Sentry).

## 3. UptimeRobot — está no ar? (e alerta)
1. Em uptimerobot.com → **Add New Monitor**.
2. Tipo **HTTP(s)**, URL `https://cafe-com-proposito-api.onrender.com/healthz/`,
   intervalo **5 minutos**, alerta por e-mail.
3. Repita para a landing: `https://cafecomproposito.luminaflow.io/`.
- Bônus: o ping de 5 em 5 minutos mantém o Render acordado, reduzindo o cold start.
- O `/healthz/` é leve de propósito (não consulta o banco).

## Fase 2 (quando sair o próximo build do app)
- **Firebase Analytics:** telas e eventos (`capitulo_lido`, `capitulo_ouvido`).
- **Sentry React Native:** crashes do app.
Ambos exigem build novo — combinar com quem for gerar (ver `docs/build-local-guia.md`).
```

- [ ] **Step 2: Atualizar a coordenação**

No topo do Log em `COORDENACAO.md` (logo após a linha `## Log (mais recente no topo)`):

```markdown
### 2026-07-22 · 💻 LOCAL · Observabilidade (Fase 1 — backend)
- **Painel `/status/`** (staff-only): saúde (banco/latência/migrações), conteúdo (capítulos
  publicados e com narração) e uso (novos/ativos/lidos/ouvidos/favoritos/anotações + 14 dias).
  Só agregados, sem PII. Arquivos: `cafe_backend/status.py`, `cafe_backend/urls.py`,
  `content/templates/site/status.html` + `_status_uso.html`.
- **Sentry no Django** gracioso (liga com a env `SENTRY_DSN`; sem ela, no-op),
  `send_default_pii=False`, `traces_sample_rate=0.1`. `render.yaml` ganhou `SENTRY_DSN` (sync:false).
- **Guia:** `docs/observabilidade.md` (painel + Sentry + UptimeRobot; e o que falta na Fase 2).
- ☁️ **Fase 2 é do app e precisa de build:** Firebase Analytics + Sentry React Native.
```

- [ ] **Step 3: Gate final**

Run: `cd backend && .venv/bin/python manage.py test`
Expected: tudo verde.

- [ ] **Step 4: Commit, push e PR**

```bash
git add docs/observabilidade.md COORDENACAO.md
git commit -m "docs(observabilidade): guia de operação (painel, Sentry, UptimeRobot)"
git push -u origin claude/observabilidade
gh pr create --base main --title "feat(observabilidade): painel /status/ + Sentry no Django" --body "Fase 1 da observabilidade (só backend, sem build do app): painel /status/ staff-only com saude/conteudo/uso e tendencia de 14 dias (so agregados, sem PII); Sentry no Django gracioso (liga com SENTRY_DSN); guia de operacao em docs/observabilidade.md (inclui UptimeRobot). Fase 2 (Firebase Analytics + Sentry RN) fica para o proximo build do app."
```

NÃO mergear — deixar para o dono revisar.

---

## Notas de execução
- Branch: `claude/observabilidade` (já criada, com a spec commitada).
- Spec: `docs/superpowers/specs/2026-07-22-observabilidade-design.md`.
- Depois do merge, o Render sobe sozinho; o painel fica em `/status/` (login do admin).
