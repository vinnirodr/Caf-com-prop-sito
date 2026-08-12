/**
 * Música de fundo da leitura. 2º player expo-audio (volume baixo) que toca por baixo
 * da experiência de leitura/escuta: enquanto o usuário lê um capítulo OU enquanto a
 * narração está tocando (inclusive no player e no mini-player, em qualquer tela).
 *
 * O usuário monta uma **playlist** (faixas + ordem) e escolhe o modo (sequência ou
 * aleatório); ao terminar uma faixa, avança para a próxima (a fila repete em loop).
 * Sem playlist explícita, cai no acervo inteiro como padrão. Ducking dinâmico (abaixa
 * sob a narração) + fades. Gracioso: sem faixa, nada toca e nada quebra.
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
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { getMusicasFundo, mediaUrl, type MusicaFundo } from '@/api/content';
import { getMusicaFundoPrefs, saveMusicaFundoPrefs, type MusicaModo } from '@/lib/storage';
import { useAudioStatus } from '@/audio/AudioContext';

const VOL_LEITURA = 0.4; // leitura silenciosa
const VOL_DUCK = 0.2; // narração tocando (≤ 50% da narração)
const FADE_MS = 1200;
const DUCK_MS = 400;
const GRACA_SAIR_MS = 600; // janela p/ não reiniciar entre capítulos

type MusicaValue = {
  ativa: boolean;
  faixas: MusicaFundo[]; // acervo completo disponível
  temFaixas: boolean;
  playlist: MusicaFundo[]; // seleção do usuário, na ordem (vazio = "todas")
  modo: MusicaModo;
  tocandoAgora: MusicaFundo | null; // faixa da fila tocando no momento
  alternar: () => void; // liga/desliga a música de fundo
  estaNaPlaylist: (id: number) => boolean;
  adicionar: (id: number) => void;
  remover: (id: number) => void;
  mover: (id: number, dir: -1 | 1) => void;
  definirModo: (m: MusicaModo) => void;
  entrarLeitura: () => void;
  sairLeitura: () => void;
  definirDemo: (ligar: boolean) => void;
};

const MusicaContext = createContext<MusicaValue | undefined>(undefined);

/** Próximo índice na fila conforme o modo (sequência = +1 circular; aleatório ≠ atual). */
function proximoIndice(atual: number, tamanho: number, modo: MusicaModo): number {
  if (tamanho <= 1) return 0;
  if (modo === 'aleatorio') {
    let n = atual;
    while (n === atual) n = Math.floor(Math.random() * tamanho);
    return n;
  }
  return (atual + 1) % tamanho;
}

