# Assinaturas (Premium manual + admin + webhook RevenueCat) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir premium manual (comp, sem pagamento) gerenciado no admin, expor `premium` na API, e o app respeitar (backend OU RevenueCat); + webhook do RevenueCat (gracioso) pronto p/ sincronizar assinaturas pagas.

**Architecture:** Campos de premium no `Profile` + propriedade `premium_ativo`. Proxy model `Assinatura` dá a seção "Assinaturas" no admin. `/api/auth/eu/` devolve `premium`/`premium_ate`. Webhook `/api/assinaturas/revenuecat-webhook/` atualiza `premium_pago_ate`. App combina `user.premium` com RevenueCat e tem a tela "Assinaturas".

**Tech Stack:** Django + DRF (backend); React Native/Expo/TS, expo-router, react-native-purchases (frontend).

## Global Constraints
- **Gate backend:** `cd backend && .venv/bin/python manage.py test accounts` (e suíte completa verde).
- **Gate frontend:** `cd frontend && npx tsc --noEmit` — aceitável só o pré-existente `src/components/Field.tsx:38`.
- **Gracioso:** webhook sem `REVENUECAT_WEBHOOK_AUTH` → 503 (desabilitado), não quebra. `Purchases.logIn/logOut` no-op sem chave (via `configuradoRevenueCat()`).
- **Premium efetivo** = `premium_manual` válido **OU** `premium_pago_ate` no futuro. App: `user?.premium || RevenueCat`.
- Textos PT; tokens de `@/theme/ccpTheme`. Node 20 p/ front. Migrations versionadas.
- **Só ADIÇÃO** em arquivos compartilhados (`models.py`, `admin.py`, `serializers.py`, `urls.py`, `settings.py`, `meu-espaco.tsx`, `_layout.tsx`, `auth.ts`, `PremiumContext.tsx`, `purchases.ts`).

---

### Task 1: Backend — campos premium no Profile + `premium_ativo` + proxy `Assinatura` + migration

**Files:** Modify `backend/accounts/models.py`; Create migration; Test `backend/accounts/tests.py`.

- [ ] **Step 1: Teste que falha** — em `accounts/tests.py` (append):
```python
class PremiumProfileTests(TestCase):
    def test_premium_ativo_manual_e_pago(self):
        from datetime import date, timedelta
        from django.utils import timezone
        from accounts.models import Profile
        u = criar_usuario(email="prem@example.com")
        p = u.perfil
        self.assertFalse(p.premium_ativo)
        p.premium_manual = True
        self.assertTrue(p.premium_ativo)  # manual sem validade = permanente
        p.premium_manual_ate = date.today() - timedelta(days=1)
        self.assertFalse(p.premium_ativo)  # manual expirado
        p.premium_manual = False
        p.premium_pago_ate = timezone.now() + timedelta(days=5)
        self.assertTrue(p.premium_ativo)  # pago válido
        p.premium_pago_ate = timezone.now() - timedelta(days=1)
        self.assertFalse(p.premium_ativo)  # pago expirado
```
(Se `criar_usuario` não cria o `Profile` automaticamente, garanta `Profile.objects.get_or_create(usuario=u)`; verificar como o signal/registro cria o perfil hoje.)

- [ ] **Step 2: Rodar — falha** (`premium_manual` não existe):
`cd backend && .venv/bin/python manage.py test accounts.tests.PremiumProfileTests -v 2`

