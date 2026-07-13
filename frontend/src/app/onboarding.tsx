/**
 * 02 · Onboarding — carrossel de 3 telas de boas-vindas (convite/conforto/jornada).
 * Deslizável (swipe) + bolinhas. "Pular"/"Começar" entram nas abas; "Entrar" vai ao login.
 * Todas as saídas marcam o onboarding como visto.
 */
import { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  useWindowDimensions,
  type ListRenderItemInfo,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BrandSeal from '@/components/BrandSeal';
import Button from '@/components/Button';
import { fonts, palette, spacing } from '@/theme/ccpTheme';
import { gradients } from '@/theme/gradients';
import { setOnboardingDone } from '@/lib/storage';

type Grad = {
  colors: readonly [string, string, ...string[]];
  locations?: readonly [number, number, ...number[]];
  start: { x: number; y: number };
  end: { x: number; y: number };
};
type IconName = React.ComponentProps<typeof Ionicons>['name'];
type SlideBase = { chave: string; gradiente: Grad; titulo: string; subtitulo: string };
// Ou tem o selo da marca, ou tem um ícone — nunca ambíguo (garantido pelo tipo).
type Slide =
  | (SlideBase & { seal: true; icone?: undefined })
  | (SlideBase & { seal?: false; icone: IconName });

const SLIDES: Slide[] = [
  {
    chave: 'convite',
    gradiente: gradients.ceu,
    seal: true,
    titulo: 'Comece o dia devagar, com fé e um bom café',
    subtitulo: 'Uma reflexão por dia — para ler ou ouvir, no seu tempo.',
  },
  {
    chave: 'conforto',
    gradiente: gradients.escuroQuente,
    icone: 'musical-notes',
    titulo: 'Ouça a narração, com uma música suave ao fundo',
    subtitulo: 'Um som calmo para relaxar e se concentrar enquanto lê ou escuta.',
  },
  {
    chave: 'jornada',
    gradiente: gradients.avatar,
    icone: 'bookmark-outline',
    titulo: 'Guarde favoritos, faça anotações, acompanhe sua jornada',
    subtitulo: 'Seu espaço pessoal para voltar sempre ao que tocou seu coração.',
  },
];
const TOTAL = SLIDES.length;

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);

  const começar = async () => {
    await setOnboardingDone();
    router.replace('/(tabs)');
  };
  const irParaEntrar = async () => {
    await setOnboardingDone();
    router.replace('/(auth)/entrar');
  };
  const avancar = (index: number) =>
    listRef.current?.scrollToIndex({ index: Math.min(index + 1, TOTAL - 1), animated: true });

  const renderItem = ({ item, index }: ListRenderItemInfo<Slide>) => {
    const ultima = index === TOTAL - 1;
    const mostrarEntrar = index === 0 || ultima;
    return (
      <View style={{ width, height }}>
        <View style={styles.hero}>
          <LinearGradient
            colors={item.gradiente.colors}
            locations={item.gradiente.locations}
            start={item.gradiente.start}
            end={item.gradiente.end}
            style={styles.heroFill}
          >
            {item.seal ? (
              <BrandSeal size={124} color="#F4E6CF" />
            ) : (
              <Ionicons name={item.icone} size={64} color="#F4E6CF" />
            )}
          </LinearGradient>
          {!ultima && (
            <Pressable
              onPress={começar}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Pular introdução"
              style={[styles.pular, { top: insets.top + 10 }]}
            >
              <Text style={styles.pularText}>Pular</Text>
            </Pressable>
          )}
        </View>

        <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
          {/* Cada página renderiza suas próprias bolinhas (ativa = seu índice).
              Como só a página visível aparece, não precisa de estado de índice global. */}
          <View style={styles.dots}>
            {SLIDES.map((s, i) => (
              <View key={s.chave} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>

          <Text style={styles.title}>{item.titulo}</Text>
          <Text style={styles.lead}>{item.subtitulo}</Text>

          <View style={styles.spacer} />

          <Button
            label={ultima ? 'Começar' : 'Próximo'}
            onPress={ultima ? começar : () => avancar(index)}
          />
          {mostrarEntrar ? (
            <Pressable style={styles.signin} onPress={irParaEntrar} accessibilityRole="button">
              <Text style={styles.signinText}>
                Já tenho conta · <Text style={styles.signinLink}>Entrar</Text>
              </Text>
            </Pressable>
          ) : (
            <View style={styles.signinSpacer} />
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.fill}>
      <StatusBar style="light" />
      <FlatList
        ref={listRef}
        style={styles.fill}
        data={SLIDES}
        keyExtractor={(s) => s.chave}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#FAF7F2' },
  hero: {
    height: 354,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    overflow: 'hidden',
  },
  heroFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pular: { position: 'absolute', right: 22 },
  pularText: { fontFamily: fonts.sansBold, fontSize: 14, color: '#F4E6CF' },
  body: { flex: 1, paddingHorizontal: 30, paddingTop: 34 },
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
  signinSpacer: { height: 20, marginTop: 18 },
  signinText: { fontFamily: fonts.sans, fontSize: 14, color: '#6E625A' },
  signinLink: { fontFamily: fonts.sansBold, color: palette.douradoAmanhecer },
});
