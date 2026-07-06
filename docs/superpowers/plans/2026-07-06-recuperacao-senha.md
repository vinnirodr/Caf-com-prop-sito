# Recuperação de senha (OTP) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir recuperar a senha por um código OTP de 6 dígitos enviado por e-mail (via Resend), tudo dentro do app.

**Architecture:** Backend gera/valida um código (guardado como hash, expira em 20 min) e envia por e-mail; dois endpoints públicos (`/auth/esqueci-senha/` anti-enumeração + `/auth/redefinir-senha/`). App tem uma tela de duas fases (pedir código → redefinir).

**Tech Stack:** Django/DRF + `django.core.mail` (SMTP Resend) (backend); React Native/Expo/TypeScript (frontend).

## Global Constraints

- Base: `origin/main` @ `caca138`. Branch: `claude/recuperacao-senha` (há sessão-irmã; mudanças cirúrgicas; PR pra `main`).
- **Anti-enumeração:** `/auth/esqueci-senha/` responde **sempre 200** `{"detail": "Se o e-mail existir, enviamos um código."}`; nunca revela se o e-mail existe.
- **Código:** 6 dígitos numéricos; guardado como **hash** (`make_password`/`check_password`), nunca em claro; expira em **20 min**; **uso único**; **máx 5 tentativas**; **cooldown de 60s** por e-mail no pedido.
- **E-mail via Resend:** se `RESEND_API_KEY` definido → SMTP (`smtp.resend.com`); senão → `console.EmailBackend` (dev). `DEFAULT_FROM_EMAIL` vem de env (default `onboarding@resend.dev`). Trocar o from por domínio verificado no futuro = só env, sem código.
- Endpoints públicos (`AllowAny`). Reusar `validate_password` do Django. Textos em português, tom caloroso.
- Backend roda testes com o venv: `cd backend && .venv/bin/python manage.py test accounts -v 2`. Nos testes, o Django usa o email backend `locmem` automaticamente (`django.core.mail.outbox`).
- Frontend: tela dentro de `src/app/(auth)/` (auto-registrada pelo Stack do grupo — **não** mexer no `_layout`); honrar o param `email`; `tsc --noEmit` só com o erro pré-existente conhecido em `Field.tsx:38`. Usar Node 20 pra tooling (`nvm use v20.20.2`).

---

### Task 1: Backend — Modelo `PasswordResetCode` + migration + config de e-mail

**Files:**
- Modify: `backend/accounts/models.py`
- Modify: `backend/cafe_backend/settings.py`
- Create: `backend/accounts/migrations/000X_passwordresetcode.py` (via makemigrations)
- Test: `backend/accounts/tests.py`

**Interfaces:**
- Produces: modelo `accounts.models.PasswordResetCode` (campos: `usuario`, `code_hash`, `criado_em`, `expira_em`, `usado`, `tentativas`).

- [ ] **Step 1: Escrever o teste que falha**

Adicionar em `backend/accounts/tests.py` (usa o helper `criar_usuario` já existente):

```python
from datetime import timedelta
from django.utils import timezone


class PasswordResetModelTests(APITestCase):
    def test_cria_codigo_reset(self):
        from accounts.models import PasswordResetCode
        u = criar_usuario()
        c = PasswordResetCode.objects.create(
            usuario=u, code_hash="x", expira_em=timezone.now() + timedelta(minutes=20)
        )
        self.assertFalse(c.usado)
        self.assertEqual(c.tentativas, 0)
        self.assertEqual(u.codigos_reset.count(), 1)
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd "/Users/viniciusrodrigues/Documents/Vinicius/Cafe com proposito/backend" && .venv/bin/python manage.py test accounts.tests.PasswordResetModelTests -v 2`
Expected: FAIL (`ImportError`/`cannot import name 'PasswordResetCode'`).

- [ ] **Step 3: Adicionar o modelo**

Em `backend/accounts/models.py`, ao final do arquivo:

