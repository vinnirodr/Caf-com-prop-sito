/**
 * Tema do Café com Propósito.
 *
 * Fonte canônica dos tokens: `ccpTheme.ts` (resolvido de `ccp.tokens.json`,
 * formato Style Dictionary). Este arquivo apenas reexpõe os tokens com os
 * nomes usados pelas telas atuais — não cravar cores aqui nem nas telas.
 *
 * Para novas telas, prefira importar de `@/theme/ccpTheme`:
 *   import { theme, typography, elevation, motion } from '@/theme/ccpTheme';
 */
import {
  palette as brand,
  spacing,
  radius,
  fonts,
  theme,
} from './ccpTheme';

const lightUi = theme.light.ui;

/** Paleta plana usada pelas telas (interface clara). */
export const palette = {
  // Marca
  cafe: brand.cafe,
  cafeDark: brand.cafeEscuro,
  dourado: brand.douradoAmanhecer,
  douradoSoft: brand.douradoSuave,
  salvia: brand.salvia,
  // Interface (clara e quente)
  bg: lightUi.fundo,
  surface: lightUi.superficie,
  text: lightUi.texto,
  textSoft: lightUi.textoSuave,
  line: lightUi.linha,
  paperPanel: lightUi.papel,
} as const;

/** Os três temas de leitura (aplicados na tela de Leitura). */
export const readingThemes = {
  claro: { bg: theme.light.reading.claro.fundo, text: theme.light.reading.claro.texto, soft: '#6E625A' },
  papel: { bg: theme.light.reading.papel.fundo, text: theme.light.reading.papel.texto, soft: '#6B5E4E' },
  escuro: { bg: theme.light.reading.escuro.fundo, text: theme.light.reading.escuro.texto, soft: '#A89E90' },
} as const;

export type ReadingThemeName = keyof typeof readingThemes;

export { fonts, spacing, radius };
