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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getChapter, Chapter } from '@/api/content';
import { fonts, spacing, radius, palette, reading } from '@/theme/ccpTheme';

/** O livro tem um número fixo de capítulos (molde do conteúdo). */
const TOTAL_CAPITULOS = 75;

type ReadingThemeName = keyof typeof reading;
/** Cor "suave" (rótulos/meta) por tema de leitura — complementa os tokens. */
const readingSoft: Record<ReadingThemeName, string> = {
  claro: '#6E625A',
  papel: '#6B5E4E',
  escuro: '#A89E90',
};

const FONT_STEPS = [0.9, 1, 1.15, 1.3] as const;

export default function CapituloLeitura() {
  const { numero } = useLocalSearchParams<{ numero: string }>();
  const router = useRouter();
  const num = Number(numero);

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [themeName, setThemeName] = useState<ReadingThemeName>('claro');
  const [fontStepIndex, setFontStepIndex] = useState(1);

  const tema = reading[themeName];
  const soft = readingSoft[themeName];
  const scale = FONT_STEPS[fontStepIndex];
  const styles = useMemo(
    () => makeStyles(tema.fundo, tema.texto, soft, scale),
    [tema.fundo, tema.texto, soft, scale]
  );

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
  const cycleTheme = () => {
    const order: ReadingThemeName[] = ['claro', 'papel', 'escuro'];
    setThemeName(order[(order.indexOf(themeName) + 1) % order.length]);
  };
  const biggerFont = () =>
    setFontStepIndex((i) => Math.min(i + 1, FONT_STEPS.length - 1));
  const smallerFont = () => setFontStepIndex((i) => Math.max(i - 1, 0));

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator color={palette.douradoAmanhecer} size="large" />
      </SafeAreaView>
    );
  }

  if (error || !chapter) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]} edges={['top']}>
        <Ionicons name="cloud-offline-outline" size={40} color={soft} />
        <Text style={styles.error}>{error ?? 'Capítulo não encontrado.'}</Text>
        <Pressable style={styles.retry} onPress={load}>
          <Text style={styles.retryText}>Tentar de novo</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const reflexaoParas = chapter.reflexao.split(/\n\s*\n/).filter((p) => p.trim());

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Barra superior: voltar + controles de leitura */}
      <View style={styles.topbar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityLabel="Voltar"
        >
          <Ionicons name="chevron-back" size={26} color={tema.texto} />
        </Pressable>
        <View style={styles.controls}>
          <Pressable onPress={smallerFont} hitSlop={8} accessibilityLabel="Diminuir fonte">
            <Text style={styles.controlAa}>A</Text>
          </Pressable>
          <Pressable onPress={biggerFont} hitSlop={8} accessibilityLabel="Aumentar fonte">
            <Text style={[styles.controlAa, styles.controlAaBig]}>A</Text>
          </Pressable>
          <Pressable onPress={cycleTheme} hitSlop={8} accessibilityLabel="Trocar tema de leitura">
            <Ionicons name="contrast-outline" size={22} color={tema.texto} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>CAPÍTULO {chapter.numero}</Text>
        <Text style={styles.titulo}>{chapter.titulo}</Text>

        {/* Versículo-chave */}
        <View style={styles.versiculoBox}>
          <Text style={styles.versiculoTexto}>{chapter.versiculo_texto}</Text>
          {!!chapter.versiculo_ref && (
            <Text style={styles.versiculoRef}>{chapter.versiculo_ref}</Text>
          )}
        </View>

        {chapter.tem_audio && (
          <Pressable
            style={styles.ouvir}
            onPress={() =>
              Alert.alert('Em breve', 'O player de áudio chega no próximo bloco.')
            }
            accessibilityRole="button"
          >
            <Ionicons name="headset-outline" size={18} color="#fff" />
            <Text style={styles.ouvirText}>Ouvir narração</Text>
          </Pressable>
        )}

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

        {/* Frase para guardar */}
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

        {/* Navegação anterior/próximo */}
        <View style={styles.nav}>
          <Pressable
            style={[styles.navBtn, num <= 1 && styles.navBtnDisabled]}
            disabled={num <= 1}
            onPress={() => goTo(num - 1)}
          >
            <Ionicons name="arrow-back" size={18} color={tema.texto} />
            <Text style={styles.navText}>Anterior</Text>
          </Pressable>
          <Pressable
            style={[styles.navBtn, num >= TOTAL_CAPITULOS && styles.navBtnDisabled]}
            disabled={num >= TOTAL_CAPITULOS}
            onPress={() => goTo(num + 1)}
          >
            <Text style={styles.navText}>Próximo</Text>
            <Ionicons name="arrow-forward" size={18} color={tema.texto} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
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

const makeStyles = (bg: string, fg: string, soft: string, scale: number) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: bg },
    center: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
    error: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, color: soft, textAlign: 'center' },
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
      paddingVertical: spacing.sm,
    },
    controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
    controlAa: { fontFamily: fonts.serifBold, fontSize: 15, color: fg },
    controlAaBig: { fontSize: 21 },

    content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl * 2 },
    kicker: {
      fontFamily: fonts.sansBold,
      fontSize: 12,
      letterSpacing: 1.5,
      color: palette.douradoAmanhecer,
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
    titulo: {
      fontFamily: fonts.serifBold,
      fontSize: 30 * scale,
      lineHeight: 36 * scale,
      color: fg,
      marginBottom: spacing.lg,
    },

    versiculoBox: {
      borderLeftWidth: 3,
      borderLeftColor: palette.douradoSuave,
      paddingLeft: spacing.md,
      marginBottom: spacing.xl,
    },
    versiculoTexto: {
      fontFamily: fonts.serif,
      fontStyle: 'italic',
      fontSize: 19 * scale,
      lineHeight: 30 * scale,
      color: fg,
    },
    versiculoRef: { fontFamily: fonts.sansBold, fontSize: 13, color: soft, marginTop: spacing.sm },

    ouvir: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: palette.douradoAmanhecer,
      paddingVertical: 14,
      borderRadius: radius.md,
      marginBottom: spacing.xl,
    },
    ouvirText: { fontFamily: fonts.sansBold, color: '#fff', fontSize: 15 },

    section: { marginBottom: spacing.xl },
    sectionLabel: {
      fontFamily: fonts.sansBold,
      fontSize: 12,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: palette.salvia,
      marginBottom: spacing.sm,
    },
    paragrafo: {
      fontFamily: fonts.serif,
      fontSize: 18 * scale,
      lineHeight: 31 * scale,
      color: fg,
      marginBottom: spacing.md,
    },

    fraseBox: {
      backgroundColor: palette.cafe,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginBottom: spacing.xl,
    },
    fraseLabel: {
      fontFamily: fonts.sansBold,
      fontSize: 11,
      letterSpacing: 1.5,
      color: palette.douradoSuave,
      marginBottom: spacing.sm,
    },
    frase: {
      fontFamily: fonts.serif,
      fontStyle: 'italic',
      fontSize: 20 * scale,
      lineHeight: 30 * scale,
      color: '#FAF7F2',
    },

    referencia: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 24, color: fg },

    nav: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
    },
    navBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
    navBtnDisabled: { opacity: 0.35 },
    navText: { fontFamily: fonts.sansBold, fontSize: 15, color: fg },
  });
