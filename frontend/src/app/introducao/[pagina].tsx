/**
 * Introdução · leitor de página (placeholder). A Task 6 substitui isto pelo
 * leitor completo (gradiente dourado-creme, ornamento, Aa de fonte, áudio
 * etc. — ver spec). Por ora, existe só para a rota/typed-routes serem
 * válidas a partir do hub (`/introducao`).
 */
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme/useTheme';

export default function IntroducaoPagina() {
  const { pagina } = useLocalSearchParams<{ pagina: string }>();
  const t = useTheme();

  return (
    <View style={[styles.safe, { backgroundColor: t.ui.fundo }]}>
      <ActivityIndicator color={t.palette.douradoAmanhecer} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
