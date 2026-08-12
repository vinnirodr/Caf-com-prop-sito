/**
 * Pequenos wrappers sobre AsyncStorage. Persistência local leve (sem conta):
 *  - flag de onboarding visto;
 *  - preferências da Tela de Leitura (tema e tamanho de fonte).
 *
 * Tudo tolera falha silenciosamente — preferência local nunca deve quebrar a UI.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  onboardingDone: 'ccp.onboarding_done_v2',
  readingTheme: 'ccp.reading.theme',
  readingFontStep: 'ccp.reading.fontStep',
  accessToken: 'ccp.auth.access',
  refreshToken: 'ccp.auth.refresh',
  reminderEnabled: 'ccp.reminder.enabled',
  reminderHour: 'ccp.reminder.hour',
  reminderMinute: 'ccp.reminder.minute',
  musicaAtiva: 'ccp.musica.ativa',
  musicaFaixaId: 'ccp.musica.faixaId',
  musicaPlaylist: 'ccp.musica.playlist',
  musicaModo: 'ccp.musica.modo',
  temaModo: 'ccp.tema.modo',
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

// Preferência do lembrete diário de leitura (agendado localmente no aparelho).
export type ReminderPrefs = { enabled: boolean; hour: number; minute: number };

export const REMINDER_PADRAO: ReminderPrefs = { enabled: false, hour: 8, minute: 0 };

export async function getReminderPrefs(): Promise<ReminderPrefs> {
  try {
    const [enabled, hour, minute] = await Promise.all([
      AsyncStorage.getItem(KEYS.reminderEnabled),
      AsyncStorage.getItem(KEYS.reminderHour),
      AsyncStorage.getItem(KEYS.reminderMinute),
    ]);
    return {
      enabled: enabled === '1',
      hour: hour != null ? Number(hour) : REMINDER_PADRAO.hour,
      minute: minute != null ? Number(minute) : REMINDER_PADRAO.minute,
    };
  } catch {
    return { ...REMINDER_PADRAO };
  }
}

export async function saveReminderPrefs(prefs: ReminderPrefs): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [KEYS.reminderEnabled, prefs.enabled ? '1' : '0'],
      [KEYS.reminderHour, String(prefs.hour)],
      [KEYS.reminderMinute, String(prefs.minute)],
    ]);
  } catch {
    // ignora
  }
}

// Preferência da música de fundo da leitura (local, sem conta).
// `playlist` é a ordem escolhida pelo usuário; `modo` toca em sequência ou aleatório.
// `faixaId` é mantido só por compatibilidade com versões antigas (migração abaixo).
export type MusicaModo = 'sequencia' | 'aleatorio';
export type MusicaFundoPrefs = {
  ativa: boolean;
  faixaId: number | null;
  playlist: number[];
  modo: MusicaModo;
};

export async function getMusicaFundoPrefs(): Promise<MusicaFundoPrefs> {
  try {
    const [ativa, faixaId, playlistRaw, modoRaw] = await Promise.all([
      AsyncStorage.getItem(KEYS.musicaAtiva),
      AsyncStorage.getItem(KEYS.musicaFaixaId),
      AsyncStorage.getItem(KEYS.musicaPlaylist),
      AsyncStorage.getItem(KEYS.musicaModo),
    ]);
    const fid = faixaId ? Number(faixaId) : null;
    let playlist: number[] = [];
    if (playlistRaw) {
      try {
        const arr = JSON.parse(playlistRaw);
        if (Array.isArray(arr)) playlist = arr.filter((n) => typeof n === 'number');
      } catch {
        /* ignora json inválido */
      }
    }
    // Migração: versão antiga guardava só uma faixa — vira uma playlist de 1.
    if (playlist.length === 0 && fid != null) playlist = [fid];
    return {
      ativa: ativa === '1',
      faixaId: fid,
      playlist,
      modo: modoRaw === 'aleatorio' ? 'aleatorio' : 'sequencia',
    };
  } catch {
    return { ativa: false, faixaId: null, playlist: [], modo: 'sequencia' };
  }
}

export async function saveMusicaFundoPrefs(prefs: MusicaFundoPrefs): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [KEYS.musicaAtiva, prefs.ativa ? '1' : '0'],
      [KEYS.musicaFaixaId, prefs.faixaId != null ? String(prefs.faixaId) : ''],
      [KEYS.musicaPlaylist, JSON.stringify(prefs.playlist ?? [])],
      [KEYS.musicaModo, prefs.modo === 'aleatorio' ? 'aleatorio' : 'sequencia'],
    ]);
  } catch {
    // ignora
  }
}

export type TemaModo = 'auto' | 'claro' | 'escuro';

export async function getTemaModo(): Promise<TemaModo> {
  try {
    const v = await AsyncStorage.getItem(KEYS.temaModo);
    return v === 'claro' || v === 'escuro' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export async function saveTemaModo(modo: TemaModo): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.temaModo, modo);
  } catch {
    // ignora
  }
}
