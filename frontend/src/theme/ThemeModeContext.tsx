/**
 * Preferência de tema do app: Automático (segue o sistema) / Claro / Escuro.
 * Persistida localmente. `useTheme()` consome o modo resolvido daqui.
 */
import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { getTemaModo, saveTemaModo, saveReadingPrefs, type TemaModo } from '@/lib/storage';

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

  const definirModo = useCallback(
    (m: TemaModo) => {
      setModo(m);
      saveTemaModo(m);
      const resolvido = m === 'auto' ? (sistema === 'dark' ? 'dark' : 'light') : m === 'escuro' ? 'dark' : 'light';
      saveReadingPrefs({ theme: resolvido === 'dark' ? 'escuro' : 'claro' });
    },
    [sistema]
  );

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
