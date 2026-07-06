# Login com Google — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir login social com Google no app — seletor nativo obtém o ID token, o backend verifica e emite JWT (find-or-create por e-mail).

**Architecture:** App usa `@react-native-google-signin/google-signin` para obter o `idToken` → `POST /api/auth/google/` → o backend verifica com `google-auth` (audiência = Web client ID, exige `email_verified`) e faz find-or-create do `User` por e-mail, devolvendo `{access, refresh, user}` (mesma forma de `LoginView`).

**Tech Stack:** Django/DRF + `google-auth` + simplejwt (backend); React Native/Expo/TypeScript + `@react-native-google-signin/google-signin` (frontend).

## Global Constraints

- Base: `origin/main` @ `3519a17`. Branch: `claude/login-google` (nome distinto — há sessão-irmã ativa; manter mudanças cirúrgicas).
- **Web client ID** (audiência no backend E `webClientId` no app): `560408856695-1hatukjbsikb90at19rj7gqkcmbtgvcb.apps.googleusercontent.com`.
- Backend: aceitar SÓ e-mails com `email_verified === True`; find-or-create por `email__iexact`; `username = email` (minúsculo); novos usuários Google recebem `set_unusable_password()`; reusar `tokens_para` e `UserSerializer`.
- Resposta do endpoint = `{**tokens_para(user), "user": UserSerializer(user).data}` (idêntica a `LoginView`).
- Backend roda testes com o venv: `cd backend && .venv/bin/python manage.py test accounts -v 2`.
- Frontend: `webClientId` = o Web client ID acima; honrar o redirect `proximo`; textos em português, tom caloroso; `tsc --noEmit` deve passar (fora o erro pré-existente conhecido em `Field.tsx:38`). Usar Node 20 pra tooling (`nvm use v20.20.2`).
- Dependência nativa nova → exige rebuild (dev/preview) pra validação manual no fim.

---

### Task 1: Backend — Endpoint `POST /auth/google/` (verifica ID token + find-or-create)

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/cafe_backend/settings.py`
- Create: `backend/accounts/google.py`
- Modify: `backend/accounts/serializers.py`
- Modify: `backend/accounts/views.py`
- Modify: `backend/accounts/urls.py`
- Test: `backend/accounts/tests.py`

**Interfaces:**
- Produces: `POST /api/auth/google/` body `{id_token}` → 200 `{access, refresh, user}` (novo ou linkado); 400 se token inválido ou e-mail não verificado.

- [ ] **Step 1: Adicionar a dependência e instalá-la no venv**

Em `backend/requirements.txt`, adicionar ao final:

```
google-auth>=2.28
```

Instalar no venv (necessário para os testes importarem a lib):

Run: `cd "/Users/viniciusrodrigues/Documents/Vinicius/Cafe com proposito/backend" && .venv/bin/python -m pip install "google-auth>=2.28"`
Expected: instala `google-auth` (e dependências) sem erro.

- [ ] **Step 2: Adicionar a config no settings**

Em `backend/cafe_backend/settings.py`, logo após a linha `CRON_SECRET = env("CRON_SECRET", "")`, adicionar:

```python
GOOGLE_WEB_CLIENT_ID = env("GOOGLE_WEB_CLIENT_ID", "")
```

- [ ] **Step 3: Escrever o teste que falha**

Adicionar em `backend/accounts/tests.py` (usa o helper `criar_usuario` já existente no arquivo):

```python
from unittest.mock import patch


class GoogleLoginTests(APITestCase):
    URL = "/api/auth/google/"

    def _payload(self, **over):
        base = {
            "email": "ana.google@gmail.com",
            "email_verified": True,
            "given_name": "Ana",
            "family_name": "Souza",
        }
        base.update(over)
        return base

    @patch("accounts.google.google_id_token.verify_oauth2_token")
    def test_cria_novo_usuario(self, mock_verify):
        mock_verify.return_value = self._payload()
        resp = self.client.post(self.URL, {"id_token": "fake"}, format="json")
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertIn("access", resp.json())
        self.assertEqual(resp.json()["user"]["email"], "ana.google@gmail.com")
        self.assertTrue(User.objects.filter(email__iexact="ana.google@gmail.com").exists())

    @patch("accounts.google.google_id_token.verify_oauth2_token")
    def test_linka_usuario_existente_sem_duplicar(self, mock_verify):
        existente = criar_usuario(email="ana.google@gmail.com")
        mock_verify.return_value = self._payload()
        resp = self.client.post(self.URL, {"id_token": "fake"}, format="json")
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual(resp.json()["user"]["id"], existente.id)
        self.assertEqual(User.objects.filter(email__iexact="ana.google@gmail.com").count(), 1)

    @patch("accounts.google.google_id_token.verify_oauth2_token")
    def test_rejeita_token_invalido(self, mock_verify):
        mock_verify.side_effect = ValueError("token inválido")
        resp = self.client.post(self.URL, {"id_token": "fake"}, format="json")
        self.assertEqual(resp.status_code, 400)

    @patch("accounts.google.google_id_token.verify_oauth2_token")
    def test_rejeita_email_nao_verificado(self, mock_verify):
        mock_verify.return_value = self._payload(email_verified=False)
        resp = self.client.post(self.URL, {"id_token": "fake"}, format="json")
        self.assertEqual(resp.status_code, 400)
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `cd "/Users/viniciusrodrigues/Documents/Vinicius/Cafe com proposito/backend" && .venv/bin/python manage.py test accounts.tests.GoogleLoginTests -v 2`
Expected: FAIL — `ModuleNotFoundError: accounts.google` (ou 404 na rota).

