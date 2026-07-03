# Minha Conta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o usuário logado edite seus dados, troque a senha, altere o e-mail e exclua a conta, no app e na API.

**Architecture:** 4 endpoints novos no app Django `accounts` (PATCH do usuário + 3 POSTs sensíveis gated por senha), consumidos por uma tela `/conta` no app (expo-router) com duas sub-telas (`/conta/senha`, `/conta/email`). Reusa o padrão existente (DRF + simplejwt no backend; `authFetch` + `ApiError` + `AuthContext` no frontend).

**Tech Stack:** Python/Django/DRF, djangorestframework-simplejwt; React Native/Expo/TypeScript, expo-router.

## Global Constraints

- Backend: login por e-mail com `username = email` — ao trocar o e-mail, atualizar **ambos**.
- Operações sensíveis (trocar e-mail, excluir conta) exigem reconfirmar a **senha atual**.
- Alterar e-mail na v1 **não** tem verificação por e-mail (só senha).
- Excluir conta = **hard delete** imediato; cascata já garantida por `on_delete=CASCADE`.
- Textos de interface em **português**, tom caloroso; erros por campo quando possível.
- Frontend usa os tokens de `ccpTheme` e os componentes `Field`/`Button` existentes; nunca cores cravadas.
- Data de nascimento no app: **máscara de texto DD/MM/AAAA** (sem dependência nativa nova); enviada à API como ISO `YYYY-MM-DD`.
- `tsc --noEmit` deve continuar passando (exceto o erro pré-existente já conhecido em `Field.tsx:38`).
- Rodar backend a partir de `backend/`; comandos `python manage.py ...`.

---

### Task 1: Backend — Editar dados básicos (PATCH /auth/eu/)

**Files:**
- Modify: `backend/accounts/serializers.py` (adicionar `AtualizarPerfilSerializer`)
- Modify: `backend/accounts/views.py` (`MeView` vira `RetrieveUpdateAPIView`)
- Test: `backend/accounts/tests.py` (criar)

**Interfaces:**
- Produces: `AtualizarPerfilSerializer` (input: `nome?`, `sobrenome?`, `telefone?`, `data_nascimento?`); `PATCH /auth/eu/` retorna `UserSerializer` do usuário atualizado.

- [ ] **Step 1: Escrever o teste que falha**

Criar `backend/accounts/tests.py`:

```python
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

User = get_user_model()


def criar_usuario(email="dona.marta@example.com", senha="Cafe12345", **extra):
    user = User.objects.create_user(
        username=email, email=email, password=senha,
        first_name=extra.get("first_name", "Marta"),
        last_name=extra.get("last_name", "Silva"),
    )
    return user


class EditarPerfilTests(APITestCase):
    def setUp(self):
        self.user = criar_usuario()
        self.client.force_authenticate(user=self.user)

    def test_patch_atualiza_nome_e_perfil(self):
        resp = self.client.patch("/api/auth/eu/", {
            "nome": "Marta Regina",
            "telefone": "11999998888",
            "data_nascimento": "1968-03-10",
        }, format="json")
        self.assertEqual(resp.status_code, 200, resp.content)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Marta Regina")
        self.assertEqual(self.user.perfil.telefone, "11999998888")
        self.assertEqual(str(self.user.perfil.data_nascimento), "1968-03-10")
        self.assertEqual(resp.json()["telefone"], "11999998888")

    def test_patch_nao_edita_email(self):
        resp = self.client.patch("/api/auth/eu/", {"email": "hacker@x.com"}, format="json")
        self.assertEqual(resp.status_code, 200, resp.content)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "dona.marta@example.com")

    def test_patch_exige_autenticacao(self):
        self.client.force_authenticate(user=None)
        resp = self.client.patch("/api/auth/eu/", {"nome": "X"}, format="json")
        self.assertEqual(resp.status_code, 401)
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && python manage.py test accounts.tests.EditarPerfilTests -v 2`
Expected: FAIL (PATCH devolve 405/erro — MeView ainda é só Retrieve).

- [ ] **Step 3: Adicionar `AtualizarPerfilSerializer`**

Em `backend/accounts/serializers.py`, após `UserSerializer` (antes de `RegisterSerializer`):

