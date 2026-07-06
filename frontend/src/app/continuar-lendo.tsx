/**
 * Convite para criar conta ao tentar ler do capítulo 3 em diante sem estar
 * logado. A leitura é gratuita — só pedimos a conta para guardar o progresso.
 * Recebe `proximo` (rota do capítulo pretendido) e o repassa ao cadastro/login,
 * para o usuário voltar direto ao capítulo depois de entrar.
 */
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, radius } from '@/theme/ccpTheme';

const BENEFICIOS = [
  'Leia os 75 capítulos de graça',
  'Salve favoritos e anotações',
  'Acompanhe o seu progresso',
];

export default function ContinuarLendo() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { proximo } = useLocalSearchParams<{ proximo?: string }>();

  const paramsProximo = proximo ? { proximo } : {};

  const criarConta = () =>
    router.replace({ pathname: '/(auth)/cadastro', params: paramsProximo });
  const entrar = () =>
    router.replace({ pathname: '/(auth)/entrar', params: paramsProximo });

  return (
    <LinearGradient
      colors={['#2E2018', '#3A2D22', '#5B4636']}
      locations={[0, 0.45, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.fill}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.lg },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.fechar} accessibilityLabel="Fechar">
          <Ionicons name="close" size={22} color="#D8C3A6" />
        </Pressable>

        <View style={styles.selo}>
          <Ionicons name="cafe" size={16} color="#E0B878" />
          <Text style={styles.seloText}>Gratuito</Text>
        </View>

        <Text style={styles.headline}>Crie sua conta para continuar lendo</Text>
        <Text style={styles.lead}>
          A partir do capítulo 3, a leitura continua gratuita — pedimos apenas uma conta para
          guardar seu progresso, favoritos e anotações.
        </Text>

        <View style={styles.beneficios}>
          {BENEFICIOS.map((b) => (
            <View key={b} style={styles.beneficio}>
              <Ionicons name="checkmark-circle" size={18} color="#E0B878" />
              <Text style={styles.beneficioText}>{b}</Text>
            </View>
          ))}
        </View>

        <View style={{ flex: 1 }} />

        <Pressable style={styles.cta} onPress={criarConta} accessibilityRole="button">
          <Text style={styles.ctaText}>Criar conta grátis</Text>
        </Pressable>
        <Pressable onPress={entrar} hitSlop={6} accessibilityRole="button">
          <Text style={styles.jaTenho}>Já tenho conta</Text>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 28 },
  fechar: { alignSelf: 'flex-end' },
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(224,184,120,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(224,184,120,0.4)',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: spacing.sm,
  },
  seloText: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: '#E0B878' },
  headline: { fontFamily: fonts.serif, fontSize: 29, lineHeight: 36, color: '#FAF7F2', marginTop: 18 },
  lead: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 22, color: '#D8C3A6', marginTop: 10 },
  beneficios: { gap: 13, marginTop: 24 },
  beneficio: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  beneficioText: { fontFamily: fonts.sans, fontSize: 14, color: '#FAF7F2' },

  cta: { backgroundColor: '#C8924A', height: 54, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  ctaText: { fontFamily: fonts.sansBold, fontSize: 16, color: '#3A2D22' },
  jaTenho: { fontFamily: fonts.sansBold, fontSize: 13, color: '#E0B878', textAlign: 'center', marginTop: 16 },
});
