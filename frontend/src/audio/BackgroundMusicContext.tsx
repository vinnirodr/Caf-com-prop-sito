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
  const ativaRef = useRef(false); // espelha `ativa` p/ callbacks lerem o valor fresco
  const parandoRef = useRef(false); // true durante o fade-out de `parar()` (ainda não pausou)
  const tocandoRef = useRef(false); // espelha `narracao.tocando` sem entrar na cadeia de deps de `iniciar`/`value`
  const [idParaReiniciar, setIdParaReiniciar] = useState<number | null>(null); // troca de faixa em andamento

  const faixaSelecionada = useMemo(
    () => faixas.find((f) => f.id === faixaId) ?? null,
    [faixas, faixaId]
  );

  // Mantém a ref sempre sincronizada com o estado (fonte única: `ativa`).
  useEffect(() => {
    ativaRef.current = ativa;
  }, [ativa]);

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

  // Lê `tocandoRef` (não `narracao.tocando`) p/ não entrar na cadeia de deps de
  // `iniciar`/`entrarLeitura`/`value` — senão a identidade do contexto mudaria a
  // cada play/pause da narração, derrubando o `useFocusEffect` da tela de leitura.
  const alvoDuck = useCallback(() => (tocandoRef.current ? VOL_DUCK : VOL_LEITURA), []);

  // Começa a tocar com fade-in (se as condições permitirem).
  // Lê `ativaRef` (não `ativa`) p/ não ficar preso ao valor da renderização em
  // que este callback foi criado — essencial p/ chamadas logo após um setAtiva.
  const iniciar = useCallback(() => {
    if (!ativaRef.current || !emLeituraRef.current || !garantirCarregada()) return;
    parandoRef.current = false;
    try {
      player.volume = 0;
      player.play();
      rampaVolume(alvoDuck(), FADE_MS);
    } catch {
      /* ignora */
    }
  }, [garantirCarregada, player, rampaVolume, alvoDuck]);

  // Para com fade-out. Marca `parandoRef` durante o fade p/ `entrarLeitura`
  // conseguir detectar e cancelar uma saída em andamento.
  const parar = useCallback(() => {
    parandoRef.current = true;
    rampaVolume(0, FADE_MS, () => {
      parandoRef.current = false;
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

  // Ducking: ao mudar o estado da narração, atualiza a ref e, se está tocando,
  // ramp curto ao novo alvo. A ref é atualizada aqui (não num efeito à parte)
  // pra manter uma única fonte de sincronização com `narracao.tocando`.
  useEffect(() => {
    tocandoRef.current = narracao.tocando;
    if (ativa && emLeituraRef.current && player.playing) {
      rampaVolume(alvoDuck(), DUCK_MS);
    }
  }, [narracao.tocando, ativa, player, rampaVolume, alvoDuck]);

  const entrarLeitura = useCallback(() => {
    // "Estava saindo" cobre tanto o timer de graça (ainda não chamou parar())
    // quanto um fade-out já em andamento (parar() chamado, ainda tocando).
    const estavaSaindo = !!sairTimerRef.current || parandoRef.current;
    if (sairTimerRef.current) {
      clearTimeout(sairTimerRef.current);
      sairTimerRef.current = null;
    }
    parandoRef.current = false;
    emLeituraRef.current = true;
    // Se não está tocando, ou se estava no meio de um fade-out (player ainda
    // `playing` mas a caminho do silêncio), (re)inicia — senão fica mudo.
    if (!player.playing || estavaSaindo) iniciar();
  }, [player, iniciar]);

  const sairLeitura = useCallback(() => {
    if (sairTimerRef.current) clearTimeout(sairTimerRef.current);
    sairTimerRef.current = setTimeout(() => {
      emLeituraRef.current = false;
      sairTimerRef.current = null;
      parar();
    }, GRACA_SAIR_MS);
  }, [parar]);

  // Não chama efeitos colaterais dentro do updater de `setAtiva` (impuro, e
  // sob Strict Mode dispararia I/O + áudio 2x). Calcula `nova` fora, aplica o
  // estado, atualiza a ref na hora (p/ `iniciar`/`parar` lerem o valor fresco
  // já nesta mesma chamada) e só então roda os efeitos colaterais.
  const alternar = useCallback(() => {
    const nova = !ativaRef.current;
    ativaRef.current = nova;
    setAtiva(nova);
    saveMusicaFundoPrefs({ ativa: nova, faixaId });
    if (nova) {
      if (emLeituraRef.current) iniciar();
    } else {
      parar();
    }
  }, [faixaId, iniciar, parar]);

  const escolherFaixa = useCallback(
    (id: number) => {
      setFaixaId(id);
      saveMusicaFundoPrefs({ ativa: ativaRef.current, faixaId: id });
      // troca de faixa: fade-out, recarrega, fade-in (se tocando)
      const tocando = player.playing;
      rampaVolume(0, DUCK_MS, () => {
        carregadaRef.current = null; // força recarregar na próxima
        if (ativaRef.current && emLeituraRef.current && tocando) {
          // Não chama o `iniciar` fechado aqui — está preso ao `faixaSelecionada`
          // anterior. Em vez disso, sinaliza o id alvo; o efeito abaixo dispara
          // quando `faixaSelecionada` já refletir esse id (valor fresco).
          setIdParaReiniciar(id);
        }
      });
    },
    [player, rampaVolume]
  );

  // Reinicia a reprodução após uma troca de faixa, usando sempre o `iniciar`
  // (e o `faixaSelecionada` dentro dele) da renderização mais recente.
  useEffect(() => {
    if (idParaReiniciar === null) return;
    if (faixaSelecionada?.id === idParaReiniciar) {
      setIdParaReiniciar(null);
      iniciar();
    }
  }, [idParaReiniciar, faixaSelecionada, iniciar]);

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