```python
class AtualizarPerfilSerializer(serializers.Serializer):
    """Edição dos dados básicos do usuário logado (não mexe no e-mail/senha)."""

    nome = serializers.CharField(source="first_name", max_length=150, required=False)
    sobrenome = serializers.CharField(
        source="last_name", max_length=150, required=False, allow_blank=True
    )
    telefone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    data_nascimento = serializers.DateField(required=False, allow_null=True)

    def update(self, instance, validated_data):
        campos_user = []
        if "first_name" in validated_data:
            instance.first_name = validated_data["first_name"].strip()
            campos_user.append("first_name")
        if "last_name" in validated_data:
            instance.last_name = validated_data["last_name"].strip()
            campos_user.append("last_name")
        if campos_user:
            instance.save(update_fields=campos_user)

        perfil = instance.perfil
        campos_perfil = []
        if "telefone" in validated_data:
            perfil.telefone = validated_data["telefone"]
            campos_perfil.append("telefone")
        if "data_nascimento" in validated_data:
            perfil.data_nascimento = validated_data["data_nascimento"]
            campos_perfil.append("data_nascimento")
        if campos_perfil:
            perfil.save(update_fields=campos_perfil)
        return instance
```

- [ ] **Step 4: Transformar `MeView` em `RetrieveUpdateAPIView`**

Em `backend/accounts/views.py`, atualizar o import e a `MeView`:

```python
from .serializers import (
    AtualizarPerfilSerializer,
    LoginSerializer,
    PushTokenSerializer,
    RegisterSerializer,
    UserSerializer,
    tokens_para,
)


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
```

- [ ] **Step 5: Rodar o teste e ver passar**

Run: `cd backend && python manage.py test accounts.tests.EditarPerfilTests -v 2`
Expected: PASS (3 testes).

- [ ] **Step 6: Commit**

```bash
git add backend/accounts/serializers.py backend/accounts/views.py backend/accounts/tests.py
git commit -m "feat(accounts): PATCH /auth/eu/ para editar dados básicos do perfil"
```

---

### Task 2: Backend — Trocar senha (POST /auth/trocar-senha/)

**Files:**
- Modify: `backend/accounts/serializers.py` (`TrocarSenhaSerializer`)
- Modify: `backend/accounts/views.py` (`TrocarSenhaView`)
- Modify: `backend/accounts/urls.py` (rota)
- Test: `backend/accounts/tests.py`

**Interfaces:**
- Produces: `POST /auth/trocar-senha/` body `{senha_atual, nova_senha}` → 200 `{"ok": true}`.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar em `backend/accounts/tests.py`:

```python
class TrocarSenhaTests(APITestCase):
    def setUp(self):
        self.user = criar_usuario()
        self.client.force_authenticate(user=self.user)

    def test_troca_com_senha_correta(self):
        resp = self.client.post("/api/auth/trocar-senha/", {
            "senha_atual": "Cafe12345", "nova_senha": "NovaSenha987",
        }, format="json")
        self.assertEqual(resp.status_code, 200, resp.content)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NovaSenha987"))

    def test_rejeita_senha_atual_errada(self):
        resp = self.client.post("/api/auth/trocar-senha/", {
            "senha_atual": "errada", "nova_senha": "NovaSenha987",
        }, format="json")
        self.assertEqual(resp.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("Cafe12345"))

    def test_rejeita_nova_senha_fraca(self):
        resp = self.client.post("/api/auth/trocar-senha/", {
            "senha_atual": "Cafe12345", "nova_senha": "123",
        }, format="json")
        self.assertEqual(resp.status_code, 400)
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && python manage.py test accounts.tests.TrocarSenhaTests -v 2`
Expected: FAIL (404 — rota não existe).

- [ ] **Step 3: Adicionar `TrocarSenhaSerializer`**

Em `backend/accounts/serializers.py` (após `AtualizarPerfilSerializer`):

```python
class TrocarSenhaSerializer(serializers.Serializer):
    senha_atual = serializers.CharField(write_only=True)
    nova_senha = serializers.CharField(write_only=True, min_length=8)

    def validate_senha_atual(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Senha atual incorreta.")
        return value

    def validate_nova_senha(self, value):
        validate_password(value, user=self.context["request"].user)
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["nova_senha"])
        user.save(update_fields=["password"])
        return user
```

- [ ] **Step 4: Adicionar `TrocarSenhaView`**

Em `backend/accounts/views.py` (após `MeView`), e incluir `TrocarSenhaSerializer` no import de `.serializers`:

```python
class TrocarSenhaView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = TrocarSenhaSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"ok": True})
```

- [ ] **Step 5: Registrar a rota**

Em `backend/accounts/urls.py`, adicionar dentro de `urlpatterns`:

```python
    path("trocar-senha/", views.TrocarSenhaView.as_view(), name="auth-trocar-senha"),
```

- [ ] **Step 6: Rodar o teste e ver passar**

Run: `cd backend && python manage.py test accounts.tests.TrocarSenhaTests -v 2`
Expected: PASS (3 testes).

- [ ] **Step 7: Commit**

```bash
git add backend/accounts/serializers.py backend/accounts/views.py backend/accounts/urls.py backend/accounts/tests.py
git commit -m "feat(accounts): POST /auth/trocar-senha/ com validação da senha atual"
```

---

