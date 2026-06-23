/**
 * Tema do Café com Propósito — cores e tipografia aprovadas.
 */

export const palette = {
  // Marca
  cafe: '#5B4636',
  cafeDark: '#3A2D22',
  dourado: '#C8924A',
  douradoSoft: '#E0B878',
  salvia: '#8B9D83',
  // Interface (clara e quente)
  bg: '#FAF7F2',
  surface: '#FFFFFF',
  text: '#2A2422',
  textSoft: '#6E625A',
  line: '#EAE0D4',
  paperPanel: '#F7F1E8',
} as const;

/** Os três temas de leitura (aplicados na tela de Leitura). */
export const readingThemes = {
  claro: { bg: '#FAF7F2', text: '#2A2422', soft: '#6E625A' },
  papel: { bg: '#F2E9D8', text: '#3A3128', soft: '#6B5E4E' },
  escuro: { bg: '#15120F', text: '#ECE6DD', soft: '#A89E90' },
} as const;

export type ReadingThemeName = keyof typeof readingThemes;

/** Famílias de fonte (carregadas em src/app/_layout.tsx). */
export const fonts = {
  serif: 'Lora_500Medium',
  serifBold: 'Lora_600SemiBold',
  serifXBold: 'Lora_700Bold',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansBold: 'Inter_600SemiBold',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 10, md: 16, lg: 22 } as const;
