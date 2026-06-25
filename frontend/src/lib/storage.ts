/**
 * Pequenos wrappers sobre AsyncStorage. Persistência local leve (sem conta):
 *  - flag de onboarding visto;
 *  - preferências da Tela de Leitura (tema e tamanho de fonte).
 *
 * Tudo tolera falha silenciosamente — preferência local nunca deve quebrar a UI.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  onboardingDone: 'ccp.onboarding_done',
  readingTheme: 'ccp.reading.theme',
  readingFontStep: 'ccp.reading.fontStep',
  accessToken: 'ccp.auth.access',
  refreshToken: 'ccp.auth.refresh',
} as const;

export type Tokens = { access: string; refresh: string };

export async function getTokens(): Promise<Tokens | null> {
  try {
    const [access, refresh] = await Promise.all([
      AsyncStorage.getItem(KEYS.accessToken),
      AsyncStorage.getItem(KEYS.refreshToken),
    ]);
    if (access && refresh) return { access, refresh };
    return null;
  } catch {
    return null;
  }
}

export async function saveTokens(tokens: Tokens): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [KEYS.accessToken, tokens.access],
      [KEYS.refreshToken, tokens.refresh],
    ]);
  } catch {
    // ignora
  }
}

export async function saveAccessToken(access: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.accessToken, access);
  } catch {
    // ignora
  }
}

export async function clearTokens(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([KEYS.accessToken, KEYS.refreshToken]);
  } catch {
    // ignora
  }
}

export async function getOnboardingDone(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEYS.onboardingDone)) === '1';
  } catch {
    return false;
  }
}

export async function setOnboardingDone(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.onboardingDone, '1');
  } catch {
    // ignora
  }
}

export type ReadingPrefs = { theme?: string; fontStep?: number };

export async function getReadingPrefs(): Promise<ReadingPrefs> {
  try {
    const [theme, fontStep] = await Promise.all([
      AsyncStorage.getItem(KEYS.readingTheme),
      AsyncStorage.getItem(KEYS.readingFontStep),
    ]);
    return {
      theme: theme ?? undefined,
      fontStep: fontStep != null ? Number(fontStep) : undefined,
    };
  } catch {
    return {};
  }
}

export async function saveReadingPrefs(prefs: ReadingPrefs): Promise<void> {
  try {
    const ops: Promise<void>[] = [];
    if (prefs.theme != null) ops.push(AsyncStorage.setItem(KEYS.readingTheme, prefs.theme));
    if (prefs.fontStep != null)
      ops.push(AsyncStorage.setItem(KEYS.readingFontStep, String(prefs.fontStep)));
    await Promise.all(ops);
  } catch {
    // ignora
  }
}
