/**
 * Player de áudio global (vive no provider, persiste entre telas).
 *
 * Dois hooks para evitar re-render desnecessário:
 *  - `useAudioControls()` — ações estáveis (não mudam a cada tick): telas que só
 *    disparam o áudio (botão "Ouvir") usam este.
 *  - `useAudioStatus()` — faixa atual, tocando, posição, duração (muda a cada tick):
 *    mini-player e a tela do player usam este.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  setAudioModeAsync,
  type AudioSource,
} from 'expo-audio';

export type Faixa = { numero: number | null; titulo: string };

const VELOCIDADES = [1, 1.25, 1.5, 0.75] as const;

type Controls = {
  tocar: (faixa: Faixa, fonte: AudioSource) => void;
  alternar: () => void;
  avancar15: () => void;
  voltar15: () => void;
  seek: (segundos: number) => void;
  ciclarVelocidade: () => void;
  fechar: () => void;
};

type Status = {
  faixaAtual: Faixa | null;
  tocando: boolean;
  posicao: number;
  duracao: number;
  velocidade: number;
};

const ControlsContext = createContext<Controls | undefined>(undefined);
const StatusContext = createContext<Status | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);
  const [faixaAtual, setFaixaAtual] = useState<Faixa | null>(null);
  const [velocidade, setVelocidade] = useState(1);
  const velRef = useRef(1);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  // Ao terminar a narração, volta ao início (fica pausado).
  useEffect(() => {
    if (status.didJustFinish) {
      player.seekTo(0).catch(() => {});
    }
  }, [status.didJustFinish, player]);

  const controls = useMemo<Controls>(
    () => ({
      tocar: (faixa, fonte) => {
        player.replace(fonte);
        player.setPlaybackRate(velRef.current);
        player.play();
        setFaixaAtual(faixa);
      },
      alternar: () => {
        if (player.playing) player.pause();
        else player.play();
      },
      avancar15: () => {
        const dur = player.duration || 0;
        const alvo = player.currentTime + 15;
        player.seekTo(dur ? Math.min(alvo, dur) : alvo).catch(() => {});
      },
      voltar15: () => {
        player.seekTo(Math.max(player.currentTime - 15, 0)).catch(() => {});
      },
      seek: (segundos) => {
        player.seekTo(Math.max(0, segundos)).catch(() => {});
      },
      ciclarVelocidade: () => {
        const lista = VELOCIDADES as readonly number[];
        const prox = lista[(lista.indexOf(velRef.current) + 1) % lista.length];
        velRef.current = prox;
        player.setPlaybackRate(prox);
        setVelocidade(prox);
      },
      fechar: () => {
        player.pause();
        setFaixaAtual(null);
      },
    }),
    [player]
  );

  const statusValue = useMemo<Status>(
    () => ({
      faixaAtual,
      tocando: status.playing,
      posicao: status.currentTime,
      duracao: status.duration,
      velocidade,
    }),
    [faixaAtual, status.playing, status.currentTime, status.duration, velocidade]
  );

  return (
    <ControlsContext.Provider value={controls}>
      <StatusContext.Provider value={statusValue}>{children}</StatusContext.Provider>
    </ControlsContext.Provider>
  );
}

export function useAudioControls(): Controls {
  const c = useContext(ControlsContext);
  if (!c) throw new Error('useAudioControls deve ser usado dentro de <AudioProvider>.');
  return c;
}

export function useAudioStatus(): Status {
  const s = useContext(StatusContext);
  if (!s) throw new Error('useAudioStatus deve ser usado dentro de <AudioProvider>.');
  return s;
}
