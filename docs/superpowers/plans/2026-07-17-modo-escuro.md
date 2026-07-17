# Modo escuro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App inteiro legível no modo escuro, com controle Automático/Claro/Escuro em Ajustes (persistido).

**Architecture:** `ThemeModeProvider` (preferência persistida + resolução auto/claro/escuro) alimenta o `useTheme()` existente (mesma assinatura — as 20 telas tematizadas não mudam de API). Varredura substitui cores cravadas de superfície clara por tokens. Ajustes ganha a seção "Aparência".

**Tech Stack:** React Native/Expo/TS. Sem backend.

## Global Constraints
- **Gate:** `cd frontend && npx tsc --noEmit` — só o pré-existente `src/components/Field.tsx:38`. Node 20 (`source ~/.nvm/nvm.sh && nvm use v20.20.2`).
- **Regra da varredura:** cor sobre **gradiente/superfície fixa escura** (header céu da Início, avatar gradiente, splash/premium/player, texto sobre botão dourado) **FICA**; cor de **superfície clara** vira token: `#F0E8DC`/`#EAE0D4`→`t.ui.linha` · `#C9BAA8`→`t.ui.textoSuave` · `#6E625A`→`t.ui.textoSuave` · `#FFF(FFF)` de card→`t.ui.superficie` · `#B07F3C`→`palette.douradoAmanhecer` (julgar contraste). Na dúvida, token.
- **NÃO tocar:** `capitulo/[numero].tsx`, `introducao.tsx` (temas de leitura próprios), `splash.tsx`, `premium.tsx`, `player.tsx` (escuros por design), backend.
- `useTheme()` mantém assinatura. Telas que já têm `const t = useTheme()` seguem funcionando sem mudança de chamada.
- Textos PT. Padrões visuais das seções existentes (Ajustes).

---

### Task 1: Fundação — storage + ThemeModeContext + useTheme rewire + _layout

**Files:** Modify `frontend/src/lib/storage.ts` (adição); Create `frontend/src/theme/ThemeModeContext.tsx`; Modify `frontend/src/theme/useTheme.ts`, `frontend/src/app/_layout.tsx`.

- [ ] **Step 1: storage** — adicionar em `KEYS`: `temaModo: 'ccp.tema.modo'`. Append:
```typescript
export type TemaModo = 'auto' | 'claro' | 'escuro';

export async function getTemaModo(): Promise<TemaModo> {
  try {
    const v = await AsyncStorage.getItem(KEYS.temaModo);
    return v === 'claro' || v === 'escuro' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export async function saveTemaModo(modo: TemaModo): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.temaModo, modo);
  } catch {
    // ignora
  }
}
```

- [ ] **Step 2: ThemeModeContext** — criar `src/theme/ThemeModeContext.tsx`:
```tsx
/**
 * Preferência de tema do app: Automático (segue o sistema) / Claro / Escuro.
 * Persistida localmente. `useTheme()` consome o modo resolvido daqui.
 */
import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { getTemaModo, saveTemaModo, type TemaModo } from '@/lib/storage';

type Valor = {
  modo: TemaModo;                 // preferência escolhida
  mode: 'light' | 'dark';        // modo resolvido (aplica o 'auto')
  definirModo: (m: TemaModo) => void;
};

const Ctx = createContext<Valor | undefined>(undefined);

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const sistema = useColorScheme();
  const [modo, setModo] = useState<TemaModo>('auto');

  useEffect(() => {
    getTemaModo().then(setModo);
  }, []);

  const definirModo = useCallback((m: TemaModo) => {
    setModo(m);
    saveTemaModo(m);
  }, []);

  const mode: 'light' | 'dark' =
    modo === 'auto' ? (sistema === 'dark' ? 'dark' : 'light') : modo === 'escuro' ? 'dark' : 'light';

  const value = useMemo(() => ({ modo, mode, definirModo }), [modo, mode, definirModo]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Preferência + resolvido (para a UI de Ajustes). */
export function useThemeMode(): Valor {
  const v = useContext(Ctx);
  if (!v) throw new Error('useThemeMode deve ser usado dentro de <ThemeModeProvider>.');
  return v;
}

/** Modo resolvido com fallback (para o useTheme funcionar mesmo fora do provider). */
export function useResolvedMode(): 'light' | 'dark' {
  const v = useContext(Ctx);
  const sistema = useColorScheme();
  if (v) return v.mode;
  return sistema === 'dark' ? 'dark' : 'light';
}
```

