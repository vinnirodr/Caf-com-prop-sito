# Monetização (Premium + Doação) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar assinatura Premium e Doação via Google Play Billing + RevenueCat no app, com fallback gracioso (no-op sem a chave), de forma que ative sozinho quando a chave/produtos existirem.

**Architecture:** Um wrapper fino sobre `react-native-purchases` (`src/lib/purchases.ts`) que é **no-op se não houver `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`**. Um `PremiumContext` provê `usePremium() → { premium, loading, restaurar }` lendo o `CustomerInfo` do RevenueCat. O gating de áudio (cap. 3+) passa a usar esse estado real. Telas `premium.tsx` (paywall) e `apoiar.tsx` (doação) leem as *offerings* reais quando configuradas, senão mostram "Em breve".

**Tech Stack:** React Native 0.85.3, Expo ~56.0.12, React 19.2.3, expo-router ~56.2.11, `react-native-purchases` (via `expo install`), TypeScript.

## Global Constraints

- **Fallback gracioso obrigatório:** sem `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`, o app NÃO pode quebrar — toda função de compra vira no-op e as telas mostram "Em breve". Nunca chamar métodos do RevenueCat sem antes checar `configuradoRevenueCat()`.
- **Gate de verificação = `npx tsc --noEmit`** (não há Jest no frontend). Aceitável apenas o erro **pré-existente** `src/components/Field.tsx:38`. Nenhum erro novo.
- **Textos em português**, tom caloroso/de convite (persona Dona Marta, 58). Acessibilidade: alvos ≥44px, `accessibilityRole`/`accessibilityLabel`.
- **Cores sempre via tokens** de `@/theme/ccpTheme` / `useTheme()` — nunca cravar cor nova fora do padrão já usado no arquivo.
- **Entitlement Premium** identificado por `customerInfo.entitlements.active['premium']`.
- **Doação = consumível** (offering nomeada `doacao`, 4 tiers). Premium = offering `current`.
- **Arquivos hotspot da coordenação** tocados aqui: `_layout.tsx`, `(tabs)/meu-espaco.tsx`, `eas.json`. Registrar no `COORDENACAO.md` no fim (Task 7).
- Comandos rodam em `frontend/` com Node 20 (`nvm use v20.20.2`).

---

### Task 1: Dependência + wrapper `purchases.ts` (no-op gracioso)

**Files:**
- Modify: `frontend/package.json` (via `expo install`)
- Create: `frontend/src/lib/purchases.ts`

**Interfaces:**
- Consumes: env `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`.
- Produces:
  - `configuradoRevenueCat(): boolean`
  - `inicializarCompras(): Promise<void>`
  - `getCustomerInfoAtual(): Promise<CustomerInfo | null>`
  - `checarPremium(info: CustomerInfo | null): boolean`
  - `getPacotesPremium(): Promise<PurchasesPackage[]>`
  - `getPacotesDoacao(): Promise<PurchasesPackage[]>`
  - `comprarPacote(pkg: PurchasesPackage): Promise<{ info: CustomerInfo | null; cancelado: boolean }>`
  - `restaurarCompras(): Promise<CustomerInfo | null>`
  - `aoAtualizarCliente(cb: (info: CustomerInfo) => void): () => void`
  - const `ENTITLEMENT_PREMIUM = 'premium'`, `OFERTA_DOACAO = 'doacao'`

- [ ] **Step 1: Instalar a lib (versão compatível com o SDK 56)**

Run:
```bash
cd frontend && source ~/.nvm/nvm.sh && nvm use v20.20.2 && npx expo install react-native-purchases
```
Expected: adiciona `react-native-purchases` ao `package.json` (peer `react-native >= 0.73` — RN 0.85 ok).

- [ ] **Step 2: Criar `src/lib/purchases.ts`**