- [ ] **Step 3: Campos + propriedade + proxy** — em `accounts/models.py`:
Import no topo: `from datetime import date` e `from django.utils import timezone` (se ainda não).
No `Profile`, adicionar campos (após `notificacoes_ativas`):
```python
    premium_manual = models.BooleanField(
        "premium (concedido)", default=False,
        help_text="Liga o Premium manualmente (comp/brinde), sem pagamento.",
    )
    premium_manual_ate = models.DateField(
        "premium manual até", null=True, blank=True,
        help_text="Opcional. Vazio = permanente; com data = expira nesse dia.",
    )
    premium_pago_ate = models.DateTimeField(
        "premium pago até", null=True, blank=True,
        help_text="Validade da assinatura paga (sincronizada do RevenueCat).",
    )
    rc_ultimo_evento = models.CharField("último evento RevenueCat", max_length=60, blank=True, default="")
```
Propriedade no `Profile`:
```python
    @property
    def premium_ativo(self):
        manual = self.premium_manual and (
            self.premium_manual_ate is None or self.premium_manual_ate >= date.today()
        )
        pago = self.premium_pago_ate is not None and self.premium_pago_ate >= timezone.now()
        return bool(manual or pago)

    @property
    def premium_ate(self):
        """Data efetiva mais distante (manual/pago) enquanto premium; senão None."""
        from datetime import datetime, time
        candidatos = []
        if self.premium_manual and self.premium_manual_ate:
            candidatos.append(timezone.make_aware(datetime.combine(self.premium_manual_ate, time.max)))
        if self.premium_pago_ate:
            candidatos.append(self.premium_pago_ate)
        return max(candidatos) if candidatos else None
```
Proxy model (fim do arquivo, ou perto do Profile):
```python
class Assinatura(Profile):
    class Meta:
        proxy = True
        verbose_name = "assinatura"
        verbose_name_plural = "assinaturas"
```

- [ ] **Step 4: Migration** — `cd backend && .venv/bin/python manage.py makemigrations accounts` (cria os 4 campos + o proxy Assinatura).

- [ ] **Step 5: Rodar — passa** — `cd backend && .venv/bin/python manage.py test accounts -v 2` e depois `manage.py test` (suíte inteira verde).

- [ ] **Step 6: Commit**
```bash
git add backend/accounts/models.py backend/accounts/migrations/ backend/accounts/tests.py
git commit -m "feat(assinaturas): campos premium no Profile + premium_ativo + proxy Assinatura"
```

---

### Task 2: Backend — admin "Assinaturas" (gerenciador)

**Files:** Modify `backend/accounts/admin.py`.

- [ ] **Step 1: Registrar o proxy + mostrar premium no inline** — em `accounts/admin.py`:
Import: adicionar `Assinatura` ao `from .models import ...`.
No `ProfileInline.fields`, adicionar os campos de premium (pra aparecer ao editar o usuário):
```python
    fields = ("telefone", "data_nascimento", "push_token", "notificacoes_ativas",
              "premium_manual", "premium_manual_ate", "premium_pago_ate", "rc_ultimo_evento")
    readonly_fields = ("push_token", "premium_pago_ate", "rc_ultimo_evento")
```
Registrar o admin dedicado "Assinaturas":
```python
@admin.register(Assinatura)
class AssinaturaAdmin(admin.ModelAdmin):
    list_display = ("usuario", "premium_badge", "origem", "premium_manual", "premium_manual_ate", "premium_pago_ate")
    list_editable = ("premium_manual", "premium_manual_ate")
    list_filter = ("premium_manual",)
    search_fields = ("usuario__email", "usuario__first_name", "usuario__last_name", "usuario__username")
    readonly_fields = ("premium_pago_ate", "rc_ultimo_evento", "criado_em")

    @admin.display(description="premium", boolean=True)
    def premium_badge(self, obj):
        return obj.premium_ativo

    @admin.display(description="origem")
    def origem(self, obj):
        if obj.premium_manual:
            return "Manual"
        if obj.premium_pago_ate:
            return "Pago"
        return "—"
```

- [ ] **Step 2: Sistema check** — `cd backend && .venv/bin/python manage.py check` (sem erros de admin).
- [ ] **Step 3: Rodar testes** — `manage.py test accounts` verde.
- [ ] **Step 4: Commit**
```bash
git add backend/accounts/admin.py
git commit -m "feat(assinaturas): admin 'Assinaturas' (liga premium manual + lista/filtro)"
```

---

### Task 3: Backend — `/api/auth/eu/` devolve `premium` + `premium_ate`

**Files:** Modify `backend/accounts/serializers.py`; Test `backend/accounts/tests.py`.