- [ ] **Step 3: useTheme rewire** — `src/theme/useTheme.ts` passa a:
```typescript
import { theme, type Theme } from './ccpTheme';
import { useResolvedMode } from './ThemeModeContext';

export type { Theme } from './ccpTheme';

export function useTheme(): Theme {
  const mode = useResolvedMode();
  return mode === 'dark' ? theme.dark : theme.light;
}

export default useTheme;
```
(Atualizar o comentário do topo do arquivo: agora resolve pela preferência do app, com fallback no sistema.)

- [ ] **Step 4: _layout** — envolver TUDO com `<ThemeModeProvider>` como provider MAIS EXTERNO.
  ⚠️ O `RootLayout` chama `useTheme()`/`useColorScheme()` no corpo — extrair o miolo p/ um
  componente interno no MESMO arquivo (ex.: `function RootInner() { ...corpo atual... }`) e o
  `RootLayout` vira: fontes + `<ThemeModeProvider><RootInner/></ThemeModeProvider>` (fontes podem
  ficar no RootLayout; o `useTheme` fica no Inner). `StatusBar` raiz: trocar o baseado em
  `useColorScheme` por `style={t.mode === 'dark' ? 'light' : 'dark'}` no Inner. NÃO remover
  nenhuma `Stack.Screen`/provider.

- [ ] **Step 5: tsc** — `npx tsc --noEmit` (só Field.tsx:38).
- [ ] **Step 6: Commit** — `feat(tema): preferência Automático/Claro/Escuro (provider + useTheme)`

---

### Task 2: Ajustes — seção "Aparência"

**Files:** Modify `frontend/src/app/ajustes.tsx`.

- [ ] **Step 1** — ler o arquivo; adicionar seção/card "Aparência" (mesmo padrão visual das seções
  existentes) com 3 linhas selecionáveis: **Automático** ("segue o tema do celular"), **Claro**,
  **Escuro**. Usa `useThemeMode()` (`modo`, `definirModo`); check (`checkmark-circle`) na
  selecionada, como o seletor de faixas da música. A11y: `accessibilityRole="radio"` +
  `accessibilityState={{ selected }}`.
- [ ] **Step 2: tsc**; **Step 3: Commit** — `feat(tema): seção Aparência em Ajustes`

---

### Task 3: Varredura A — abas + componentes base

**Files:** Modify `frontend/src/app/(tabs)/{index,biblioteca,meu-espaco}.tsx`,
`frontend/src/components/{TabBar,MiniPlayer,NoteSheet,Field}.tsx`.

- [ ] **Step 1** — em cada arquivo, aplicar a **Regra da varredura** (Global Constraints):
  localizar `#hex` cravados (`grep -nE "#[0-9A-Fa-f]{3,6}"`), decidir FICA (sobre gradiente/fixo)
  vs TOKEN (superfície clara), e trocar. Nos arquivos com `makeStyles(t)`, usar `t.ui.*`; nos com
  StyleSheet estático + `useTheme()` no corpo, mover a cor pro JSX (`style={[styles.x, { color: t.ui... }]}`)
  ou converter o StyleSheet pra `makeStyles(t)` + `useMemo` (padrão já usado em `meu-espaco.tsx`).
- [ ] **Step 2: tsc**; **Step 3: Commit** — `fix(tema): varredura modo escuro nas abas e componentes`

---

### Task 4: Varredura B — telas de conta/auth/standalone + StatusBar dinâmica

