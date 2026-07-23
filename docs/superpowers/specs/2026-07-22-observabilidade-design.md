# Observabilidade do Café com Propósito — Design/Spec

## Objetivo
Ter visão de: **está no ar?**, **está quebrando?**, **está lento?** e **quantos usam e como?** —
sem mensalidade (tudo em free tier) e sem depender de build do app pra começar.

## Decisões (aprovadas com o dono)
- **Formato misto:** ferramentas de mercado (free tier) para o trabalho pesado + um
  **painel próprio** de saúde/uso para a visão rápida do dia a dia.
- **Faseado pela restrição de build:** o que é backend sobe pelo Render na hora; o que é
  app espera o próximo build (que hoje é caro — cota do EAS/build local demorado).
- Analytics comportamental do app = **Firebase Analytics** (escolha do dono).
- Erros = **Sentry** (SDK padrão; o DSN pode apontar pra Sentry.io ou GlitchTip — sem lock-in).
- Uptime = **UptimeRobot** (dono já tem conta).

---

## Fase 1 — Backend (sobe já pelo Render, zero build no app)

### 1.1 Painel próprio `/status/` (staff-only)
Página HTML renderizada pelo Django, protegida por `staff_member_required` (mesmo login do
admin — redireciona pro login se anônimo). Sem PII: **apenas agregados**, nunca lista de
e-mails/nomes.

**Bloco Saúde**
- Banco acessível (ok/erro) + **latência** de uma query simples (ms).
- Hora do servidor (UTC e America/Sao_Paulo).
- Migrações aplicadas (total + nome da última) e nº de tabelas.

**Bloco Conteúdo** (útil pra autora)
- Capítulos publicados / total; **capítulos com áudio** (quantos já têm narração).
- Páginas especiais publicadas.

**Bloco Uso** (agregados do próprio banco)
- Usuários totais; **novos** hoje / 7d / 30d (`auth_user.date_joined`).
- **Ativos** hoje / 7d / 30d = usuários distintos com `ReadingProgress.ultimo_acesso >= corte`
  (é `auto_now`, atualiza a cada leitura/progresso — melhor sinal disponível; `last_login` não
  serve porque o JWT não o atualiza por padrão).
- **Premium ativos** (mesma regra do `Profile.premium_ativo`: `premium_manual` válido OU
  `premium_pago_ate >= agora`).
- Capítulos **lidos** (total / 7d) e **ouvidos** (total / 7d) via `ReadingProgress.lido/ouvido`.
- Favoritos e anotações (total / 7d).

**Bloco Tendência (14 dias)**
- Barras em CSS puro (sem biblioteca): cadastros/dia e ativos/dia.

**Implementação:** view em `backend/cafe_backend/status.py` (fica no pacote do projeto porque
cruza três apps: accounts, content e engagement), template
`backend/content/templates/site/status.html` (mesma pasta e estilo autocontido da landing),
rota `path("status/", ...)` em `backend/cafe_backend/urls.py`. Poucas queries agregadas
(volume baixo, sem paginação nem cache).

### 1.2 Sentry no Django (erros + latência do backend)
- Dependência: `sentry-sdk[django]` em `backend/requirements.txt`.
- Em `settings.py`, **inicialização condicional e graciosa** (mesmo padrão do R2/RevenueCat):
  só liga se a env `SENTRY_DSN` existir; sem ela, no-op (nada quebra em dev/CI).
- Configuração: `environment` (production/dev), `traces_sample_rate=0.1` (amostra de
  performance — é o "está lento?"), **`send_default_pii=False`** (privacidade: não manda
  e-mail/IP do usuário; o app lida com dados pessoais de leitores).
- `render.yaml`: `SENTRY_DSN` como `sync: false` (dono cola o DSN no painel).

### 1.3 UptimeRobot (no ar? + alerta + keep-warm)
Configuração do dono (não é código) — documentar em `docs/observabilidade.md`:
- Monitor HTTP(s) em `https://cafe-com-proposito-api.onrender.com/healthz/`, intervalo 5 min,
  alerta por e-mail. Bônus: mantém o Render acordado (mitiga cold start).
- Monitor na landing `https://cafecomproposito.luminaflow.io/`.
- O `/healthz/` já existe e é leve (não toca o banco) — ideal pra isso.

---

## Fase 2 — App (entra no próximo build, junto com a irmã)
- **Firebase Analytics:** telas (`screen_view`) + eventos custom `capitulo_lido`,
  `capitulo_ouvido`, `introducao_concluida`. Requer `google-services.json` (dono gera no
  console do Firebase) + config plugin no `app.json` + build.
- **Sentry React Native:** crashes do app com stack trace, mesmo projeto/DSN do backend
  (ou projeto separado). Requer build.
- Fica registrado aqui; **não** entra nesta implementação.

## Fora de escopo (YAGNI)
Logs centralizados (o Render já mostra), APM detalhado, dashboards customizados de métricas
de infra, status page pública, alertas por WhatsApp.

## Verificação
- **Testes (backend):** `/status/` anônimo → redireciona pro login; com usuário staff → 200 e
  contém os blocos; números conferem com dados de teste (ex.: 1 progresso `lido` hoje aparece
  em "lidos hoje"); a suíte roda **sem** `SENTRY_DSN` (prova o modo gracioso).
- **Manual:** abrir `/status/` logado como admin em produção e conferir que os números batem
  com o que se sabe (149 capítulos, 11 usuários no momento da escrita).
