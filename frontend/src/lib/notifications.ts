/**
 * Utilitários de push notification (Expo).
 *
 * Fluxo:
 *  1. `obterPushToken()` — pede permissão e retorna o ExpoPushToken (ou null).
 *  2. `sincronizarToken(token, ativo)` — envia o token ao backend via authFetch.
 *  3. `configurarCanaisAndroid()` / `pedirPermissaoNotificacoes()` — usados na
 *     inicialização e na tela de Ajustes (lembretes locais).
 *
 * Chamado silenciosamente no boot/login/cadastro e ao ajustar as notificações.
 */
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { authFetch } from '@/api/auth';

/** Configura comportamento das notificações em foreground (mostra banner). */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * projectId do EAS. Em builds standalone a auto-detecção pode falhar, então
 * passamos explicitamente para o getExpoPushTokenAsync — sem isso o token não
 * é gerado e o push_token do usuário fica vazio no backend.
 */
const EAS_PROJECT_ID: string | undefined =
  Constants.expoConfig?.extra?.eas?.projectId ??
  (Constants as any).easConfig?.projectId;

/** Cria os canais de notificação do Android (obrigatório para heads-up no Android 8+). */
export async function configurarCanaisAndroid(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Geral',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('lembretes', {
      name: 'Lembretes de leitura',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  } catch {
    // ignora — sem canal, o Android usa o padrão
  }
}

/** Garante a permissão de notificação. Retorna true se concedida. */
export async function pedirPermissaoNotificacoes(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return true;
    const { status: novo } = await Notifications.requestPermissionsAsync();
    return novo === 'granted';
  } catch {
    return false;
  }
}

/**
 * Pede permissão e devolve o Expo Push Token (string) ou null se recusado/erro.
 * Só funciona em dispositivo físico — em simulador retorna null silenciosamente.
 */
export async function obterPushToken(): Promise<string | null> {
  try {
    if (!(await pedirPermissaoNotificacoes())) return null;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      EAS_PROJECT_ID ? { projectId: EAS_PROJECT_ID } : undefined
    );
    return tokenData.data;
  } catch {
    return null;
  }
}

/**
 * Registra (ou atualiza) o token no backend.
 * Falha silenciosa — não bloqueia o fluxo de login.
 */
export async function sincronizarToken(
  token: string,
  notificacoesAtivas: boolean
): Promise<void> {
  try {
    await authFetch('/auth/registrar-token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ push_token: token, notificacoes_ativas: notificacoesAtivas }),
    });
  } catch {
    // ignora — token será re-sincronizado no próximo login
  }
}
