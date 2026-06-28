/**
 * Utilitários de push notification (Expo).
 *
 * Fluxo:
 *  1. `obterPushToken()` — pede permissão e retorna o ExpoPushToken (ou null).
 *  2. `sincronizarToken(token, ativo)` — envia o token ao backend via authFetch.
 *
 * Chamado silenciosamente após login/cadastro e na troca do toggle "Lembrete diário".
 */
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
 * Pede permissão e devolve o Expo Push Token (string) ou null se recusado/erro.
 * Só funciona em dispositivo físico — em simulador retorna null silenciosamente.
 */
export async function obterPushToken(): Promise<string | null> {
  try {
    const { status: existente } = await Notifications.getPermissionsAsync();
    let status = existente;
    if (existente !== 'granted') {
      const { status: solicitado } = await Notifications.requestPermissionsAsync();
      status = solicitado;
    }
    if (status !== 'granted') return null;

    const tokenData = await Notifications.getExpoPushTokenAsync();
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