- [ ] **Step 5: Criar o módulo `accounts/google.py`**

Criar `backend/accounts/google.py`:

```python
"""Login com Google: verificação do ID token e find-or-create do usuário.

Isolado para facilitar teste (os testes mockam `google_id_token.verify_oauth2_token`).
"""
from django.contrib.auth import get_user_model
import google.auth.transport.requests
from google.oauth2 import id_token as google_id_token

User = get_user_model()


class GoogleTokenInvalido(Exception):
    """Token do Google ausente, inválido, expirado ou com e-mail não verificado."""


def verificar_id_token(token, client_id):
    """Verifica o ID token do Google e devolve o payload. Lança GoogleTokenInvalido."""
    try:
        info = google_id_token.verify_oauth2_token(
            token, google.auth.transport.requests.Request(), client_id
        )
    except Exception as e:  # ValueError, GoogleAuthError, etc.
        raise GoogleTokenInvalido("Token do Google inválido.") from e
    if not info.get("email_verified"):
        raise GoogleTokenInvalido("O e-mail desta conta Google não está verificado.")
    if not info.get("email"):
        raise GoogleTokenInvalido("O Google não devolveu um e-mail.")
    return info


def obter_ou_criar_usuario(info):
    """Find-or-create por e-mail (username=email). Novos usuários Google não têm senha usável."""
    email = info["email"].strip().lower()
    user = User.objects.filter(email__iexact=email).order_by("id").first()
    if user:
        return user
    user = User(
        username=email,
        email=email,
        first_name=(info.get("given_name") or "").strip(),
        last_name=(info.get("family_name") or "").strip(),
    )
    user.set_unusable_password()
    user.save()  # o signal cria o Profile
    return user
```

- [ ] **Step 6: Adicionar o serializer**

Em `backend/accounts/serializers.py`, adicionar (após `UserSerializer`, antes de `RegisterSerializer`):

```python
class GoogleLoginSerializer(serializers.Serializer):
    id_token = serializers.CharField()
```

- [ ] **Step 7: Adicionar a view**

Em `backend/accounts/views.py`: incluir `GoogleLoginSerializer` no import de `.serializers`, importar o módulo google, e adicionar a view (após `LoginView`):

```python
from . import google as google_login
```

```python
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
```

> Nota: `settings` já está importado no topo de `views.py` (`from django.conf import settings`).

- [ ] **Step 8: Registrar a rota**

Em `backend/accounts/urls.py`, adicionar dentro de `urlpatterns`:

```python
    path("google/", views.GoogleLoginView.as_view(), name="auth-google"),
```

- [ ] **Step 9: Rodar os testes e ver passar**

Run: `cd "/Users/viniciusrodrigues/Documents/Vinicius/Cafe com proposito/backend" && .venv/bin/python manage.py test accounts.tests.GoogleLoginTests -v 2`
Expected: PASS (4 testes).

Depois, a suíte inteira (não pode regredir):
Run: `.venv/bin/python manage.py test accounts -v 2`
Expected: PASS (todos).

- [ ] **Step 10: Commit**

