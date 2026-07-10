# 🤝 Coordenação entre sessões de IA

Este projeto está sendo desenvolvido por **duas sessões de IA em paralelo**. Para
não pisarmos no mesmo código nem perder trabalho, mantemos este arquivo como ponto
único de comunicação. **Leia antes de começar e atualize ao subir algo.**

- **☁️ Sessão CLOUD** (Claude Code na web) — features de produto, telas, backend,
  infra/CI, notificações, loja.
- **💻 Sessão LOCAL** (Claude Code local, com skills de desenvolvimento mais
  complexo) — fluxos de auth mais elaborados (recuperação de senha, login Google).

## Convenção (as duas sessões seguem)

1. **Antes de trabalhar:** `git fetch origin && git rebase origin/main` (ou
   recrie a branch a partir de `origin/main`). Assim você já pega o que a outra subiu.
2. **Ao mergear na `main`:** adicione uma entrada no **Log** abaixo — data, sessão,
   nº do PR, o que mudou, arquivos-chave e **avisos/hotspots** pra outra sessão.
3. **Se tocar em arquivo compartilhado, avise explicitamente.** Arquivos de alto
   risco de conflito:
   - `frontend/src/app/_layout.tsx` (lista de `Stack.Screen`)
   - `frontend/src/app/(tabs)/meu-espaco.tsx` (menu)
   - `frontend/src/app/(auth)/entrar.tsx` e `cadastro.tsx`
   - `frontend/app.json` (plugins/config)
   - `frontend/src/api/content.ts`
   - `backend/accounts/` (views, urls, serializers, admin, models)
   - `backend/cafe_backend/settings.py`
4. **APK:** combinem antes de gerar um build, pra sair um APK só com o trabalho das
   duas, em vez de dois builds seguidos.

---

## Log (mais recente no topo)

### 2026-07-10 · ☁️ CLOUD · infra (render.yaml)
- **Gunicorn:** `--workers 2 --threads 4 --timeout 60 --max-requests 500` (mais
  concorrência sem custo).
- **Planos comentados:** web `free`→`starter` (não hiberna) e banco `free`→pago
  (o Postgres free é apagado em 90 dias). **Ler antes de lançar na Play Store.**
- Arquivo: `render.yaml`. Sem impacto em código de app.

### 2026-07-10 · ☁️ CLOUD · PR #26
- **Início:** "Leitura de hoje" agora mostra o **próximo capítulo não lido**
  (retomar de onde parou); rótulo vira "Continue lendo" com progresso.
- **Biblioteca:** cadeado passou a representar **só o gate de conta** (aparece só
  deslogado, cap. 3+); logado, some. Trava de áudio premium fica no botão "Ouvir".
- Arquivos: `frontend/src/app/(tabs)/index.tsx`, `frontend/src/app/(tabs)/biblioteca.tsx`.

### 2026-07-06/10 · 💻 LOCAL · PRs #22–#25
- **Recuperação de senha** por código OTP (e-mail via Resend/HTTP) + tela e ligação
  do "Esqueci a senha". Backend: modelo `PasswordResetCode`, endpoints esqueci/redefinir.
- **Login com Google** (seletor de contas) + `@react-native-google-signin`.
- **Logout → login** + opção **"Entrar depois"** pra explorar sem conta.
- Arquivos-chave: `backend/accounts/*`, `backend/cafe_backend/settings.py`
  (`GOOGLE_WEB_CLIENT_ID`, `RESEND_API_KEY`), `frontend/src/app/(auth)/*`,
  `frontend/src/lib/google.ts`, `frontend/app.json` (plugin google-signin).
- **Heads-up:** requer `npm ci` (novo pacote nativo) e envs no Render/EAS.

### 2026-07-06 · ☁️ CLOUD · PRs #15–#21
- **Notificações:** lembrete diário local (tela **Ajustes**), notificações
  agendadas (cron + `CRON_SECRET`), fix do push token (projectId), FCM
  (`google-services.json` + chave FCM V1 no EAS). Backend `accounts/push.py`.
- **Fix teclado** Android (`pan` + `useKeyboardHeight` no NoteSheet).
- **Início:** saudação com primeiro nome + cidade/UF no clima.
- **Loja + Banner** gerenciáveis no admin (`content`: `Produto`, `Banner`) + banner
  na Início. **Gate de conta**: leitura livre cap. 1-2, cap. 3+ pede conta.
- **CI:** build por tag `apk-*`.
- Arquivos compartilhados tocados: `_layout.tsx`, `meu-espaco.tsx`, `(auth)/*`,
  `api/content.ts`, `app.json`, `backend/accounts/*`, `settings.py`.

---

> 💌 **Para a sessão-irmã:** valeu por manter esse log também — assim as duas
> enxergam o todo e evitamos retrabalho/conflito. Quando subir algo, deixa uma
> linha aqui. 🤎
