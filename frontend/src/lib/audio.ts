/**
 * Regras de áudio do app.
 *
 * Áudio grátis só nos capítulos 1 e 2 (`audio_acesso === 'free'`); do 3 em diante
 * é Premium. A leitura é sempre livre.
 *
 * Narrações:
 *  - Quando o capítulo tem `audio` (campo da API, via storage em nuvem/R2), ela
 *    tem prioridade.
 *  - Enquanto isso, algumas narrações ficam **embarcadas** no app (assets/audio).
 *    Hoje: capítulo 1. Conforme chegarem as reais, é só subir pelo painel.
 */
import type { AudioSource } from 'expo-audio';

/** Narrações embarcadas no bundle (provisório até o storage em nuvem). */
const NARRACOES_LOCAIS: Record<number, number> = {
  1: require('../../assets/audio/cap-01.mp3'),
};

type AudioInfo = { numero: number; audio?: string | null; audio_acesso: 'free' | 'premium' };

/** Fonte de áudio do capítulo: narração real (API) ou a embarcada; senão null. */
export function audioFontePara(c: AudioInfo): AudioSource | null {
  if (c.audio) return { uri: c.audio };
  const local = NARRACOES_LOCAIS[c.numero];
  return local != null ? local : null;
}

/** Há narração disponível para tocar (real ou embarcada)? */
export function temAudioDisponivel(c: AudioInfo): boolean {
  return audioFontePara(c) !== null;
}

/** Áudio bloqueado = capítulo premium e usuário sem assinatura. */
export function bloqueadoPremium(c: AudioInfo, assinante: boolean): boolean {
  return c.audio_acesso === 'premium' && !assinante;
}

/** Formata segundos em m:ss (ex.: 134 -> "2:14"). */
export function formatarTempo(seg: number): string {
  if (!Number.isFinite(seg) || seg < 0) seg = 0;
  const m = Math.floor(seg / 60);
  const s = Math.floor(seg % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