export function BackgroundMusicProvider({ children }: { children: ReactNode }) {
  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);
  const narracao = useAudioStatus(); // { tocando, faixaAtual, ... }

  const [faixas, setFaixas] = useState<MusicaFundo[]>([]);
  const [ativa, setAtiva] = useState(false);
  const [playlistIds, setPlaylistIds] = useState<number[]>([]);
  const [modo, setModo] = useState<MusicaModo>('sequencia');
  const [indice, setIndice] = useState(0); // posição na fila de reprodução
  const [emLeitura, setEmLeitura] = useState(false); // está numa tela de leitura
  const [demoAtiva, setDemoAtiva] = useState(false); // demo (ex.: onboarding)

  const rampaRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sairTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const carregadaRef = useRef<number | null>(null); // id da faixa carregada no player

  const porId = useMemo(() => new Map(faixas.map((f) => [f.id, f])), [faixas]);

  // Playlist explícita do usuário (só faixas que ainda existem, na ordem escolhida).
  const playlist = useMemo(
    () => playlistIds.map((id) => porId.get(id)).filter((f): f is MusicaFundo => !!f),
    [playlistIds, porId]
  );

  // Fila de reprodução: a playlist do usuário, ou o acervo inteiro como padrão.
  const fila = playlist.length > 0 ? playlist : faixas;
  const tocandoAgora = fila[indice] ?? fila[0] ?? null;

  // Persiste o estado atual das prefs (mescla o que mudou).
  const persistir = useCallback(
    (patch: Partial<{ ativa: boolean; playlist: number[]; modo: MusicaModo }>) => {
      const nova = {
        ativa: patch.ativa ?? ativa,
        playlist: patch.playlist ?? playlistIds,
        modo: patch.modo ?? modo,
      };
      saveMusicaFundoPrefs({
        ativa: nova.ativa,
        faixaId: nova.playlist[0] ?? null, // compat com versões antigas
        playlist: nova.playlist,
        modo: nova.modo,
      });
    },
    [ativa, playlistIds, modo]
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
    if (!tocandoAgora?.url) return false;
    if (carregadaRef.current !== tocandoAgora.id) {
      try {
        player.replace({ uri: mediaUrl(tocandoAgora.url) as string });
        // Loop nativo só quando a fila tem 1 faixa; com várias, avançamos ao terminar.
        player.loop = fila.length <= 1;
        carregadaRef.current = tocandoAgora.id;
      } catch {
        return false;
      }
    }
    return true;
  }, [tocandoAgora, fila.length, player]);

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
      setModo(prefs.modo);
      // mantém só ids que existem no acervo
      const validos = prefs.playlist.filter((id) => lista.some((f) => f.id === id));
      setPlaylistIds(validos);
    })();
    return () => {
      vivo = false;
      if (rampaRef.current) clearInterval(rampaRef.current);
      if (sairTimerRef.current) clearTimeout(sairTimerRef.current);
    };
  }, []);

  // A música deve tocar quando: ligada + tem fila + (lendo um capítulo OU há uma
  // sessão de narração ativa). Usar `faixaAtual != null` (sessão aberta) em vez de só
  // `tocando` mantém a música contínua durante o "Ouvir" e acompanha a escuta em
  // qualquer tela (player/mini).
  const deveTocar =
    (ativa && fila.length > 0 && (emLeitura || narracao.faixaAtual != null)) ||
    (demoAtiva && fila.length > 0);
  // Volume-alvo: abaixa sob a narração (ducking), volume de leitura caso contrário.
  const alvo = narracao.tocando ? VOL_DUCK : VOL_LEITURA;

  // Reconcilia o player com o estado desejado (play/pause + volume), com fades.
  useEffect(() => {
    if (deveTocar) {
      if (!garantirCarregada()) return;
      if (player.playing) {
        rampaVolume(alvo, DUCK_MS);
      } else {
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

  // Ao terminar uma faixa, avança para a próxima da fila (com várias faixas; com 1, o
  // loop nativo cuida). O reconcile acima recarrega e retoma com fade.
  useEffect(() => {
    if (!status.didJustFinish) return;
    if (fila.length <= 1) return;
    carregadaRef.current = null;
    setIndice((i) => proximoIndice(i, fila.length, modo));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.didJustFinish]);

  // Se a fila encolher (usuário removeu faixas), mantém o índice válido.
  useEffect(() => {
    if (fila.length > 0 && indice >= fila.length) {
      carregadaRef.current = null;
      setIndice(0);
    }
  }, [fila.length, indice]);

  // Entrar/sair da tela de leitura. `sairLeitura` tem janela de graça (~600ms) p/ não
  // derrubar a música numa transição capítulo→capítulo.
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

  const definirDemo = useCallback((ligar: boolean) => setDemoAtiva(ligar), []);

  const alternar = useCallback(() => {
    setAtiva((prev) => {
      const nova = !prev;
      persistir({ ativa: nova });
      return nova;
    });
  }, [persistir]);

  const estaNaPlaylist = useCallback((id: number) => playlistIds.includes(id), [playlistIds]);

  const adicionar = useCallback(
    (id: number) => {
      setPlaylistIds((prev) => {
        if (prev.includes(id)) return prev;
        const nova = [...prev, id];
        persistir({ playlist: nova });
        return nova;
      });
    },
    [persistir]
  );

  const remover = useCallback(
    (id: number) => {
      setPlaylistIds((prev) => {
        const nova = prev.filter((x) => x !== id);
        persistir({ playlist: nova });
        return nova;
      });
    },
    [persistir]
  );

  const mover = useCallback(
    (id: number, dir: -1 | 1) => {
      setPlaylistIds((prev) => {
        const i = prev.indexOf(id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= prev.length) return prev;
        const nova = [...prev];
        [nova[i], nova[j]] = [nova[j], nova[i]];
        persistir({ playlist: nova });
        return nova;
      });
    },
    [persistir]
  );

  const definirModo = useCallback(
    (m: MusicaModo) => {
      setModo(m);
      persistir({ modo: m });
    },
    [persistir]
  );

  const value = useMemo<MusicaValue>(
    () => ({
      ativa,
      faixas,
      temFaixas: faixas.length > 0,
      playlist,
      modo,
      tocandoAgora,
      alternar,
      estaNaPlaylist,
      adicionar,
      remover,
      mover,
      definirModo,
      entrarLeitura,
      sairLeitura,
      definirDemo,
    }),
    [
      ativa,
      faixas,
      playlist,
      modo,
      tocandoAgora,
      alternar,
      estaNaPlaylist,
      adicionar,
      remover,
      mover,
      definirModo,
      entrarLeitura,
      sairLeitura,
      definirDemo,
    ]
  );

  return <MusicaContext.Provider value={value}>{children}</MusicaContext.Provider>;
}

export function usarMusicaFundo(): MusicaValue {
  const c = useContext(MusicaContext);
  if (!c) throw new Error('usarMusicaFundo deve ser usado dentro de <BackgroundMusicProvider>.');
  return c;
}