```python
class PasswordResetCode(models.Model):
    """Código OTP de recuperação de senha. Guardado como hash, nunca em claro."""

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="codigos_reset"
    )
    code_hash = models.CharField(max_length=128)
    criado_em = models.DateTimeField(auto_now_add=True)
    expira_em = models.DateTimeField()
    usado = models.BooleanField(default=False)
    tentativas = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "código de recuperação"
        verbose_name_plural = "códigos de recuperação"
        ordering = ["-criado_em"]

    def __str__(self):
        return f"Código de {self.usuario} ({'usado' if self.usado else 'ativo'})"
```

- [ ] **Step 4: Adicionar a config de e-mail no settings**

Em `backend/cafe_backend/settings.py`, logo após a linha `GOOGLE_WEB_CLIENT_ID = env("GOOGLE_WEB_CLIENT_ID", "")`:

```python
# E-mail (recuperação de senha via Resend). Com RESEND_API_KEY definido, envia por
# SMTP do Resend; sem ela, cai no backend de console (dev). O remetente
# (DEFAULT_FROM_EMAIL) exige um domínio verificado no Resend em produção — por ora
# usa o domínio de teste. Trocar depois é só mudar a env, sem tocar no código.
RESEND_API_KEY = env("RESEND_API_KEY", "")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", "onboarding@resend.dev")
if RESEND_API_KEY:
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = "smtp.resend.com"
    EMAIL_PORT = 587
    EMAIL_USE_TLS = True
    EMAIL_HOST_USER = "resend"
    EMAIL_HOST_PASSWORD = RESEND_API_KEY
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
```

- [ ] **Step 5: Gerar a migration**

Run: `cd "/Users/viniciusrodrigues/Documents/Vinicius/Cafe com proposito/backend" && .venv/bin/python manage.py makemigrations accounts`
Expected: cria `accounts/migrations/000X_passwordresetcode.py` (a numeração real depende das migrations existentes).

- [ ] **Step 6: Rodar o teste e ver passar**

Run: `.venv/bin/python manage.py test accounts.tests.PasswordResetModelTests -v 2`
Expected: PASS. Depois `.venv/bin/python manage.py check` → sem erros.

- [ ] **Step 7: Commit**

```bash
git add backend/accounts/models.py backend/cafe_backend/settings.py backend/accounts/migrations/ backend/accounts/tests.py
git commit -m "feat(accounts): modelo PasswordResetCode + config de e-mail (Resend/console)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Backend — Serviço `reset_senha.py` + endpoints `/auth/esqueci-senha/` e `/auth/redefinir-senha/`

**Files:**
- Create: `backend/accounts/reset_senha.py`
- Modify: `backend/accounts/serializers.py`
- Modify: `backend/accounts/views.py`
- Modify: `backend/accounts/urls.py`
- Test: `backend/accounts/tests.py`

**Interfaces:**
- Consumes: `PasswordResetCode` (Task 1).
- Produces: `POST /api/auth/esqueci-senha/` `{email}` → 200 (anti-enumeração); `POST /api/auth/redefinir-senha/` `{email, codigo, nova_senha}` → 200 / 400.

- [ ] **Step 1: Escrever os testes que falham**

Adicionar em `backend/accounts/tests.py`:

```python
import re
from django.core import mail


