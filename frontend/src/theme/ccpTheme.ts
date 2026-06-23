/**
 * Café com Propósito — tema pronto para React Native + Expo.
 * Resolvido a partir de tokens/ccp.tokens.json (Style Dictionary) — fonte
 * canônica das fundações: cor, espaçamento, raio, elevação, tipografia e
 * movimento. Veja `ccp.tokens.json` (mesmos valores aprovados).
 *
 * Uso:
 *   import { theme } from '@/theme/ccpTheme';
 *   const t = theme.light;  // ou theme.dark
 *   <View style={{ backgroundColor: t.ui.fundo, ...t.elevation.level2 }} />
 */

export const palette = {
  cafe: '#5B4636',
  cafeEscuro: '#3A2D22',
  douradoAmanhecer: '#C8924A',
  douradoSuave: '#E0B878',
  salvia: '#8B9D83',
  sucesso: '#5E7256',
  sucessoFundo: '#EEF3EA',
  erro: '#B4493C',
  erroFundo: '#FBF1ED',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, screenMargin: 24 } as const;

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 } as const;

// Sombras quentes (base café). iOS usa shadow*, Android usa elevation.
export const elevation = {
  level1: { shadowColor: '#5B4636', shadowOpacity: 0.10, shadowRadius: 6,  shadowOffset: { width: 0, height: 2 },  elevation: 1 },
  level2: { shadowColor: '#5B4636', shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },  elevation: 4 },
  level3: { shadowColor: '#5B4636', shadowOpacity: 0.24, shadowRadius: 28, shadowOffset: { width: 0, height: 16 }, elevation: 8 },
} as const;

/**
 * Identificadores das famílias de fonte carregados em `src/app/_layout.tsx`
 * via @expo-google-fonts. A escala tipográfica abaixo já os referencia.
 */
export const fonts = {
  serif: 'Lora_500Medium',
  serifBold: 'Lora_600SemiBold',
  serifXBold: 'Lora_700Bold',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansBold: 'Inter_600SemiBold',
  serifRegular: 'Lora_400Regular',
} as const;

export const typography = {
  display:  { fontFamily: fonts.serif,    fontSize: 48, lineHeight: 50, letterSpacing: -0.7 },
  title:    { fontFamily: fonts.serif,    fontSize: 32, lineHeight: 37, letterSpacing: -0.3 },
  subtitle: { fontFamily: fonts.serif,    fontSize: 22, lineHeight: 29 },
  body:     { fontFamily: fonts.serifRegular, fontSize: 18, lineHeight: 31 },
  bodyUi:   { fontFamily: fonts.sans,     fontSize: 16, lineHeight: 26 },
  caption:  { fontFamily: fonts.sans,     fontSize: 13, lineHeight: 20 },
  label:    { fontFamily: fonts.sansBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.5 },
} as const;

export const motion = {
  duration: { fast: 180, default: 280, slow: 420, stagger: 60 },
  // React Native Reanimated / Easing.bezier(0.22, 0.61, 0.36, 1)
  easing: { standard: [0.22, 0.61, 0.36, 1] as [number, number, number, number] },
} as const;

// Temas de leitura selecionáveis na tela de Leitura (fundo + texto aprovados).
export const reading = {
  claro:  { fundo: '#FAF7F2', texto: '#2A2422' },
  papel:  { fundo: '#F2E9D8', texto: '#3A3128' },
  escuro: { fundo: '#15120F', texto: '#ECE6DD' },
} as const;

const ui = {
  light: {
    fundo: '#FAF7F2', superficie: '#FFFFFF', texto: '#2A2422',
    textoSuave: '#6E625A', linha: '#EAE0D4', papel: '#F2E9D8',
    // superfície "elevada"/painel — comum a claro e escuro (claro = papel)
    painel: '#F2E9D8',
  },
  dark: {
    fundo: '#1C1714', superficie: '#261F1A', texto: '#ECE6DD',
    textoSuave: '#B3A599', linha: '#3A2F27', realce: '#2E251F',
    // superfície "elevada"/painel — comum a claro e escuro (escuro = realce)
    painel: '#2E251F',
  },
} as const;

export const theme = {
  light: { mode: 'light' as const, palette, ui: ui.light, reading, spacing, radius, elevation, typography, motion },
  dark:  { mode: 'dark'  as const, palette, ui: ui.dark,  reading, spacing, radius, elevation, typography, motion },
} as const;

export type ThemeMode = keyof typeof theme;
export type Theme = (typeof theme)[ThemeMode];

export default theme;