**Files:** Modify `frontend/src/app/{ajustes,anotacoes,favoritos,apoiar,assinaturas,loja,conta}.tsx`,
`frontend/src/app/conta/{email,senha}.tsx`, `frontend/src/app/(auth)/{entrar,cadastro,recuperar-senha}.tsx`.

- [ ] **Step 1** — mesma varredura da Task 3 nesses arquivos.
- [ ] **Step 2** — nas 8 telas com `<StatusBar style="dark" />` (conta, apoiar, cadastro,
  assinaturas, conta/senha, entrar, conta/email, recuperar-senha): trocar por
  `style={t.mode === 'dark' ? 'light' : 'dark'}` (usar o `t` da tela; adicionar `useTheme()` se faltar).
- [ ] **Step 3: tsc**; **Step 4: Commit** — `fix(tema): varredura modo escuro (conta/auth/standalone) + StatusBar dinâmica`

---

### Task 5: Estáticas → tematizadas + fecho

**Files:** Modify `frontend/src/app/{onboarding,continuar-lendo}.tsx`,
`frontend/src/components/Button.tsx`, `COORDENACAO.md`.

- [ ] **Step 1: onboarding** — heros/gradientes e textos sobre eles FICAM; corpo segue o tema:
  `useTheme()` no componente; fundo `t.ui.fundo`, título `t.palette.cafeEscuro`→`t.ui.texto`?
  (usar `t.ui.texto` p/ título e `t.ui.textoSuave` p/ lead), bolinhas inativas `t.ui.linha`,
  "Já tenho conta" `t.ui.textoSuave` + link dourado (fica). Converter styles afetados pra
  aplicação via JSX ou makeStyles.
- [ ] **Step 2: continuar-lendo** — tematizar as ~11 cores cravadas pela mesma regra.
- [ ] **Step 3: Button** — `useTheme()` interno (a API `label/variant/...` não muda):
  `disabled` → `backgroundColor: t.ui.linha`; `outline` border → `t.ui.linha` e label →
  `t.ui.texto` (claro: café funciona; escuro: precisa claro) — usar tokens; `primary/secondary`
  ficam (dourado/café funcionam nos dois). Converter o StyleSheet pro padrão `makeStyles(t)`.
- [ ] **Step 4: gates** — `npx tsc --noEmit` (só Field.tsx:38).
- [ ] **Step 5: COORDENACAO.md** (topo do Log):
```markdown
### 2026-07-17 · 💻 LOCAL · Modo escuro
- `ThemeModeProvider` (Automático/Claro/Escuro persistido) + `useTheme()` rewire (mesma API);
  seção "Aparência" em Ajustes; varredura de cores cravadas → tokens em ~20 telas/componentes;
  StatusBar dinâmica; onboarding/continuar-lendo/Button tematizados.
- **Intocados:** leitura/introdução (temas próprios), splash/premium/player (escuros por design).
- Hotspots (só adição/troca de cor): storage.ts, _layout.tsx, ajustes.tsx e as telas listadas no plano.
```
- [ ] **Step 6: Commit + push + PR** —
```bash
git add COORDENACAO.md && git commit -m "docs(coordenacao): log do modo escuro"
git push -u origin claude/modo-escuro
gh pr create --base main --title "feat(tema): modo escuro (Automático/Claro/Escuro em Ajustes)" --body "Modo escuro em todo o app com controle em Ajustes (persistido). Ver docs/superpowers/plans/2026-07-17-modo-escuro.md."
```

---

## Notas de execução
- Branch: já em `claude/modo-escuro` (base main e1d009f).
- Sem Jest: gate = tsc; a validação visual final é no próximo build (alternar os 3 modos em Ajustes).
- Vocabulário `ui.dark`: `fundo #1C1714 · superficie #261F1A · texto #ECE6DD · textoSuave #B3A599 · linha #3A2F27 · realce #2E251F · painel #2E251F`.
