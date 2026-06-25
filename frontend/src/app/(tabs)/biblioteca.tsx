/**
 * 07 · Biblioteca. Lista de capítulos da API em cartão, com busca e chips de
 * filtro. "Todos" é real; "Em andamento" e "Favoritos" dependem de conta —
 * por ora mostram um empty-state gentil.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAllChapters, ChapterListItem } from '@/api/content';
import { fonts, spacing, radius, typography } from '@/theme/ccpTheme';
import { useTheme, type Theme } from '@/theme/useTheme';

type Filtro = 'todos' | 'andamento' | 'favoritos';

const CHIPS: { key: Filtro; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'andamento', label: 'Em andamento' },
  { key: 'favoritos', label: 'Favoritos' },
];

export default function Biblioteca() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const router = useRouter();

  const [items, setItems] = useState<ChapterListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await getAllChapters());
    } catch {
      setError('Não foi possível carregar os capítulos. Verifique sua conexão.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (c) =>
        c.titulo.toLowerCase().includes(q) ||
        c.versiculo_ref.toLowerCase().includes(q) ||
        String(c.numero) === q
    );
  }, [items, query]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <ActivityIndicator color={t.palette.douradoAmanhecer} size="large" />
        <Text style={styles.muted}>Carregando capítulos…</Text>
      </SafeAreaView>
    );
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Biblioteca</Text>
      <Text style={styles.subtitle}>
        {error ? 'Verifique a conexão' : `${items.length} capítulos`}
      </Text>

      <View style={styles.search}>
        <Ionicons name="search-outline" size={18} color={t.palette.salvia} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar capítulo ou versículo"
          placeholderTextColor={t.ui.textoSuave}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          accessibilityLabel="Buscar capítulo ou versículo"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={t.ui.linha} />
          </Pressable>
        )}
      </View>

      <View style={styles.chips}>
        {CHIPS.map((c) => {
          const active = filtro === c.key;
          return (
            <Pressable
              key={c.key}
              onPress={() => setFiltro(c.key)}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={active ? { selected: true } : {}}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {renderHeader()}
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={t.ui.linha} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retry} onPress={load}>
            <Text style={styles.retryText}>Tentar de novo</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // "Em andamento" e "Favoritos" precisam de conta/engagement (ainda não há).
  const semConta = filtro !== 'todos';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={semConta ? [] : filtrados}
        keyExtractor={(c) => String(c.numero)}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={t.palette.douradoAmanhecer}
          />
        }
        ListEmptyComponent={
          semConta ? (
            <View style={styles.empty}>
              <Ionicons
                name={filtro === 'favoritos' ? 'heart-outline' : 'bookmark-outline'}
                size={34}
                color={t.ui.linha}
              />
              <Text style={styles.emptyText}>
                {filtro === 'favoritos'
                  ? 'Seus favoritos aparecerão aqui quando você tiver uma conta.'
                  : 'Seu progresso de leitura aparecerá aqui quando você tiver uma conta.'}
              </Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nenhum capítulo encontrado para "{query}".</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => router.push(`/capitulo/${item.numero}`)}
              accessibilityRole="button"
              accessibilityLabel={`Abrir capítulo ${item.numero}: ${item.titulo}`}
            >
              <View style={styles.num}>
                <Text style={styles.numText}>{String(item.numero).padStart(2, '0')}</Text>
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.titulo}
                </Text>
                <Text style={styles.rowMeta}>{item.versiculo_ref}</Text>
              </View>
              {item.tem_audio ? (
                <View style={styles.badgeAudio}>
                  <Ionicons name="play" size={11} color="#B07F3C" />
                  <Text style={styles.badgeAudioText}>Áudio</Text>
                </View>
              ) : item.audio_acesso === 'premium' ? (
                <Ionicons name="lock-closed" size={16} color={t.ui.linha} />
              ) : null}
            </Pressable>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.ui.fundo },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      backgroundColor: t.ui.fundo,
      gap: spacing.md,
    },
    muted: { fontFamily: fonts.sans, color: t.ui.textoSuave },

    listContent: { paddingBottom: spacing.xl },
    header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
    title: { fontFamily: fonts.serif, fontSize: 32, color: t.palette.cafeEscuro },
    subtitle: { ...typography.caption, color: t.palette.salvia, marginTop: 2 },

    search: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm + 2,
      backgroundColor: t.ui.superficie,
      borderWidth: 1.5,
      borderColor: t.ui.linha,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 46,
      marginTop: spacing.md,
    },
    searchInput: { flex: 1, fontFamily: fonts.sans, fontSize: 15, color: t.ui.texto, padding: 0 },

    chips: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    chip: {
      backgroundColor: t.ui.superficie,
      borderWidth: 1,
      borderColor: t.ui.linha,
      borderRadius: radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    chipActive: { backgroundColor: t.palette.cafe, borderColor: t.palette.cafe },
    chipText: { fontFamily: fonts.sansBold, fontSize: 12, color: t.ui.textoSuave },
    chipTextActive: { color: '#FAF7F2' },

    cardWrap: { paddingHorizontal: spacing.md },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: t.ui.superficie,
      borderWidth: 1,
      borderColor: t.ui.linha,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      marginBottom: spacing.sm,
    },
    rowPressed: { backgroundColor: t.ui.painel },
    num: {
      width: 40,
      height: 40,
      borderRadius: radius.sm,
      backgroundColor: t.ui.painel,
      alignItems: 'center',
      justifyContent: 'center',
    },
    numText: { fontFamily: fonts.serifBold, fontSize: 14, color: '#B07F3C' },
    rowText: { flex: 1, minWidth: 0 },
    rowTitle: { fontFamily: fonts.serif, fontSize: 15, color: t.palette.cafeEscuro },
    rowMeta: { fontFamily: fonts.sans, fontSize: 11.5, color: t.palette.salvia, marginTop: 2 },

    badgeAudio: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: t.ui.painel,
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    badgeAudioText: { fontFamily: fonts.sansBold, fontSize: 11, color: '#B07F3C' },

    empty: { alignItems: 'center', gap: spacing.md, padding: spacing.xl, paddingTop: spacing.xl * 2 },
    emptyText: { ...typography.bodyUi, color: t.ui.textoSuave, textAlign: 'center' },

    errorText: { ...typography.bodyUi, color: t.ui.textoSuave, textAlign: 'center' },
    retry: {
      marginTop: spacing.sm,
      backgroundColor: t.palette.douradoAmanhecer,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.md,
    },
    retryText: { fontFamily: fonts.sansBold, color: '#fff', fontSize: 14 },
  });