- [ ] **Step 1: Teste que falha** — em `accounts/tests.py` (append; usa DRF client autenticado):
```python
class EuPremiumTests(APITestCase):
    def test_eu_reflete_premium_manual(self):
        u = criar_usuario(email="eu@example.com")
        self.client.force_authenticate(user=u)
        resp = self.client.get("/api/auth/eu/")
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.json()["premium"])
        u.perfil.premium_manual = True
        u.perfil.save()
        resp = self.client.get("/api/auth/eu/")
        self.assertTrue(resp.json()["premium"])
```
- [ ] **Step 2: Rodar — falha** (`premium` não no payload).
- [ ] **Step 3: Serializer** — em `accounts/serializers.py`, no `UserSerializer`:
Adicionar campos method:
```python
    premium = serializers.SerializerMethodField()
    premium_ate = serializers.SerializerMethodField()

    def get_premium(self, obj):
        perfil = getattr(obj, "perfil", None)
        return bool(perfil and perfil.premium_ativo)

    def get_premium_ate(self, obj):
        perfil = getattr(obj, "perfil", None)
        return perfil.premium_ate.isoformat() if (perfil and perfil.premium_ate) else None
```
E adicionar `"premium", "premium_ate"` ao `Meta.fields`.
- [ ] **Step 4: Rodar — passa** — `manage.py test accounts`.
- [ ] **Step 5: Commit**
```bash
git add backend/accounts/serializers.py backend/accounts/tests.py
git commit -m "feat(assinaturas): /api/auth/eu/ devolve premium + premium_ate"
```

---

### Task 4: Backend — webhook do RevenueCat

**Files:** Create `backend/accounts/assinaturas.py`; Modify `backend/cafe_backend/urls.py` (rota raiz), `backend/cafe_backend/settings.py`; Test `backend/accounts/tests.py`.

- [ ] **Step 1: Teste que falha** — em `accounts/tests.py`:
```python
@override_settings(REVENUECAT_WEBHOOK_AUTH="segredo123")
class RevenueCatWebhookTests(APITestCase):
    def _evento(self, tipo, app_user_id, exp_ms=None):
        return {"event": {"type": tipo, "app_user_id": str(app_user_id), "expiration_at_ms": exp_ms}}

    def test_compra_ativa_premium_pago(self):
        import time
        u = criar_usuario(email="rc@example.com")
        exp = int((time.time() + 30 * 86400) * 1000)
        resp = self.client.post("/api/assinaturas/revenuecat-webhook/",
                                self._evento("INITIAL_PURCHASE", u.id, exp),
                                format="json", HTTP_AUTHORIZATION="segredo123")
        self.assertEqual(resp.status_code, 200)
        u.perfil.refresh_from_db()
        self.assertIsNotNone(u.perfil.premium_pago_ate)
        self.assertTrue(u.perfil.premium_ativo)

    def test_sem_segredo_rejeita(self):
        u = criar_usuario(email="rc2@example.com")
        resp = self.client.post("/api/assinaturas/revenuecat-webhook/",
                                self._evento("INITIAL_PURCHASE", u.id, 1),
                                format="json", HTTP_AUTHORIZATION="errado")
        self.assertEqual(resp.status_code, 401)

    def test_app_user_anonimo_ignora(self):
        resp = self.client.post("/api/assinaturas/revenuecat-webhook/",
                                self._evento("INITIAL_PURCHASE", "$RCAnonymousID:abc", 1),
                                format="json", HTTP_AUTHORIZATION="segredo123")
        self.assertEqual(resp.status_code, 200)
```
- [ ] **Step 2: Rodar — falha** (endpoint não existe).
- [ ] **Step 3: settings** — em `cafe_backend/settings.py` (perto de RESEND_API_KEY):
```python
REVENUECAT_WEBHOOK_AUTH = env("REVENUECAT_WEBHOOK_AUTH", "")
```
- [ ] **Step 4: View do webhook** — criar `backend/accounts/assinaturas.py`:
```python
"""Webhook do RevenueCat: sincroniza a assinatura paga no Profile."""
from datetime import datetime, timezone as dt_timezone

from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

User = get_user_model()

ATIVA = {"INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION"}
ENCERRA = {"EXPIRATION"}


class RevenueCatWebhook(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        segredo = settings.REVENUECAT_WEBHOOK_AUTH
        if not segredo:
            return Response({"detail": "webhook não configurado"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        if request.headers.get("Authorization") != segredo:
            return Response({"detail": "não autorizado"}, status=status.HTTP_401_UNAUTHORIZED)

        evento = (request.data or {}).get("event", {})
        tipo = evento.get("type", "")
        app_user_id = str(evento.get("app_user_id", ""))
        if not app_user_id or app_user_id.startswith("$RCAnonymousID"):
            return Response({"detail": "ignorado (anônimo)"}, status=status.HTTP_200_OK)
        try:
            user = User.objects.get(pk=int(app_user_id))
        except (User.DoesNotExist, ValueError):
            return Response({"detail": "ignorado (sem usuário)"}, status=status.HTTP_200_OK)

        perfil = user.perfil
        if tipo in ATIVA:
            exp_ms = evento.get("expiration_at_ms")
            if exp_ms:
                perfil.premium_pago_ate = datetime.fromtimestamp(int(exp_ms) / 1000, tz=dt_timezone.utc)
        elif tipo in ENCERRA:
            perfil.premium_pago_ate = None
        perfil.rc_ultimo_evento = tipo[:60]
        perfil.save(update_fields=["premium_pago_ate", "rc_ultimo_evento"])
        return Response({"detail": "ok"}, status=status.HTTP_200_OK)
```
- [ ] **Step 5: URL** — o app `accounts` entra sob `/api/auth/`, então o webhook vai no **`urls.py` raiz** (`backend/cafe_backend/urls.py`) p/ ficar em `/api/assinaturas/...`. Importar e adicionar ao `urlpatterns`:
```python
from accounts.assinaturas import RevenueCatWebhook
# ...
    path("api/assinaturas/revenuecat-webhook/", RevenueCatWebhook.as_view(), name="revenuecat-webhook"),
```
- [ ] **Step 6: Rodar — passa** — `manage.py test accounts` (3 testes do webhook + resto verde).
- [ ] **Step 7: Commit**
```bash
git add backend/accounts/assinaturas.py backend/accounts/urls.py backend/cafe_backend/settings.py backend/accounts/tests.py
git commit -m "feat(assinaturas): webhook RevenueCat (gracioso) atualiza premium pago"
```