```bash
git add backend/requirements.txt backend/cafe_backend/settings.py backend/accounts/google.py backend/accounts/serializers.py backend/accounts/views.py backend/accounts/urls.py backend/accounts/tests.py
git commit -m "feat(accounts): POST /auth/google/ — verifica ID token e find-or-create por e-mail

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Frontend — Biblioteca nativa + `src/lib/google.ts`

**Files:**
- Modify: `frontend/package.json` (via `expo install`)
- Modify: `frontend/app.json` (config plugin)
- Create: `frontend/src/lib/google.ts`

**Interfaces:**
- Produces: `obterIdTokenGoogle(): Promise<string | null>` (null = usuário cancelou) e `configurarGoogle(): void`.

- [ ] **Step 1: Instalar a biblioteca nativa**

Run: `cd "/Users/viniciusrodrigues/Documents/Vinicius/Cafe com proposito/frontend" && nvm use v20.20.2 && npx expo install @react-native-google-signin/google-signin`
Expected: adiciona a dependência ao `package.json` na versão compatível com o SDK 56.

- [ ] **Step 2: Adicionar o config plugin no app.json**

Em `frontend/app.json`, dentro do array `"plugins"`, adicionar a string:

```json
"@react-native-google-signin/google-signin"
```

(Adicionar como um item do array, junto dos outros plugins. Não precisa de opções para Android.)

- [ ] **Step 3: Criar `src/lib/google.ts`**

Criar `frontend/src/lib/google.ts`:

```typescript
/**
 * Login com Google (nativo). Usa o Web client ID (público) como `webClientId`
 * para obter um idToken com a audiência que o backend espera verificar.
 */
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

// Client IDs do Google são públicos (não são segredo).
const WEB_CLIENT_ID = '560408856695-1hatukjbsikb90at19rj7gqkcmbtgvcb.apps.googleusercontent.com';

let configurado = false;

export function configurarGoogle(): void {
  if (configurado) return;
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
  configurado = true;
}

/**
 * Abre o seletor nativo do Google e devolve o idToken.
 * Retorna null se o usuário cancelar. Lança nos demais erros (sem rede, etc.).
 */
export async function obterIdTokenGoogle(): Promise<string | null> {
  configurarGoogle();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  try {
    const resp = await GoogleSignin.signIn();
    // A forma do retorno varia por versão do pacote: v13+ usa { data: { idToken } };
    // versões antigas expõem { idToken } direto. Cobrimos ambas.
    const idToken =
      (resp as { data?: { idToken?: string | null } })?.data?.idToken ??
      (resp as { idToken?: string | null })?.idToken ??
      null;
    return idToken ?? null;
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === statusCodes.SIGN_IN_CANCELLED) return null;
    throw e;
  }
}
```

> Nota para o implementador: confirme a forma do retorno de `GoogleSignin.signIn()` na versão que o `expo install` instalou (README do pacote). O código acima já cobre as duas formas conhecidas; se a versão instalada usar outra, ajuste a extração do `idToken` e reporte.

- [ ] **Step 4: Type-check**

Run: `cd "/Users/viniciusrodrigues/Documents/Vinicius/Cafe com proposito/frontend" && nvm use v20.20.2 && ./node_modules/.bin/tsc --noEmit -p tsconfig.json`
Expected: só o erro pré-existente conhecido em `src/components/Field.tsx:38`; nenhum novo.

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/app.json frontend/src/lib/google.ts
git commit -m "feat(app): integra @react-native-google-signin + lib google.ts

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Frontend — `loginGoogle` (API) + `entrarComGoogle` (AuthContext)

**Files:**
- Modify: `frontend/src/api/auth.ts`
- Modify: `frontend/src/auth/AuthContext.tsx`

**Interfaces:**
- Consumes: `obterIdTokenGoogle` (Task 2), `postJson`/`saveTokens`/`Usuario`/`AuthResposta` (já em `auth.ts`).
- Produces: `loginGoogle(idToken: string): Promise<Usuario>`; `useAuth().entrarComGoogle(): Promise<boolean>` (true = logou, false = cancelou).

- [ ] **Step 1: Adicionar `loginGoogle` em `api/auth.ts`**

Em `frontend/src/api/auth.ts`, após a função `registrar` (por volta da linha 83), adicionar:

```typescript
export async function loginGoogle(idToken: string): Promise<Usuario> {
  const data = await postJson<AuthResposta>('/auth/google/', { id_token: idToken });
  await saveTokens({ access: data.access, refresh: data.refresh });
  return data.user;
}
```

- [ ] **Step 2: Adicionar `entrarComGoogle` no `AuthContext`**

Em `frontend/src/auth/AuthContext.tsx`:

1. No import de `@/api/auth`, adicionar `loginGoogle`:

```typescript
import {
  login as apiLogin,
  registrar as apiRegistrar,
  buscarEu,
  sair as apiSair,
  excluirConta,
  loginGoogle,
  type Usuario,
  type RegistroPayload,
} from '@/api/auth';
```

2. Adicionar o import do lib google:

```typescript
import { obterIdTokenGoogle } from '@/lib/google';
```

3. No type `AuthValue`, adicionar:

```typescript
  entrarComGoogle: () => Promise<boolean>;
