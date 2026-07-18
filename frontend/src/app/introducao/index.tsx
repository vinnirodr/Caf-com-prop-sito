/**
 * Introdução · hub (índice). Substitui o antigo leitor direto: aqui o usuário
 * vê a jornada inteira antes de entrar — hero com o selo da marca, quantas
 * páginas + tempo estimado de leitura, e a lista numerada (título + subtítulo
 * de cada página, vindos da API). Tocar em qualquer item abre o leitor
 * `/introducao/[pagina]` naquela posição (1-based).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BrandSeal from '@/components/BrandSeal';
import { getSpecialPages, SpecialPage } from '@/api/content';
import { fonts, spacing, radius } from '@/theme/ccpTheme';
import { gradients } from '@/theme/gradients';
import { useTheme, type Theme } from '@/theme/useTheme';

export default function IntroducaoHub() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(t), [t]);

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

  // Estimativa de leitura: soma de palavras de todas as páginas / 200wpm.
  const minutosEstimados = useMemo(() => {
    const totalPalavras = paginas.reduce(
      (acc, p) => acc + p.conteudo.split(/\s+/).filter(Boolean).length,
      0
    );
    return Math.max(1, Math.round(totalPalavras / 200));
  }, [paginas]);

  if (loading) {
    return (
      <View style={[styles.safe, styles.center]}>
        <ActivityIndicator color={t.palette.douradoAmanhecer} size="large" />
      </View>
    );
  }

  if (error || paginas.length === 0) {
    return (
      <View style={[styles.safe, styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="cloud-offline-outline" size={40} color={t.ui.textoSuave} />
        <Text style={styles.errorText}>
          {error ?? 'A introdução ainda não está disponível.'}
        </Text>
        <Pressable style={styles.retry} onPress={load} accessibilityRole="button">
          <Text style={styles.retryText}>Tentar de novo</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {/* Hero */}
        <LinearGradient
          colors={gradients.escuroQuente.colors}
          locations={gradients.escuroQuente.locations}
          start={gradients.escuroQuente.start}
          end={gradients.escuroQuente.end}
          style={[styles.hero, { paddingTop: insets.top + spacing.md }]}
        >
          <View style={styles.heroTop}>
            <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Voltar">
              <Ionicons name="chevron-back" size={24} color="#FAF7F2" />
            </Pressable>
            <Text style={styles.eyebrow}>ANTES DE COMEÇAR</Text>
            <View style={styles.heroTopSpacer} />
          </View>

          <View style={styles.badge}>
            <BrandSeal size={26} color="#F4E6CF" variant="min" />
          </View>
          <Text style={styles.heroTitle}>Introdução</Text>
          <Text style={styles.heroSubtitle}>Sobre o livro, a autora e o convite</Text>
        </LinearGradient>

        {/* Conteúdo */}
        <View style={styles.content}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>SUA JORNADA COMEÇA AQUI</Text>
            <Text style={styles.metaInfo}>
              {paginas.length} página{paginas.length === 1 ? '' : 's'} · ~{minutosEstimados} min
            </Text>
          </View>

          <View style={styles.lista}>
            {paginas.map((pagina, i) => {
              const primeira = i === 0;
              const ultima = i === paginas.length - 1;
              return (
                <Pressable
                  key={pagina.id}
                  style={[styles.item, !ultima && styles.itemBorda]}
                  onPress={() => router.push(`/introducao/${i + 1}`)}
                  accessibilityRole="button"
                  accessibilityLabel={pagina.titulo}
                >
                  <View style={[styles.numCirculo, primeira && styles.numCirculoAtivo]}>
                    <Text style={[styles.numTexto, primeira && styles.numTextoAtivo]}>{i + 1}</Text>
                  </View>
                  <View style={styles.itemTextos}>
                    <Text style={styles.itemTitulo}>{pagina.titulo}</Text>
                    {!!pagina.subtitulo && (
                      <Text style={styles.itemSubtitulo} numberOfLines={2}>
                        {pagina.subtitulo}
                      </Text>
                    )}
                  </View>
                  {primeira ? (
                    <View style={styles.pill}>
                      <Text style={styles.pillTexto}>Começar</Text>
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color={t.ui.textoSuave} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.ui.fundo },
    center: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
    errorText: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, color: t.ui.textoSuave, textAlign: 'center' },
    retry: {
      marginTop: spacing.sm,
      backgroundColor: t.palette.douradoAmanhecer,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.md,
    },
    retryText: { fontFamily: fonts.sansBold, color: '#fff', fontSize: 14 },

    hero: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
    },
    heroTop: { flexDirection: 'row', alignItems: 'center' },
    eyebrow: {
      flex: 1,
      textAlign: 'center',
      fontFamily: fonts.sansBold,
      fontSize: 11,
      letterSpacing: 1.6,
      textTransform: 'uppercase',
      color: t.palette.douradoSuave,
    },
    heroTopSpacer: { width: 24 },
    badge: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: 'rgba(244,230,207,0.16)',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    heroTitle: { fontFamily: fonts.serif, fontSize: 34, color: '#FAF7F2' },
    heroSubtitle: { fontFamily: fonts.sans, fontSize: 14, color: '#D8C3A6', marginTop: 4 },

    content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.md },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    metaLabel: {
      fontFamily: fonts.sansBold,
      fontSize: 11,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      color: t.palette.douradoAmanhecer,
    },
    metaInfo: { fontFamily: fonts.sans, fontSize: 12.5, color: t.ui.textoSuave },

    lista: {
      backgroundColor: t.ui.superficie,
      borderWidth: 1,
      borderColor: t.ui.linha,
      borderRadius: radius.lg,
      ...t.elevation.level1,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    itemBorda: { borderBottomWidth: 1, borderBottomColor: t.ui.linha },
    numCirculo: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: t.ui.linha,
      alignItems: 'center',
      justifyContent: 'center',
    },
    numCirculoAtivo: { backgroundColor: t.palette.douradoAmanhecer, borderColor: t.palette.douradoAmanhecer },
    numTexto: { fontFamily: fonts.sansBold, fontSize: 14, color: t.ui.textoSuave },
    numTextoAtivo: { color: '#FFFFFF' },
    itemTextos: { flex: 1, minWidth: 0 },
    itemTitulo: { fontFamily: fonts.serif, fontSize: 16.5, color: t.ui.texto },
    itemSubtitulo: { fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 18, color: t.ui.textoSuave, marginTop: 2 },
    pill: {
      backgroundColor: t.palette.douradoAmanhecer,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
    },
    pillTexto: { fontFamily: fonts.sansBold, fontSize: 13, color: t.palette.cafeEscuro },
  });
