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
 * Abre o seletor nativo do Google e devolve o idToken.
 * Retorna null se o usuário cancelar. Lança nos demais erros (sem rede, etc.).
 */
export async function obterIdTokenGoogle(): Promise<string | null> {
  configurarGoogle();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
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
