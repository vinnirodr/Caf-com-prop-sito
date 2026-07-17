/**
 * Assinaturas. Mostra o status do Premium (ativo ou gratuito) e permite
 * assinar ou restaurar uma compra já feita. Compra real fica no paywall
 * (`premium.tsx`) — aqui é só status + atalhos.
 */
import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '@/components/Button';
import { useAuth } from '@/auth/AuthContext';
import { usePremium } from '@/subscription/PremiumContext';
import { fonts, palette, spacing, radius } from '@/theme/ccpTheme';
import { useTheme, type Theme } from '@/theme/useTheme';

const BENEFICIOS = [
  'Áudio de todos os capítulos, sem limite',
  'Sem anúncios, só o essencial',
  'Sua forma de apoiar o projeto',
];

export default function Assinaturas() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const router = useRouter();
  const { user } = useAuth();
  const { premium, restaurar } = usePremium();

  const dataFormatada = user?.premium_ate
    ? new Date(user.premium_ate).toLocaleDateString('pt-BR')
    : null;

  const aoRestaurar = async () => {
    const ok = await restaurar();
    Alert.alert(
      ok ? 'Pronto' : 'Nada encontrado',
      ok ? 'Seu Premium foi restaurado.' : 'Não achamos uma assinatura ativa nesta conta.'
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style={t.mode === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.voltar} accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={24} color={t.ui.texto} />
        </Pressable>
        <Text style={styles.titulo}>Assinaturas</Text>

        {premium ? (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Ionicons name="checkmark-circle" size={22} color={palette.sucesso} />
              <Text style={styles.cardTitulo}>Premium ativo</Text>
            </View>
            {dataFormatada && <Text style={styles.cardSub}>Válido até {dataFormatada}</Text>}
            <Text style={styles.agradecimento}>
              Obrigado por apoiar o Café com Propósito. É gente como você que mantém esse projeto vivo. ☕
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Ionicons name="cafe-outline" size={22} color={t.ui.texto} />
              <Text style={styles.cardTitulo}>Plano gratuito</Text>
            </View>
            <Text style={styles.cardSub}>Você ainda não tem o Premium.</Text>

            <View style={styles.beneficios}>
              {BENEFICIOS.map((b) => (
                <View key={b} style={styles.beneficio}>
                  <Ionicons name="checkmark" size={16} color={palette.douradoAmanhecer} />
                  <Text style={styles.beneficioText}>{b}</Text>
                </View>
              ))}
            </View>

            <Button label="Assinar Premium" onPress={() => router.push('/premium')} style={styles.cta} />
          </View>
        )}

        <Pressable onPress={aoRestaurar} hitSlop={8} style={styles.restaurar}>
          <Text style={styles.restaurarText}>Restaurar compras</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.ui.fundo },
    content: { paddingHorizontal: 30, paddingTop: spacing.sm, paddingBottom: spacing.xl },
    voltar: { alignSelf: 'flex-start', marginBottom: spacing.sm },
    titulo: { fontFamily: fonts.serif, fontSize: 30, color: t.ui.texto, marginBottom: spacing.md },

    card: {
      backgroundColor: t.ui.superficie,
      borderWidth: 1,
      borderColor: t.ui.linha,
      borderRadius: radius.md,
      padding: 20,
      marginTop: spacing.sm,
    },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    cardTitulo: { fontFamily: fonts.serif, fontSize: 20, color: t.ui.texto },
    cardSub: { fontFamily: fonts.sans, fontSize: 14, color: t.ui.textoSuave, marginTop: 6 },
    agradecimento: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, color: t.ui.textoSuave, marginTop: 14 },

    beneficios: { gap: 10, marginTop: 16 },
    beneficio: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    beneficioText: { fontFamily: fonts.sans, fontSize: 14, color: t.ui.texto },
    cta: { marginTop: 20 },

    restaurar: { alignSelf: 'center', marginTop: 24, paddingVertical: 8 },
    restaurarText: { fontFamily: fonts.sansBold, fontSize: 13, color: palette.salvia },
  });
