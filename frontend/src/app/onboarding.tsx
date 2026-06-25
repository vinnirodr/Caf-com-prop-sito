/**
 * 02 · Onboarding. Hero gradiente (slot de imagem futuro) + título, corpo e CTA.
 * "Começar" marca o onboarding como visto e entra nas abas.
 */
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import BrandSeal from '@/components/BrandSeal';
import Button from '@/components/Button';
import { fonts, palette, spacing } from '@/theme/ccpTheme';
import { gradients } from '@/theme/gradients';
import { setOnboardingDone } from '@/lib/storage';

export default function Onboarding() {
  const router = useRouter();

  const começar = async () => {
    await setOnboardingDone();
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.fill}>
      <StatusBar style="light" />
      <LinearGradient
        colors={gradients.ceu.colors}
        locations={gradients.ceu.locations}
        start={gradients.ceu.start}
        end={gradients.ceu.end}
        style={styles.hero}
      >
        <BrandSeal size={132} color="#F4E6CF" />
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        <Text style={styles.title}>Comece o dia devagar, com fé e um bom café</Text>
        <Text style={styles.lead}>
          São 75 capítulos para ler ou ouvir — um por dia, no seu tempo. Uma pausa
          diária para o coração e a Palavra.
        </Text>

        <View style={styles.spacer} />

        <Button label="Começar" onPress={começar} />
        <Pressable style={styles.signin} onPress={começar} accessibilityRole="button">
          <Text style={styles.signinText}>
            Já tenho conta · <Text style={styles.signinLink}>Entrar</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#FAF7F2' },
  hero: {
    height: 354,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, paddingHorizontal: 30, paddingTop: 34, paddingBottom: 42 },
  dots: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginBottom: 26 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E3D6C4' },
  dotActive: { width: 26, backgroundColor: palette.douradoAmanhecer },
  title: {
    fontFamily: fonts.serif,
    fontSize: 29,
    lineHeight: 35,
    letterSpacing: -0.3,
    color: palette.cafeEscuro,
  },
  lead: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 26, color: '#6E625A', marginTop: 16 },
  spacer: { flex: 1 },
  signin: { alignItems: 'center', marginTop: 18 },
  signinText: { fontFamily: fonts.sans, fontSize: 14, color: '#6E625A' },
  signinLink: { fontFamily: fonts.sansBold, color: palette.douradoAmanhecer },
});
