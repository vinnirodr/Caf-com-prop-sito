import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, fonts, spacing } from '@/theme/theme';

export default function Inicio() {
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  container: { flex: 1, justifyContent: 'center', padding: spacing.xl },
  kicker: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 1.5,
    color: palette.salvia,
    marginBottom: spacing.md,
  },
  phrase: {
    fontFamily: fonts.serif,
    fontSize: 24,
    lineHeight: 34,
    fontStyle: 'italic',
    color: palette.cafe,
  },
  note: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    color: palette.textSoft,
    marginTop: spacing.xl,
  },
});
