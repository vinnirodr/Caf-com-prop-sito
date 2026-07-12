# Monetização — assinatura Premium + doação (HANDOFF para a sessão LOCAL 💻)

> A sessão CLOUD (☁️) fez o design/decisões abaixo, mas **NÃO implementou** — a
> integração é nativa (RevenueCat/Play Billing) e precisa de build/teste local, então
> fica com a **sessão LOCAL**. Este doc é a especificação do que queremos.

## Objetivo
1. **Assinatura Premium** funcional, com o dinheiro caindo na conta do dono via Google
   Play (perfil de pagamentos/merchant → banco).
2. **Doação** no perfil ("Apoiar o projeto"), valores **R$2 a R$20**, só pra manter o
   projeto no ar.

## Decisões já tomadas (pelo dono)
- **Ambas via Google Play Billing** (conteúdo digital in-app **obriga** Play Billing —
  Stripe/PIX é reprovado pelo Google).
- Camada: **RevenueCat** (grátis até bom volume; já era o plano do projeto).
- **Doação = compras únicas** (consumíveis, permite repetir) nos tiers R$2/5/10/20.
- **Premium** desbloqueia o **áudio dos capítulos 3+** (a leitura é sempre livre).

## O que já existe no código (pontos de integração)
- `frontend/src/app/premium.tsx` — **paywall pronto (UI)**; hoje o botão "Assinar" só faz
  `Alert('Em breve')`. Tem tiers Anual (R$79,90) e Mensal (R$9,90) como placeholder.
- `frontend/src/lib/audio.ts` — `bloqueadoPremium(cap, assinante)` já recebe um booleano
  `assinante`. Hoje é chamado **hardcoded `false`** em:
  - `frontend/src/app/capitulo/[numero].tsx` (botão Ouvir + ícone de cadeado)
  - `frontend/src/app/(tabs)/index.tsx` (card "Ouvir")
  → basta trocar o `false` pelo estado real de assinante.
- `frontend/src/app/(tabs)/meu-espaco.tsx` — menu do perfil (adicionar "Apoiar o projeto").
- `frontend/src/app/_layout.tsx` — Stack raiz + providers (registrar tela de doação + provider de compras).
- `frontend/eas.json` — perfis EAS (adicionar a env da chave do RevenueCat).

## Implementação sugerida (frontend)
- Adicionar `react-native-purchases` (⚠️ **conferir versão p/ Expo SDK 56 / RN 0.85** via
  `npx expo install react-native-purchases`).
- `src/lib/purchases.ts` — init do RevenueCat com `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`
  (se a chave não existir, **no-op gracioso** para não quebrar o app sem config); helpers
  `getOfertaPremium/getOfertaDoacao/comprar/restaurar/checarPremium`.
- `src/subscription/PremiumContext.tsx` — `usePremium()` → `{ premium, loading }` a partir
  do customerInfo (+ listener); provider no `_layout.tsx`.
- **Gating real:** trocar `bloqueadoPremium(cap, false)` por `usePremium()` nos 2 arquivos acima.
- `src/app/apoiar.tsx` — tela de doação (tiers R$2/5/10/20; agradecimento; fallback "em breve").
- `premium.tsx` — ligar às offerings reais (comprar/restaurar); manter "em breve" sem config.
- eas.json — env `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` (vazia até existir a chave).

## O que depende do DONO (fora do código) — bloqueado até a conta aprovar
- **Conta Play aprovada** (em verificação de identidade — leva alguns dias).
- **Perfil de pagamentos / merchant** no Play Console → conta bancária (é assim que o
  dinheiro chega). Taxa do Google: **15%** em assinaturas (programa de pequenas empresas).
- **Produtos no Play Console:** assinatura mensal + anual; 4 produtos únicos de doação
  (R$2/5/10/20). Definir preços em BRL.
- **RevenueCat:** criar projeto, conectar o Play (service account), definir entitlement
  `premium`, offerings (`default` = pacotes premium; `doacao` = os 4 tiers), pegar a
  **chave pública Android** → setar `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` no eas.json.
- **License testers** no Play Console para testar a compra sem cobrar.

## Caveats
- **Não fica funcional** até: conta aprovada + produtos + RevenueCat + chave + build novo.
- `react-native-purchases` é **lib nativa** → exige build (EAS) e testar em teste interno.
- Doação como **consumível** (permite doar de novo). Não confunde com assinatura.

## Fluxo do dinheiro (resumo)
Usuário paga no app (Play Billing) → Google desconta a taxa → repassa ao **perfil de
pagamentos do Google Play** → cai na **conta bancária** cadastrada. Sem intermediário
externo; tudo dentro da política da Play.
