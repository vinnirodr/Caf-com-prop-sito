/**
 * Gradientes da marca — únicos valores "crus" fora do ccpTheme, vindos do
 * handoff de design (não há equivalente em token simples). Usados com
 * <LinearGradient> (expo-linear-gradient).
 *
 * Em RN, o ângulo CSS vira start/end. Aproximações dos ângulos do protótipo:
 *  - céu (160deg)  ≈ start {x:0,y:0} → end {x:1,y:1}
 *  - escuro (168/172deg) ≈ start {x:0,y:0} → end {x:0.6,y:1}
 */
export const gradients = {
  // Header Início / hero do Onboarding
  ceu: {
    colors: ['#5B4636', '#8A5E34', '#C8924A'] as const,
    locations: [0, 0.55, 1] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  // Splash / fundos escuros quentes
  escuroQuente: {
    colors: ['#3A2D22', '#5B4636', '#7A5430'] as const,
    locations: [0, 0.6, 1] as const,
    start: { x: 0.1, y: 0 },
    end: { x: 0.6, y: 1 },
  },
  // Avatar (Meu Espaço)
  avatar: {
    colors: ['#8B9D83', '#5B4636'] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  // Barra de progresso da jornada
  progresso: {
    colors: ['#8B9D83', '#C8924A'] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
} as const;
