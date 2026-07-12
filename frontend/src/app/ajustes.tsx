/**
 * Ajustes de notificação. Dois controles independentes:
 *  - "Receber notificações" → avisos/mensagens da autora (push do backend).
 *  - "Lembrete diário de leitura" → notificação local agendada no aparelho, no
 *    horário escolhido pelo usuário (o texto é rotativo, vindo do backend).
 */
import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/auth/AuthContext';
import { usarMusicaFundo } from '@/audio/BackgroundMusicContext';
import { obterPushToken, sincronizarToken, pedirPermissaoNotificacoes } from '@/lib/notifications';
import { agendarLembretes, cancelarLembretes } from '@/lib/reminders';
import { getReminderPrefs, saveReminderPrefs, REMINDER_PADRAO } from '@/lib/storage';
import { fonts, spacing, radius } from '@/theme/ccpTheme';
import { useTheme, type Theme } from '@/theme/useTheme';

const pad = (n: number) => String(n).padStart(2, '0');

export default function Ajustes() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const musica = usarMusicaFundo();
  const styles = useMemo(() => makeStyles(t), [t]);

  const [broadcast, setBroadcast] = useState(user?.notificacoes_ativas ?? true);
  const [reminderOn, setReminderOn] = useState(REMINDER_PADRAO.enabled);
  const [hora, setHora] = useState(REMINDER_PADRAO.hour);
  const [minuto, setMinuto] = useState(REMINDER_PADRAO.minute);

  useEffect(() => {
    getReminderPrefs().then((p) => {
      setReminderOn(p.enabled);
      setHora(p.hour);
      setMinuto(p.minute);
    });
  }, []);

  const alternarBroadcast = async () => {
    const novo = !broadcast;
    setBroadcast(novo);
    try {
      const token = await obterPushToken();
      if (token) await sincronizarToken(token, novo);
    } catch {
      // ignora falha silenciosa
    }
  };

  const alternarLembrete = async () => {
    const novo = !reminderOn;
    if (novo) {
      const ok = await pedirPermissaoNotificacoes();
      if (!ok) {
        Alert.alert(
          'Permissão necessária',
          'Para receber o lembrete, permita as notificações do Café com Propósito nas configurações do aparelho.'
        );
        return;
      }
      setReminderOn(true);
      await saveReminderPrefs({ enabled: true, hour: hora, minute: minuto });
      await agendarLembretes(hora, minuto);
    } else {
      setReminderOn(false);
      await saveReminderPrefs({ enabled: false, hour: hora, minute: minuto });
      await cancelarLembretes();
    }
  };

  const ajustarHorario = async (novaHora: number, novoMinuto: number) => {
    setHora(novaHora);
    setMinuto(novoMinuto);
    if (reminderOn) {
      await saveReminderPrefs({ enabled: true, hour: novaHora, minute: novoMinuto });
      await agendarLembretes(novaHora, novoMinuto);
    }
  };

  const mudarHora = (delta: number) => ajustarHorario((hora + delta + 24) % 24, minuto);
  const mudarMinuto = (delta: number) => ajustarHorario(hora, (minuto + delta + 60) % 60);

  const Switch = ({ on, onPress, label }: { on: boolean; onPress: () => void; label: string }) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      style={[styles.switch, on ? styles.switchOn : styles.switchOff]}
    >
      <View style={[styles.knob, on ? styles.knobOn : styles.knobOff]} />
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style={t.mode === 'dark' ? 'light' : 'dark'} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={24} color={t.palette.cafe} />
        </Pressable>
        <Text style={styles.titulo}>Ajustes</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Notificações da autora — só faz sentido logado (sincroniza com a conta) */}
        {user && (
          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="notifications-outline" size={20} color={t.palette.cafe} />
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Receber notificações</Text>
                <Text style={styles.rowSub}>Avisos e mensagens especiais da autora.</Text>
              </View>
              <Switch on={broadcast} onPress={alternarBroadcast} label="Receber notificações" />
            </View>
          </View>
        )}

        {/* Lembrete diário — local, funciona com ou sem conta */}
        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="cafe-outline" size={20} color={t.palette.cafe} />
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Lembrete diário de leitura</Text>
              <Text style={styles.rowSub}>Um toque suave no horário que você escolher.</Text>
            </View>
            <Switch on={reminderOn} onPress={alternarLembrete} label="Lembrete diário de leitura" />
          </View>

          {reminderOn && (
            <View style={styles.horario}>
              <Text style={styles.horarioTitulo}>Horário do lembrete</Text>
              <View style={styles.relogio}>
                <Stepper value={pad(hora)} onUp={() => mudarHora(1)} onDown={() => mudarHora(-1)} label="hora" styles={styles} theme={t} />
                <Text style={styles.doisPontos}>:</Text>
                <Stepper value={pad(minuto)} onUp={() => mudarMinuto(5)} onDown={() => mudarMinuto(-5)} label="minuto" styles={styles} theme={t} />
              </View>
              <Text style={styles.horarioDica}>Todo dia às {pad(hora)}:{pad(minuto)}.</Text>
            </View>
          )}
        </View>

        {/* Música de fundo — trilha suave durante a leitura */}
        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="musical-notes-outline" size={20} color={t.palette.cafe} />
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Música de fundo</Text>
              <Text style={styles.rowSub}>Uma trilha suave por baixo da leitura.</Text>
            </View>
            <View style={!musica.temFaixas ? styles.switchDesabilitado : undefined}>
              <Switch
                on={musica.ativa}
                onPress={musica.temFaixas ? musica.alternar : () => {}}
                label="Música de fundo na leitura"
              />
            </View>
          </View>

          {musica.temFaixas ? (
            <View style={styles.faixas}>
              {musica.faixas.map((f) => {
                const selecionada = musica.faixaSelecionada?.id === f.id;
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => musica.escolherFaixa(f.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selecionada }}
                    style={styles.faixaItem}
                  >
                    <Text style={[styles.faixaTitulo, selecionada && styles.faixaTituloAtiva]}>
                      {f.titulo}
                    </Text>
                    {selecionada && (
                      <Ionicons name="checkmark-circle" size={20} color={t.palette.douradoAmanhecer} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={styles.faixasVazio}>Nenhuma faixa disponível ainda.</Text>
          )}
        </View>

        <Text style={styles.rodape}>
          O lembrete toca no seu aparelho, sem precisar de internet no momento.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stepper({
  value,
  onUp,
  onDown,
  label,
  styles,
  theme,
}: {
  value: string;
  onUp: () => void;
  onDown: () => void;
  label: string;
  styles: ReturnType<typeof makeStyles>;
  theme: Theme;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={onUp} hitSlop={8} accessibilityLabel={`Aumentar ${label}`} style={styles.stepBtn}>
        <Ionicons name="chevron-up" size={22} color={theme.palette.cafe} />
      </Pressable>
      <Text style={styles.stepValor}>{value}</Text>
      <Pressable onPress={onDown} hitSlop={8} accessibilityLabel={`Diminuir ${label}`} style={styles.stepBtn}>
        <Ionicons name="chevron-down" size={22} color={theme.palette.cafe} />
      </Pressable>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.ui.fundo },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: 22,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: t.ui.linha,
    },
    titulo: { fontFamily: fonts.serif, fontSize: 23, color: t.palette.cafeEscuro },
    content: { padding: spacing.lg, gap: spacing.md },

    card: {
      backgroundColor: t.ui.superficie,
      borderWidth: 1,
      borderColor: t.ui.linha,
      borderRadius: 18,
      padding: 18,
      ...t.elevation.level1,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    rowText: { flex: 1, minWidth: 0 },
    rowLabel: { fontFamily: fonts.sansBold, fontSize: 15, color: t.ui.texto },
    rowSub: { fontFamily: fonts.sans, fontSize: 12.5, color: t.ui.textoSuave, marginTop: 2 },

    switch: { width: 46, height: 27, borderRadius: 999, padding: 3, justifyContent: 'center' },
    switchOn: { backgroundColor: t.palette.douradoAmanhecer },
    switchOff: { backgroundColor: t.ui.linha },
    switchDesabilitado: { opacity: 0.5 },
    knob: { width: 21, height: 21, borderRadius: 999, backgroundColor: '#fff' },
    knobOn: { alignSelf: 'flex-end' },
    knobOff: { alignSelf: 'flex-start' },

    faixas: {
      marginTop: 18,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: t.ui.linha,
      gap: 4,
    },
    faixaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      gap: spacing.sm,
    },
    faixaTitulo: { flex: 1, fontFamily: fonts.sans, fontSize: 14, color: t.ui.texto },
    faixaTituloAtiva: { fontFamily: fonts.sansBold, color: t.palette.cafeEscuro },
    faixasVazio: {
      fontFamily: fonts.sans,
      fontSize: 12.5,
      color: t.ui.textoSuave,
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: t.ui.linha,
    },

    horario: {
      marginTop: 18,
      paddingTop: 18,
      borderTopWidth: 1,
      borderTopColor: t.ui.linha,
      alignItems: 'center',
    },
    horarioTitulo: { fontFamily: fonts.sans, fontSize: 13, color: t.ui.textoSuave },
    relogio: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 10 },
    doisPontos: { fontFamily: fonts.serif, fontSize: 34, color: t.palette.cafeEscuro, marginHorizontal: 4 },
    stepper: { alignItems: 'center', gap: 2 },
    stepBtn: {
      width: 44,
      height: 30,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.sm,
    },
    stepValor: {
      fontFamily: fonts.serif,
      fontSize: 40,
      color: t.palette.cafeEscuro,
      minWidth: 60,
      textAlign: 'center',
    },
    horarioDica: { fontFamily: fonts.sans, fontSize: 12.5, color: t.ui.textoSuave, marginTop: 12 },

    rodape: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: t.palette.salvia,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
  });
