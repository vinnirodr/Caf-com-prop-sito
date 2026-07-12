/**
 * Música de fundo da leitura. 2º player expo-audio (em loop, volume baixo) que toca
 * por baixo da narração enquanto o usuário está num capítulo. Ducking dinâmico +
 * fades + continuidade entre capítulos. Gracioso: sem faixa, nada toca e nada quebra.
 */
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useAudioPlayer } from 'expo-audio';
import { getMusicasFundo, mediaUrl, type MusicaFundo } from '@/api/content';
import { getMusicaFundoPrefs, saveMusicaFundoPrefs } from '@/lib/storage';
import { useAudioStatus } from '@/audio/AudioContext';

const VOL_LEITURA = 0.4; // leitura silenciosa
const VOL_DUCK = 0.2; // narração tocando (≤ 50% da narração)
const FADE_MS = 1200;
const DUCK_MS = 400;
const GRACA_SAIR_MS = 600; // janela p/ não reiniciar entre capítulos

type MusicaValue = {
  ativa: boolean;
  temFaixas: boolean;
  faixas: MusicaFundo[];
  faixaSelecionada: MusicaFundo | null;
  alternar: () => void;
  escolherFaixa: (id: number) => void;
  entrarLeitura: () => void;
  sairLeitura: () => void;
};

const MusicaContext = createContext<MusicaValue | undefined>(undefined);

export function BackgroundMusicProvider({ children }: { children: ReactNode }) {
  const player = useAudioPlayer();
  const narracao = useAudioStatus(); // { tocando, ... }

  const [faixas, setFaixas] = useState<MusicaFundo[]>([]);
  const [ativa, setAtiva] = useState(false);
  const [faixaId, setFaixaId] = useState<number | null>(null);

  const emLeituraRef = useRef(false);
  const rampaRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sairTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const carregadaRef = useRef<number | null>(null); // id da faixa já carregada no player

  const faixaSelecionada = useMemo(
    () => faixas.find((f) => f.id === faixaId) ?? null,
    [faixas, faixaId]
  );

  // Rampa de volume manual (expo-audio não tem fade nativo).
  const rampaVolume = useCallback(
    (para: number, ms: number, aoFim?: () => void) => {
      if (rampaRef.current) clearInterval(rampaRef.current);
      const de = player.volume ?? 0;
      const passos = Math.max(1, Math.round(ms / 40));
      let i = 0;
      rampaRef.current = setInterval(() => {
        i += 1;
        const v = de + (para - de) * (i / passos);
        try {
          player.volume = Math.max(0, Math.min(1, v));
        } catch {
          /* ignora */
        }
        if (i >= passos) {
          if (rampaRef.current) clearInterval(rampaRef.current);
          rampaRef.current = null;
          aoFim?.();
        }
      }, 40);
    },
    [player]
  );

  // Garante a faixa certa carregada no player.
  const garantirCarregada = useCallback(() => {
    if (!faixaSelecionada?.url) return false;
    if (carregadaRef.current !== faixaSelecionada.id) {
      try {
        player.replace({ uri: mediaUrl(faixaSelecionada.url) as string });
        player.loop = true;
        carregadaRef.current = faixaSelecionada.id;
      } catch {
        return false;
      }
    }
    return true;
  }, [faixaSelecionada, player]);

  const alvoDuck = useCallback(
    () => (narracao.tocando ? VOL_DUCK : VOL_LEITURA),
    [narracao.tocando]
  );

  // Começa a tocar com fade-in (se as condições permitirem).
  const iniciar = useCallback(() => {
    if (!ativa || !emLeituraRef.current || !garantirCarregada()) return;
    try {
      player.volume = 0;
      player.play();
      rampaVolume(alvoDuck(), FADE_MS);
    } catch {
      /* ignora */
    }
  }, [ativa, garantirCarregada, player, rampaVolume, alvoDuck]);

  // Para com fade-out.
  const parar = useCallback(() => {
    rampaVolume(0, FADE_MS, () => {
      try {
        player.pause();
      } catch {
        /* ignora */
      }
    });
  }, [player, rampaVolume]);

  // Boot: carrega prefs + faixas.
  useEffect(() => {
    let vivo = true;
    (async () => {
      const [prefs, lista] = await Promise.all([
        getMusicaFundoPrefs(),
        getMusicasFundo().then((r) => r.results).catch(() => [] as MusicaFundo[]),
      ]);
      if (!vivo) return;
      setFaixas(lista);
      setAtiva(prefs.ativa);
      // faixa salva, ou a primeira disponível como padrão
      setFaixaId(prefs.faixaId ?? lista[0]?.id ?? null);
    })();
    return () => {
      vivo = false;
      if (rampaRef.current) clearInterval(rampaRef.current);
      if (sairTimerRef.current) clearTimeout(sairTimerRef.current);
    };
  }, []);

  // Ducking: ao mudar o estado da narração, se está tocando, ramp curto ao novo alvo.
  useEffect(() => {
    if (ativa && emLeituraRef.current && player.playing) {
      rampaVolume(alvoDuck(), DUCK_MS);
    }
  }, [narracao.tocando, ativa, player, rampaVolume, alvoDuck]);

  const entrarLeitura = useCallback(() => {
    if (sairTimerRef.current) {
      clearTimeout(sairTimerRef.current);
      sairTimerRef.current = null;
    }
    emLeituraRef.current = true;
    if (!player.playing) iniciar();
  }, [player, iniciar]);

  const sairLeitura = useCallback(() => {
    if (sairTimerRef.current) clearTimeout(sairTimerRef.current);
    sairTimerRef.current = setTimeout(() => {
      emLeituraRef.current = false;
      sairTimerRef.current = null;
      parar();
    }, GRACA_SAIR_MS);
  }, [parar]);

  const alternar = useCallback(() => {
    setAtiva((prev) => {
      const nova = !prev;
      saveMusicaFundoPrefs({ ativa: nova, faixaId });
      if (nova) {
        if (emLeituraRef.current) iniciar();
      } else {
        parar();
      }
      return nova;
    });
  }, [faixaId, iniciar, parar]);

  const escolherFaixa = useCallback(
    (id: number) => {
      setFaixaId(id);
      saveMusicaFundoPrefs({ ativa, faixaId: id });
      // troca de faixa: fade-out, recarrega, fade-in (se tocando)
      const tocando = player.playing;
      rampaVolume(0, DUCK_MS, () => {
        carregadaRef.current = null; // força recarregar na próxima
        if (ativa && emLeituraRef.current && tocando) {
          // garantirCarregada usa o faixaSelecionada memoizado; adia p/ próximo tick
          setTimeout(() => iniciar(), 0);
        }
      });
    },
    [ativa, player, rampaVolume, iniciar]
  );

  const value = useMemo<MusicaValue>(
    () => ({
      ativa,
      temFaixas: faixas.length > 0,
      faixas,
      faixaSelecionada,
      alternar,
      escolherFaixa,
      entrarLeitura,
      sairLeitura,
    }),
    [ativa, faixas, faixaSelecionada, alternar, escolherFaixa, entrarLeitura, sairLeitura]
  );

  return <MusicaContext.Provider value={value}>{children}</MusicaContext.Provider>;
}

export function usarMusicaFundo(): MusicaValue {
  const c = useContext(MusicaContext);
  if (!c) throw new Error('usarMusicaFundo deve ser usado dentro de <BackgroundMusicProvider>.');
  return c;
}
