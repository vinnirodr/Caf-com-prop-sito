/**
 * Favoritos. Lista os capítulos favoritados (do EngagementContext). Toque abre o
 * capítulo; o coração remove dos favoritos.
 */
import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEngagement } from '@/engagement/EngagementContext';
import { fonts, spacing, radius, typography } from '@/theme/ccpTheme';
import { useTheme, type Theme } from '@/theme/useTheme';

export default function Favoritos() {
  const t = useTheme();
  const router = useRouter();
  const { favoritos, alternarFavorito } = useEngagement();
  const styles = useMemo(() => makeStyles(t), [t]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={24} color={t.palette.cafe} />
        </Pressable>
        <Text style={styles.title}>Favoritos</Text>
        <Text style={styles.count}>{favoritos.length > 0 ? `${favoritos.length}` : ''}</Text>
      </View>

      {favoritos.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="heart-outline" size={40} color={t.ui.linha} />
          <Text style={styles.vazio}>
            Você ainda não favoritou nenhum capítulo. Toque no coração ao ler para
            guardar aqui.
          </Text>
        </View>
      ) : (
        <FlatList
          data={favoritos}
          keyExtractor={(f) => String(f.capitulo)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => router.push(`/capitulo/${item.capitulo}`)}
              accessibilityRole="button"
              accessibilityLabel={`Abrir capítulo ${item.capitulo}: ${item.titulo}`}
            >
              <View style={styles.num}>
                <Text style={styles.numText}>{String(item.capitulo).padStart(2, '0')}</Text>
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={1}>{item.titulo}</Text>
                <Text style={styles.rowMeta}>{item.versiculo_ref}</Text>
              </View>
              <Pressable onPress={() => alternarFavorito(item.capitulo)} hitSlop={8} accessibilityLabel="Remover dos favoritos">
                <Ionicons name="heart" size={20} color={t.palette.douradoAmanhecer} />
              </Pressable>
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
    },
    title: { flex: 1, fontFamily: fonts.serif, fontSize: 26, color: t.palette.cafeEscuro },
    count: { fontFamily: fonts.sansBold, fontSize: 13, color: t.palette.salvia },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
    vazio: { ...typography.bodyUi, color: t.ui.textoSuave, textAlign: 'center' },
    list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
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
  });
