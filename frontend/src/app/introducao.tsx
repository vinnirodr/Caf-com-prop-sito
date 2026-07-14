/**
 * Introdução · leitor sequencial das páginas especiais do livro (abertura,
 * apresentação da autora, "como utilizar", manifesto, contracapa etc.).
 * Mesmo conforto de leitura do capítulo (tema claro/papel/escuro + tamanho de
 * fonte, preferência compartilhada), mas navegação só por botões (Anterior/
 * Próxima), sem áudio e sem gate de conta — leitura sempre livre.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { getSpecialPages, SpecialPage } from '@/api/content';
import { fonts, spacing, radius, palette, reading } from '@/theme/ccpTheme';
import { getReadingPrefs, saveReadingPrefs } from '@/lib/storage';

const FONT_STEPS = [0.9, 1, 1.15, 1.3] as const;

type ReadingThemeName = keyof typeof reading;
const ORDER: ReadingThemeName[] = ['claro', 'papel', 'escuro'];

/** Cores complementares por tema de leitura (rótulos, barra de controle, etc.). */
const chrome: Record<
  ReadingThemeName,
  { soft: string; bar: string; line: string; seg: string; segActive: string; track: string }
> = {
  claro: { soft: '#6E625A', bar: '#FFFFFF', line: '#EAE0D4', seg: '#F2E9D8', segActive: '#FFFFFF', track: '#EAE0D4' },
  papel: { soft: '#6B5E4E', bar: '#F7EFDD', line: '#E4D7BE', seg: '#EADCBF', segActive: '#FFFDF7', track: '#E0D2B6' },
  escuro: { soft: '#A89E90', bar: '#1F1B17', line: '#2E2620', seg: '#2A231D', segActive: '#3A2F27', track: '#2E2620' },
};

