/**
 * Página especial do livro (abertura, apresentação da autora, "como utilizar",
 * manifesto, contracapa etc.) — prosa livre, sempre de leitura livre (sem gate
 * de conta, sem áudio). Mais simples que a tela do capítulo: topbar (voltar +
 * título) + corpo rolável, sem barra de controles fixa.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { getSpecialPages, SpecialPage } from '@/api/content';
import { fonts, spacing, palette, radius, reading } from '@/theme/ccpTheme';

// Reaproveita o tema de leitura "claro" (o mesmo conforto tipográfico do capítulo).
const tema = reading.claro;
const soft = '#6E625A';
const line = '#EAE0D4';

export default function PaginaEspecial() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [pagina, setPagina] = useState<SpecialPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await getSpecialPages();
      const encontrada = data.results.find((p) => String(p.id) === id);
      if (!encontrada) {
        setError('Página não encontrada.');
        setPagina(null);
      } else {
        setPagina(encontrada);
      }
    } catch {
      setError('Não foi possível carregar esta página. Verifique a conexão.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const paragrafos = useMemo(
    () => (pagina ? pagina.conteudo.split(/\n\s*\n/).filter((p) => p.trim()) : []),
    [pagina]
  );

  if (loading) {
    return (
      <View style={[styles.safe, styles.center]}>
        <ActivityIndicator color={palette.douradoAmanhecer} size="large" />
      </View>
    );
  }

  if (error || !pagina) {
    return (
      <View style={[styles.safe, styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="cloud-offline-outline" size={40} color={soft} />
        <Text style={styles.error}>{error ?? 'Página não encontrada.'}</Text>
        <Pressable style={styles.retry} onPress={load}>
          <Text style={styles.retryText}>Tentar de novo</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <StatusBar style="dark" />

      <View style={[styles.topbar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={24} color={tema.texto} />
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>
          {pagina.titulo}
        </Text>
        <View style={styles.topSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.titulo}>{pagina.titulo}</Text>
        {paragrafos.map((p, i) => (
          <Text key={i} style={styles.paragrafo}>
            {p.trim()}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tema.fundo },
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
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: line,
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1,
    color: soft,
    textTransform: 'uppercase',
  },
  topSpacer: { width: 24 },

  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl * 2 },
  titulo: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 31, color: tema.texto, marginBottom: spacing.lg },
  paragrafo: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 30, color: tema.texto, marginBottom: spacing.md },
});
