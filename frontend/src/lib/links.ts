/**
 * Links legais (Política de Privacidade e Termos de Uso), hospedados no backend.
 * Abrem num navegador in-app via expo-web-browser.
 */
import * as WebBrowser from 'expo-web-browser';
import { API_BASE } from '@/api/config';

export const URL_PRIVACIDADE = `${API_BASE}/privacidade/`;
export const URL_TERMOS = `${API_BASE}/termos/`;

export function abrirLink(url: string): void {
  WebBrowser.openBrowserAsync(url).catch(() => {});
}
