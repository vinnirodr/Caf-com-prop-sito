/**
 * 05 · Leitura. Capítulo no molde de 8 partes (conteúdo real da API), com barra
 * de controles fixa embaixo: tamanho de fonte, tema de leitura (Claro/Papel/
 * Escuro) e "Ouvir". Preferências de leitura persistem localmente.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { getChapter, Chapter } from '@/api/content';
import { fonts, spacing, radius, palette, reading } from '@/theme/ccpTheme';
import { getReadingPrefs, saveReadingPrefs } from '@/lib/storage';

const TOTAL_CAPITULOS = 75;
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

function estimarMinutos(c: Chapter): number {
  const txt = [c.reflexao, c.oracao, c.aplicacao].filter(Boolean).join(' ');
  const palavras = txt.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(palavras / 200));
}

export default function CapituloLeitura() {
  const { numero } = useLocalSearchParams<{ numero: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const num = Number(numero);

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [themeName, setThemeName] = useState<ReadingThemeName>('claro');
  const [fontStepIndex, setFontStepIndex] = useState(1);

  // Carrega preferências salvas (tema + tamanho).
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
      setChapter(await getChapter(num));
    } catch {
      setError('Não foi possível carregar este capítulo. Verifique a conexão.');
    } finally {
      setLoading(false);
    }
  }, [num]);

  useEffect(() => {
    load();
  }, [load]);

  const goTo = (n: number) => router.replace(`/capitulo/${n}`);
  const setTheme = (name: ReadingThemeName) => {
    setThemeName(name);
    saveReadingPrefs({ theme: name });
  };
  const setFont = (i: number) => {
    const idx = Math.min(Math.max(i, 0), FONT_STEPS.length - 1);
    setFontStepIndex(idx);
    saveReadingPrefs({ fontStep: idx });
  };
  const emBreve = () => Alert.alert('Em breve', 'Esta ação chega nos próximos blocos.');

  if (loading) {
    return (
      <View style={[styles.safe, styles.center]}>
        <ActivityIndicator color={palette.douradoAmanhecer} size="large" />
      </View>
    );
  }

  if (error || !chapter) {
    return (
      <View style={[styles.safe, styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="cloud-offline-outline" size={40} color={c.soft} />
        <Text style={styles.error}>{error ?? 'Capítulo não encontrado.'}</Text>
        <Pressable style={styles.retry} onPress={load}>
          <Text style={styles.retryText}>Tentar de novo</Text>
        </Pressable>
      </View>
    );
  }

  const reflexaoParas = chapter.reflexao.split(/\n\s*\n/).filter((p) => p.trim());
  const minutos = estimarMinutos(chapter);

  return (
    <View style={styles.safe}>
      <StatusBar style={themeName === 'escuro' ? 'light' : 'dark'} />

      {/* Cabeçalho */}
      <View style={[styles.topbar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={24} color={tema.texto} />
        </Pressable>
        <Text style={styles.topTitle}>
          CAPÍTULO {chapter.numero} · {minutos} MIN
        </Text>
        <View style={styles.topActions}>
          <Pressable onPress={emBreve} hitSlop={8} accessibilityLabel="Favoritar">
            <Ionicons name="heart-outline" size={21} color={palette.douradoAmanhecer} />
          </Pressable>
          <Pressable onPress={emBreve} hitSlop={8} accessibilityLabel="Anotar">
            <Ionicons name="create-outline" size={21} color={tema.texto} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.titulo}>{chapter.titulo}</Text>

        <View style={styles.versiculoBox}>
          <Text style={styles.versiculoTexto}>{chapter.versiculo_texto}</Text>
          {!!chapter.versiculo_ref && <Text style={styles.versiculoRef}>{chapter.versiculo_ref}</Text>}
        </View>

        <Section label="Reflexão" styles={styles}>
          {reflexaoParas.map((p, i) => (
            <Text key={i} style={styles.paragrafo}>
              {p.trim()}
            </Text>
          ))}
        </Section>

        <Section label="Oração" styles={styles}>
          <Text style={styles.paragrafo}>{chapter.oracao}</Text>
        </Section>

        <Section label="Aplicação prática" styles={styles}>
          <Text style={styles.paragrafo}>{chapter.aplicacao}</Text>
        </Section>

        <View style={styles.fraseBox}>
          <Text style={styles.fraseLabel}>PARA GUARDAR NO CORAÇÃO</Text>
          <Text style={styles.frase}>{chapter.frase_guardar}</Text>
        </View>

        {chapter.referencias_lista.length > 0 && (
          <Section label="Referências" styles={styles}>
            {chapter.referencias_lista.map((r, i) => (
              <Text key={i} style={styles.referencia}>
                {r}
              </Text>
            ))}
          </Section>
        )}
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

        {/* Tema + Ouvir */}
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
          {chapter.tem_audio && (
            <Pressable style={styles.ouvir} onPress={emBreve} accessibilityRole="button">
              <Ionicons name="play" size={16} color={palette.cafeEscuro} />
              <Text style={styles.ouvirText}>Ouvir</Text>
            </Pressable>
          )}
        </View>

        {/* Navegação */}
        <View style={styles.nav}>
          <Pressable
            style={styles.navBtn}
            disabled={num <= 1}
            onPress={() => goTo(num - 1)}
          >
            <Ionicons name="chevron-back" size={15} color={num <= 1 ? c.soft : palette.douradoAmanhecer} />
            <Text style={[styles.navText, num <= 1 && styles.navTextDisabled]}>Anterior</Text>
          </Pressable>
          <Pressable
            style={styles.navBtn}
            disabled={num >= TOTAL_CAPITULOS}
            onPress={() => goTo(num + 1)}
          >
            <Text style={[styles.navTextGold, num >= TOTAL_CAPITULOS && styles.navTextDisabled]}>
              Próximo capítulo
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={num >= TOTAL_CAPITULOS ? c.soft : palette.douradoAmanhecer}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Section({
  label,
  styles,
  children,
}: {
  label: string;
  styles: ReturnType<typeof makeStyles>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
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
    topActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },

    content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl * 2 },
    titulo: { fontFamily: fonts.serif, fontSize: 26 * scale, lineHeight: 31 * scale, color: fg },

    versiculoBox: {
      borderLeftWidth: 3,
      borderLeftColor: palette.douradoSuave,
      paddingLeft: spacing.md,
      marginTop: spacing.md,
      marginBottom: spacing.xl,
    },
    versiculoTexto: { fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 16 * scale, lineHeight: 25 * scale, color: '#B07F3C' },
    versiculoRef: { fontFamily: fonts.sansBold, fontSize: 13, color: c.soft, marginTop: spacing.sm },

    section: { marginBottom: spacing.xl },
    sectionLabel: {
      fontFamily: fonts.sansBold,
      fontSize: 12,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: palette.salvia,
      marginBottom: spacing.sm,
    },
    paragrafo: { fontFamily: fonts.serif, fontSize: 17 * scale, lineHeight: 30 * scale, color: fg, marginBottom: spacing.md },

    fraseBox: { backgroundColor: palette.cafe, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.xl },
    fraseLabel: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 1.5, color: palette.douradoSuave, marginBottom: spacing.sm },
    frase: { fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 18 * scale, lineHeight: 27 * scale, color: '#FAF7F2' },

    referencia: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 24, color: fg },

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

    ouvir: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: palette.douradoAmanhecer,
      height: 48,
      paddingHorizontal: 18,
      borderRadius: 13,
    },
    ouvirText: { fontFamily: fonts.sansBold, fontSize: 14, color: palette.cafeEscuro },

    nav: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: c.line,
    },
    navBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    navText: { fontFamily: fonts.sansBold, fontSize: 13, color: palette.douradoAmanhecer },
    navTextGold: { fontFamily: fonts.sansBold, fontSize: 14, color: palette.douradoAmanhecer },
    navTextDisabled: { color: c.soft },
  });