### Task 3: Backend — Alterar e-mail (POST /auth/trocar-email/)

**Files:**
- Modify: `backend/accounts/serializers.py` (`TrocarEmailSerializer`)
- Modify: `backend/accounts/views.py` (`TrocarEmailView`)
- Modify: `backend/accounts/urls.py` (rota)
- Test: `backend/accounts/tests.py`

**Interfaces:**
- Produces: `POST /auth/trocar-email/` body `{novo_email, senha_atual}` → 200 `UserSerializer`.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar em `backend/accounts/tests.py`:

```python
class TrocarEmailTests(APITestCase):
    def setUp(self):
        self.user = criar_usuario()
        self.client.force_authenticate(user=self.user)

    def test_troca_email_e_sincroniza_username(self):
        resp = self.client.post("/api/auth/trocar-email/", {
            "novo_email": "Nova.Marta@Example.com", "senha_atual": "Cafe12345",
        }, format="json")
        self.assertEqual(resp.status_code, 200, resp.content)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "nova.marta@example.com")
        self.assertEqual(self.user.username, "nova.marta@example.com")

    def test_rejeita_senha_errada(self):
        resp = self.client.post("/api/auth/trocar-email/", {
            "novo_email": "outro@example.com", "senha_atual": "errada",
        }, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_rejeita_email_ja_em_uso(self):
        criar_usuario(email="ocupado@example.com")
        resp = self.client.post("/api/auth/trocar-email/", {
            "novo_email": "ocupado@example.com", "senha_atual": "Cafe12345",
        }, format="json")
        self.assertEqual(resp.status_code, 400)
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && python manage.py test accounts.tests.TrocarEmailTests -v 2`
Expected: FAIL (404 — rota não existe).

- [ ] **Step 3: Adicionar `TrocarEmailSerializer`**

Em `backend/accounts/serializers.py` (após `TrocarSenhaSerializer`):

```python
class TrocarEmailSerializer(serializers.Serializer):
    novo_email = serializers.EmailField(max_length=150)
    senha_atual = serializers.CharField(write_only=True)

    def validate_senha_atual(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Senha atual incorreta.")
        return value

    def validate_novo_email(self, value):
        value = value.strip().lower()
        user = self.context["request"].user
        if User.objects.filter(email__iexact=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("Já existe uma conta com este e-mail.")
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        email = self.validated_data["novo_email"]
        user.email = email
        user.username = email
        user.save(update_fields=["email", "username"])
        return user
```

- [ ] **Step 4: Adicionar `TrocarEmailView`**

Em `backend/accounts/views.py` (após `TrocarSenhaView`), e incluir `TrocarEmailSerializer` no import:

```python
class TrocarEmailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = TrocarEmailSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data)
```

- [ ] **Step 5: Registrar a rota**

Em `backend/accounts/urls.py`, adicionar:

```python
    path("trocar-email/", views.TrocarEmailView.as_view(), name="auth-trocar-email"),
```

- [ ] **Step 6: Rodar o teste e ver passar**

Run: `cd backend && python manage.py test accounts.tests.TrocarEmailTests -v 2`
Expected: PASS (3 testes).

- [ ] **Step 7: Commit**

```bash
git add backend/accounts/serializers.py backend/accounts/views.py backend/accounts/urls.py backend/accounts/tests.py
git commit -m "feat(accounts): POST /auth/trocar-email/ (gated por senha, sincroniza username)"
```

---

### Task 4: Backend — Excluir conta (POST /auth/excluir-conta/)

**Files:**
- Modify: `backend/accounts/serializers.py` (`ExcluirContaSerializer`)
- Modify: `backend/accounts/views.py` (`ExcluirContaView`)
- Modify: `backend/accounts/urls.py` (rota)
- Test: `backend/accounts/tests.py`

**Interfaces:**
- Produces: `POST /auth/excluir-conta/` body `{senha}` → 204; apaga o usuário e dados em cascata.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar em `backend/accounts/tests.py` (topo do arquivo, garantir import do `Favorite`):

```python
from engagement.models import Favorite  # noqa: E402  (usado no teste de cascata)


class ExcluirContaTests(APITestCase):
    def setUp(self):
        self.user = criar_usuario()
        self.client.force_authenticate(user=self.user)

    def test_exclui_com_senha_correta_e_cascata(self):
        Favorite.objects.create(usuario=self.user, capitulo_id=1)
        resp = self.client.post("/api/auth/excluir-conta/", {"senha": "Cafe12345"}, format="json")
        self.assertEqual(resp.status_code, 204, resp.content)
        self.assertFalse(User.objects.filter(pk=self.user.pk).exists())
        self.assertFalse(Favorite.objects.filter(usuario_id=self.user.pk).exists())

    def test_rejeita_senha_errada(self):
        resp = self.client.post("/api/auth/excluir-conta/", {"senha": "errada"}, format="json")
        self.assertEqual(resp.status_code, 400)
        self.assertTrue(User.objects.filter(pk=self.user.pk).exists())
```