```typescript
/**
 * Wrapper fino sobre o RevenueCat (Google Play Billing).
 *
 * REGRA DE OURO: sem EXPO_PUBLIC_REVENUECAT_ANDROID_KEY tudo é no-op gracioso —
 * o app funciona 100% sem config; a monetização "ativa" sozinha quando a chave
 * e os produtos existirem. Nunca chamar métodos do RevenueCat sem checar
 * configuradoRevenueCat() antes.
 */
import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';

const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

export const ENTITLEMENT_PREMIUM = 'premium';
export const OFERTA_DOACAO = 'doacao';

let iniciado = false;

/** Há chave configurada para este build? (só Android por ora) */
export function configuradoRevenueCat(): boolean {
  return Platform.OS === 'android' && ANDROID_KEY.length > 0;
}

/** Configura o SDK uma única vez. No-op sem chave. Tolera falha (não quebra o app). */
export async function inicializarCompras(): Promise<void> {
  if (iniciado || !configuradoRevenueCat()) return;
  try {
    Purchases.configure({ apiKey: ANDROID_KEY });
    iniciado = true;
  } catch {
    // não deve derrubar o app; segue como não-configurado
  }
}

export async function getCustomerInfoAtual(): Promise<CustomerInfo | null> {
  if (!configuradoRevenueCat()) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

/** Premium ativo = entitlement 'premium' presente entre os ativos. */
export function checarPremium(info: CustomerInfo | null): boolean {
  return !!info?.entitlements.active[ENTITLEMENT_PREMIUM];
}

export async function getPacotesPremium(): Promise<PurchasesPackage[]> {
  if (!configuradoRevenueCat()) return [];
  try {
    const ofertas = await Purchases.getOfferings();
    return ofertas.current?.availablePackages ?? [];
  } catch {
    return [];
  }
}

export async function getPacotesDoacao(): Promise<PurchasesPackage[]> {
  if (!configuradoRevenueCat()) return [];
  try {
    const ofertas = await Purchases.getOfferings();
    return ofertas.all[OFERTA_DOACAO]?.availablePackages ?? [];
  } catch {
    return [];
  }
}

/** Compra um pacote. `cancelado: true` quando o usuário fecha o fluxo (não é erro). */
export async function comprarPacote(
  pkg: PurchasesPackage
): Promise<{ info: CustomerInfo | null; cancelado: boolean }> {
  if (!configuradoRevenueCat()) return { info: null, cancelado: false };
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { info: customerInfo, cancelado: false };
  } catch (e) {
    if ((e as { userCancelled?: boolean })?.userCancelled) {
      return { info: null, cancelado: true };
    }
    throw e;
  }
}

export async function restaurarCompras(): Promise<CustomerInfo | null> {
  if (!configuradoRevenueCat()) return null;
  return Purchases.restorePurchases();
}

/** Assina atualizações do CustomerInfo. Devolve função de cleanup. No-op sem chave. */
export function aoAtualizarCliente(cb: (info: CustomerInfo) => void): () => void {
  if (!configuradoRevenueCat()) return () => {};
  Purchases.addCustomerInfoUpdateListener(cb);
  return () => Purchases.removeCustomerInfoUpdateListener(cb);
}
```

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: sem erros novos (apenas o pré-existente `src/components/Field.tsx:38`, se houver).

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/lib/purchases.ts
git commit -m "feat(monetizacao): wrapper RevenueCat com fallback gracioso (purchases.ts)"
```

---

### Task 2: `PremiumContext` + provider no `_layout`

**Files:**
- Create: `frontend/src/subscription/PremiumContext.tsx`
- Modify: `frontend/src/app/_layout.tsx` (imports + envolver a árvore com `<PremiumProvider>`)

**Interfaces:**
- Consumes (Task 1): `inicializarCompras`, `getCustomerInfoAtual`, `checarPremium`, `restaurarCompras`, `aoAtualizarCliente`.
- Produces: `usePremium(): { premium: boolean; loading: boolean; restaurar: () => Promise<boolean> }` e `<PremiumProvider>`.

- [ ] **Step 1: Criar `src/subscription/PremiumContext.tsx`**

```tsx
/**
 * Estado global de assinatura (RevenueCat). `usePremium()` devolve se o usuário
 * tem Premium ativo. Sem config (sem chave), `premium` é sempre false e nada quebra.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import {
  inicializarCompras,
  getCustomerInfoAtual,
  checarPremium,
  restaurarCompras,
  aoAtualizarCliente,
} from '@/lib/purchases';

type PremiumValue = {
  premium: boolean;
  loading: boolean;
  restaurar: () => Promise<boolean>;
};

const PremiumContext = createContext<PremiumValue | undefined>(undefined);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [premium, setPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    (async () => {
      await inicializarCompras();
      const info = await getCustomerInfoAtual();
      if (ativo) {
        setPremium(checarPremium(info));
        setLoading(false);
      }
    })();
    const desinscrever = aoAtualizarCliente((info) => {
      if (ativo) setPremium(checarPremium(info));
    });
    return () => {
      ativo = false;
      desinscrever();
    };
  }, []);

  const restaurar = useCallback(async (): Promise<boolean> => {
    const info = await restaurarCompras();
    const ativo = checarPremium(info);
    setPremium(ativo);
    return ativo;
  }, []);

  const value = useMemo(
    () => ({ premium, loading, restaurar }),
    [premium, loading, restaurar]
  );

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}

export function usePremium(): PremiumValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error('usePremium deve ser usado dentro de <PremiumProvider>.');
  return ctx;
}
```

- [ ] **Step 2: Registrar o provider em `_layout.tsx`**

Adicionar o import junto aos outros providers:
```tsx
import { PremiumProvider } from '@/subscription/PremiumContext';
```

Envolver a árvore — trocar o bloco de providers para incluir `<PremiumProvider>` logo dentro de `<AuthProvider>`:
```tsx
  return (
    <AuthProvider>
      <PremiumProvider>
        <EngagementProvider>
          <AudioProvider>
            <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
            <Stack initialRouteName="splash" screenOptions={screenOptions}>
              {/* ...as mesmas Stack.Screen já existentes... */}
            </Stack>
          </AudioProvider>
        </EngagementProvider>
      </PremiumProvider>
    </AuthProvider>
  );
