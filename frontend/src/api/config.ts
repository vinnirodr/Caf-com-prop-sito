import Constants from 'expo-constants';

/**
 * Em desenvolvimento, o app no celular NÃO acessa "localhost" do seu PC.
 * Ele precisa do IP da sua máquina na rede. Como o Expo já conhece esse IP
 * (é o mesmo do Metro/QR code), nós o reaproveitamos e usamos a porta 8000
 * do Django automaticamente — você não precisa configurar nada.
 *
 * Para PRODUÇÃO, troque API_BASE pela URL do Render. Veja abaixo.
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

// Quando for para produção, comente a linha do dev e use a URL do Render:
// export const API_BASE = 'https://cafe-com-proposito-api.onrender.com';
export const API_BASE = devApiBase();

export const API_URL = `${API_BASE}/api`;
