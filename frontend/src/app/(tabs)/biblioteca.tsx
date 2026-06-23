import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAllChapters, ChapterListItem } from '@/api/content';
import { fonts, spacing, radius, typography } from '@/theme/ccpTheme';
import { useTheme, type Theme } from '@/theme/useTheme';

export default function Biblioteca() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const router = useRouter();

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
        <ActivityIndicator color={t.palette.douradoAmanhecer} size="large" />
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
          <Ionicons name="cloud-offline-outline" size={40} color={t.ui.linha} />
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
              tintColor={t.palette.douradoAmanhecer}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => router.push(`/capitulo/${item.numero}`)}
              accessibilityRole="button"
              accessibilityLabel={`Abrir capítulo ${item.numero}: ${item.titulo}`}
            >
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
                <Ionicons name="headset-outline" size={18} color={t.palette.salvia} />
              ) : item.audio_acesso === 'premium' ? (
                <Ionicons name="lock-closed-outline" size={16} color={t.ui.linha} />
              ) : null}
              <Ionicons name="chevron-forward" size={18} color={t.ui.linha} />
            </Pressable>
          )}
        />
      )}
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
    header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
    title: { fontFamily: fonts.serifBold, fontSize: 28, color: t.palette.cafe },
    subtitle: { ...typography.caption, color: t.ui.textoSuave, marginTop: 2 },
    muted: { fontFamily: fonts.sans, color: t.ui.textoSuave },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: t.ui.linha,
    },
    rowPressed: { backgroundColor: t.ui.painel },
    num: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: t.ui.painel,
      alignItems: 'center',
      justifyContent: 'center',
    },
    numText: { fontFamily: fonts.serifBold, fontSize: 16, color: t.palette.cafe },
    rowText: { flex: 1 },
    rowTitle: { fontFamily: fonts.sansBold, fontSize: 15, color: t.ui.texto },
    rowMeta: { fontFamily: fonts.sans, fontSize: 12.5, color: t.ui.textoSuave, marginTop: 2 },
    errorText: {
      ...typography.bodyUi,
      color: t.ui.textoSuave,
      textAlign: 'center',
    },
    retry: {
      marginTop: spacing.sm,
      backgroundColor: t.palette.douradoAmanhecer,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.md,
    },
    retryText: { fontFamily: fonts.sansBold, color: '#fff', fontSize: 14 },
  });
