/**
 * 10 · Premium (paywall). Só UI nesta fase — a compra real entra com o RevenueCat
 * (conta do usuário). No plano grátis o áudio dos caps 1 e 2 é livre; a leitura
 * é sempre livre.
 */
import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing, radius } from '@/theme/ccpTheme';

const BENEFICIOS = [
  'Áudio ilimitado dos 75 capítulos',
  'Sem anúncios, só o essencial',
  'Novos devocionais toda semana',
];

type Plano = 'anual' | 'mensal';

export default function Premium() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [plano, setPlano] = useState<Plano>('anual');

  const assinar = () => Alert.alert('Em breve', 'A assinatura chega com a integração de pagamentos.');

  return (
    <LinearGradient colors={['#2E2018', '#3A2D22', '#5B4636']} locations={[0, 0.45, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.lg }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.fechar} accessibilityLabel="Fechar">
          <Ionicons name="close" size={22} color="#D8C3A6" />
        </Pressable>

        <View style={styles.selo}><Text style={styles.seloText}>Premium</Text></View>
        <Text style={styles.headline}>Ouça os 75 capítulos, sem pressa e sem anúncios</Text>
        <Text style={styles.lead}>No plano gratuito, o áudio dos capítulos 1 e 2 é livre. A leitura é sempre sua.</Text>

        <View style={styles.beneficios}>
          {BENEFICIOS.map((b) => (
            <View key={b} style={styles.beneficio}>
              <Ionicons name="checkmark-circle" size={18} color="#E0B878" />
              <Text style={styles.beneficioText}>{b}</Text>
            </View>
          ))}
        </View>

        <View style={{ flex: 1 }} />

        <PlanoCard
          ativo={plano === 'anual'}
          onPress={() => setPlano('anual')}
          titulo="Anual"
          detalhe="R$ 79,90/ano · economize 33%"
        />
        <PlanoCard
          ativo={plano === 'mensal'}
          onPress={() => setPlano('mensal')}
          titulo="Mensal"
          detalhe="R$ 9,90/mês"
        />

        <Pressable style={styles.cta} onPress={assinar} accessibilityRole="button">
          <Text style={styles.ctaText}>
            Assinar — {plano === 'anual' ? 'R$ 79,90/ano' : 'R$ 9,90/mês'}
          </Text>
        </Pressable>
        <Pressable onPress={() => router.back()} hitSlop={6}>
          <Text style={styles.gratis}>Continuar no plano gratuito</Text>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

function PlanoCard({ ativo, onPress, titulo, detalhe }: { ativo: boolean; onPress: () => void; titulo: string; detalhe: string }) {
  return (
    <Pressable onPress={onPress} style={[styles.plano, ativo && styles.planoAtivo]} accessibilityRole="radio" accessibilityState={{ selected: ativo }}>
      <View>
        <Text style={styles.planoTitulo}>{titulo}</Text>
        <Text style={styles.planoDetalhe}>{detalhe}</Text>
      </View>
      <View style={[styles.radio, ativo && styles.radioOn]}>
        {ativo && <Ionicons name="checkmark" size={15} color="#3A2D22" />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 28 },
  fechar: { alignSelf: 'flex-end' },
  selo: {
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
  beneficios: { gap: 13, marginTop: 22 },
  beneficio: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  beneficioText: { fontFamily: fonts.sans, fontSize: 14, color: '#FAF7F2' },

  plano: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 16,
    padding: 16,
    marginTop: spacing.sm + 2,
  },
  planoAtivo: { borderColor: '#C8924A', backgroundColor: 'rgba(255,255,255,0.06)' },
  planoTitulo: { fontFamily: fonts.serif, fontSize: 16, color: '#FAF7F2' },
  planoDetalhe: { fontFamily: fonts.sans, fontSize: 12, color: '#D8C3A6', marginTop: 2 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: '#C8924A', borderColor: '#C8924A' },

  cta: { backgroundColor: '#C8924A', height: 54, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  ctaText: { fontFamily: fonts.sansBold, fontSize: 16, color: '#3A2D22' },
  gratis: { fontFamily: fonts.sans, fontSize: 12, color: '#A8967F', textAlign: 'center', marginTop: 14 },
});
