/** Tela de doação ("Apoiar o projeto"): compras únicas (consumíveis) R$2–20. */
import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { PurchasesPackage } from 'react-native-purchases';
import { getPacotesDoacao, comprarPacote } from '@/lib/purchases';
import { fonts, spacing } from '@/theme/ccpTheme';
import { useTheme, type Theme } from '@/theme/useTheme';

export default function Apoiar() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const router = useRouter();
  const [tiers, setTiers] = useState<PurchasesPackage[]>([]);
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    getPacotesDoacao().then(setTiers);
  }, []);

  const doar = async (pkg: PurchasesPackage) => {
    setProcessando(true);
    try {
      const { cancelado } = await comprarPacote(pkg);
      if (!cancelado) {
        Alert.alert('Obrigado de coração! ☕', 'Seu apoio ajuda a manter o projeto vivo.');
      }
    } catch {
      Alert.alert('Ops', 'Não foi possível concluir. Tente de novo.');
    } finally {
      setProcessando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style={t.mode === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.voltar} accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={24} color={t.ui.texto} />
        </Pressable>
        <Text style={styles.titulo}>Apoiar o projeto</Text>
        <Text style={styles.sub}>
          Se o Café com Propósito te faz bem, você pode ajudar a manter ele no ar.
          Qualquer valor é gratidão. 🤎
        </Text>

        {tiers.length === 0 ? (
          <View style={styles.emBreve}>
            <Text style={styles.emBreveText}>
              As doações chegam junto com a integração de pagamentos. Obrigado pelo carinho!
            </Text>
          </View>
        ) : (
          <View style={styles.grade}>
            {tiers.map((pkg) => (
              <Pressable
                key={pkg.identifier}
                style={[styles.tier, processando && styles.tierInativo]}
                onPress={() => doar(pkg)}
                disabled={processando}
                accessibilityRole="button"
                accessibilityLabel={`Doar ${pkg.product.priceString}`}
              >
                <Ionicons name="heart" size={18} color={t.palette.douradoAmanhecer} />
                <Text style={styles.tierValor}>{pkg.product.priceString}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.ui.fundo },
    content: { paddingHorizontal: 30, paddingTop: spacing.sm, paddingBottom: spacing.lg },
    voltar: { alignSelf: 'flex-start', marginBottom: spacing.sm },
    titulo: { fontFamily: fonts.serif, fontSize: 30, color: t.ui.texto, marginBottom: 8 },
    sub: { fontFamily: fonts.sans, fontSize: 14, color: t.ui.textoSuave, marginBottom: spacing.lg, lineHeight: 21 },
    grade: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    tier: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      minWidth: '46%', flexGrow: 1, paddingVertical: 18,
      borderWidth: 1.5, borderColor: t.palette.douradoSuave, borderRadius: 16,
    },
    tierInativo: { opacity: 0.5 },
    tierValor: { fontFamily: fonts.sansBold, fontSize: 17, color: t.ui.texto },
    emBreve: {
      borderWidth: 1, borderColor: t.ui.linha, borderRadius: 16, padding: 20,
      backgroundColor: t.ui.superficie,
    },
    emBreveText: { fontFamily: fonts.sans, fontSize: 14, color: t.ui.textoSuave, lineHeight: 21, textAlign: 'center' },
  });
