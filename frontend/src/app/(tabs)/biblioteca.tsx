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
import { getAllChapters, ChapterListItem, getSpecialPages, SpecialPage } from '@/api/content';
import { useAuth } from '@/auth/AuthContext';
import { useEngagement } from '@/engagement/EngagementContext';
import { fonts, spacing, radius, typography } from '@/theme/ccpTheme';
import { useTheme, type Theme } from '@/theme/useTheme';

type Filtro = 'todos' | 'andamento' | 'favoritos';

const CHIPS: { key: Filtro; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'andamento', label: 'Em andamento' },
  { key: 'favoritos', label: 'Favoritos' },
];

// Sem conta, a leitura é livre até este capítulo; do próximo em diante, pede login.
const LEITURA_LIVRE_ATE = 2;

export default function Biblioteca() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const router = useRouter();
  const { user } = useAuth();
  const { isFavorito, statusCapitulo } = useEngagement();

  const [items, setItems] = useState<ChapterListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const [paginas, setPaginas] = useState<SpecialPage[]>([]);

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

  // Páginas especiais do livro (abertura, apresentação da autora etc.) — leitura livre.
  useEffect(() => {
    let ativo = true;
    getSpecialPages()
      .then((data) => {
        if (ativo) setPaginas([...data.results].sort((a, b) => a.ordem - b.ordem));
      })
      .catch(() => {
        if (ativo) setPaginas([]);
      });
    return () => {
      ativo = false;
    };
  }, []);

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    let base = items;
    if (q) {
      base = base.filter(
        (c) =>
          c.titulo.toLowerCase().includes(q) ||
          c.versiculo_ref.toLowerCase().includes(q) ||
          String(c.numero) === q
      );
    }
    if (user) {
      if (filtro === 'favoritos') base = base.filter((c) => isFavorito(c.numero));
      else if (filtro === 'andamento') base = base.filter((c) => statusCapitulo(c.numero) === 'andamento');
    }
    return base;
  }, [items, query, filtro, user, isFavorito, statusCapitulo]);

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

      {paginas.length > 0 && (
        <Pressable
          style={({ pressed }) => [styles.introducaoRow, pressed && styles.rowPressed]}
          onPress={() => router.push('/introducao')}
          accessibilityRole="button"
          accessibilityLabel="Abrir Introdução: sobre o livro, a autora e o convite"
        >
          <View style={styles.introducaoIcon}>
            <Ionicons name="book-outline" size={18} color={t.palette.douradoAmanhecer} />
          </View>
          <View style={styles.introducaoText}>
            <Text style={styles.introducaoTitle}>Introdução</Text>
            <Text style={styles.introducaoSubtitle}>Sobre o livro, a autora e o convite</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.ui.linha} />
        </Pressable>
      )}

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

  // Filtros pessoais sem login → convite para entrar.
  const semConta = !user && filtro !== 'todos';

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
            <Pressable style={styles.empty} onPress={() => router.push('/(auth)/entrar')}>
              <Ionicons
                name={filtro === 'favoritos' ? 'heart-outline' : 'bookmark-outline'}
                size={34}
                color={t.ui.linha}
              />
              <Text style={styles.emptyText}>
                {filtro === 'favoritos'
                  ? 'Entre na sua conta para ver seus favoritos aqui.'
                  : 'Entre na sua conta para acompanhar seu progresso aqui.'}
              </Text>
              <Text style={styles.emptyLink}>Entrar</Text>
            </Pressable>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {filtro === 'favoritos'
                  ? 'Você ainda não favoritou nenhum capítulo.'
                  : filtro === 'andamento'
                    ? 'Nenhuma leitura em andamento por enquanto.'
                    : `Nenhum capítulo encontrado para "${query}".`}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => {
                // Sem conta, leitura livre até LEITURA_LIVRE_ATE; além disso, convida a criar conta.
                if (!user && item.numero > LEITURA_LIVRE_ATE) {
                  router.push({
                    pathname: '/continuar-lendo',
                    params: { proximo: `/capitulo/${item.numero}` },
                  });
                } else {
                  router.push(`/capitulo/${item.numero}`);
                }
              }}
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
              <View style={styles.trailing}>
                {user && isFavorito(item.numero) && (
                  <Ionicons name="heart" size={15} color={t.palette.douradoAmanhecer} />
                )}
                {/* Deslogado: cadeado de "precisa entrar para ler" (do 3º cap. em diante).
                    Logado: some — a trava de áudio premium fica só no botão "Ouvir" do capítulo. */}
                {!user && item.numero > LEITURA_LIVRE_ATE ? (
                  <Ionicons name="lock-closed" size={16} color={t.ui.linha} accessibilityLabel="Requer conta" />
                ) : user && statusCapitulo(item.numero) === 'lido' ? (
                  <View style={styles.badgeLido}>
                    <Ionicons name="checkmark" size={11} color={t.palette.sucesso} />
                    <Text style={styles.badgeLidoText}>Lido</Text>
                  </View>
                ) : item.tem_audio ? (
                  <View style={styles.badgeAudio}>
                    <Ionicons name="play" size={11} color={t.palette.douradoAmanhecer} />
                    <Text style={styles.badgeAudioText}>Áudio</Text>
                  </View>
                ) : null}
              </View>
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
    title: { fontFamily: fonts.serif, fontSize: 32, color: t.ui.texto },
    subtitle: { ...typography.caption, color: t.palette.salvia, marginTop: 2 },

    introducaoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: t.ui.superficie,
      borderWidth: 1,
      borderColor: t.ui.linha,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      marginTop: spacing.md,
    },
    introducaoIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      backgroundColor: t.ui.painel,
      alignItems: 'center',
      justifyContent: 'center',
    },
    introducaoText: { flex: 1, minWidth: 0 },
    introducaoTitle: { fontFamily: fonts.serif, fontSize: 15, color: t.ui.texto },
    introducaoSubtitle: { fontFamily: fonts.sans, fontSize: 12, color: t.palette.salvia, marginTop: 2 },

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
    numText: { fontFamily: fonts.serifBold, fontSize: 14, color: t.palette.douradoAmanhecer },
    rowText: { flex: 1, minWidth: 0 },
    rowTitle: { fontFamily: fonts.serif, fontSize: 15, color: t.ui.texto },
    rowMeta: { fontFamily: fonts.sans, fontSize: 11.5, color: t.palette.salvia, marginTop: 2 },

    trailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    badgeAudio: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: t.ui.painel,
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    badgeAudioText: { fontFamily: fonts.sansBold, fontSize: 11, color: t.palette.douradoAmanhecer },
    badgeLido: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: t.palette.sucessoFundo,
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    badgeLidoText: { fontFamily: fonts.sansBold, fontSize: 11, color: t.palette.sucesso },
    emptyLink: { fontFamily: fonts.sansBold, fontSize: 14, color: t.palette.douradoAmanhecer, marginTop: 4 },

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
