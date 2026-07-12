/**
 * Estado global de assinatura (RevenueCat). `usePremium()` devolve se o usuário
 * tem Premium ativo. Sem config (sem chave), `premium` é sempre false e nada quebra.
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

type PremiumValue = {
  premium: boolean;
  loading: boolean;
  restaurar: () => Promise<boolean>;
};

const PremiumContext = createContext<PremiumValue | undefined>(undefined);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [premium, setPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    (async () => {
      await inicializarCompras();
      const info = await getCustomerInfoAtual();
      if (ativo) {
        setPremium(checarPremium(info));
        setLoading(false);
      }
    })();
    const desinscrever = aoAtualizarCliente((info) => {
      if (ativo) setPremium(checarPremium(info));
    });
    return () => {
      ativo = false;
      desinscrever();
    };
  }, []);

  const restaurar = useCallback(async (): Promise<boolean> => {
    const info = await restaurarCompras();
    const ativo = checarPremium(info);
    setPremium(ativo);
    return ativo;
  }, []);

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
