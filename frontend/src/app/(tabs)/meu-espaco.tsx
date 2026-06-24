import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, typography } from '@/theme/ccpTheme';
import { useTheme, type Theme } from '@/theme/useTheme';

export default function MeuEspaco() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Meu Espaço</Text>
      </View>
      <View style={styles.center}>
        <Ionicons name="bookmark-outline" size={40} color={t.ui.linha} />
        <Text style={styles.note}>
          Aqui ficarão seus favoritos, suas anotações e seu progresso.
          Chega nos próximos blocos do desenvolvimento.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.ui.fundo },
    header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
    title: { fontFamily: fonts.serifBold, fontSize: 28, color: t.palette.cafe },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
    note: {
      ...typography.bodyUi,
      color: t.ui.textoSuave,
      textAlign: 'center',
    },
  });