> Nota para o implementador: o teste de cascata cria um `Favorite` com `capitulo_id=1`. Se não houver `Chapter` de id 1 nos fixtures/migrações, crie um capítulo mínimo no `setUp` (`from content.models import Chapter; Chapter.objects.create(...)`) ou remova a linha do `Favorite` e valide a cascata só pelo `Profile` (`self.assertFalse(Profile.objects.filter(usuario_id=...).exists())`). Ajuste conforme os campos obrigatórios reais de `Chapter`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && python manage.py test accounts.tests.ExcluirContaTests -v 2`
Expected: FAIL (404 — rota não existe).

- [ ] **Step 3: Adicionar `ExcluirContaSerializer`**

Em `backend/accounts/serializers.py` (após `TrocarEmailSerializer`):

```python
class ExcluirContaSerializer(serializers.Serializer):
    senha = serializers.CharField(write_only=True)

    def validate_senha(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Senha incorreta.")
        return value
```

- [ ] **Step 4: Adicionar `ExcluirContaView`**

Em `backend/accounts/views.py` (após `TrocarEmailView`), incluir `ExcluirContaSerializer` no import:

```python
class ExcluirContaView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ExcluirContaSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
```

- [ ] **Step 5: Registrar a rota**

Em `backend/accounts/urls.py`, adicionar:

```python
    path("excluir-conta/", views.ExcluirContaView.as_view(), name="auth-excluir-conta"),
```

- [ ] **Step 6: Rodar toda a suíte de accounts**

Run: `cd backend && python manage.py test accounts -v 2`
Expected: PASS (todos os testes das Tasks 1–4).

- [ ] **Step 7: Commit**

```bash
git add backend/accounts/serializers.py backend/accounts/views.py backend/accounts/urls.py backend/accounts/tests.py
git commit -m "feat(accounts): POST /auth/excluir-conta/ (hard delete gated por senha)"
```

---

### Task 5: Frontend — Funções de API (`api/auth.ts`)

**Files:**
- Modify: `frontend/src/api/auth.ts`

**Interfaces:**
- Consumes: `authFetch`, `ApiError`, `primeiraMensagem`, `Usuario` (já existem no arquivo).
- Produces: `atualizarPerfil(patch)`, `trocarSenha(senha_atual, nova_senha)`, `trocarEmail(novo_email, senha_atual)`, `excluirConta(senha)`.

- [ ] **Step 1: Adicionar as funções**

Ao final de `frontend/src/api/auth.ts` (antes ou depois de `sair()`), adicionar:

```typescript
export type PerfilPatch = Partial<
  Pick<Usuario, 'nome' | 'sobrenome' | 'telefone' | 'data_nascimento'>
>;

/** Lê o JSON e lança ApiError com a mensagem do backend quando !ok. */
async function lerOuErro<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, (data as any) ?? {}, primeiraMensagem(data));
  return data as T;
}

export async function atualizarPerfil(patch: PerfilPatch): Promise<Usuario> {
  const res = await authFetch('/auth/eu/', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return lerOuErro<Usuario>(res);
}

export async function trocarSenha(senha_atual: string, nova_senha: string): Promise<void> {
  const res = await authFetch('/auth/trocar-senha/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senha_atual, nova_senha }),
  });
  await lerOuErro<unknown>(res);
}

export async function trocarEmail(novo_email: string, senha_atual: string): Promise<Usuario> {
  const res = await authFetch('/auth/trocar-email/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ novo_email, senha_atual }),
  });
  return lerOuErro<Usuario>(res);
}

