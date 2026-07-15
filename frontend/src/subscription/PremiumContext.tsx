/**
 * Estado global de assinatura (RevenueCat + backend). `usePremium()` devolve se o
 * usuário tem Premium ativo: `premium = premium do backend OU premium do RevenueCat`.
 * Sem config do RevenueCat (sem chave), `premiumRC` é sempre false e nada quebra —
 * o premium ainda pode vir do backend.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import {
  inicializarCompras,
  getCustomerInfoAtual,
  checarPremium,
  restaurarCompras,
  aoAtualizarCliente,
} from '@/lib/purchases';
import { useAuth } from '@/auth/AuthContext';

type PremiumValue = {
  premium: boolean;
  loading: boolean;
  restaurar: () => Promise<boolean>;
};

const PremiumContext = createContext<PremiumValue | undefined>(undefined);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [premiumRC, setPremiumRC] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    (async () => {
      await inicializarCompras();
      const info = await getCustomerInfoAtual();
      if (ativo) {
        setPremiumRC(checarPremium(info));
        setLoading(false);
      }
    })();
    const desinscrever = aoAtualizarCliente((info) => {
      if (ativo) setPremiumRC(checarPremium(info));
    });
    return () => {
      ativo = false;
      desinscrever();
    };
  }, []);

  const restaurar = useCallback(async (): Promise<boolean> => {
    const info = await restaurarCompras();
    const ativo = checarPremium(info);
    setPremiumRC(ativo);
    return ativo;
  }, []);

  const premiumBackend = !!user?.premium;
  const premium = premiumBackend || premiumRC;

  const value = useMemo(
    () => ({ premium, loading, restaurar }),
    [premium, loading, restaurar]
  );

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}

export function usePremium(): PremiumValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error('usePremium deve ser usado dentro de <PremiumProvider>.');
  return ctx;
}
