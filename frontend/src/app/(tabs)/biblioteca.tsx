import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getAllChapters, ChapterListItem } from '@/api/content';
import { palette, fonts, spacing, radius } from '@/theme/theme';

export default function Biblioteca() {
  const [items, setItems] = useState<ChapterListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getAllChapters();
      setItems(data);
    } catch {
      setError(
        'Não foi possível carregar os capítulos. Confira se o backend está rodando (python manage.py runserver) e na mesma rede.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <ActivityIndicator color={palette.dourado} size="large" />
        <Text style={styles.muted}>Carregando capítulos…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Biblioteca</Text>
        <Text style={styles.subtitle}>
          {error ? 'Verifique a conexão' : `${items.length} capítulos`}
        </Text>
      </View>

      {error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={palette.line} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retry} onPress={load}>
            <Text style={styles.retryText}>Tentar de novo</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(c) => String(c.numero)}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={palette.dourado}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.num}>
                <Text style={styles.numText}>{item.numero}</Text>
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.titulo}
                </Text>
                <Text style={styles.rowMeta}>{item.versiculo_ref}</Text>
              </View>
              {item.tem_audio ? (
                <Ionicons name="headset-outline" size={18} color={palette.salvia} />
              ) : item.audio_acesso === 'premium' ? (
                <Ionicons name="lock-closed-outline" size={16} color={palette.line} />
              ) : null}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: palette.bg,
    gap: spacing.md,
  },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { fontFamily: fonts.serifBold, fontSize: 28, color: palette.cafe },
  subtitle: { fontFamily: fonts.sans, fontSize: 13, color: palette.textSoft, marginTop: 2 },
  muted: { fontFamily: fonts.sans, color: palette.textSoft },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  num: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: palette.paperPanel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { fontFamily: fonts.serifBold, fontSize: 16, color: palette.cafe },
  rowText: { flex: 1 },
  rowTitle: { fontFamily: fonts.sansBold, fontSize: 15, color: palette.text },
  rowMeta: { fontFamily: fonts.sans, fontSize: 12.5, color: palette.textSoft, marginTop: 2 },
  errorText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    color: palette.textSoft,
    textAlign: 'center',
  },
  retry: {
    marginTop: spacing.sm,
    backgroundColor: palette.dourado,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  retryText: { fontFamily: fonts.sansBold, color: '#fff', fontSize: 14 },
});
