# Modo escuro — Design/Spec

## Objetivo
O app inteiro funcionar bem no **modo escuro**, com controle do usuário em Ajustes:
**Automático (segue o sistema) / Claro / Escuro** (persistido).

## Decisões (fechadas com o dono)
- Controle em **Ajustes** (Automático/Claro/Escuro), padrão Automático.
- **Fora do escopo:** temas de leitura da Leitura/Introdução (claro/papel/escuro manuais —
  independentes, como hoje); `splash`, `premium` e `player` continuam escuros por design.

## O que já existe (não recriar)
- Tokens completos: `theme.light`/`theme.dark` em `ccpTheme.ts` (`ui.dark`: `fundo #1C1714`,
  `superficie #261F1A`, `texto #ECE6DD`, `textoSuave #B3A599`, `linha #3A2F27`, `realce #2E251F`,
  `painel #2E251F`). `app.json` com `userInterfaceStyle: "automatic"`.
- `useTheme()` (`src/theme/useTheme.ts`) resolve pelo `useColorScheme()` do sistema.
- **20 telas/componentes já usam `useTheme()`** — mas várias têm **cores cravadas** que quebram
  no escuro (divisórias `#F0E8DC`, chevrons `#C9BAA8`, dourado `#B07F3C`, etc.).

## Arquitetura

### 1. Preferência de tema (`src/lib/storage.ts` — só adição)
- `TemaModo = 'auto' | 'claro' | 'escuro'`; chave `ccp.tema.modo`.
- `getTemaModo(): Promise<TemaModo>` (default `'auto'`) e `saveTemaModo(m)`.

### 2. `src/theme/ThemeModeContext.tsx` (NOVO)
- `ThemeModeProvider`: estado `modo` (carrega do storage no boot), `definirModo(m)` (seta + persiste).
- Resolve: `mode = modo === 'auto' ? (useColorScheme() ?? 'light') : (modo === 'escuro' ? 'dark' : 'light')`.
- Exporta `useThemeMode(): { modo, definirModo }` e um contexto com o `mode` resolvido.
- **`useTheme()` mantém a MESMA assinatura** (20 arquivos não mudam): passa a ler o `mode` do
  contexto; **fallback pro `useColorScheme()`** se usado fora do provider (defensivo).
- `_layout.tsx`: envolver TUDO com `<ThemeModeProvider>` (o mais externo). Como o `RootLayout`
  chama `useTheme()` no corpo, extrair o miolo p/ um componente interno (`<RootInner/>`) que roda
  DENTRO do provider. `StatusBar` raiz: `style={t.mode === 'dark' ? 'light' : 'dark'}` (substitui
  o atual baseado em `useColorScheme`).

### 3. Ajustes — seção "Aparência" (`src/app/ajustes.tsx`)
- Nova seção/card "Aparência" com 3 opções tipo rádio: **Automático · Claro · Escuro**
  (padrão visual das seções existentes; check na selecionada; usa `useThemeMode()`).

### 4. Varredura de cores cravadas (telas já tematizadas)
**Regra:** cor sobre **gradiente/superfície fixa** (header céu, avatar, premium/player/splash,
texto sobre dourado) **fica**; cor que era da **superfície clara** vira token:
- `#F0E8DC`/`#EAE0D4` (divisórias/bordas) → `t.ui.linha`
- `#C9BAA8` (chevrons/ícones suaves) → `t.ui.textoSuave`
- `#6E625A` (texto suave cravado) → `t.ui.textoSuave`
- `#FFF`/`#FFFFFF` (cards) → `t.ui.superficie`
- `#B07F3C` (dourado de chip/pill) → `palette.douradoAmanhecer` (funciona nos dois) ou manter se
  sobre fundo `t.ui.painel` com contraste ok no escuro — julgar caso a caso.
- Arquivos: `(tabs)/{index,biblioteca,meu-espaco}.tsx`, `ajustes.tsx`, `anotacoes.tsx`,
  `favoritos.tsx`, `apoiar.tsx`, `assinaturas.tsx`, `loja.tsx`, `conta.tsx`, `conta/{email,senha}.tsx`,
  `(auth)/{entrar,cadastro,recuperar-senha}.tsx`, `components/{Field,TabBar,MiniPlayer,NoteSheet}.tsx`.

### 5. StatusBar por tela
8 telas cravam `<StatusBar style="dark" />` (conta, apoiar, cadastro, assinaturas, conta/senha,
entrar, conta/email, recuperar-senha) → trocar por `style={t.mode === 'dark' ? 'light' : 'dark'}`
(o `t` já existe nessas telas; onde não existir, usar `useTheme()`).

### 6. Estáticas que passam a seguir o tema
- `onboarding.tsx`: heros em gradiente ficam; o corpo (fundo, bolinhas, títulos, "Entrar") vira
  token via `useTheme()`.
- `continuar-lendo.tsx`: tematizar (11 cores cravadas).
- `components/Button.tsx`: `primary`/`secondary` funcionam nos dois modos (dourado/café);
  ajustar `disabled` (`#E3D6C4`) e `outline` (`#D8C4A8`/label) pra tokens/versões que funcionem
  no escuro (ex.: disabled = `t.ui.linha`; outline border/label = tokens). Button vira consumidor
  de `useTheme()` (ou recebe do chamador — decidir na implementação mantendo a API `label/variant`).

## Fora de escopo (YAGNI)
- Temas de leitura integrados ao modo do app; barra de navegação Android; landing page web;
  transições animadas de tema.

## Verificação
- `npx tsc --noEmit` (só `Field.tsx:38`).
- Manual (próximo build): alternar Automático/Claro/Escuro em Ajustes muda o app na hora e
  persiste ao reabrir; todas as telas do escopo legíveis no escuro (sem "flash" branco de
  divisórias/cards); leitura/premium/player/splash inalterados.
