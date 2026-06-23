import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { palette, fonts, spacing } from '@/theme/theme';

export default function MeuEspaco() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Meu Espaço</Text>
      </View>
      <View style={styles.center}>
        <Ionicons name="bookmark-outline" size={40} color={palette.line} />
        <Text style={styles.note}>
          Aqui ficarão seus favoritos, suas anotações e seu progresso.
          Chega nos próximos blocos do desenvolvimento.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  title: { fontFamily: fonts.serifBold, fontSize: 28, color: palette.cafe },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  note: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    color: palette.textSoft,
    textAlign: 'center',
  },
});
