/**
 * Introdução · leitor de página (oficial, fiel ao mock aprovado). Fundo em
 * gradiente dourado-creme no tema claro; papel/escuro usam fundo sólido dos
 * temas de leitura (regra B: segue `getReadingPrefs()` ou o tema do app).
 * Ornamento central com o selo da marca, conteúdo em Lora, rodapé fixo com
 * progresso + navegação — última página convida a começar o Capítulo 1.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BrandSeal from '@/components/BrandSeal';
import { getSpecialPages, mediaUrl, SpecialPage } from '@/api/content';
import { fonts, spacing, radius, palette, reading } from '@/theme/ccpTheme';
import { getReadingPrefs, saveReadingPrefs } from '@/lib/storage';
import { useResolvedMode } from '@/theme/ThemeModeContext';
import { useAudioControls } from '@/audio/AudioContext';
import { usarMusicaFundo } from '@/audio/BackgroundMusicContext';

const FONT_STEPS = [0.9, 1, 1.15, 1.3] as const;

type ReadingThemeName = keyof typeof reading;
const ORDER: ReadingThemeName[] = ['claro', 'papel', 'escuro'];

const CLARO_GRADIENTE = ['#FCF5E7', '#F3E7D0', '#E8D4B4'] as const;

export default function IntroducaoPagina() {
  const { pagina } = useLocalSearchParams<{ pagina: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const n = Number(pagina);

  const musica = usarMusicaFundo();
  const { tocar } = useAudioControls();

  useFocusEffect(
    useCallback(() => {
      musica.entrarLeitura();
      return () => musica.sairLeitura();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [musica.entrarLeitura, musica.sairLeitura])
  );

  const [paginas, setPaginas] = useState<SpecialPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await getSpecialPages();
      setPaginas([...data.results].sort((a, b) => a.ordem - b.ordem));
    } catch {
      setError('Não foi possível carregar a introdução. Verifique a conexão.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Tema de leitura (regra B): usa a preferência salva se válida, senão deriva do
  // tema do app (Ajustes > Aparência).
  const appMode = useResolvedMode();
  const temaAppPadrao: ReadingThemeName = appMode === 'dark' ? 'escuro' : 'claro';
  const [temaEfetivo, setTemaEfetivo] = useState<ReadingThemeName>(temaAppPadrao);
  const [fontStepIndex, setFontStepIndex] = useState(1);

  useEffect(() => {
    getReadingPrefs().then((p) => {
      if (p.theme && ORDER.includes(p.theme as ReadingThemeName)) {
        setTemaEfetivo(p.theme as ReadingThemeName);
      } else {
        setTemaEfetivo(temaAppPadrao);
      }
      if (p.fontStep != null && p.fontStep >= 0 && p.fontStep < FONT_STEPS.length) {
        setFontStepIndex(p.fontStep);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temaAppPadrao]);

  const tema = reading[temaEfetivo];
  const scale = FONT_STEPS[fontStepIndex];
  const styles = useMemo(() => makeStyles(tema.texto, scale), [tema.texto, scale]);

  const alternarFonte = () => {
    const idx = (fontStepIndex + 1) % FONT_STEPS.length;
    setFontStepIndex(idx);
    saveReadingPrefs({ fontStep: idx });
  };

  // Reseta o scroll ao topo a cada troca de página.
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [n]);

  if (loading) {
    return (
      <View style={[styles.safe, { backgroundColor: tema.fundo }, styles.center]}>
        <ActivityIndicator color={palette.douradoAmanhecer} size="large" />
      </View>
    );
  }

  if (error || paginas.length === 0 || !Number.isFinite(n) || n < 1 || n > paginas.length) {
    return (
      <View style={[styles.safe, { backgroundColor: tema.fundo }, styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="cloud-offline-outline" size={40} color={tema.texto} />
        <Text style={styles.error}>
          {error ?? 'Esta página da introdução não foi encontrada.'}
        </Text>
        <Pressable style={styles.retry} onPress={() => (error ? load() : router.back())} accessibilityRole="button">
          <Text style={styles.retryText}>{error ? 'Tentar de novo' : 'Voltar'}</Text>
        </Pressable>
      </View>
    );
  }

  const paginaAtual = paginas[n - 1];
  const ultima = n === paginas.length;
  const paragrafos = paginaAtual.conteudo.split(/\n\s*\n/).filter((p) => p.trim());
  const centralizado = paginaAtual.conteudo.length < 300;

  const ouvir = () => {
    const uri = mediaUrl(paginaAtual.audio);
    if (!uri) return;
    tocar({ numero: 0, titulo: paginaAtual.titulo }, { uri });
    router.push('/player');
  };

  const conteudo = (
    <>
      <StatusBar style={temaEfetivo === 'escuro' ? 'light' : 'dark'} />

      {/* Cabeçalho */}
      <View style={[styles.topbar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Voltar" accessibilityRole="button">
          <Ionicons name="chevron-back" size={24} color={tema.texto} />
        </Pressable>
        <Text style={styles.topTitle}>INTRODUÇÃO</Text>
        <Pressable
          onPress={alternarFonte}
          hitSlop={10}
          accessibilityLabel="Tamanho da letra"
          accessibilityRole="button"
          style={styles.aaBtn}
        >
          <Text style={styles.aaText}>Aa</Text>
        </Pressable>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Ornamento */}
        <View style={styles.ornamento}>
          <View style={styles.ornamentoLinha} />
          <View style={styles.ornamentoCirculo}>
            <BrandSeal size={22} color={palette.douradoAmanhecer} variant="min" />
          </View>
          <View style={styles.ornamentoLinha} />
        </View>

        <Text style={[styles.eyebrow, centralizado && styles.textoCentro]}>
          {paginaAtual.titulo.toUpperCase()}
        </Text>

        {paragrafos.map((p, i) => (
          <Text key={i} style={[styles.paragrafo, centralizado && styles.textoCentro]}>
            {p.trim()}
          </Text>
        ))}

        {(!!paginaAtual.audio || musica.temFaixas) && (
          <View style={styles.acoesRow}>
            {!!paginaAtual.audio && (
              <Pressable style={styles.ouvir} onPress={ouvir} accessibilityRole="button">
                <Ionicons name="play" size={14} color={palette.cafeEscuro} />
                <Text style={styles.ouvirText}>Ouvir a introdução</Text>
              </Pressable>
            )}
            {musica.temFaixas && (
              <Pressable
                onPress={musica.alternar}
                accessibilityRole="button"
                accessibilityLabel="Ligar/Desligar música de fundo"
                style={styles.musicaBtn}
              >
                <Ionicons
                  name={musica.ativa ? 'musical-notes' : 'musical-notes-outline'}
                  size={18}
                  color={palette.cafeEscuro}
                />
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      {/* Rodapé fixo */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <View style={styles.progressoTrack}>
          <View style={[styles.progressoFill, { width: `${(n / paginas.length) * 100}%` }]} />
        </View>

        {ultima ? (
          <Pressable
            style={styles.cta}
            onPress={() => router.replace('/capitulo/1')}
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>Iniciar Capítulo 1</Text>
          </Pressable>
        ) : (
          <View style={styles.nav}>
            {n > 1 ? (
              <Pressable
                style={styles.navBtn}
                onPress={() => router.replace(`/introducao/${n - 1}`)}
                accessibilityRole="button"
              >
                <Ionicons name="chevron-back" size={15} color={palette.douradoAmanhecer} />
                <Text style={styles.navText}>Anterior</Text>
              </Pressable>
            ) : (
              <View style={styles.navBtn} />
            )}
            <Text style={styles.navMeio}>
              {n} de {paginas.length}
            </Text>
            <Pressable
              style={styles.navBtn}
              onPress={() => router.replace(`/introducao/${n + 1}`)}
              accessibilityRole="button"
            >
              <Text style={styles.navTextGold}>Próxima</Text>
              <Ionicons name="chevron-forward" size={15} color={palette.douradoAmanhecer} />
            </Pressable>
          </View>
        )}
      </View>
    </>
  );

  if (temaEfetivo === 'claro') {
    return (
      <LinearGradient colors={CLARO_GRADIENTE} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.safe}>
        {conteudo}
      </LinearGradient>
    );
  }

  return <View style={[styles.safe, { backgroundColor: tema.fundo }]}>{conteudo}</View>;
}

const makeStyles = (fg: string, scale: number) =>
  StyleSheet.create({
    safe: { flex: 1 },
    center: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
    error: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, color: fg, textAlign: 'center' },
    retry: {
      marginTop: spacing.sm,
      backgroundColor: palette.douradoAmanhecer,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.md,
    },
    retryText: { fontFamily: fonts.sansBold, color: '#fff', fontSize: 14 },

    topbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    topTitle: {
      flex: 1,
      textAlign: 'center',
      fontFamily: fonts.sansBold,
      fontSize: 11,
      letterSpacing: 2,
      color: palette.douradoAmanhecer,
    },
    aaBtn: {
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    aaText: { fontFamily: fonts.serifBold, fontSize: 16, color: fg },

    content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl * 2 },

    ornamento: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      marginBottom: spacing.xl,
    },
    ornamentoLinha: { flex: 1, maxWidth: 48, height: 1, backgroundColor: palette.douradoSuave },
    ornamentoCirculo: {
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: palette.douradoSuave,
      alignItems: 'center',
      justifyContent: 'center',
    },

    eyebrow: {
      fontFamily: fonts.sansBold,
      fontSize: 12,
      letterSpacing: 2,
      textTransform: 'uppercase',
      color: palette.douradoAmanhecer,
      marginBottom: spacing.lg,
    },
    textoCentro: { textAlign: 'center' },

    paragrafo: {
      fontFamily: fonts.serif,
      fontSize: 20 * scale,
      lineHeight: 32 * scale,
      color: fg,
      marginBottom: spacing.md,
      textAlign: 'left',
    },

    acoesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.lg,
      justifyContent: 'center',
    },
    ouvir: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: palette.douradoAmanhecer,
      height: 48,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.pill,
    },
    ouvirText: { fontFamily: fonts.sansBold, fontSize: 14, color: palette.cafeEscuro },
    musicaBtn: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.douradoSuave,
      borderRadius: radius.md,
    },

    footer: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
    },
    progressoTrack: {
      height: 3,
      borderRadius: 2,
      backgroundColor: 'rgba(0,0,0,0.08)',
      overflow: 'hidden',
      marginBottom: spacing.md,
    },
    progressoFill: { height: 3, borderRadius: 2, backgroundColor: palette.douradoAmanhecer },

    nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    navBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minWidth: 80, minHeight: 44 },
    navText: { fontFamily: fonts.sansBold, fontSize: 13, color: palette.douradoAmanhecer },
    navTextGold: { fontFamily: fonts.sansBold, fontSize: 14, color: palette.douradoAmanhecer },
    navMeio: { fontFamily: fonts.sans, fontSize: 12.5, color: fg, opacity: 0.7 },

    cta: {
      backgroundColor: palette.douradoAmanhecer,
      borderRadius: radius.pill,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    },
    ctaText: { fontFamily: fonts.sansBold, fontSize: 15, color: palette.cafeEscuro },
  });