---

### Task 5: App — premium combinado (backend OU RevenueCat) + logIn

**Files:** Modify `frontend/src/api/auth.ts` (tipo `Usuario`), `frontend/src/lib/purchases.ts` (`identificar`/`logOut`), `frontend/src/subscription/PremiumContext.tsx`, `frontend/src/auth/AuthContext.tsx` (chamar logIn/logOut no login/sair).

- [ ] **Step 1: `auth.ts`** — no tipo `Usuario`, adicionar `premium: boolean;` e `premium_ate?: string | null;`.
- [ ] **Step 2: `purchases.ts`** — adicionar (no-op gracioso):
```typescript
export async function identificarUsuario(id: string | number): Promise<void> {
  if (!configuradoRevenueCat()) return;
  try { await Purchases.logIn(String(id)); } catch { /* ignora */ }
}
export async function desidentificarUsuario(): Promise<void> {
  if (!configuradoRevenueCat()) return;
  try { await Purchases.logOut(); } catch { /* ignora */ }
}
```
- [ ] **Step 3: `PremiumContext.tsx`** — combinar backend + RevenueCat:
  - Importar `useAuth` de `@/auth/AuthContext`. Obter `const { user } = useAuth();`.
  - `premiumBackend = !!user?.premium`. Manter `premiumRC` do RevenueCat (o estado atual `premium` vira `premiumRC`).
  - Expor `premium: premiumBackend || premiumRC`. Ajustar o `value`/deps p/ recalcular quando `user?.premium` mudar.
  - ⚠️ Ordem de providers: `PremiumProvider` precisa estar **dentro** de `AuthProvider` no `_layout` (conferir; se não estiver, ajustar mantendo AudioProvider etc.).
- [ ] **Step 4: `AuthContext.tsx`** — chamar `identificarUsuario(user.id)` quando logar/boot com user, e `desidentificarUsuario()` no `sair`. (Reusar o padrão do `sairDoGoogle()` que já existe no `sair`.)
- [ ] **Step 5: Type-check** — `cd frontend && npx tsc --noEmit` (só Field.tsx:38).
- [ ] **Step 6: Commit**
```bash
git add frontend/src/api/auth.ts frontend/src/lib/purchases.ts frontend/src/subscription/PremiumContext.tsx frontend/src/auth/AuthContext.tsx
git commit -m "feat(assinaturas): premium = backend OU RevenueCat + logIn do usuário"
```

---

### Task 6: App — tela "Assinaturas" + item no menu + rota

**Files:** Create `frontend/src/app/assinaturas.tsx`; Modify `frontend/src/app/(tabs)/meu-espaco.tsx`, `frontend/src/app/_layout.tsx`.