export async function excluirConta(senha: string): Promise<void> {
  const res = await authFetch('/auth/excluir-conta/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senha }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, (data as any) ?? {}, primeiraMensagem(data));
  }
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && ./node_modules/.bin/tsc --noEmit -p tsconfig.json`
Expected: sem NOVOS erros (só o pré-existente em `Field.tsx:38`).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/auth.ts
git commit -m "feat(app): funções de API para editar conta (perfil, senha, e-mail, excluir)"
```

---

### Task 6: Frontend — AuthContext (`atualizarUsuario`, `excluir`)

**Files:**
- Modify: `frontend/src/auth/AuthContext.tsx`

**Interfaces:**
- Consumes: `excluirConta` (Task 5), `sair as apiSair` (já importado como `apiSair`).
- Produces: `useAuth()` passa a expor `atualizarUsuario(user: Usuario): void` e `excluir(senha: string): Promise<void>`.

- [ ] **Step 1: Atualizar o tipo `AuthValue`**

Em `frontend/src/auth/AuthContext.tsx`, no type `AuthValue`, adicionar:

```typescript
  atualizarUsuario: (user: Usuario) => void;
  excluir: (senha: string) => Promise<void>;
```

- [ ] **Step 2: Importar `excluirConta`**

No import de `@/api/auth`, adicionar `excluirConta`:

```typescript
import {
  login as apiLogin,
  registrar as apiRegistrar,
  buscarEu,
  sair as apiSair,
  excluirConta,
  type Usuario,
  type RegistroPayload,
} from '@/api/auth';
```

- [ ] **Step 3: Adicionar os callbacks e incluir no value**

Depois do `sair` (`const sair = useCallback(...)`), adicionar:

```typescript
  const atualizarUsuario = useCallback((u: Usuario) => setUser(u), []);

  const excluir = useCallback(async (senha: string) => {
    await excluirConta(senha);
    await apiSair();
    setUser(null);
  }, []);
```

E no `useMemo` do `value`, incluir os dois:

```typescript
  const value = useMemo(
    () => ({ user, loading, entrar, cadastrar, sair, atualizarUsuario, excluir }),
    [user, loading, entrar, cadastrar, sair, atualizarUsuario, excluir]
  );
```

- [ ] **Step 4: Type-check**

Run: `cd frontend && ./node_modules/.bin/tsc --noEmit -p tsconfig.json`
Expected: sem NOVOS erros.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/auth/AuthContext.tsx
git commit -m "feat(app): AuthContext expõe atualizarUsuario e excluir"
```

---

### Task 7: Frontend — Tela "Minha Conta" (editar dados) + rota

**Files:**
- Create: `frontend/src/lib/dateInput.ts` (máscara de data)
- Create: `frontend/src/app/conta.tsx`
- Modify: `frontend/src/app/_layout.tsx` (registrar `conta`, `conta/senha`, `conta/email`)
- Modify: `frontend/src/app/(tabs)/meu-espaco.tsx` (item "Dados pessoais" → `/conta`)

**Interfaces:**
- Consumes: `useAuth()` (`user`, `atualizarUsuario`), `atualizarPerfil` (Task 5), `Field`, `Button`.
- Produces: rota `/conta`; helpers `maskDateBR(texto)`, `brParaISO(br)`, `isoParaBR(iso)`.

- [ ] **Step 1: Criar o helper de data**

Criar `frontend/src/lib/dateInput.ts`:

```typescript
/** Máscara de data brasileira para inputs de texto: DD/MM/AAAA. */
export function maskDateBR(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 8);
  const partes = [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean);
  return partes.join('/');
}

/** "10/03/1968" -> "1968-03-10". Retorna null se incompleto/ inválido. */
export function brParaISO(br: string): string | null {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, aaaa] = m;
  const iso = `${aaaa}-${mm}-${dd}`;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  return iso;
}

/** "1968-03-10" -> "10/03/1968". Vazio quando null. */
export function isoParaBR(iso: string | null): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  const [, aaaa, mm, dd] = m;
  return `${dd}/${mm}/${aaaa}`;
}
```

- [ ] **Step 2: Criar a tela `conta.tsx` (editar dados básicos)**

Criar `frontend/src/app/conta.tsx`:

```tsx
/**
 * Minha Conta. Edita dados básicos; e-mail e senha têm fluxos próprios;
 * excluir conta é destrutivo e confirmado por senha (Task 10).
 */
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Field from '@/components/Field';
import Button from '@/components/Button';
import { useAuth } from '@/auth/AuthContext';
import { atualizarPerfil, ApiError, type PerfilPatch } from '@/api/auth';
import { maskDateBR, brParaISO, isoParaBR } from '@/lib/dateInput';
import { fonts, palette, spacing } from '@/theme/ccpTheme';
import { useTheme } from '@/theme/useTheme';