```
(NÃO remover nenhuma `Stack.Screen` existente; só aninhar o novo provider. A tela `apoiar` é adicionada na Task 5.)

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/subscription/PremiumContext.tsx frontend/src/app/_layout.tsx
git commit -m "feat(monetizacao): PremiumContext + provider no _layout"
```

---

### Task 3: Gating real de áudio (cap. 3+)

**Files:**
- Modify: `frontend/src/app/(tabs)/index.tsx:37,178`
- Modify: `frontend/src/app/capitulo/[numero].tsx:142,309`

**Interfaces:**
- Consumes (Task 2): `usePremium`.
- Produces: nada (consumo interno).

- [ ] **Step 1: `(tabs)/index.tsx` — usar premium real**

Adicionar import:
```tsx
import { usePremium } from '@/subscription/PremiumContext';
```
Dentro do componente (perto dos outros hooks), obter o estado:
```tsx
  const { premium } = usePremium();
```
Trocar as duas chamadas hardcoded:
- Linha ~37: `if (bloqueadoPremium(cap, false)) {` → `if (bloqueadoPremium(cap, premium)) {`
- Linha ~178: `name={bloqueadoPremium(chapter, false) ? 'lock-closed' : 'play'}` → `name={bloqueadoPremium(chapter, premium) ? 'lock-closed' : 'play'}`

(Se a linha 178 estiver dentro de um `.map` onde a variável é `chapter`, manter `chapter`; usar `premium` no 2º argumento.)

- [ ] **Step 2: `capitulo/[numero].tsx` — usar premium real**

Adicionar import:
```tsx
import { usePremium } from '@/subscription/PremiumContext';
```
Dentro do componente:
```tsx
  const { premium } = usePremium();
```
Trocar:
- Linha ~142: `if (bloqueadoPremium(chapter, false)) {` → `if (bloqueadoPremium(chapter, premium)) {`
- Linha ~309: `name={bloqueadoPremium(chapter, false) ? 'lock-closed' : 'play'}` → `name={bloqueadoPremium(chapter, premium) ? 'lock-closed' : 'play'}`

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 4: Commit**

```bash
git add "frontend/src/app/(tabs)/index.tsx" "frontend/src/app/capitulo/[numero].tsx"
git commit -m "feat(monetizacao): gating de áudio usa estado real de Premium"
```

---

### Task 4: `premium.tsx` ligado às offerings reais

**Files:**
- Modify: `frontend/src/app/premium.tsx`

**Interfaces:**
- Consumes (Tasks 1–2): `getPacotesPremium`, `comprarPacote`, `usePremium` (`restaurar`).
- Produces: nada.

- [ ] **Step 1: Carregar pacotes reais e ligar compra/restauração**