- [ ] **Step 1: `assinaturas.tsx`** — tela (usa `usePremium()` + `useAuth()`; seguir o visual de `conta.tsx`):
  - Topbar voltar + "Assinaturas".
  - Se `premium`: card "Premium ativo" (se `user?.premium_ate`, "até {DD/MM/AAAA}"), texto de agradecimento; link "Restaurar compras" (chama `restaurar()` do `usePremium`).
  - Se não: card "Plano gratuito" + 2-3 benefícios do Premium + botão **"Assinar Premium"** → `router.push('/premium')`; link "Restaurar compras".
  - PT, tokens de `ccpTheme`; sem cor nova crua.
- [ ] **Step 2: menu** — em `(tabs)/meu-espaco.tsx`: estender `Rota` com `'/assinaturas'`; adicionar item ao `MENU` (antes de "Ajustes"): `{ icon: 'card-outline', label: 'Assinaturas', rota: '/assinaturas', requerLogin: true }`.
- [ ] **Step 3: rota** — em `_layout.tsx`: `<Stack.Screen name="assinaturas" />`.
- [ ] **Step 4: typed-routes + tsc** — nova rota exige regen dos typed-routes: `cd frontend && (source ~/.nvm/nvm.sh && nvm use v20.20.2); npx expo start` ~15s então matar (não commitar `.expo/`). Depois `npx tsc --noEmit` (só Field.tsx:38).
- [ ] **Step 5: Commit**
```bash
git add frontend/src/app/assinaturas.tsx "frontend/src/app/(tabs)/meu-espaco.tsx" frontend/src/app/_layout.tsx
git commit -m "feat(assinaturas): tela Assinaturas (status + assinar + restaurar) + menu"
```

---

### Task 7: Fecho — gates finais + COORDENACAO + PR

**Files:** Modify `COORDENACAO.md`.

- [ ] **Step 1: Gates** — `cd backend && .venv/bin/python manage.py test` (verde) + `cd frontend && npx tsc --noEmit` (só Field.tsx:38).
- [ ] **Step 2: COORDENACAO.md** (topo do Log):
```markdown
### 2026-07-14 · 💻 LOCAL · Assinaturas (premium manual + webhook RevenueCat)
- **Backend:** campos premium no Profile + `premium_ativo`; admin "Assinaturas" (liga premium sem
  pagar + lista/filtro); `/api/auth/eu/` devolve `premium`/`premium_ate`; webhook
  `/api/assinaturas/revenuecat-webhook/` (gracioso, env `REVENUECAT_WEBHOOK_AUTH`).
- **App:** `usePremium()` = backend OU RevenueCat; `Purchases.logIn(id)` no login; tela "Assinaturas"
  em Meu Espaço. Hotspots (só adição): models/admin/serializers/urls/settings, meu-espaco/_layout/
  auth.ts/PremiumContext/purchases.
- **Ativa já:** premium manual. **Pendente:** configurar webhook no painel do RevenueCat quando houver produtos/chave.
```
- [ ] **Step 3: Commit + push + PR**
```bash
git add COORDENACAO.md
git commit -m "docs(coordenacao): log das Assinaturas"
git push -u origin claude/assinaturas
gh pr create --base main --title "feat(assinaturas): premium manual + admin + webhook RevenueCat" --body "Premium manual (comp sem pagamento) gerenciado no admin 'Assinaturas'; /api/auth/eu/ expõe premium; app respeita (backend OU RevenueCat) + tela Assinaturas; webhook RevenueCat gracioso. Ver docs/superpowers/plans/2026-07-14-assinaturas.md."
```

---

## Notas de execução
- **Branch:** já em `claude/assinaturas` (base main 76ee45c). Não recriar.
- **Perfil auto-criado:** confirmado — `accounts/signals.py` cria o `Profile` via `post_save` (`get_or_create`). `u.perfil` já existe nos testes; não precisa criar à mão.
- **Prefixo da URL:** confirmado — `accounts` entra sob `/api/auth/` (raiz), então o webhook fica no `urls.py` **raiz** em `/api/assinaturas/revenuecat-webhook/` (Task 4 Step 5). Django `env()` já existe no settings (padrão `env("X", "")`).
- **Task 4 gate:** o step de "webhook `Authorization`" — DRF `request.headers.get("Authorization")` compara com o segredo cru (o RevenueCat manda o header exatamente como configurado no painel).