export default function Conta() {
  const t = useTheme();
  const router = useRouter();
  const { user, atualizarUsuario } = useAuth();

  const [nome, setNome] = useState(user?.nome ?? '');
  const [sobrenome, setSobrenome] = useState(user?.sobrenome ?? '');
  const [telefone, setTelefone] = useState(user?.telefone ?? '');
  const [nascimento, setNascimento] = useState(isoParaBR(user?.data_nascimento ?? null));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    setErro(null);
    const patch: PerfilPatch = { nome: nome.trim(), sobrenome: sobrenome.trim(), telefone: telefone.trim() };
    if (nascimento.trim()) {
      const iso = brParaISO(nascimento.trim());
      if (!iso) { setErro('Data de nascimento inválida. Use DD/MM/AAAA.'); return; }
      patch.data_nascimento = iso;
    } else {
      patch.data_nascimento = null;
    }
    setSalvando(true);
    try {
      const atualizado = await atualizarPerfil(patch);
      atualizarUsuario(atualizado);
      Alert.alert('Pronto', 'Seus dados foram salvos.');
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível salvar. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.ui.fundo }]} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.voltar} accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={24} color={palette.cafeEscuro} />
        </Pressable>
        <Text style={styles.titulo}>Minha Conta</Text>

        <Field label="Nome" value={nome} onChangeText={setNome} style={styles.field} />
        <Field label="Sobrenome" value={sobrenome} onChangeText={setSobrenome} style={styles.field} />
        <Field label="Telefone" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" style={styles.field} />
        <Field
          label="Data de nascimento"
          value={nascimento}
          onChangeText={(v) => setNascimento(maskDateBR(v))}
          placeholder="DD/MM/AAAA"
          keyboardType="number-pad"
          style={styles.field}
        />

        <View style={styles.emailRow}>
          <Field label="E-mail" value={user?.email ?? ''} editable={false} style={styles.emailField} />
          <Pressable onPress={() => router.push('/conta/email')} style={styles.alterar} hitSlop={6}>
            <Text style={styles.alterarText}>Alterar</Text>
          </Pressable>
        </View>

        {!!erro && <Text style={styles.erro}>{erro}</Text>}

        <Button label={salvando ? 'Salvando…' : 'Salvar'} onPress={salvar} disabled={salvando} style={styles.cta} />

        <View style={styles.acoes}>
          <Pressable style={styles.acaoItem} onPress={() => router.push('/conta/senha')} accessibilityRole="button">
            <Ionicons name="lock-closed-outline" size={18} color={palette.salvia} />
            <Text style={styles.acaoLabel}>Trocar senha</Text>
            <Ionicons name="chevron-forward" size={18} color={palette.salvia} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 30, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  voltar: { alignSelf: 'flex-start', marginBottom: spacing.sm },
  titulo: { fontFamily: fonts.serif, fontSize: 30, color: palette.cafeEscuro, marginBottom: spacing.md },
  field: { marginTop: 16 },
  emailRow: { marginTop: 16, flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  emailField: { flex: 1 },
  alterar: { paddingBottom: 16 },
  alterarText: { fontFamily: fonts.sansBold, fontSize: 13, color: palette.douradoAmanhecer },
  erro: { fontFamily: fonts.sans, fontSize: 13, color: palette.erro, marginTop: 14, textAlign: 'center' },
  cta: { marginTop: 24 },
  acoes: { marginTop: 28 },
  acaoItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#EAE0D4' },
  acaoLabel: { flex: 1, fontFamily: fonts.sansBold, fontSize: 15, color: palette.cafeEscuro },
});
```

> Nota: se `spacing.xl` não existir no tema, usar `spacing.lg`. Conferir `src/theme/ccpTheme.ts`.

- [ ] **Step 3: Registrar as rotas no Stack**

Em `frontend/src/app/_layout.tsx`, dentro do `<Stack ...>`, adicionar (junto das outras `Stack.Screen`):

```tsx
            <Stack.Screen name="conta" />
            <Stack.Screen name="conta/senha" />
            <Stack.Screen name="conta/email" />
```

- [ ] **Step 4: Ligar o item "Dados pessoais" do Meu Espaço**

Em `frontend/src/app/(tabs)/meu-espaco.tsx`:
1. No type `Rota`, incluir `/conta`:

```tsx
type Rota = '/anotacoes' | '/favoritos' | '/conta';
```

2. No `MENU`, dar rota ao item "Dados pessoais":

```tsx
  { icon: 'person-outline', label: 'Dados pessoais', rota: '/conta' },
```

- [ ] **Step 5: Type-check**

Run: `cd frontend && ./node_modules/.bin/tsc --noEmit -p tsconfig.json`
Expected: sem NOVOS erros.

- [ ] **Step 6: Verificação manual (dev build + Metro)**

1. `cd frontend && ./node_modules/.bin/expo start --dev-client`
2. No dev build: Meu Espaço → "Dados pessoais" abre `/conta`.
3. Editar nome/telefone/nascimento → "Salvar" → alerta "Pronto"; reabrir a tela e ver os valores persistidos.
Expected: dados salvos e refletidos.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/dateInput.ts frontend/src/app/conta.tsx frontend/src/app/_layout.tsx "frontend/src/app/(tabs)/meu-espaco.tsx"
git commit -m "feat(app): tela Minha Conta (editar dados básicos) + rota"
```

---

### Task 8: Frontend — Sub-tela "Trocar senha" (`/conta/senha`)

**Files:**
- Create: `frontend/src/app/conta/senha.tsx`

**Interfaces:**
- Consumes: `trocarSenha` (Task 5), `Field`, `Button`.

- [ ] **Step 1: Criar `conta/senha.tsx`**

Criar `frontend/src/app/conta/senha.tsx`:

```tsx
/** Trocar senha: senha atual + nova (com confirmação). */
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Field from '@/components/Field';
import Button from '@/components/Button';
import { trocarSenha, ApiError } from '@/api/auth';
import { fonts, palette, spacing } from '@/theme/ccpTheme';
import { useTheme } from '@/theme/useTheme';

export default function TrocarSenha() {
  const t = useTheme();
  const router = useRouter();
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const podeEnviar = atual.length > 0 && nova.length >= 8 && confirmar.length > 0 && !salvando;

  const enviar = async () => {
    setErro(null);
    if (nova !== confirmar) { setErro('A nova senha e a confirmação não conferem.'); return; }
    setSalvando(true);
    try {
      await trocarSenha(atual, nova);
      Alert.alert('Pronto', 'Sua senha foi alterada.');
      router.back();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível trocar a senha.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.ui.fundo }]} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.voltar} accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={24} color={palette.cafeEscuro} />
        </Pressable>
        <Text style={styles.titulo}>Trocar senha</Text>

        <Field label="Senha atual" secure value={atual} onChangeText={setAtual} style={styles.field} />
        <Field label="Nova senha" secure value={nova} onChangeText={setNova} placeholder="Mínimo 8 caracteres" style={styles.field} />
        <Field label="Confirmar nova senha" secure value={confirmar} onChangeText={setConfirmar} style={styles.field} />

        {!!erro && <Text style={styles.erro}>{erro}</Text>}
        <Button label={salvando ? 'Salvando…' : 'Salvar nova senha'} onPress={enviar} disabled={!podeEnviar} style={styles.cta} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 30, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  voltar: { alignSelf: 'flex-start', marginBottom: spacing.sm },
  titulo: { fontFamily: fonts.serif, fontSize: 30, color: palette.cafeEscuro, marginBottom: spacing.md },
  field: { marginTop: 16 },
  erro: { fontFamily: fonts.sans, fontSize: 13, color: palette.erro, marginTop: 14, textAlign: 'center' },
  cta: { marginTop: 24 },
});
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && ./node_modules/.bin/tsc --noEmit -p tsconfig.json`
Expected: sem NOVOS erros.

- [ ] **Step 3: Verificação manual**

No dev build: `/conta` → "Trocar senha". Com senha atual errada → erro do backend. Com correta + nova válida → "Pronto"; deslogar e logar com a nova senha funciona.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/conta/senha.tsx
git commit -m "feat(app): sub-tela Trocar senha"
```

---

### Task 9: Frontend — Sub-tela "Alterar e-mail" (`/conta/email`)

**Files:**
- Create: `frontend/src/app/conta/email.tsx`

**Interfaces:**
- Consumes: `trocarEmail` (Task 5), `useAuth().atualizarUsuario`, `Field`, `Button`.

- [ ] **Step 1: Criar `conta/email.tsx`**

Criar `frontend/src/app/conta/email.tsx`:

```tsx
/** Alterar e-mail: novo e-mail + senha atual (v1 sem verificação por e-mail). */
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Field from '@/components/Field';
import Button from '@/components/Button';
import { useAuth } from '@/auth/AuthContext';
import { trocarEmail, ApiError } from '@/api/auth';
import { fonts, palette, spacing } from '@/theme/ccpTheme';
import { useTheme } from '@/theme/useTheme';

export default function AlterarEmail() {
  const t = useTheme();
  const router = useRouter();
  const { user, atualizarUsuario } = useAuth();
  const [novo, setNovo] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const podeEnviar = novo.trim().length > 3 && senha.length > 0 && !salvando;

  const enviar = async () => {
    setErro(null);
    setSalvando(true);
    try {
      const atualizado = await trocarEmail(novo.trim(), senha);
      atualizarUsuario(atualizado);
      Alert.alert('Pronto', 'Seu e-mail foi alterado.');
      router.back();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível alterar o e-mail.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.ui.fundo }]} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.voltar} accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={24} color={palette.cafeEscuro} />
        </Pressable>
        <Text style={styles.titulo}>Alterar e-mail</Text>
        <Text style={styles.sub}>E-mail atual: {user?.email}</Text>

        <Field label="Novo e-mail" value={novo} onChangeText={setNovo} keyboardType="email-address" autoCapitalize="none" style={styles.field} />
        <Field label="Senha atual" secure value={senha} onChangeText={setSenha} style={styles.field} />

        {!!erro && <Text style={styles.erro}>{erro}</Text>}
        <Button label={salvando ? 'Salvando…' : 'Alterar e-mail'} onPress={enviar} disabled={!podeEnviar} style={styles.cta} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 30, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  voltar: { alignSelf: 'flex-start', marginBottom: spacing.sm },
  titulo: { fontFamily: fonts.serif, fontSize: 30, color: palette.cafeEscuro, marginBottom: 6 },
  sub: { fontFamily: fonts.sans, fontSize: 14, color: '#6E625A', marginBottom: spacing.md },
  field: { marginTop: 16 },
  erro: { fontFamily: fonts.sans, fontSize: 13, color: palette.erro, marginTop: 14, textAlign: 'center' },
  cta: { marginTop: 24 },
});
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && ./node_modules/.bin/tsc --noEmit -p tsconfig.json`
Expected: sem NOVOS erros.

- [ ] **Step 3: Verificação manual**

No dev build: `/conta` → "Alterar" (no e-mail). Senha errada → erro; e-mail em uso → erro; sucesso → "Pronto", e-mail atualizado na tela Conta; logar com o novo e-mail funciona.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/conta/email.tsx
git commit -m "feat(app): sub-tela Alterar e-mail"
```