Comportamento:
- No mount, `getPacotesPremium()`. Se **vazio** (sem config), manter o layout atual com os cards placeholder (Anual R$79,90 / Mensal R$9,90) e o botão chamando `Alert('Em breve', 'A assinatura chega com a integração de pagamentos.')` — como hoje.
- Se **vier pacotes**, renderizar um `PlanoCard` por pacote usando `pkg.product.title`/`pkg.product.priceString`; o CTA chama `comprarPacote(pkgSelecionado)`; em sucesso com premium ativo → `Alert('Tudo certo!', 'Seu Premium está ativo. Bom proveito ☕')` e `router.back()`; em cancelado → nada; em erro → `Alert('Ops', 'Não foi possível concluir a compra. Tente de novo.')`.
- Adicionar um link discreto **"Restaurar compras"** que chama `restaurar()` do `usePremium()`; se voltar `true` → `Alert('Pronto', 'Seu Premium foi restaurado.')`, senão `Alert('Nada encontrado', 'Não achamos uma assinatura ativa nesta conta.')`.

Implementação (substituir o corpo do componente `Premium`; manter os estilos existentes e o componente `PlanoCard`, apenas estendendo `PlanoCard` para aceitar `titulo`/`detalhe` — já aceita):

```tsx
import { useEffect, useState } from 'react';
// ...imports existentes...
import type { PurchasesPackage } from 'react-native-purchases';
import { getPacotesPremium, comprarPacote } from '@/lib/purchases';
import { usePremium } from '@/subscription/PremiumContext';

export default function Premium() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { restaurar } = usePremium();
  const [pacotes, setPacotes] = useState<PurchasesPackage[]>([]);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [planoPlaceholder, setPlanoPlaceholder] = useState<'anual' | 'mensal'>('anual');

  useEffect(() => {
    getPacotesPremium().then((p) => {
      setPacotes(p);
      if (p.length) setSelecionado(p[0].identifier);
    });
  }, []);

  const temOfertas = pacotes.length > 0;

  const assinar = async () => {
    if (!temOfertas) {
      Alert.alert('Em breve', 'A assinatura chega com a integração de pagamentos.');
      return;
    }
    const pkg = pacotes.find((p) => p.identifier === selecionado);
    if (!pkg) return;
    setProcessando(true);
    try {
      const { info, cancelado } = await comprarPacote(pkg);
      if (cancelado) return;
      if (info?.entitlements.active['premium']) {
        Alert.alert('Tudo certo!', 'Seu Premium está ativo. Bom proveito ☕');
        router.back();
      }
    } catch {
      Alert.alert('Ops', 'Não foi possível concluir a compra. Tente de novo.');
    } finally {
      setProcessando(false);
    }
  };

  const aoRestaurar = async () => {
    const ok = await restaurar();
    Alert.alert(
      ok ? 'Pronto' : 'Nada encontrado',
      ok ? 'Seu Premium foi restaurado.' : 'Não achamos uma assinatura ativa nesta conta.'
    );
  };
  // ...render: se temOfertas, mapear pacotes em PlanoCard (titulo=pkg.product.title,
  //    detalhe=pkg.product.priceString, ativo=selecionado===pkg.identifier,
  //    onPress=()=>setSelecionado(pkg.identifier)); senão manter os 2 cards atuais
  //    controlados por planoPlaceholder. CTA -> assinar (label muda p/ 'Processando…'
  //    quando processando). Abaixo do "Continuar no plano gratuito", adicionar
  //    <Pressable onPress={aoRestaurar}><Text style={styles.gratis}>Restaurar compras</Text></Pressable>
}
```

> Nota p/ o implementador: preserve TODOS os estilos e o markup visual atuais; só troque a **origem dos dados** (placeholder → pacotes reais quando existirem) e ligue os handlers. O visual sem config deve ficar idêntico ao de hoje.

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/premium.tsx
git commit -m "feat(monetizacao): paywall lê offerings reais + comprar/restaurar (fallback em breve)"
```

---

### Task 5: Tela de Doação `apoiar.tsx` + rota + item no menu

**Files:**
- Create: `frontend/src/app/apoiar.tsx`
- Modify: `frontend/src/app/_layout.tsx` (registrar `<Stack.Screen name="apoiar" ... />`)
- Modify: `frontend/src/app/(tabs)/meu-espaco.tsx` (item "Apoiar o projeto" no menu)

**Interfaces:**
- Consumes (Task 1): `getPacotesDoacao`, `comprarPacote`.
- Produces: rota `/apoiar`.

- [ ] **Step 1: Criar `src/app/apoiar.tsx`**

Tela simples e acolhedora (usar `useTheme()` + tokens, seguir o visual de `conta.tsx`/`ajustes.tsx`):
- Cabeçalho com voltar + título "Apoiar o projeto" + subtítulo curto ("Se o Café com Propósito te faz bem, você pode ajudar a manter ele no ar. Qualquer valor é gratidão. 🤎").
- `getPacotesDoacao()` no mount. Se **vazio** → um card "Em breve" ("As doações chegam junto com a integração de pagamentos."). Se **vier** → uma grade de botões, um por tier (label = `pkg.product.priceString`), cada um chama `comprarPacote(pkg)`.
- Em sucesso (não cancelado) → `Alert('Obrigado de coração! ☕', 'Seu apoio ajuda a manter o projeto vivo.')`. Em erro → `Alert('Ops', 'Não foi possível concluir. Tente de novo.')`.
- Estado `processando` desabilita os botões durante a compra.

```tsx
/** Tela de doação ("Apoiar o projeto"): compras únicas (consumíveis) R$2–20. */
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { PurchasesPackage } from 'react-native-purchases';
import { getPacotesDoacao, comprarPacote } from '@/lib/purchases';
import { fonts, palette, spacing } from '@/theme/ccpTheme';
import { useTheme } from '@/theme/useTheme';

