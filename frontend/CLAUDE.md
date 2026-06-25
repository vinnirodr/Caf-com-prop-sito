# Café com Propósito — App (React Native + Expo)

> Contexto persistente para o Claude Code. Leia antes de qualquer tarefa.

## O que é o projeto
App mobile devocional cristão baseado no livro *Café com Propósito* (75 capítulos).
Atmosfera de paz, leveza e acolhimento — "um café com Deus todos os dias". O usuário
lê ou ouve uma reflexão diária, faz anotações, favorita e compartilha. Consome a API
de um backend Django (repositório separado).

## Stack
- **React Native + Expo + TypeScript**, roteamento com **expo-router** (rotas em `src/app`)
- Fontes: **Lora** (serifada, títulos/citações) e **Inter** (interface), via `@expo-google-fonts`
- Ícones: `@expo/vector-icons` (Ionicons); selo da marca em `react-native-svg`
- Gradientes: `expo-linear-gradient` (tokens em `src/theme/gradients.ts`)
- Clima: `expo-location` + Open-Meteo (`src/api/weather.ts`)
- Persistência local: `@react-native-async-storage/async-storage` (`src/lib/storage.ts`)
- Estado: React hooks (sem libs extras por enquanto)

## Estrutura
- `src/app/_layout.tsx` — carrega fontes + Stack raiz (`initialRouteName: splash`)
- `src/app/splash.tsx` — abertura animada; decide onboarding × abas
- `src/app/onboarding.tsx` — boas-vindas (marca `onboarding_done` no storage)
- `src/app/(tabs)/` — as 3 abas: `index` (Início), `biblioteca`, `meu-espaco`
- `src/app/(tabs)/_layout.tsx` — usa a `TabBar` customizada (prop `tabBar`)
- `src/app/(auth)/` — telas `entrar` (03) e `cadastro` (11); login opcional
- `src/auth/AuthContext.tsx` — `useAuth()` (user/entrar/cadastrar/sair); sessão JWT
- `src/api/auth.ts` — login/registro/eu/refresh + `authFetch` (Bearer + refresh em 401)
- `src/app/capitulo/[numero].tsx` — Tela de Leitura (8 partes + barra de controles)
- `src/components/` — `BrandSeal` (selo SVG), `Button` (DS), `TabBar` (flutuante)
- `src/lib/` — `greeting` (saudação por horário), `storage` (AsyncStorage)
- `src/api/config.ts` — URL da API (`EXPO_PUBLIC_API_BASE` ou IP da máquina em dev)
- `src/api/content.ts` — tipos + funções (`getAllChapters`, `getChapter`, `getSpecialPages`)
- `src/api/weather.ts` — clima atual (Open-Meteo + localização)
- `src/theme/gradients.ts` — gradientes da marca (céu, escuro quente, avatar)
- `src/theme/ccpTheme.ts` — **fonte canônica e única dos tokens** (cor claro/escuro,
  espaçamento, raio, elevação, tipografia, movimento; `theme.light`/`theme.dark`),
  resolvida de `src/theme/ccp.tokens.json` (Style Dictionary, exportado do design system)
- `src/theme/useTheme.ts` — hook `useTheme()` que devolve o tema resolvido
  (`light`/`dark`) conforme o esquema de cor do sistema. Telas usam
  `const t = useTheme()` e aplicam `t.ui.*`, `t.palette.*`, mais `typography`/
  `spacing`/`radius`/`elevation` importados de `ccpTheme`.

## Princípios de design (guiam toda decisão de UI)
1. **Acolhimento** — convite, nunca cobrança.
2. **Beleza com calma** — bonito, porém sereno; o conteúdo é o herói.
3. **Simplicidade** — fácil para qualquer idade (persona Dona Marta, 58 anos).
4. **Conforto de uso** — leitura/escuta pensadas para o bem-estar.
Movimento sempre lento e suave (fades, leve deslize); respeitar "reduzir movimento".

## Tokens (usar sempre os de `ccpTheme.ts`/`theme.ts`, nunca cores cravadas no código)
- Marca: café `#5B4636`, dourado `#C8924A`, dourado suave `#E0B878`, sálvia `#8B9D83`
- Interface clara: bg `#FAF7F2`, surface `#FFF`, texto `#2A2422`, suave `#6E625A`, linha `#EAE0D4`
- Temas de leitura: claro (`#FAF7F2`/`#2A2422`), papel (`#F2E9D8`/`#3A3128`), escuro (`#15120F`/`#ECE6DD`)
- Espaçamento 4/8/16/24/32; raios 10/16/22

## Regras de domínio
- Capítulo = **molde de 8 partes**: número, título, versículo (texto + ref), reflexão,
  oração, aplicação prática, frase para guardar, referências (vêm da API).
- **Áudio:** grátis só nos Capítulos 1 e 2 (`audio_acesso`); do 3 em diante exige
  Premium. A **leitura é sempre livre**. "Ouvir" só aparece quando o capítulo tem áudio.

## Convenções
- TypeScript em tudo; componentes funcionais.
- Textos de interface em **português**, tom caloroso e de convite.
- Acessibilidade: suportar fontes ampliadas; alvos de toque >= 44px; foco visível.
- Conectar à API via funções de `src/api/`, com estados de carregando/erro/vazio.

## Estado atual
- **Fundação + refino visual (pronto):** Splash, Onboarding, Início (header "céu"
  + clima real + leitura de hoje), Biblioteca (busca/filtros/badges), Leitura
  (controles + temas claro/papel/escuro persistidos) e Meu Espaço, todos fiéis ao
  protótipo. Tab bar customizada. Ícone oficial (selo da marca). Type-check passa.
- **Placeholders honestos:** dados pessoais (progresso, favoritos, jornada, perfil)
  só entram com auth/engagement — hoje as telas convidam ao login, sem números fake.

## Roadmap (próximos blocos, nesta ordem)
2. **Leitura** — tela do capítulo (molde de 8 partes), ajuste de tamanho/família de
   fonte, temas claro/papel/escuro, avançar/voltar, botão "Ouvir". (Coração do app.)
3. **Áudio** — player estilo Spotify + mini-player, tocando o áudio da API;
   bloqueio premium do Cap. 3 em diante (paywall gentil).
4. **Início** — saudação por horário com o nome + clima (Open-Meteo) + bloco da
   leitura do dia + "retomar de onde parou".
5. **Conta** — splash, onboarding, permissões, cadastro/login/recuperação
   (depende dos endpoints de auth no backend).
6. **Pessoal** — anotações, favoritos, Meu Espaço e compartilhar reflexão.
Fase 2 (monetização): assinatura via RevenueCat; anúncios via AdMob (Premium = zero anúncios).

## Como rodar
- Backend primeiro: `python manage.py runserver 0.0.0.0:8000`
- App: `npm install` -> `npx expo start` -> abrir no **Expo Go** (mesma rede Wi-Fi)
- Em dev o app detecta o IP da máquina sozinho; para produção, ajustar `API_BASE` em `src/api/config.ts`.

## Referência de UX
O design system completo e a aparência pretendida estão no briefing de design e nos
protótipos de UX (HTML) — use-os como norte visual ao construir as telas.
