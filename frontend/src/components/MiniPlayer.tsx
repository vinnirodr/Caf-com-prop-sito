/**
 * Mini-player persistente — aparece acima da tab bar quando há uma narração
 * carregada. Toque abre o player cheio; o botão play/pause controla na hora.
 */
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAudioControls, useAudioStatus } from '@/audio/AudioContext';
import { fonts, radius, spacing } from '@/theme/ccpTheme';
import { useTheme } from '@/theme/useTheme';

export default function MiniPlayer() {
  const t = useTheme();
  const router = useRouter();
  const { faixaAtual, tocando, posicao, duracao } = useAudioStatus();
  const { alternar } = useAudioControls();

  if (!faixaAtual) return null;
  const frac = duracao > 0 ? Math.min(posicao / duracao, 1) : 0;

  return (
    <Pressable
      onPress={() => router.push('/player')}
      style={[styles.wrap, { backgroundColor: t.palette.cafeEscuro }]}
      accessibilityRole="button"
      accessibilityLabel={`Abrir player: ${faixaAtual.titulo}`}
    >
      <View style={styles.progress}>
        <View style={[styles.progressFill, { width: `${frac * 100}%` }]} />
      </View>
      <View style={styles.row}>
        <LinearGradient colors={['#8A5E34', '#C8924A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.art}>
          <Ionicons name="cafe" size={16} color="#FBEAC8" />
        </LinearGradient>
        <View style={styles.texts}>
          <Text style={styles.titulo} numberOfLines={1}>{faixaAtual.titulo}</Text>
          <Text style={styles.sub}>{faixaAtual.numero != null ? `Capítulo ${faixaAtual.numero}` : 'Introdução'}</Text>
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            alternar();
          }}
          hitSlop={10}
          style={styles.play}
          accessibilityLabel={tocando ? 'Pausar' : 'Tocar'}
        >
          <Ionicons name={tocando ? 'pause' : 'play'} size={20} color="#3A2D22" />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.md, overflow: 'hidden', marginBottom: spacing.sm },
  progress: { height: 2.5, backgroundColor: 'rgba(255,255,255,0.16)' },
  progressFill: { height: 2.5, backgroundColor: '#E0B878' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, paddingHorizontal: 10, paddingVertical: 8 },
  art: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, minWidth: 0 },
  titulo: { fontFamily: fonts.serif, fontSize: 14, color: '#FAF7F2' },
  sub: { fontFamily: fonts.sans, fontSize: 11, color: '#D8C3A6', marginTop: 1 },
  play: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#C8924A',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
