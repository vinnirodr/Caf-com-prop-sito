/**
 * Wrapper fino sobre o RevenueCat (Google Play Billing).
 *
 * REGRA DE OURO: sem EXPO_PUBLIC_REVENUECAT_ANDROID_KEY tudo é no-op gracioso —
 * o app funciona 100% sem config; a monetização "ativa" sozinha quando a chave
 * e os produtos existirem. Nunca chamar métodos do RevenueCat sem checar
 * configuradoRevenueCat() antes.
 */
import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';

const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

export const ENTITLEMENT_PREMIUM = 'premium';
export const OFERTA_DOACAO = 'doacao';

let iniciado = false;

/** Há chave configurada para este build? (só Android por ora) */
export function configuradoRevenueCat(): boolean {
  return Platform.OS === 'android' && ANDROID_KEY.length > 0;
}

/** Configura o SDK uma única vez. No-op sem chave. Tolera falha (não quebra o app). */
export async function inicializarCompras(): Promise<void> {
  if (iniciado || !configuradoRevenueCat()) return;
  try {
    Purchases.configure({ apiKey: ANDROID_KEY });
    iniciado = true;
  } catch {
    // não deve derrubar o app; segue como não-configurado
  }
}

export async function getCustomerInfoAtual(): Promise<CustomerInfo | null> {
  if (!configuradoRevenueCat()) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

/** Premium ativo = entitlement 'premium' presente entre os ativos. */
export function checarPremium(info: CustomerInfo | null): boolean {
  return !!info?.entitlements.active[ENTITLEMENT_PREMIUM];
}

export async function getPacotesPremium(): Promise<PurchasesPackage[]> {
  if (!configuradoRevenueCat()) return [];
  try {
    const ofertas = await Purchases.getOfferings();
    return ofertas.current?.availablePackages ?? [];
  } catch {
    return [];
  }
}

export async function getPacotesDoacao(): Promise<PurchasesPackage[]> {
  if (!configuradoRevenueCat()) return [];
  try {
    const ofertas = await Purchases.getOfferings();
    return ofertas.all[OFERTA_DOACAO]?.availablePackages ?? [];
  } catch {
    return [];
  }
}

/** Compra um pacote. `cancelado: true` quando o usuário fecha o fluxo (não é erro). */
export async function comprarPacote(
  pkg: PurchasesPackage
): Promise<{ info: CustomerInfo | null; cancelado: boolean }> {
  if (!configuradoRevenueCat()) return { info: null, cancelado: false };
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { info: customerInfo, cancelado: false };
  } catch (e) {
    if ((e as { userCancelled?: boolean })?.userCancelled) {
      return { info: null, cancelado: true };
    }
    throw e;
  }
}

export async function restaurarCompras(): Promise<CustomerInfo | null> {
  if (!configuradoRevenueCat()) return null;
  try {
    return await Purchases.restorePurchases();
  } catch {
    return null;
  }
}

/** Assina atualizações do CustomerInfo. Devolve função de cleanup. No-op sem chave. */
export function aoAtualizarCliente(cb: (info: CustomerInfo) => void): () => void {
  if (!configuradoRevenueCat()) return () => {};
  Purchases.addCustomerInfoUpdateListener(cb);
  return () => Purchases.removeCustomerInfoUpdateListener(cb);
}

/** Identifica o usuário logado no RevenueCat (App User ID = id do backend). No-op sem chave. */
export async function identificarUsuario(id: string | number): Promise<void> {
  if (!configuradoRevenueCat()) return;
  try {
    await Purchases.logIn(String(id));
  } catch {
    // não deve derrubar o app
  }
}

/** Desvincula o usuário do RevenueCat (logout). No-op sem chave. */
export async function desidentificarUsuario(): Promise<void> {
  if (!configuradoRevenueCat()) return;
  try {
    await Purchases.logOut();
  } catch {
    // não deve derrubar o app
  }
}