---

### Task 10: Frontend — Fluxo "Excluir conta"

**Files:**
- Modify: `frontend/src/app/conta.tsx`

**Interfaces:**
- Consumes: `useAuth().excluir` (Task 6), `Alert.prompt` (iOS) / campo de senha inline (Android).

> Nota importante: `Alert.prompt` **só existe no iOS**. Para funcionar no Android (nosso alvo principal), a confirmação de senha usa um pequeno **estado inline** na própria tela Conta (um `Field` de senha que aparece ao tocar em "Excluir conta"), não `Alert.prompt`.

- [ ] **Step 1: Adicionar estado e handler de exclusão na tela Conta**

Em `frontend/src/app/conta.tsx`, dentro do componente `Conta`, adicionar estados e função (após os estados existentes):

```tsx
  const { user, atualizarUsuario, excluir } = useAuth(); // substituir a linha atual do useAuth
  const [mostrarExcluir, setMostrarExcluir] = useState(false);
  const [senhaExcluir, setSenhaExcluir] = useState('');
  const [excluindo, setExcluindo] = useState(false);

  const confirmarExcluir = () => {
    Alert.alert(
      'Excluir conta',
      'Isso apaga sua conta e todos os seus dados (favoritos, anotações e progresso). Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Continuar', style: 'destructive', onPress: () => setMostrarExcluir(true) },
      ],
    );
  };

  const excluirConfirmado = async () => {
    setErro(null);
    setExcluindo(true);
    try {
      await excluir(senhaExcluir);
      router.replace('/(auth)/entrar');
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível excluir a conta.');
    } finally {
      setExcluindo(false);
    }
  };
```

- [ ] **Step 2: Adicionar a UI de excluir ao final da lista de ações**

Em `conta.tsx`, dentro de `<View style={styles.acoes}>` (após o item "Trocar senha"), adicionar:

```tsx
          <Pressable style={styles.acaoItem} onPress={confirmarExcluir} accessibilityRole="button">
            <Ionicons name="trash-outline" size={18} color={palette.erro} />
            <Text style={[styles.acaoLabel, { color: palette.erro }]}>Excluir conta</Text>
            <Ionicons name="chevron-forward" size={18} color={palette.erro} />
          </Pressable>

          {mostrarExcluir && (
            <View style={styles.excluirBox}>
              <Field label="Confirme sua senha para excluir" secure value={senhaExcluir} onChangeText={setSenhaExcluir} style={styles.field} />
              <Button
                label={excluindo ? 'Excluindo…' : 'Excluir minha conta'}
                onPress={excluirConfirmado}
                disabled={excluindo || senhaExcluir.length === 0}
                style={styles.cta}
              />
            </View>
          )}
```

- [ ] **Step 3: Adicionar os estilos usados**

No `StyleSheet.create` de `conta.tsx`, adicionar:

```tsx
  excluirBox: { marginTop: 8 },
```

- [ ] **Step 4: Type-check**

Run: `cd frontend && ./node_modules/.bin/tsc --noEmit -p tsconfig.json`
Expected: sem NOVOS erros.

- [ ] **Step 5: Verificação manual**

No dev build: `/conta` → "Excluir conta" → "Continuar" → digitar senha. Senha errada → erro; senha correta → conta apagada, redireciona para Entrar; tentar logar com a conta antiga falha.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/conta.tsx
git commit -m "feat(app): fluxo de excluir conta (confirmação + senha)"
```

---

## Notas finais para o implementador

- Rode a suíte de backend completa ao terminar as Tasks 1–4: `cd backend && python manage.py test accounts -v 2`.
- Verificação de frontend é manual no **dev build** (Metro + Fast Refresh) — o `expo-dev-client` já está instalado.
- Este plano é o sub-projeto 1/2. O sub-projeto "Ajustes" (notificações, Termos/Política, Sobre, tema) terá seu próprio spec + plano.
