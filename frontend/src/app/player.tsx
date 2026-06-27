/**
 * 06 · Player de áudio. Tela cheia: capa, título, progresso (toque para buscar),
 * −15s / play-pause / +15s e velocidade. Lê o estado do AudioContext global.
 */
import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BrandSeal from '@/components/BrandSeal';
import { useAudioControls, useAudioStatus } from '@/audio/AudioContext';
import { formatarTempo } from '@/lib/audio';
import { fonts, spacing, radius } from '@/theme/ccpTheme';
import { gradients } from '@/theme/gradients';

export default function Player() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { faixaAtual, tocando, posicao, duracao, velocidade } = useAudioStatus();
  const { alternar, avancar15, voltar15, seek, ciclarVelocidade } = useAudioControls();
  const [largura, setLargura] = useState(0);

  const frac = duracao > 0 ? Math.min(posicao / duracao, 1) : 0;
  const restante = Math.max(duracao - posicao, 0);

  const onTrack = (e: { nativeEvent: { locationX: number } }) => {
    if (duracao > 0 && largura > 0) {
      seek((e.nativeEvent.locationX / largura) * duracao);
    }
  };

  return (
    <LinearGradient
      colors={gradients.escuroQuente.colors}
      locations={gradients.escuroQuente.locations}
      start={gradients.escuroQuente.start}
      end={gradients.escuroQuente.end}
      style={styles.fill}
    >
      <StatusBar style="light" />
      <View style={[styles.content, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.top}>
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Fechar player">
            <Ionicons name="chevron-down" size={26} color="#F0E0C6" />
          </Pressable>
          <Text style={styles.eyebrow}>Tocando agora</Text>
          <View style={{ width: 26 }} />
        </View>

        <LinearGradient colors={['#8A5E34', '#C8924A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.artwork}>
          <BrandSeal size={108} color="#FBEAC8" />
        </LinearGradient>

        <Text style={styles.titulo} numberOfLines={2}>{faixaAtual?.titulo ?? 'Narração'}</Text>
        <Text style={styles.sub}>Capítulo {faixaAtual?.numero ?? ''} · Café com Propósito</Text>

        {/* Progresso */}
        <Pressable onPress={onTrack} onLayout={(e: LayoutChangeEvent) => setLargura(e.nativeEvent.layout.width)} style={styles.trackWrap} accessibilityLabel="Barra de progresso">
          <View style={styles.track}>
            <View style={[styles.trackFill, { width: `${frac * 100}%` }]} />
            <View style={[styles.thumb, { left: `${frac * 100}%` }]} />
          </View>
        </Pressable>
        <View style={styles.tempos}>
          <Text style={styles.tempo}>{formatarTempo(posicao)}</Text>
          <Text style={styles.tempo}>-{formatarTempo(restante)}</Text>
        </View>

        {/* Controles */}
        <View style={styles.controles}>
          <Pressable onPress={voltar15} hitSlop={10} accessibilityLabel="Voltar 15 segundos">
            <Ionicons name="play-back" size={30} color="#F0E0C6" />
          </Pressable>
          <Pressable onPress={alternar} style={styles.playBtn} accessibilityLabel={tocando ? 'Pausar' : 'Tocar'}>
            <Ionicons name={tocando ? 'pause' : 'play'} size={32} color="#3A2D22" />
          </Pressable>
          <Pressable onPress={avancar15} hitSlop={10} accessibilityLabel="Avançar 15 segundos">
            <Ionicons name="play-forward" size={30} color="#F0E0C6" />
          </Pressable>
        </View>

        <View style={styles.rodape}>
          <Pressable onPress={ciclarVelocidade} style={styles.pill} accessibilityLabel="Velocidade">
            <Ionicons name="speedometer-outline" size={16} color="#FBEAC8" />
            <Text style={styles.pillText}>{velocidade.toFixed(velocidade % 1 === 0 ? 1 : 2)}×</Text>
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 30, alignItems: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  eyebrow: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: '#D8C3A6' },
  artwork: {
    width: 208,
    height: 208,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 38,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 50,
    shadowOffset: { width: 0, height: 24 },
  },
  titulo: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 30, color: '#FAF7F2', textAlign: 'center' },
  sub: { fontFamily: fonts.sans, fontSize: 13, color: '#D8C3A6', marginTop: 6 },

  trackWrap: { width: '100%', marginTop: 30, paddingVertical: 8 },
  track: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)' },
  trackFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#E0B878', borderRadius: 3 },
  thumb: { position: 'absolute', top: -5, width: 15, height: 15, borderRadius: 8, backgroundColor: '#E0B878', marginLeft: -7 },
  tempos: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 6 },
  tempo: { fontFamily: fonts.sans, fontSize: 11, color: '#D8C3A6' },

  controles: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 34, marginTop: 30 },
  playBtn: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#C8924A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  rodape: { flex: 1, justifyContent: 'flex-end', width: '100%', alignItems: 'flex-start', paddingTop: spacing.lg },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillText: { fontFamily: fonts.sansBold, fontSize: 13, color: '#FAF7F2' },
});