class RecuperacaoSenhaTests(APITestCase):
    def setUp(self):
        self.user = criar_usuario(email="marta@example.com")  # senha "Cafe12345"

    def _pedir(self, email):
        return self.client.post("/api/auth/esqueci-senha/", {"email": email}, format="json")

    def _codigo_do_email(self):
        return re.search(r"\b(\d{6})\b", mail.outbox[-1].body).group(1)

    def _redefinir(self, codigo, nova="NovaSenha987", email="marta@example.com"):
        return self.client.post(
            "/api/auth/redefinir-senha/",
            {"email": email, "codigo": codigo, "nova_senha": nova},
            format="json",
        )

    def test_pedir_codigo_existente_envia(self):
        from accounts.models import PasswordResetCode
        resp = self._pedir("marta@example.com")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(PasswordResetCode.objects.filter(usuario=self.user).count(), 1)
        self.assertEqual(len(mail.outbox), 1)

    def test_pedir_codigo_inexistente_nao_envia(self):
        from accounts.models import PasswordResetCode
        resp = self._pedir("ninguem@example.com")
        self.assertEqual(resp.status_code, 200)  # anti-enumeração
        self.assertEqual(PasswordResetCode.objects.count(), 0)
        self.assertEqual(len(mail.outbox), 0)

    def test_redefinir_com_codigo_correto(self):
        self._pedir("marta@example.com")
        resp = self._redefinir(self._codigo_do_email())
        self.assertEqual(resp.status_code, 200, resp.content)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NovaSenha987"))

    def test_redefinir_codigo_errado_nao_troca(self):
        self._pedir("marta@example.com")
        resp = self._redefinir("111111")  # improvável ser o código real
        self.assertEqual(resp.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("Cafe12345"))

    def test_redefinir_codigo_expirado(self):
        from accounts.models import PasswordResetCode
        self._pedir("marta@example.com")
        codigo = self._codigo_do_email()
        PasswordResetCode.objects.filter(usuario=self.user).update(
            expira_em=timezone.now() - timedelta(minutes=1)
        )
        self.assertEqual(self._redefinir(codigo).status_code, 400)

    def test_redefinir_senha_fraca(self):
        self._pedir("marta@example.com")
        resp = self._redefinir(self._codigo_do_email(), nova="123")
        self.assertEqual(resp.status_code, 400)
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd "/Users/viniciusrodrigues/Documents/Vinicius/Cafe com proposito/backend" && .venv/bin/python manage.py test accounts.tests.RecuperacaoSenhaTests -v 2`
Expected: FAIL (404 nas rotas).

- [ ] **Step 3: Criar `accounts/reset_senha.py`**

```python
"""Recuperação de senha por código OTP: geração, envio e verificação.

Isolado para facilitar teste. O código nunca é salvo em claro (só o hash).
"""
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password, make_password
from django.core.mail import send_mail
from django.utils import timezone

from .models import PasswordResetCode

User = get_user_model()

EXPIRACAO = timedelta(minutes=20)
COOLDOWN = timedelta(seconds=60)
MAX_TENTATIVAS = 5


class CodigoInvalido(Exception):
    """Código ausente, errado, expirado, já usado ou tentativas esgotadas."""


def _gerar_codigo():
    return f"{secrets.randbelow(1_000_000):06d}"


