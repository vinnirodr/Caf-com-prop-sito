# Testar pagamento (Premium + Doação) no teste fechado — passo a passo

> Objetivo: validar a compra **de ponta a ponta, sem cobrança real e sem produção**,
> usando testadores de licença no teste fechado da Play. **O código do app já está pronto**
> — o que falta é configuração nos painéis (Play + RevenueCat) e um build novo.

## Identificadores que o código espera (⚠️ use EXATAMENTE estes)
O app procura estes nomes — se digitar diferente, a compra não conecta:
- **Entitlement** (RevenueCat): `premium`
- **Offering de doação** (RevenueCat): `doacao`
- **Offering de assinatura:** o **current/default** (o padrão marcado no RevenueCat)
- Pacote (package): `com.cafecomproposito.app`
- Chave pública do SDK (já no `eas.json`): `goog_DnaSGpajOUwzQZfxgAPEUBBroQr`

Os **IDs dos produtos** na Play você escolhe (ex.: `premium_mensal`, `doacao_5`) — só precisam
ser **os mesmos** dos dois lados (Play e RevenueCat).

---

## Parte A — Google Play Console

### A1. Criar a assinatura Premium
1. Play Console → app **Café com Propósito** → menu **Monetizar com o Google Play → Produtos → Assinaturas**.
2. **Criar assinatura**:
   - **ID do produto:** `premium_mensal` (sugestão; não dá pra mudar depois).
   - **Nome:** "Premium".
3. Dentro dela, **Criar plano básico (base plan)**:
   - **ID do plano:** `mensal`.
   - Tipo: **Recorrente**, período **Mensal**.
   - **Preço:** defina (ex.: R$ 9,90) → salvar para o Brasil.
4. **Ativar** a assinatura e o plano (status *Ativo*).
5. (Opcional, depois) criar `premium_anual` no mesmo produto ou num produto separado.

### A2. Criar os produtos de Doação (in-app, uma vez)
> Doações são **produtos in-app do tipo "consumível"** (podem ser compradas de novo).
1. **Monetizar → Produtos → Produtos in-app → Criar produto**.
2. Para cada valor, um produto:
   - `doacao_5` — nome "Doação R$ 5" — preço R$ 5,00.
   - `doacao_10` — "Doação R$ 10" — R$ 10,00. (crie quantos quiser)
3. **Ativar** cada um.

### A3. Cadastrar os testadores de licença (compra grátis)
> Isso é o que faz a compra **não cobrar** (aparece "cartão de teste").
1. Play Console → **canto superior → troque para a visão da CONTA de desenvolvedor**
   (não a do app) → **Configuração → Teste de licença** (ou *Setup → License testing*).
2. Em **Testadores de licença**, adicione os **e-mails Gmail** dos testadores (os mesmos
   que já estão no teste fechado).
3. **Resposta de licença:** deixe `RESPOND_NORMALLY`. Salvar.
4. Garanta que cada testador **aceitou o convite** do teste fechado (Testar e lançar →
   Teste fechado → Testadores → link de convite).

---

## Parte B — RevenueCat

### B1. Conectar a conta de serviço do Google Play (validação server-side)
> O RevenueCat valida os recibos com o Google via conta de serviço.
1. RevenueCat → seu projeto → **Apps → (o app Android)** → seção **Service Account credentials JSON**.
2. Faça upload do JSON da conta de serviço. Pode ser a **mesma** já usada no `eas submit`
   (`play-publisher@winged-ray-442120-v2.iam.gserviceaccount.com`), **desde que** ela tenha,
   no Play Console → Usuários e permissões, as permissões: **Ver dados financeiros** e
   **Gerenciar pedidos e assinaturas**. Se não tiver, adicione e salve.
3. ⚠️ **Propagação:** o Google pode levar **até ~36h** pra liberar essas permissões. Se as
   compras derem erro de validação logo após configurar, quase sempre é isso — espere e tente de novo.

### B2. Importar os produtos no RevenueCat
1. RevenueCat → **Products → + New** (ou "Import from Play Store").
2. Adicione, com os **mesmos IDs** da Play:
   - `premium_mensal:mensal` (assinatura + base plan) — o RevenueCat mostra no formato `produto:plano`.
   - `doacao_5`, `doacao_10`, … (in-app).

### B3. Criar o Entitlement `premium`
1. RevenueCat → **Entitlements → + New**.
2. **Identifier:** `premium` (exato).
3. **Attach** o produto de assinatura (`premium_mensal:mensal`) a esse entitlement.
   *(As doações NÃO entram no entitlement — doar não vira Premium.)*

