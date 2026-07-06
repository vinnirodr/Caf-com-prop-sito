# Spec — Login com Google

- **Data:** 2026-07-03
- **Status:** Aprovado no brainstorming; pronto para o plano de implementação
- **Sub-projeto:** Login social (item #2 do roadmap acordado)
- **Coordenação:** esta sessão faz o Login com Google; a sessão-irmã não está nisso
  (confirmado). Base: `origin/main` @ `3519a17`. Branch: `claude/login-google`.

## Contexto e objetivo

Na tela **Entrar**, o botão "Continuar com Google" hoje é placeholder
(`onPress={emBreve}`). O backend só faz auth por e-mail+senha (JWT via
`djangorestframework-simplejwt`). Este sub-projeto torna o **login com Google**
real: seletor nativo no app → verificação do token no backend → sessão JWT, com
**find-or-create do usuário por e-mail** (login social linkado à conta existente).

O `google-services.json`/Firebase já no projeto é de **FCM (push)**, não de login —
são coisas separadas. O Login com Google usa os **OAuth Client IDs** já
provisionados (ver abaixo).

## Config provisionada (Google Cloud)

- **Web client ID:** `560408856695-1hatukjbsikb90at19rj7gqkcmbtgvcb.apps.googleusercontent.com`
  → usado pelo **backend** como audiência na verificação do token **e** pelo app
  como `webClientId` no `GoogleSignin.configure`.
- **Android client ID:** `560408856695-irq0h5abr5trh4oblfsi6f4nj39t7kl6.apps.googleusercontent.com`
  (criado com o SHA-1 da keystore do EAS).
- **Secret do Web client:** guardado pelo Vinícius; entra como env var no backend
  (não versionado).

## Escopo

**Dentro:**
- Backend: endpoint `POST /api/auth/google/` que verifica o ID token do Google e
  devolve o par JWT + usuário (find-or-create por e-mail).
- Frontend: fluxo nativo (`@react-native-google-signin/google-signin`) ligado ao
  botão "Continuar com Google" da tela Entrar, honrando o redirect `proximo`.

**Fora (futuro / outros sub-projetos):**
- iOS OAuth client / build iOS (foco Android agora).
- `dj-rest-auth`/`allauth` (caminho mais pesado — optamos pelo endpoint enxuto).
- Definir senha para contas só-Google (podem usar a recuperação de senha, #3, depois).
- Login com Apple.

## Arquitetura / fluxo

1. App: `GoogleSignin.signIn()` (seletor nativo) → obtém o **idToken**.
2. App → `POST /api/auth/google/` com `{ id_token }`.
3. Backend verifica o idToken (audiência = Web client ID; exige `email_verified`),
   extrai `email`, `given_name`, `family_name`; **acha ou cria** o `User` por e-mail;
   devolve `{access, refresh, user}` (mesma forma de `LoginView`).
4. App salva os tokens (`saveTokens`), seta o `user` no `AuthContext`, registra o
   push token (fluxo existente) e redireciona (honrando `proximo`).

## Backend (`accounts`)

- **`GoogleLoginSerializer`** — valida a presença de `id_token`.
- **`GoogleLoginView`** (`permissions.AllowAny`) em `POST /auth/google/`:
  - Verifica com `google.oauth2.id_token.verify_oauth2_token(id_token, google.auth.transport.requests.Request(), GOOGLE_WEB_CLIENT_ID)`.
  - Rejeita (400) se o token for inválido/expirado ou se `email_verified` não for `True`.
  - **Find-or-create** por `email__iexact` (username=email, sempre minúsculo):
    - existe → entra (link);
    - não existe → cria com `first_name`/`last_name` do Google e
      `set_unusable_password()` (o `Profile` nasce pelo signal existente).
  - Retorna `{**tokens_para(user), "user": UserSerializer(user).data}`.
- **Config:** `GOOGLE_WEB_CLIENT_ID = env("GOOGLE_WEB_CLIENT_ID", "")` em
  `settings.py`; dependência **`google-auth`** no `requirements.txt`.
- **URL:** `path("google/", views.GoogleLoginView.as_view(), name="auth-google")`.

## Frontend (`src/`)

- **Dependência:** `@react-native-google-signin/google-signin` (via `expo install`)
  + o config plugin no `app.json`. Configurado com o **Web client ID**.
- **`src/lib/google.ts`** (novo): `configurarGoogle()` (chama `GoogleSignin.configure({ webClientId })`) e `obterIdTokenGoogle()` — dispara `hasPlayServices()` + `signIn()`, retorna o `idToken` ou `null` (usuário cancelou), e lança erro tratável nos demais casos.
- **`src/api/auth.ts`**: `loginGoogle(idToken): Promise<Usuario>` → `POST /auth/google/` → `saveTokens` → retorna `user` (mesmo padrão de `login`).
- **`src/auth/AuthContext.tsx`**: `entrarComGoogle(): Promise<void>` (igual a `entrar`: chama `loginGoogle`, `setUser`, registra push token). Exposto no `useAuth()`.
- **`src/app/(auth)/entrar.tsx`**: o botão "Continuar com Google" passa de `emBreve`
  para chamar `entrarComGoogle()`, com estados carregando/erro, e redireciona
  honrando `proximo` (mesmo padrão do login por senha já presente na tela).

## Dependência nativa + rebuild

- `@react-native-google-signin/google-signin` é módulo nativo → **exige 1 rebuild**
  (dev e preview) para validar. Config nativa via o plugin do pacote no `app.json`.

## Segurança e casos de borda

- Aceitar **somente e-mails verificados** pelo Google (`email_verified === True`).
  Link por e-mail verificado é seguro e é o padrão da indústria.
- Tratar no app: usuário **cancela** o seletor (sem erro ruidoso), **sem conexão**,
  **Google Play Services ausente/desatualizado** (mensagem amigável).
- Conta só-Google tem senha inutilizável → não loga por senha até definir uma (via
  recuperação de senha, sub-projeto #3). Comportamento esperado.

## Testes

- **Backend:** `accounts/tests.py` — mockar `verify_oauth2_token`:
  - token válido de e-mail novo → cria usuário + retorna 200 com tokens/usuário;
  - token válido de e-mail existente → linka (não duplica) e retorna tokens;
  - token inválido → 400;
  - `email_verified=False` → 400.
- **Frontend:** sem framework de UI (YAGNI). Validação **manual no dev build**: login
  real com uma conta Google que esteja em "Usuários de teste" do consent screen.
  `tsc --noEmit` deve passar (fora o erro pré-existente conhecido em `Field.tsx:38`).

## Critérios de aceite

- Tocar "Continuar com Google" abre o seletor nativo; ao escolher a conta, o usuário
  entra no app (sessão JWT), com a conta certa (nova ou linkada por e-mail).
- Backend rejeita tokens inválidos e e-mails não verificados.
- O redirect `proximo` é honrado após o login.
- Textos em português, tom caloroso; `tsc` passando.
