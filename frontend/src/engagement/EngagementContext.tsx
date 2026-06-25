/**
 * Estado de engajamento do usuário logado: favoritos, progresso (lido/andamento)
 * e o resumo da jornada. Carrega ao entrar e zera ao sair. Use via `useEngagement()`.
 *
 * As anotações são gerenciadas pontualmente nas telas (lista/edição); aqui só
 * mantemos o resumo, que pode ser atualizado via `atualizarResumo()`.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useAuth } from '@/auth/AuthContext';
import {
  listarFavoritos,
  listarProgresso,
  obterResumo,
  adicionarFavorito,
  removerFavorito,
  marcarProgresso,
  type Favorito,
  type Resumo,
} from '@/api/engagement';

export type StatusCapitulo = 'lido' | 'andamento' | 'novo';

type EngagementValue = {
  favoritos: Favorito[];
  resumo: Resumo | null;
  carregando: boolean;
  isFavorito: (numero: number) => boolean;
  statusCapitulo: (numero: number) => StatusCapitulo;
  alternarFavorito: (numero: number) => Promise<void>;
  marcarLido: (numero: number, lido: boolean) => Promise<void>;
  registrarLeitura: (numero: number) => Promise<void>;
  atualizarResumo: () => Promise<void>;
};

const EngagementContext = createContext<EngagementValue | undefined>(undefined);

export function EngagementProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [favoritos, setFavoritos] = useState<Favorito[]>([]);
  const [favSet, setFavSet] = useState<Set<number>>(new Set());
  const [progresso, setProgresso] = useState<Record<number, { lido: boolean; ouvido: boolean }>>({});
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [carregando, setCarregando] = useState(false);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [favs, progs, res] = await Promise.all([
        listarFavoritos(),
        listarProgresso(),
        obterResumo(),
      ]);
      setFavoritos(favs);
      setFavSet(new Set(favs.map((f) => f.capitulo)));
      const map: Record<number, { lido: boolean; ouvido: boolean }> = {};
      progs.forEach((p) => (map[p.capitulo] = { lido: p.lido, ouvido: p.ouvido }));
      setProgresso(map);
      setResumo(res);
    } catch {
      // silencioso — telas mostram seus próprios estados
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      recarregar();
    } else {
      setFavoritos([]);
      setFavSet(new Set());
      setProgresso({});
      setResumo(null);
    }
  }, [user, recarregar]);

  const isFavorito = useCallback((n: number) => favSet.has(n), [favSet]);

  const statusCapitulo = useCallback(
    (n: number): StatusCapitulo => {
      const p = progresso[n];
      if (!p) return 'novo';
      return p.lido ? 'lido' : 'andamento';
    },
    [progresso]
  );

  const atualizarResumo = useCallback(async () => {
    try {
      setResumo(await obterResumo());
    } catch {
      // ignora
    }
  }, []);

  const alternarFavorito = useCallback(
    async (numero: number) => {
      const eraFav = favSet.has(numero);
      // otimista
      setFavSet((prev) => {
        const s = new Set(prev);
        eraFav ? s.delete(numero) : s.add(numero);
        return s;
      });
      try {
        if (eraFav) {
          await removerFavorito(numero);
          setFavoritos((prev) => prev.filter((f) => f.capitulo !== numero));
        } else {
          const novo = await adicionarFavorito(numero);
          setFavoritos((prev) => [novo, ...prev.filter((f) => f.capitulo !== numero)]);
        }
        atualizarResumo();
      } catch {
        // reverte
        setFavSet((prev) => {
          const s = new Set(prev);
          eraFav ? s.add(numero) : s.delete(numero);
          return s;
        });
      }
    },
    [favSet, atualizarResumo]
  );

  const marcarLido = useCallback(
    async (numero: number, lido: boolean) => {
      setProgresso((prev) => ({ ...prev, [numero]: { lido, ouvido: prev[numero]?.ouvido ?? false } }));
      try {
        await marcarProgresso(numero, { lido });
        atualizarResumo();
      } catch {
        setProgresso((prev) => ({
          ...prev,
          [numero]: { lido: !lido, ouvido: prev[numero]?.ouvido ?? false },
        }));
      }
    },
    [atualizarResumo]
  );

  const registrarLeitura = useCallback(
    async (numero: number) => {
      // marca "em andamento" sem mexer no lido, se ainda não houver registro
      if (progresso[numero]) return;
      setProgresso((prev) => ({ ...prev, [numero]: { lido: false, ouvido: false } }));
      try {
        await marcarProgresso(numero, {});
      } catch {
        // ignora
      }
    },
    [progresso]
  );

  return (
    <EngagementContext.Provider
      value={{
        favoritos,
        resumo,
        carregando,
        isFavorito,
        statusCapitulo,
        alternarFavorito,
        marcarLido,
        registrarLeitura,
        atualizarResumo,
      }}
    >
      {children}
    </EngagementContext.Provider>
  );
}

export function useEngagement(): EngagementValue {
  const ctx = useContext(EngagementContext);
  if (!ctx) throw new Error('useEngagement deve ser usado dentro de <EngagementProvider>.');
  return ctx;
}