### B4. Criar os Offerings
1. RevenueCat → **Offerings → + New offering**.
2. **Offering "default"** (marque como **current**):
   - Adicione um **Package** (ex.: identifier `$rc_monthly` ou `mensal`) → produto
     `premium_mensal:mensal`. É o que a tela **Premium** vai mostrar.
3. **Offering `doacao`** (outro offering, identifier exatamente `doacao`):
   - Um Package por valor de doação, cada um ligado a `doacao_5`, `doacao_10`… É o que a
     tela **Apoiar** vai mostrar.

### B5. (Recomendado) Webhook → sincroniza Premium com o backend
> Sem isso, o app já reconhece o Premium na hora (via RevenueCat). O webhook serve pra o
> **backend** também saber (admin/Assinaturas, regras server-side). Já está implementado.
1. Gere um segredo forte (qualquer string longa).
2. Render → serviço `cafe-com-proposito-api` → **Environment** → `REVENUECAT_WEBHOOK_AUTH` = esse segredo → salvar.
3. RevenueCat → **Integrations → Webhooks → + New**:
   - **URL:** `https://cafe-com-proposito-api.onrender.com/api/assinaturas/revenuecat-webhook/`
   - **Authorization header:** o **mesmo** segredo do passo 1.
4. O backend liga o Premium em `INITIAL_PURCHASE/RENEWAL/PRODUCT_CHANGE/UNCANCELLATION` e
   desliga em `EXPIRATION`.

---

## Parte C — Build novo no teste fechado
O build atual dos testadores é anterior à chave do RevenueCat — precisa de um build novo
(com a chave já no `eas.json`) publicado no teste fechado. Ver **`docs/build-local-guia.md`**
(gerar AAB local + `eas submit`). Enquanto os produtos/offerings não existirem, o app mostra
"Em breve" automaticamente; assim que existirem + o build novo subir, o botão vira compra real.

---

## Parte D — O teste (quando A+B+C estiverem prontos)
1. No celular do **testador de licença**, atualize o app pela Play (teste fechado).
2. **Meu Espaço → (ou onde abre o Premium)** → tela **Premium** deve mostrar o **preço real**
   (não "Em breve").
3. Toque **Assinar** → abre a folha de compra do Google → deve aparecer **"Cartão de teste,
   sempre aprova"** → confirmar.
4. Esperado: alert "Tudo certo! Seu Premium está ativo" → o app **libera o áudio dos capítulos
   3+** e mostra o selo **Premium** no cartão do perfil.
5. **Doação:** tela **Apoiar** → escolher um valor → mesma folha de teste → confirma (não vira Premium).
6. **Restaurar compras:** reinstale/entre noutro aparelho com a mesma conta → "Restaurar" traz o Premium.

### Como "desfazer" uma compra de teste (pra testar de novo)
- Assinaturas de teste **renovam rápido e expiram sozinhas** (minutos, não meses).
- Pra cancelar na hora: Play Store (app) → **Pagamentos e assinaturas → Assinaturas** →
  Café com Propósito → **Cancelar**. Ou no Play Console → **Pedidos**.

---

## Erros comuns
- **Continua "Em breve":** offerings/produtos não ativos, IDs divergentes, ou o build é o
  antigo (sem a chave). Confirme A1/A2 ativos, B4 com **current** marcado, e o build novo.
- **"Item não disponível" / erro ao abrir a compra:** produto não ativo, o testador não é
  testador de licença, ou não aceitou o convite do teste fechado.
- **Compra abre mas RevenueCat não libera o `premium`:** permissões da conta de serviço
  ainda propagando (até ~36h), ou o produto não está **attachado** ao entitlement `premium`.
- **Cobrou de verdade:** a conta usada **não** está na lista de testadores de licença.

## Checklist rápido
- [ ] A1 assinatura `premium_mensal:mensal` ativa
- [ ] A2 produtos de doação ativos
- [ ] A3 testadores de licença cadastrados + convite aceito
- [ ] B1 conta de serviço no RevenueCat (com permissões financeiras)
- [ ] B2 produtos importados
- [ ] B3 entitlement `premium` com a assinatura attachada
- [ ] B4 offering **current** (Premium) + offering `doacao`
- [ ] B5 (opcional) webhook + `REVENUECAT_WEBHOOK_AUTH` no Render
- [ ] C build novo no teste fechado
- [ ] D compra de teste aprova e libera o Premium