export default function Introducao() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [paginas, setPaginas] = useState<SpecialPage[]>([]);
  const [indice, setIndice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [themeName, setThemeName] = useState<ReadingThemeName>('claro');
  const [fontStepIndex, setFontStepIndex] = useState(1);

  // Carrega preferências salvas (tema + tamanho) — mesma escolha do capítulo.
  useEffect(() => {
    getReadingPrefs().then((p) => {
      if (p.theme && ORDER.includes(p.theme as ReadingThemeName)) {
        setThemeName(p.theme as ReadingThemeName);
      }
      if (p.fontStep != null && p.fontStep >= 0 && p.fontStep < FONT_STEPS.length) {
        setFontStepIndex(p.fontStep);
      }
    });
  }, []);

  const tema = reading[themeName];
  const c = chrome[themeName];
  const scale = FONT_STEPS[fontStepIndex];
  const styles = useMemo(() => makeStyles(tema.fundo, tema.texto, c, scale), [tema.fundo, tema.texto, c, scale]);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await getSpecialPages();
      const ordenadas = [...data.results].sort((a, b) => a.ordem - b.ordem);
      setPaginas(ordenadas);
      setIndice(0);
    } catch {
      setError('Não foi possível carregar a introdução. Verifique a conexão.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Reseta o scroll pro topo ao trocar de página.
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [indice]);

  const setTheme = (name: ReadingThemeName) => {
    setThemeName(name);
    saveReadingPrefs({ theme: name });
  };
  const setFont = (i: number) => {
    const idx = Math.min(Math.max(i, 0), FONT_STEPS.length - 1);
    setFontStepIndex(idx);
    saveReadingPrefs({ fontStep: idx });
  };

  if (loading) {
    return (
      <View style={[styles.safe, styles.center]}>
        <ActivityIndicator color={palette.douradoAmanhecer} size="large" />
      </View>
    );
  }

  if (error || paginas.length === 0) {
    return (
      <View style={[styles.safe, styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="cloud-offline-outline" size={40} color={c.soft} />
        <Text style={styles.error}>{error ?? 'Não há páginas de introdução no momento.'}</Text>
        <Pressable style={styles.retry} onPress={load}>
          <Text style={styles.retryText}>Tentar de novo</Text>
        </Pressable>
      </View>
    );
  }

  const pagina = paginas[indice];
  const total = paginas.length;
  const ultima = indice >= total - 1;
  const paragrafos = pagina.conteudo.split(/\n\s*\n/).filter((p) => p.trim());

  return (
    <View style={styles.safe}>
      <StatusBar style={themeName === 'escuro' ? 'light' : 'dark'} />

      {/* Cabeçalho */}
      <View style={[styles.topbar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={24} color={tema.texto} />
        </Pressable>
        <Text style={styles.topTitle}>INTRODUÇÃO</Text>
        <View style={styles.topSpacer} />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.titulo}>{pagina.titulo}</Text>
        {paragrafos.map((p, i) => (
          <Text key={i} style={styles.paragrafo}>
            {p.trim()}
          </Text>
        ))}
      </ScrollView>

      {/* Barra de controles fixa */}
      <View style={[styles.controlBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        {/* Tamanho de fonte */}
        <View style={styles.fontRow}>
          <Pressable onPress={() => setFont(fontStepIndex - 1)} hitSlop={8} accessibilityLabel="Diminuir fonte">
            <Text style={styles.fontSmall}>A</Text>
          </Pressable>
          <View style={styles.track}>
            <View style={[styles.trackFill, { width: `${(fontStepIndex / (FONT_STEPS.length - 1)) * 100}%` }]} />
          </View>
          <Pressable onPress={() => setFont(fontStepIndex + 1)} hitSlop={8} accessibilityLabel="Aumentar fonte">
            <Text style={styles.fontBig}>A</Text>
          </Pressable>
        </View>

        {/* Tema */}
        <View style={styles.themeRow}>
          <View style={styles.segmented}>
            {ORDER.map((name) => {
              const active = themeName === name;
              return (
                <Pressable
                  key={name}
                  onPress={() => setTheme(name)}
                  style={[styles.segment, active && styles.segmentActive]}
                  accessibilityRole="button"
                  accessibilityState={active ? { selected: true } : {}}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {name === 'claro' ? 'Claro' : name === 'papel' ? 'Papel' : 'Escuro'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Navegação */}
        <View style={styles.nav}>
          <Pressable
            style={[styles.navBtn, indice <= 0 && styles.navBtnHidden]}
            disabled={indice <= 0}
            onPress={() => setIndice((i) => Math.max(0, i - 1))}
          >
            <Ionicons name="chevron-back" size={15} color={indice <= 0 ? c.soft : palette.douradoAmanhecer} />
            <Text style={[styles.navText, indice <= 0 && styles.navTextDisabled]}>Anterior</Text>
          </Pressable>

          <Text style={styles.indicador}>
            {indice + 1} de {total}
          </Text>

          <Pressable
            style={styles.navBtn}
            onPress={() => {
              if (ultima) {
                router.back();
              } else {
                setIndice((i) => Math.min(total - 1, i + 1));
              }
            }}
          >
            <Text style={styles.navTextGold}>{ultima ? 'Concluir' : 'Próxima'}</Text>
            <Ionicons name="chevron-forward" size={16} color={palette.douradoAmanhecer} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (
  bg: string,
  fg: string,
  c: { soft: string; bar: string; line: string; seg: string; segActive: string; track: string },
  scale: number
) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: bg },
    center: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
    error: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, color: c.soft, textAlign: 'center' },
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
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.line,
    },
    topTitle: {
      flex: 1,
      textAlign: 'center',
      fontFamily: fonts.sansBold,
      fontSize: 11,
      letterSpacing: 1,
      color: c.soft,
    },
    topSpacer: { width: 24 },

    content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl * 2 },
    titulo: { fontFamily: fonts.serif, fontSize: 26 * scale, lineHeight: 31 * scale, color: fg, marginBottom: spacing.lg },
    paragrafo: { fontFamily: fonts.serif, fontSize: 17 * scale, lineHeight: 30 * scale, color: fg, marginBottom: spacing.md },

    controlBar: {
      backgroundColor: c.bar,
      borderTopWidth: 1,
      borderTopColor: c.line,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
    },
    fontRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
    fontSmall: { fontFamily: fonts.serif, fontSize: 14, color: c.soft },
    fontBig: { fontFamily: fonts.serif, fontSize: 21, color: fg },
    track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: c.track, overflow: 'hidden' },
    trackFill: { height: 6, borderRadius: 3, backgroundColor: palette.douradoAmanhecer },

    themeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
    segmented: { flex: 1, flexDirection: 'row', backgroundColor: c.seg, borderRadius: 12, padding: 4 },
    segment: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9 },
    segmentActive: { backgroundColor: c.segActive },
    segmentText: { fontFamily: fonts.sansMedium, fontSize: 13, color: c.soft },
    segmentTextActive: { fontFamily: fonts.serif, color: fg },

    nav: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: c.line,
    },
    navBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minWidth: 84 },
    navBtnHidden: { opacity: 0 },
    navText: { fontFamily: fonts.sansBold, fontSize: 13, color: palette.douradoAmanhecer },
    navTextGold: { fontFamily: fonts.sansBold, fontSize: 14, color: palette.douradoAmanhecer },
    navTextDisabled: { color: c.soft },
    indicador: { fontFamily: fonts.sansMedium, fontSize: 12, color: c.soft },
  });
