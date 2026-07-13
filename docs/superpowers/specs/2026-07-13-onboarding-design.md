# Onboarding (3 telas de boas-vindas) — Design/Spec

## Objetivo
Transformar o onboarding atual (1 tela) num **carrossel de 3 telas** de boas-vindas, deslizável,
com tom acolhedor (persona Dona Marta). As 3 bolinhas já existentes no design passam a funcionar.

## Decisões (fechadas com o dono via mockup)
- **Narrativa:** 1) **Convite** · 2) **Conforto** · 3) **Jornada**.
- **Interação:** carrossel horizontal deslizável (swipe) + bolinhas refletindo a tela atual.
  - **"Pular"** (canto sup. direito, telas 1 e 2) → marca onboarding visto → vai pras abas.
  - **CTA** por baixo: "Próximo" (telas 1-2) avança; tela 3 vira **"Começar"** → abas.
  - **"Já tenho conta · Entrar"** nas telas **1 e 3** → marca visto → vai pra `/(auth)/entrar`.
- **Sem auto-avanço.** Respeita "reduzir movimento" (o swipe é do usuário; nada anima sozinho).

## Conteúdo das telas
| # | Hero (cor/gradiente + motivo) | Título (serif Lora) | Subtítulo (sans) |
|---|---|---|---|
| 1 · Convite | gradiente **"céu"** + **BrandSeal** (selo da marca) | Comece o dia devagar, com fé e um bom café | Uma reflexão por dia — para ler ou ouvir, no seu tempo. |
| 2 · Conforto | café escuro (**gradients.escuroQuente**) + ícone `musical-notes` | Ouça a narração, com uma música suave ao fundo | Um som calmo para relaxar e se concentrar enquanto lê ou escuta. |
| 3 · Jornada | sálvia (gradiente/solid em tom `palette.salvia`) + ícone `bookmark-outline` | Guarde favoritos, faça anotações, acompanhe sua jornada | Seu espaço pessoal para voltar sempre ao que tocou seu coração. |

Ícones via `@expo/vector-icons` Ionicons, na cor clara sobre o hero (ex.: `#F4E6CF`). O hero mantém
os **cantos inferiores arredondados** (34) como hoje.

## Arquitetura (frontend, arquivo `src/app/onboarding.tsx`)
Refatorar a tela única para o carrossel. Mantém a rota `onboarding` (já registrada no `_layout`).
- **Dados:** um array `SLIDES` (3 itens) com `{ chave, gradiente, icone|seal, titulo, subtitulo }`.
- **Carrossel:** `FlatList` horizontal com `pagingEnabled`, `showsHorizontalScrollIndicator={false}`,
  item com largura = `useWindowDimensions().width`. Índice atual via `onViewableItemsChanged`
  (ou `onMomentumScrollEnd` calculando `Math.round(x / width)`), guardado em `useState`.
- **Bolinhas:** derivadas do índice (ativa = larga + `palette.douradoAmanhecer`).
- **Rodapé fixo (fora do FlatList):** CTA + link "Entrar", que mudam conforme o índice
  (Próximo/Começar; "Entrar" visível nas telas 1 e 3). "Pular" fica no topo do hero (telas 1-2).
- **Ações** (reusam o que já existe): `começar()` = `setOnboardingDone()` + `router.replace('/(tabs)')`;
  `irParaEntrar()` = `setOnboardingDone()` + `router.replace('/(auth)/entrar')`; `avancar()` rola o
  FlatList pro próximo índice (`scrollToIndex`).
- **Componente de slide** (`Slide`, no mesmo arquivo ou colocado): hero + título + subtítulo,
  full-width. Mantém tipografia/tokens do `ccpTheme` (nada de cor nova crua além dos tons já usados).

## Fora de escopo (YAGNI)
- Ilustrações customizadas (usa selo/ícones + gradientes), auto-play, vídeos, permissões
  (notificação/localização) dentro do onboarding — ficam pra depois se quiser.

## Verificação
1. Primeiro acesso (storage sem `onboarding_done`) → splash manda pro onboarding.
2. Swipe entre as 3 telas move as bolinhas; "Pular" (telas 1-2) → abas; "Próximo" avança;
   tela 3 "Começar" → abas; "Entrar" (telas 1 e 3) → tela de login. Todos marcam onboarding visto.
3. Reabrir o app depois (com `onboarding_done`) NÃO mostra o onboarding de novo.
4. `npx tsc --noEmit` limpo (só o pré-existente `Field.tsx:38`).
