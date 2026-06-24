import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts, spacing, typography } from '@/theme/ccpTheme';
import { useTheme, type Theme } from '@/theme/useTheme';

export default function Inicio() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.kicker}>CAFÉ COM PROPÓSITO</Text>
        <Text style={styles.phrase}>
          "Entre uma xícara de café e uma oração sincera, Deus costuma revelar
          os mais belos propósitos para a nossa vida."
        </Text>
        <Text style={styles.note}>
          A tela inicial completa (saudação, clima e leitura do dia) chega no
          próximo bloco. Por enquanto, toque em Biblioteca para ver os
          capítulos vindos do servidor.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.ui.fundo },
    container: { flex: 1, justifyContent: 'center', padding: spacing.xl },
    kicker: {
      ...typography.label,
      fontFamily: fonts.sansBold,
      letterSpacing: 1.5,
      color: t.palette.salvia,
      marginBottom: spacing.md,
    },
    phrase: {
      ...typography.title,
      fontStyle: 'italic',
      color: t.palette.cafe,
    },
    note: {
      ...typography.bodyUi,
      color: t.ui.textoSuave,
      marginTop: spacing.xl,
    },
  });
