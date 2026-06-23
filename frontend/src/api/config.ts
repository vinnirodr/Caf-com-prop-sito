import Constants from 'expo-constants';

/**
 * URL da API.
 *
 * 1) PRODUÇÃO / teste contra o Render: defina a variável de ambiente
 *    `EXPO_PUBLIC_API_BASE` ao iniciar o Expo. Ela tem prioridade.
 *
 *      EXPO_PUBLIC_API_BASE=https://cafe-com-proposito-api.onrender.com npx expo start
 *
 *    (Funciona no Expo Go: o app nativo chama a API direto, sem CORS.)
 *
 * 2) DESENVOLVIMENTO local: sem essa variável, o app descobre sozinho o IP da
 *    sua máquina (o mesmo do Metro/QR code) e usa a porta 8000 do Django — não
 *    precisa configurar nada.
 */
function devApiBase(): string {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as any).manifest2?.extra?.expoGo?.developer?.host;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:8000`;
  }
  return 'http://localhost:8000';
}

const envBase = process.env.EXPO_PUBLIC_API_BASE?.trim();

export const API_BASE = envBase && envBase.length > 0 ? envBase : devApiBase();

export const API_URL = `${API_BASE}/api`;
