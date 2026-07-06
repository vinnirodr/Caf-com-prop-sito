/**
 * Lembrete diário de leitura — agendado LOCALMENTE no aparelho (expo-notifications).
 *
 * O horário é escolhido pelo usuário; o texto é rotativo (baixado do backend,
 * cadastrado pela autora). Como um gatilho diário repetiria sempre o mesmo texto,
 * agendamos os próximos N dias, um por dia, variando a frase. A cada abertura do
 * app chamamos `sincronizarLembretes()` para reabastecer e nunca "secar".
 */
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { getLembretes } from '@/api/content';
import { getReminderPrefs } from '@/lib/storage';

const DIAS_A_AGENDAR = 14;
const TITULO = 'Café com Propósito';
const TEXTO_PADRAO = 'Reserve um tempinho para o seu café com Deus hoje ☕';

/** Cancela todos os lembretes agendados (são as únicas notificações locais do app). */
export async function cancelarLembretes(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignora
  }
}

/** (Re)agenda os próximos dias de lembrete no horário escolhido, variando o texto. */
export async function agendarLembretes(hora: number, minuto: number): Promise<void> {
  await cancelarLembretes();

  let textos: string[] = [];
  try {
    const lista = await getLembretes();
    textos = lista.map((l) => l.texto).filter(Boolean);
  } catch {
    // sem rede: usa um texto padrão para não deixar o usuário sem lembrete
  }
  if (textos.length === 0) textos = [TEXTO_PADRAO];

  const agora = new Date();
  for (let i = 0; i < DIAS_A_AGENDAR; i++) {
    const data = new Date(agora);
    data.setHours(hora, minuto, 0, 0);
    data.setDate(data.getDate() + i);
    if (data <= agora) continue; // pula o horário de hoje se já passou

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: TITULO,
          body: textos[i % textos.length],
          sound: 'default',
        },
        trigger: {
          type: SchedulableTriggerInputTypes.DATE,
          date: data,
          channelId: 'lembretes',
        },
      });
    } catch {
      // ignora falha pontual de agendamento
    }
  }
}

/** Reabastece os lembretes na abertura do app, se estiverem ligados. */
export async function sincronizarLembretes(): Promise<void> {
  try {
    const prefs = await getReminderPrefs();
    if (prefs.enabled) await agendarLembretes(prefs.hour, prefs.minute);
  } catch {
    // ignora
  }
}
