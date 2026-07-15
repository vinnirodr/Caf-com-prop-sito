# Assinaturas (Premium manual + painel + sync RevenueCat) — Design/Spec

## Objetivo
Dar ao dono o poder de **tornar um usuário premium sem pagamento** (comp/brinde), com um
**gerenciador** no admin, e preparar a **sincronização das assinaturas reais** do RevenueCat.
No app, o cliente vê o próprio status numa área chamada **"Assinaturas"**.

## Decisões (fechadas com o dono)
- Escopo: **premium manual + painel das assinaturas reais** (webhook do RevenueCat).
- Premium manual: **liga/desliga + validade opcional** (sem data = permanente).
- Área do cliente no app chama **"Assinaturas"**; o gerenciador do dono fica no **Django admin**.
- Premium efetivo = **manual válido OU pago (RevenueCat) válido OU** RevenueCat client-side.

## Backend (app `accounts`)
### Campos no `Profile` (`accounts/models.py`)
- `premium_manual` (BooleanField, default False) — concessão manual (comp).
- `premium_manual_ate` (DateField, null=True, blank=True) — validade do manual; vazio = permanente.
- `premium_pago_ate` (DateTimeField, null=True, blank=True) — validade da assinatura paga (sync RevenueCat).
- `rc_ultimo_evento` (CharField, blank=True) — último evento do RevenueCat (auditoria no painel).
- **Propriedade `premium_ativo`**:
  ```python
  manual = self.premium_manual and (self.premium_manual_ate is None or self.premium_manual_ate >= date.today())
  pago = self.premium_pago_ate is not None and self.premium_pago_ate >= timezone.now()
  return manual or pago
  ```
- Migration nova.

### Admin — gerenciador de assinaturas (`accounts/admin.py`)
- Registrar `Profile` (ou inline no User) com um `ProfileAdmin`:
  - `list_display`: usuário (e-mail), `premium_badge` (✓/✗ via `premium_ativo`), origem (Manual/Pago/—), `premium_manual`, `premium_manual_ate`, `premium_pago_ate`.
  - `list_editable`: `premium_manual`, `premium_manual_ate` (liga premium + validade direto na lista).
  - `list_filter`: `premium_manual`; um filtro custom "É premium?" (baseado em `premium_ativo`).
  - `search_fields`: `usuario__email`, `usuario__first_name`, `usuario__last_name`.
  - verbose_name = "assinatura" / "assinaturas" (pra a seção no admin chamar "Assinaturas").
  - `readonly_fields`: `premium_pago_ate`, `rc_ultimo_evento` (só o webhook mexe).

### API do usuário (`/api/auth/eu/` — `UserSerializer`)
- Adicionar ao `fields`: `premium` (SerializerMethodField = `obj.profile.premium_ativo`) e
  `premium_ate` (a data efetiva mais distante entre manual/pago, ou null) p/ a tela mostrar "até DD/MM".

### Webhook do RevenueCat (`accounts/assinaturas.py` + url + view)
- `POST /api/assinaturas/revenuecat-webhook/`:
  - Verifica header `Authorization` == `settings.REVENUECAT_WEBHOOK_AUTH` (env; se não setado, retorna 503 "não configurado" — gracioso, não quebra).
  - Body do RevenueCat: `event.type`, `event.app_user_id`, `event.expiration_at_ms`, `event.product_id`.
  - Acha o user por `id == app_user_id` (o app faz `Purchases.logIn(user.id)` → app_user_id = nosso id).
    Se `app_user_id` for anônimo (`$RCAnonymousID:...`) ou user inexistente → ignora (200).
  - Eventos que **ativam/estendem**: `INITIAL_PURCHASE`, `RENEWAL`, `PRODUCT_CHANGE`, `UNCANCELLATION` →
    `premium_pago_ate = from_ms(expiration_at_ms)`.
  - Eventos que **encerram**: `CANCELLATION` (mantém até expirar — não mexe no `pago_ate`),
    `EXPIRATION` → `premium_pago_ate = None`.
  - Sempre grava `rc_ultimo_evento = event.type`. Responde 200 (RevenueCat re-tenta em não-200).
- Migration não precisa (só usa os campos já criados).

## App (frontend)
### Tipos + API (`src/api/auth.ts`)
- `Usuario` ganha `premium: boolean` e `premium_ate?: string | null` (vindos do `/eu/`).

### Premium combinado (`src/subscription/PremiumContext.tsx`)
- `usePremium().premium` = **`user?.premium` (backend) OU** o premium do RevenueCat (client-side).
  - Consome o `user` do `AuthContext` (o provider precisa estar dentro do AuthProvider — já está).
  - Recalcula quando `user` muda (login/logout/refresh do `/eu/`).
- **`Purchases.logIn(String(user.id))`** ao logar (em `purchases.ts` + chamado no login/boot com user);
  `Purchases.logOut()` ao sair. No-op gracioso sem chave (respeita `configuradoRevenueCat()`).

### Tela "Assinaturas" (`src/app/assinaturas.tsx` — NOVA)
- Item **"Assinaturas"** no menu de `(tabs)/meu-espaco.tsx` (ícone `card-outline` ou `star-outline`),
  `requerLogin: true`, rota `/assinaturas`.
- Conteúdo (usa `usePremium()` + `user`):
  - **Premium ativo** → card "Premium ativo" (+ "até DD/MM" se `premium_ate`), texto de agradecimento,
    link "Restaurar compras".
  - **Plano gratuito** → resumo dos benefícios + botão **"Assinar Premium"** → `router.push('/premium')`
    (paywall que já existe) + "Restaurar compras".
- Registrar `<Stack.Screen name="assinaturas" />` no `_layout.tsx`.

### Config (`eas.json` / settings)
- Backend: env `REVENUECAT_WEBHOOK_AUTH` (segredo do webhook; vazio = webhook desabilitado, gracioso).

## Faseamento
- **Manual:** funciona no deploy (admin liga → `/eu/` reflete → app respeita). ✅
- **Sync pago (webhook):** código pronto; **ativa** quando o RevenueCat existir (produtos + chave +
  configurar a URL do webhook + `REVENUECAT_WEBHOOK_AUTH` no painel do RevenueCat e no Render).

## Fora de escopo (YAGNI)
- Cancelar/reembolsar assinatura pelo app; histórico completo de eventos; relatórios de receita.

## Verificação
1. Backend: admin mostra "Assinaturas"; ligar `premium_manual` num user → `/api/auth/eu/` (autenticado)
   retorna `premium: true`. Teste: webhook com segredo + evento INITIAL_PURCHASE seta `premium_pago_ate`;
   sem segredo → 503; app_user_id anônimo → 200 e ignora. Expiração de `premium_manual_ate` no passado → premium false.
2. App: logado sem premium → Meu Espaço mostra "Assinaturas" → "Plano gratuito" + "Assinar Premium".
   Com `premium_manual` ligado no admin (e re-login/refresh) → gating de áudio cap.3+ libera e a tela
   mostra "Premium ativo".
3. `npx tsc --noEmit` limpo (só `Field.tsx:38`); `manage.py test` verde.