export default function Apoiar() {
  const t = useTheme();
  const router = useRouter();
  const [tiers, setTiers] = useState<PurchasesPackage[]>([]);
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    getPacotesDoacao().then(setTiers);
  }, []);

  const doar = async (pkg: PurchasesPackage) => {
    setProcessando(true);
    try {
      const { cancelado } = await comprarPacote(pkg);
      if (!cancelado) {
        Alert.alert('Obrigado de coração! ☕', 'Seu apoio ajuda a manter o projeto vivo.');
      }
    } catch {
      Alert.alert('Ops', 'Não foi possível concluir. Tente de novo.');
    } finally {
      setProcessando(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.ui.fundo }]} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.voltar} accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={24} color={palette.cafeEscuro} />
        </Pressable>
        <Text style={styles.titulo}>Apoiar o projeto</Text>
        <Text style={styles.sub}>
          Se o Café com Propósito te faz bem, você pode ajudar a manter ele no ar.
          Qualquer valor é gratidão. 🤎
        </Text>

        {tiers.length === 0 ? (
          <View style={styles.emBreve}>
            <Text style={styles.emBreveText}>
              As doações chegam junto com a integração de pagamentos. Obrigado pelo carinho!
            </Text>
          </View>
        ) : (
          <View style={styles.grade}>
            {tiers.map((pkg) => (
              <Pressable
                key={pkg.identifier}
                style={[styles.tier, processando && styles.tierInativo]}
                onPress={() => doar(pkg)}
                disabled={processando}
                accessibilityRole="button"
                accessibilityLabel={`Doar ${pkg.product.priceString}`}
              >
                <Ionicons name="heart" size={18} color={palette.douradoAmanhecer} />
                <Text style={styles.tierValor}>{pkg.product.priceString}</Text>
              </Pressable>
            ))}
          </View>
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
  sub: { fontFamily: fonts.sans, fontSize: 14, color: '#6E625A', marginBottom: spacing.lg, lineHeight: 21 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tier: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    minWidth: '46%', flexGrow: 1, paddingVertical: 18,
    borderWidth: 1.5, borderColor: palette.douradoSuave, borderRadius: 16,
  },
  tierInativo: { opacity: 0.5 },
  tierValor: { fontFamily: fonts.sansBold, fontSize: 17, color: palette.cafeEscuro },
  emBreve: {
    borderWidth: 1, borderColor: '#EAE0D4', borderRadius: 16, padding: 20,
    backgroundColor: '#FFF',
  },
  emBreveText: { fontFamily: fonts.sans, fontSize: 14, color: '#6E625A', lineHeight: 21, textAlign: 'center' },
});
```

> Nota: confirmar que `palette.douradoSuave`, `palette.douradoAmanhecer`, `palette.cafeEscuro` existem em `ccpTheme` (o `recuperar-senha.tsx` já usa `palette.douradoAmanhecer` e `palette.salvia`). Se algum nome divergir, usar o token equivalente já usado em telas vizinhas.

- [ ] **Step 2: Registrar a rota em `_layout.tsx`**

Dentro do `<Stack>`, junto às outras telas modais, adicionar:
```tsx
            <Stack.Screen name="apoiar" />