def _enviar_email(user, codigo):
    send_mail(
        subject="Seu código de recuperação — Café com Propósito",
        message=(
            f"Olá!\n\nSeu código para redefinir a senha é: {codigo}\n\n"
            "Ele vale por 20 minutos. Se você não pediu isso, pode ignorar este e-mail.\n\n"
            "Com carinho,\nCafé com Propósito ☕"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )


def solicitar(email):
    """Cria e envia um código, se houver conta. Silencioso se não houver (anti-enumeração)."""
    email = (email or "").strip().lower()
    user = User.objects.filter(email__iexact=email).order_by("id").first()
    if not user:
        return
    agora = timezone.now()
    # cooldown: não recria se houver um código ativo recente
    if PasswordResetCode.objects.filter(
        usuario=user, usado=False, criado_em__gt=agora - COOLDOWN
    ).exists():
        return
    PasswordResetCode.objects.filter(usuario=user, usado=False).update(usado=True)
    codigo = _gerar_codigo()
    PasswordResetCode.objects.create(
        usuario=user, code_hash=make_password(codigo), expira_em=agora + EXPIRACAO
    )
    _enviar_email(user, codigo)


def redefinir(email, codigo, nova_senha):
    """Valida o código e troca a senha. Lança CodigoInvalido nos casos ruins."""
    email = (email or "").strip().lower()
    generico = CodigoInvalido("Código inválido ou expirado.")
    user = User.objects.filter(email__iexact=email).order_by("id").first()
    if not user:
        raise generico
    reg = (
        PasswordResetCode.objects.filter(usuario=user, usado=False)
        .order_by("-criado_em")
        .first()
    )
    if not reg or reg.expira_em < timezone.now():
        raise generico
    if reg.tentativas >= MAX_TENTATIVAS:
        reg.usado = True
        reg.save(update_fields=["usado"])
        raise generico
    if not check_password(codigo, reg.code_hash):
        reg.tentativas += 1
        reg.save(update_fields=["tentativas"])
        raise generico
    user.set_password(nova_senha)
    user.save(update_fields=["password"])
    reg.usado = True
    reg.save(update_fields=["usado"])
```

- [ ] **Step 4: Adicionar os serializers**

Em `backend/accounts/serializers.py` (após `UserSerializer`), e garantir que `validate_password` já está importado no topo (está — usado pelo `RegisterSerializer`):

```python
class EsqueciSenhaSerializer(serializers.Serializer):
    email = serializers.EmailField()


class RedefinirSenhaSerializer(serializers.Serializer):
    email = serializers.EmailField()
    codigo = serializers.CharField()
    nova_senha = serializers.CharField(min_length=8)

    def validate_nova_senha(self, value):
        validate_password(value)
        return value
```

- [ ] **Step 5: Adicionar as views**

Em `backend/accounts/views.py`: incluir `EsqueciSenhaSerializer` e `RedefinirSenhaSerializer` no import de `.serializers`, adicionar `from . import reset_senha`, e as views (após `LoginView`):

```python
class EsqueciSenhaView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = EsqueciSenhaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reset_senha.solicitar(serializer.validated_data["email"])
        return Response({"detail": "Se o e-mail existir, enviamos um código."})


class RedefinirSenhaView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RedefinirSenhaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            reset_senha.redefinir(
                serializer.validated_data["email"],
                serializer.validated_data["codigo"],
                serializer.validated_data["nova_senha"],
            )
        except reset_senha.CodigoInvalido as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Senha redefinida com sucesso."})
```

- [ ] **Step 6: Registrar as rotas**

Em `backend/accounts/urls.py`, adicionar dentro de `urlpatterns`:

```python
    path("esqueci-senha/", views.EsqueciSenhaView.as_view(), name="auth-esqueci-senha"),
    path("redefinir-senha/", views.RedefinirSenhaView.as_view(), name="auth-redefinir-senha"),
```

- [ ] **Step 7: Rodar os testes e ver passar**

Run: `.venv/bin/python manage.py test accounts.tests.RecuperacaoSenhaTests -v 2`
Expected: PASS (6 testes). Depois a suíte inteira: `.venv/bin/python manage.py test accounts -v 2` (tudo verde).

- [ ] **Step 8: Commit**

```bash
git add backend/accounts/reset_senha.py backend/accounts/serializers.py backend/accounts/views.py backend/accounts/urls.py backend/accounts/tests.py
git commit -m "feat(accounts): endpoints de recuperação de senha (esqueci/redefinir) por código OTP

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Frontend — Funções de API (`esqueciSenha`, `redefinirSenha`)

**Files:**
- Modify: `frontend/src/api/auth.ts`

**Interfaces:**
- Consumes: `postJson`, `ApiError` (já em `auth.ts`).
- Produces: `esqueciSenha(email): Promise<void>`; `redefinirSenha(email, codigo, nova_senha): Promise<void>`.

- [ ] **Step 1: Adicionar as funções**

Em `frontend/src/api/auth.ts`, após `registrar` (por volta da linha 83):

```typescript
export async function esqueciSenha(email: string): Promise<void> {
  await postJson<{ detail: string }>('/auth/esqueci-senha/', { email });
}

export async function redefinirSenha(
  email: string,
  codigo: string,
  nova_senha: string
): Promise<void> {
  await postJson<{ detail: string }>('/auth/redefinir-senha/', { email, codigo, nova_senha });
}
```

- [ ] **Step 2: Type-check**

Run: `cd "/Users/viniciusrodrigues/Documents/Vinicius/Cafe com proposito/frontend" && nvm use v20.20.2 && ./node_modules/.bin/tsc --noEmit -p tsconfig.json`
Expected: só os erros pré-existentes conhecidos (Field.tsx:38 + erros de typed-route); nenhum novo. Confirmar via `git stash` A/B se preciso.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/auth.ts
git commit -m "feat(app): funções de API para recuperação de senha (esqueci/redefinir)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Frontend — Tela `recuperar-senha.tsx` (2 fases) + ligar "Esqueci a senha"

**Files:**
- Create: `frontend/src/app/(auth)/recuperar-senha.tsx`
- Modify: `frontend/src/app/(auth)/entrar.tsx`

**Interfaces:**
- Consumes: `esqueciSenha`/`redefinirSenha`/`ApiError` (Task 3), `Field`/`Button`.

- [ ] **Step 1: Criar a tela `recuperar-senha.tsx`**

Criar `frontend/src/app/(auth)/recuperar-senha.tsx`:

```tsx
/** Recuperação de senha por código OTP. Duas fases: pedir código → redefinir. */
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Field from '@/components/Field';
import Button from '@/components/Button';
import { esqueciSenha, redefinirSenha, ApiError } from '@/api/auth';
import { fonts, palette, spacing } from '@/theme/ccpTheme';
import { useTheme } from '@/theme/useTheme';

export default function RecuperarSenha() {
  const t = useTheme();
  const router = useRouter();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();

  const [fase, setFase] = useState<'pedir' | 'redefinir'>('pedir');
  const [email, setEmail] = useState(emailParam ?? '');
  const [codigo, setCodigo] = useState('');
  const [nova, setNova] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const pedir = async () => {
    setErro(null);
    setCarregando(true);
    try {
      await esqueciSenha(email.trim());
      setFase('redefinir');
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível enviar o código.');
    } finally {
      setCarregando(false);
    }
  };

  const redefinir = async () => {
    setErro(null);
    if (nova !== confirmar) {
      setErro('A nova senha e a confirmação não conferem.');
      return;
    }
    setCarregando(true);
    try {
      await redefinirSenha(email.trim(), codigo.trim(), nova);
      Alert.alert('Pronto', 'Sua senha foi redefinida. Entre com a nova senha.');
      router.replace({ pathname: '/(auth)/entrar', params: { email: email.trim() } });
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível redefinir a senha.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.ui.fundo }]} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.voltar} accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={24} color={palette.cafeEscuro} />
        </Pressable>
        <Text style={styles.titulo}>Recuperar senha</Text>

        {fase === 'pedir' ? (
          <>
            <Text style={styles.sub}>Informe seu e-mail e enviaremos um código de 6 dígitos.</Text>
            <Field
              label="E-mail"
              icon="cafe-outline"
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.field}
            />
            {!!erro && <Text style={styles.erro}>{erro}</Text>}
            <Button
              label={carregando ? 'Enviando…' : 'Enviar código'}
              onPress={pedir}
              disabled={carregando || email.trim().length < 4}
              style={styles.cta}
            />
          </>
        ) : (
          <>
            <Text style={styles.sub}>
              Enviamos um código para {email.trim()}. Digite-o abaixo com a nova senha.
            </Text>
            <Field
              label="Código"
              icon="mail-outline"
              value={codigo}
              onChangeText={setCodigo}
              placeholder="000000"
              keyboardType="number-pad"
              style={styles.field}
            />
            <Field label="Nova senha" secure value={nova} onChangeText={setNova} placeholder="Mínimo 8 caracteres" style={styles.field} />
            <Field label="Confirmar nova senha" secure value={confirmar} onChangeText={setConfirmar} style={styles.field} />
            {!!erro && <Text style={styles.erro}>{erro}</Text>}
            <Button
              label={carregando ? 'Salvando…' : 'Redefinir senha'}
              onPress={redefinir}
              disabled={carregando || codigo.trim().length === 0 || nova.length < 8}
              style={styles.cta}
            />
            <Pressable onPress={pedir} style={styles.reenviar} hitSlop={6} disabled={carregando}>
              <Text style={styles.reenviarText}>Reenviar código</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 30, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  voltar: { alignSelf: 'flex-start', marginBottom: spacing.sm },
  titulo: { fontFamily: fonts.serif, fontSize: 30, color: palette.cafeEscuro, marginBottom: 8 },
  sub: { fontFamily: fonts.sans, fontSize: 14, color: '#6E625A', marginBottom: spacing.sm, lineHeight: 20 },
  field: { marginTop: 16 },
  erro: { fontFamily: fonts.sans, fontSize: 13, color: palette.erro, marginTop: 14, textAlign: 'center' },
  cta: { marginTop: 24 },
  reenviar: { alignSelf: 'center', marginTop: 18 },
  reenviarText: { fontFamily: fonts.sansBold, fontSize: 13, color: palette.douradoAmanhecer },
});
```

- [ ] **Step 2: Ligar o "Esqueci a senha" na tela Entrar**

Em `frontend/src/app/(auth)/entrar.tsx`, trocar o `onPress` do link "Esqueci a senha" (hoje `emBreve`) por navegação, levando o e-mail digitado:

```tsx
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/(auth)/recuperar-senha',
                params: email.trim() ? { email: email.trim() } : {},
              })
            }
            style={styles.esqueci}
            hitSlop={6}
          >
            <Text style={styles.esqueciText}>Esqueci a senha</Text>
          </Pressable>
```

(Manter a função `emBreve` — ela ainda pode ser usada em outro lugar? Confirmar: se ela ficar sem uso após esta troca, remover a função `emBreve` e o import de `Alert` caso fique sem uso, para não deixar código morto / erro de lint. Se `Alert` continuar usado, manter.)

- [ ] **Step 3: Type-check**

Run: `cd "/Users/viniciusrodrigues/Documents/Vinicius/Cafe com proposito/frontend" && nvm use v20.20.2 && ./node_modules/.bin/tsc --noEmit -p tsconfig.json`
Expected: só os erros pré-existentes (Field.tsx:38 + typed-route); nenhum novo. Nota: como a tela nova é uma rota nova, pode ser preciso rodar `expo start` uma vez para regenerar o cache de typed-routes (`.expo/types/router.d.ts`) antes do `router.push`/`router.replace` tipar sem erro — se aparecer erro só de rota nas linhas novas, regenerar e reconferir.

- [ ] **Step 4: Verificação manual (após deploy do backend + no dev build)**

Sem verificação no dispositivo aqui além do `tsc`. No fim (com o backend deployado e as env vars do Resend setadas): pedir código com um e-mail real de teste, conferir o e-mail, redefinir e logar com a nova senha.

- [ ] **Step 5: Commit**

```bash
git add "frontend/src/app/(auth)/recuperar-senha.tsx" "frontend/src/app/(auth)/entrar.tsx"
git commit -m "feat(app): tela de recuperação de senha (código OTP) + liga 'Esqueci a senha'

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Notas finais para o implementador

- Backend: rodar a suíte completa ao terminar a Task 2: `cd backend && .venv/bin/python manage.py test accounts -v 2`.
- Frontend: verificação real é manual, no app apontando pro backend com o e-mail configurado.
- **Config no Render (fora do código):** setar `RESEND_API_KEY` e `DEFAULT_FROM_EMAIL` nas env vars do backend (o Vinícius faz). Sem `RESEND_API_KEY`, o backend usa o console (não envia e-mail de verdade).
- Antes de mergear: `git fetch origin` + rebase em `origin/main` (sessão-irmã ativa tocando `accounts/`).
