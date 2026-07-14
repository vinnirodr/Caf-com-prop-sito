/**
 * Música de fundo da leitura. 2º player expo-audio (em loop, volume baixo) que toca
 * por baixo da experiência de leitura/escuta: enquanto o usuário lê um capítulo OU
 * enquanto a narração está tocando (inclusive no player e no mini-player, em qualquer
 * tela). Ducking dinâmico (abaixa sob a narração) + fades. Gracioso: sem faixa, nada
 * toca e nada quebra.
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
  const [emLeitura, setEmLeitura] = useState(false); // está numa tela de leitura de capítulo

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

  // Garante a faixa certa carregada no player (recarrega só se mudou).
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

  // A música deve tocar quando: ligada + tem faixa + (lendo um capítulo OU há uma
  // sessão de narração ativa). Usar `faixaAtual != null` (sessão aberta) em vez de só
  // `tocando` mantém a música contínua durante o "Ouvir" mesmo que a narração demore
  // alguns instantes pra iniciar, e acompanha a escuta em qualquer tela (player/mini).
  const deveTocar = ativa && !!faixaSelecionada && (emLeitura || narracao.faixaAtual != null);
  // Volume-alvo: abaixa sob a narração (ducking), volume de leitura caso contrário.
  const alvo = narracao.tocando ? VOL_DUCK : VOL_LEITURA;

  // Reconcilia o player com o estado desejado (play/pause + volume), com fades.
  // Reage a deveTocar (liga/desliga/entra-sai/narração) e a alvo (ducking).
  useEffect(() => {
    if (deveTocar) {
      if (!garantirCarregada()) return;
      if (player.playing) {
        // já tocando → ajusta o volume (ex.: ducking quando a narração começa/para)
        rampaVolume(alvo, DUCK_MS);
      } else {
        // começa com fade-in a partir do silêncio
        try {
          player.volume = 0;
          player.play();
        } catch {
          /* ignora */
        }
        rampaVolume(alvo, FADE_MS);
      }
    } else if (player.playing) {
      rampaVolume(0, FADE_MS, () => {
        try {
          player.pause();
        } catch {
          /* ignora */
        }
      });
    }
  }, [deveTocar, alvo, garantirCarregada, player, rampaVolume]);

  // Entrar/sair da tela de leitura do capítulo. `sairLeitura` tem janela de graça
  // (~600ms) p/ não derrubar a música numa transição capítulo→capítulo.
  const entrarLeitura = useCallback(() => {
    if (sairTimerRef.current) {
      clearTimeout(sairTimerRef.current);
      sairTimerRef.current = null;
    }
    setEmLeitura(true);
  }, []);

  const sairLeitura = useCallback(() => {
    if (sairTimerRef.current) clearTimeout(sairTimerRef.current);
    sairTimerRef.current = setTimeout(() => {
      sairTimerRef.current = null;
      setEmLeitura(false);
    }, GRACA_SAIR_MS);
  }, []);

  const alternar = useCallback(() => {
    const nova = !ativa;
    saveMusicaFundoPrefs({ ativa: nova, faixaId });
    setAtiva(nova);
  }, [ativa, faixaId]);

  const escolherFaixa = useCallback(
    (id: number) => {
      if (id === faixaId) return;
      saveMusicaFundoPrefs({ ativa, faixaId: id });
      // Aplica o estado na hora (não num callback de fade — senão um reconcile
      // concorrente poderia descartar a troca). O reconcile recarrega a nova faixa
      // (carregadaRef limpo) e ajusta o volume.
      carregadaRef.current = null;
      setFaixaId(id);
    },
    [ativa, faixaId]
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
