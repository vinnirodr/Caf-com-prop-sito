/**
 * Hook do tema do app (claro/escuro).
 *
 * Retorna o tema resolvido do design system (`ccpTheme`) conforme a preferência
 * do app (Automático/Claro/Escuro, ver `ThemeModeContext`) — com fallback no
 * esquema de cor do sistema quando não há provider (o app.json já define
 * `userInterfaceStyle: "automatic"`).
 *
 * Uso:
 *   const t = useTheme();
 *   <View style={{ backgroundColor: t.ui.fundo, ...t.elevation.level1 }}>
 *     <Text style={{ color: t.ui.texto, ...t.typography.title }}>…</Text>
 *
 * Observação: os três *temas de leitura* (claro/papel/escuro) da Tela de Leitura
 * são escolhidos manualmente lá e usam os tokens `reading` — são independentes
 * do claro/escuro do app.
 */
import { theme, type Theme } from './ccpTheme';
import { useResolvedMode } from './ThemeModeContext';

export type { Theme } from './ccpTheme';

export function useTheme(): Theme {
  const mode = useResolvedMode();
  return mode === 'dark' ? theme.dark : theme.light;
}

export default useTheme;
