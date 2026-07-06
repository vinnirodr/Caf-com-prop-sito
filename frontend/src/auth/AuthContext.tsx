/**
 * Estado global de autenticação. Carrega a sessão salva no boot e expõe
 * login/registro/logout. Use via `useAuth()`.
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
  login as apiLogin,
  registrar as apiRegistrar,
  buscarEu,
  sair as apiSair,
  excluirConta,
  loginGoogle,
  type Usuario,
  type RegistroPayload,
} from '@/api/auth';
import { getTokens } from '@/lib/storage';
import { obterPushToken, sincronizarToken } from '@/lib/notifications';
import { obterIdTokenGoogle, sairDoGoogle } from '@/lib/google';

type AuthValue = {
  user: Usuario | null;
  loading: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  cadastrar: (payload: RegistroPayload) => Promise<void>;
  entrarComGoogle: () => Promise<boolean>;
  sair: () => Promise<void>;
  atualizarUsuario: (user: Usuario) => void;
  excluir: (senha: string) => Promise<void>;
};

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  // Boot: se houver tokens salvos, tenta recuperar o usuário e re-sincroniza o token.
  useEffect(() => {
    let active = true;
    (async () => {
      const tokens = await getTokens();
      if (tokens) {
        try {
          const u = await buscarEu();
          if (active) {
            setUser(u);
            // Re-sincroniza o token (pode ter mudado se o app foi reinstalado).
            obterPushToken()
              .then((t) => { if (t) sincronizarToken(t, u.notificacoes_ativas ?? true); })
              .catch(() => {});
          }
        } catch {
          if (active) setUser(null);
        }
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const entrar = useCallback(async (email: string, senha: string) => {
    const { user } = await apiLogin(email, senha);
    setUser(user);
    obterPushToken()
      .then((t) => { if (t) sincronizarToken(t, true); })
      .catch(() => {});
  }, []);

  const cadastrar = useCallback(async (payload: RegistroPayload) => {
    const { user } = await apiRegistrar(payload);
    setUser(user);
    obterPushToken()
      .then((t) => { if (t) sincronizarToken(t, true); })
      .catch(() => {});
  }, []);

  const entrarComGoogle = useCallback(async (): Promise<boolean> => {
    const idToken = await obterIdTokenGoogle();
    if (!idToken) return false; // usuário cancelou
    const user = await loginGoogle(idToken);
    setUser(user);
    obterPushToken()
      .then((t) => { if (t) sincronizarToken(t, true); })
      .catch(() => {});
    return true;
  }, []);

  const sair = useCallback(async () => {
    await apiSair();
    await sairDoGoogle(); // encerra a sessão nativa do Google (senão gruda a conta)
    setUser(null);
  }, []);

  const atualizarUsuario = useCallback((u: Usuario) => setUser(u), []);

  const excluir = useCallback(async (senha: string) => {
    await excluirConta(senha);
    await apiSair();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, entrar, cadastrar, entrarComGoogle, sair, atualizarUsuario, excluir }),
    [user, loading, entrar, cadastrar, entrarComGoogle, sair, atualizarUsuario, excluir]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  return ctx;
}
