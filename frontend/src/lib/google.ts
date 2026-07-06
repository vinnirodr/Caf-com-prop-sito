/**
 * Login com Google (nativo). Usa o Web client ID (público) como `webClientId`
 * para obter um idToken com a audiência que o backend espera verificar.
 */
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

// Client IDs do Google são públicos (não são segredo).
const WEB_CLIENT_ID = '560408856695-1hatukjbsikb90at19rj7gqkcmbtgvcb.apps.googleusercontent.com';

let configurado = false;

export function configurarGoogle(): void {
  if (configurado) return;
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
  configurado = true;
}

/**
 * Encerra a sessão nativa do Google (não mexe no JWT do app). Tolera falha.
 * Usada no logout e antes de um novo login, para o seletor de contas sempre aparecer.
 */
export async function sairDoGoogle(): Promise<void> {
  try {
    configurarGoogle();
    await GoogleSignin.signOut();
  } catch {
    // ignora — não deve bloquear o logout/login
  }
}

/**
 * Abre o seletor nativo do Google e devolve o idToken.
 * Retorna null se o usuário cancelar. Lança nos demais erros (sem rede, etc.).
 */
export async function obterIdTokenGoogle(): Promise<string | null> {
  configurarGoogle();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  // Encerra qualquer sessão nativa anterior para SEMPRE mostrar o seletor de contas
  // (senão o signIn reusa a última conta silenciosamente).
  await sairDoGoogle();
  try {
    const resp = await GoogleSignin.signIn();
    // A forma do retorno varia por versão do pacote: v13+ usa { data: { idToken } };
    // versões antigas expõem { idToken } direto. Cobrimos ambas.
    const idToken =
      (resp as { data?: { idToken?: string | null } })?.data?.idToken ??
      (resp as { idToken?: string | null })?.idToken ??
      null;
    return idToken ?? null;
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === statusCodes.SIGN_IN_CANCELLED) return null;
    throw e;
  }
}
