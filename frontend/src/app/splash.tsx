/**
 * 01 · Abertura (Splash). Selo da marca + wordmark sobre gradiente escuro quente.
 * Após um respiro curto, decide o destino: onboarding (1ª vez) ou as abas.
 */
import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import BrandSeal from '@/components/BrandSeal';
import { fonts } from '@/theme/ccpTheme';
import { gradients } from '@/theme/gradients';
import { getOnboardingDone } from '@/lib/storage';

export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const run = async () => {
      const [done] = await Promise.all([
        getOnboardingDone(),
        new Promise((r) => setTimeout(r, 1200)),
      ]);
      if (!active) return;
      router.replace(done ? '/(tabs)' : '/onboarding');
    };
    run();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <LinearGradient
      colors={gradients.escuroQuente.colors}
      locations={gradients.escuroQuente.locations}
      start={gradients.escuroQuente.start}
      end={gradients.escuroQuente.end}
      style={styles.fill}
    >
      <StatusBar style="light" />
      <View style={styles.center}>
        <BrandSeal size={148} color="#F0E0C6" />
        <Text style={styles.wordmark}>CAFÉ COM{'\n'}PROPÓSITO</Text>
        <Text style={styles.tagline}>Café · oração · transformação</Text>
      </View>
      <ActivityIndicator style={styles.spinner} color="#E0B878" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 48 },
  wordmark: {
    fontFamily: fonts.serif,
    fontSize: 25,
    letterSpacing: 1.5,
    textAlign: 'center',
    color: '#FAF7F2',
    marginTop: 30,
    lineHeight: 33,
  },
  tagline: {
    fontFamily: fonts.sansBold,
    fontSize: 10.5,
    letterSpacing: 2.6,
    textTransform: 'uppercase',
    color: '#E0B878',
    marginTop: 16,
  },
  spinner: { position: 'absolute', bottom: 62, alignSelf: 'center' },
});