```

- [ ] **Step 3: Item "Apoiar o projeto" no menu de `meu-espaco.tsx`**

Em `meu-espaco.tsx`, o `MENU` é uma lista tipada com `rota: Rota`. Adicionar o tipo e o item, e garantir que a navegação funcione sem login (doação não exige conta):
- Estender o type `Rota`: `'/anotacoes' | '/favoritos' | '/conta' | '/ajustes' | '/apoiar'`
- Adicionar ao array `MENU` (antes de "Ajustes"):
```tsx
  { icon: 'heart-outline', label: 'Apoiar o projeto', rota: '/apoiar', requerLogin: false },
```
(`abrirItem` já roteia por `rota` e respeita `requerLogin`; como é `false`, abre deslogado.)

- [ ] **Step 4: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/apoiar.tsx frontend/src/app/_layout.tsx "frontend/src/app/(tabs)/meu-espaco.tsx"
git commit -m "feat(monetizacao): tela Apoiar o projeto (doação) + rota + item no menu"
```

---

### Task 6: `eas.json` — env da chave RevenueCat (vazia)

**Files:**
- Modify: `frontend/eas.json`

**Interfaces:**
- Consumes: nada.
- Produces: env `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` disponível nos builds (vazia até existir a chave).

- [ ] **Step 1: Adicionar a env vazia nos 3 perfis**

Em cada perfil (`development`, `preview`, `production`), dentro do bloco `env`, adicionar a chave junto de `EXPO_PUBLIC_API_BASE`:
```json
        "EXPO_PUBLIC_API_BASE": "https://cafe-com-proposito-api.onrender.com",
        "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY": ""
```
(Vazia = fallback gracioso. Quando a chave existir, troca aqui — ou define no dashboard do EAS — e o próximo build ativa a monetização.)

- [ ] **Step 2: Validar JSON**

Run: `cd frontend && node -e "JSON.parse(require('fs').readFileSync('eas.json','utf8')); console.log('eas.json OK')"`
Expected: `eas.json OK`

- [ ] **Step 3: Commit**

```bash
git add frontend/eas.json
git commit -m "chore(monetizacao): env EXPO_PUBLIC_REVENUECAT_ANDROID_KEY (vazia) no eas.json"
```

---

### Task 7: Type-check final + log de coordenação + PR

**Files:**
- Modify: `COORDENACAO.md` (nova entrada no topo do Log)

- [ ] **Step 1: Type-check final da árvore inteira**

Run: `cd frontend && npx tsc --noEmit`
Expected: só o erro pré-existente `src/components/Field.tsx:38` (se ainda existir); nada novo.

- [ ] **Step 2: Entrada no `COORDENACAO.md`** (no topo do Log)

```markdown
### 2026-07-12 · 💻 LOCAL · Monetização (Premium + Doação)
- **RevenueCat/Play Billing** integrado com **fallback gracioso** (no-op sem
  `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`). Novos: `src/lib/purchases.ts`,
  `src/subscription/PremiumContext.tsx`, `src/app/apoiar.tsx`.
- **Gating real:** `usePremium()` substituiu o `false` hardcoded do áudio cap.3+
  em `(tabs)/index.tsx` e `capitulo/[numero].tsx`.
- **Hotspots tocados:** `_layout.tsx` (PremiumProvider + Stack.Screen `apoiar`),
  `(tabs)/meu-espaco.tsx` (item "Apoiar o projeto"), `eas.json` (env da chave).
- **Não fica funcional** até: conta Play aprovada + produtos + projeto RevenueCat +
  chave no eas.json + build novo. Ver `docs/monetizacao.md`.
```

- [ ] **Step 3: Commit + push + PR**

```bash
git add COORDENACAO.md
git commit -m "docs(coordenacao): log da monetização (Premium + Doação)"
git push -u origin claude/monetizacao-premium-doacao
gh pr create --base main --title "feat(monetizacao): Premium + Doação (RevenueCat/Play Billing) com fallback gracioso" --body "Implementa a monetização do handoff (docs/monetizacao.md): assinatura Premium + doação via Google Play Billing/RevenueCat, com no-op gracioso sem a chave. Gating real de áudio cap.3+. Não ativa até conta Play + produtos + chave + build novo."
```

---

## Notas de execução
- **Branch:** criar `claude/monetizacao-premium-doacao` a partir de `origin/main` antes da Task 1.
- **Node 20** obrigatório (`nvm use v20.20.2`) para comandos `expo`/`eas`.
- **Sem Jest:** o gate de cada task é `npx tsc --noEmit` (sem erros novos). Teste real de compra só em build com a chave + license testers no Play Console.