```

4. Adicionar o callback (após `cadastrar`):

```typescript
  const entrarComGoogle = useCallback(async (): Promise<boolean> => {
    const idToken = await obterIdTokenGoogle();
    if (!idToken) return false; // usuário cancelou
    const user = await loginGoogle(idToken);
    setUser(user);
    obterPushToken()
      .then((t) => { if (t) sincronizarToken(t, true); })
      .catch(() => {});
    return true;
  }, []);
```

5. Incluir no `useMemo` do `value` (objeto e deps):

```typescript
  const value = useMemo(
    () => ({ user, loading, entrar, cadastrar, entrarComGoogle, sair, atualizarUsuario, excluir }),
    [user, loading, entrar, cadastrar, entrarComGoogle, sair, atualizarUsuario, excluir]
  );
```

- [ ] **Step 3: Type-check**

Run: `cd "/Users/viniciusrodrigues/Documents/Vinicius/Cafe com proposito/frontend" && nvm use v20.20.2 && ./node_modules/.bin/tsc --noEmit -p tsconfig.json`
Expected: só o erro pré-existente `Field.tsx:38`; nenhum novo.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/auth.ts frontend/src/auth/AuthContext.tsx
git commit -m "feat(app): loginGoogle na API + entrarComGoogle no AuthContext

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Frontend — Ligar o botão "Continuar com Google" (entrar.tsx)

**Files:**
- Modify: `frontend/src/app/(auth)/entrar.tsx`

**Interfaces:**
- Consumes: `useAuth().entrarComGoogle` (Task 3), `ApiError` (já importado), `proximo` (já lido via `useLocalSearchParams`).

- [ ] **Step 1: Ligar o botão ao fluxo real**

Em `frontend/src/app/(auth)/entrar.tsx`:

1. Trocar a desestruturação do `useAuth` para incluir `entrarComGoogle`:

```typescript
  const { entrar, entrarComGoogle } = useAuth();
```

2. Adicionar o handler (perto do `enviar`, após ele):

```typescript
  const entrarGoogle = async () => {
    setErro(null);
    setCarregando(true);
    try {
      const ok = await entrarComGoogle();
      if (ok) router.replace(proximo ? (proximo as never) : '/(tabs)/meu-espaco');
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível entrar com o Google.');
    } finally {
      setCarregando(false);
    }
  };
```

3. Trocar o `onPress` do botão do Google de `emBreve` para `entrarGoogle`:

```tsx
          <Pressable style={styles.google} onPress={entrarGoogle} accessibilityRole="button">
```

(O `emBreve` continua sendo usado pelo "Esqueci a senha", então mantenha a função `emBreve`.)

- [ ] **Step 2: Type-check**

Run: `cd "/Users/viniciusrodrigues/Documents/Vinicius/Cafe com proposito/frontend" && nvm use v20.20.2 && ./node_modules/.bin/tsc --noEmit -p tsconfig.json`
Expected: só o erro pré-existente `Field.tsx:38`; nenhum novo.

- [ ] **Step 3: Verificação manual (após rebuild — no fim do plano)**

Sem verificação no dispositivo aqui (a lib é nativa; precisa de rebuild). No fim do plano, gerar 1 dev/preview build e validar: tocar "Continuar com Google" abre o seletor nativo; escolher uma conta em "Usuários de teste" loga no app; cancelar não mostra erro; o redirect `proximo` é honrado.

- [ ] **Step 4: Commit**

```bash
git add "frontend/src/app/(auth)/entrar.tsx"
git commit -m "feat(app): botão 'Continuar com Google' faz login real

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Notas finais para o implementador

- Backend: rodar a suíte completa ao terminar a Task 1: `cd backend && .venv/bin/python manage.py test accounts -v 2`.
- Frontend: as Tasks 2–4 são verificadas por `tsc`; a validação real (login nativo) é **manual, num dev/preview build** gerado no fim (a lib é nativa). Usar Node 20 pra tooling.
- **Config no Render (fora do código):** setar `GOOGLE_WEB_CLIENT_ID` = o Web client ID nas env vars do backend, senão a verificação recusa todos os tokens em produção. (O Vinícius faz isso no painel do Render.)
- Antes de mergear: `git fetch origin` e rebase em `origin/main` (há sessão-irmã ativa tocando `accounts/` e `entrar.tsx` — resolver mantendo ambos).
