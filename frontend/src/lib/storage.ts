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
} as const;

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
