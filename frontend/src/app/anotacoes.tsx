/**
 * 08 · Anotações. Lista as anotações do usuário (cap. + data + texto), permite
 * editar (toque) e excluir. Criar novas anotações acontece na Tela de Leitura.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listarAnotacoes, excluirAnotacao, type Anotacao } from '@/api/engagement';
import { useAuth } from '@/auth/AuthContext';
import { useEngagement } from '@/engagement/EngagementContext';
import NoteSheet from '@/components/NoteSheet';
import { dataRelativa } from '@/lib/datas';
import { fonts, spacing, radius, typography } from '@/theme/ccpTheme';
import { useTheme, type Theme } from '@/theme/useTheme';

export default function Anotacoes() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { atualizarResumo } = useEngagement();
  const styles = useMemo(() => makeStyles(t), [t]);

  const [notas, setNotas] = useState<Anotacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<Anotacao | null>(null);

  const carregar = useCallback(async () => {
    try {
      setNotas(await listarAnotacoes());
    } catch {
      // ignora — lista vazia
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) carregar();
    else setLoading(false);
  }, [user, carregar]);

  const excluir = (nota: Anotacao) =>
    Alert.alert('Excluir anotação', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          setNotas((prev) => prev.filter((n) => n.id !== nota.id));
          try {
            await excluirAnotacao(nota.id);
            atualizarResumo();
          } catch {
            carregar();
          }
        },
      },
    ]);

  const aoSalvar = (a: Anotacao) => {
    setNotas((prev) => prev.map((n) => (n.id === a.id ? a : n)));
    atualizarResumo();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={24} color={t.ui.texto} />
        </Pressable>
        <Text style={styles.title}>Anotações</Text>
        <Text style={styles.count}>{notas.length > 0 ? `${notas.length} notas` : ''}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={t.palette.douradoAmanhecer} />
        </View>
      ) : notas.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={40} color={t.ui.linha} />
          <Text style={styles.vazio}>
            Você ainda não tem anotações. Abra um capítulo e toque no lápis para
            escrever a primeira.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notas}
          keyExtractor={(n) => String(n.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => setEditando(item)} accessibilityRole="button">
              <View style={styles.cardHead}>
                <Text style={styles.cardEyebrow}>
                  Cap. {item.capitulo}{item.versiculo_ref ? ` · ${item.versiculo_ref}` : ''}
                </Text>
                <View style={styles.cardHeadRight}>
                  <Text style={styles.cardData}>{dataRelativa(item.atualizado_em)}</Text>
                  <Pressable onPress={() => excluir(item)} hitSlop={8} accessibilityLabel="Excluir">
                    <Ionicons name="trash-outline" size={16} color={t.ui.textoSuave} />
                  </Pressable>
                </View>
              </View>
              <Text style={styles.cardTexto}>{item.texto}</Text>
            </Pressable>
          )}
        />
      )}

      <NoteSheet
        visible={!!editando}
        onClose={() => setEditando(null)}
        capitulo={editando?.capitulo ?? 0}
        tituloCapitulo={editando?.capitulo_titulo}
        anotacaoExistente={editando}
        onSaved={aoSalvar}
      />
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
    title: { flex: 1, fontFamily: fonts.serif, fontSize: 26, color: t.ui.texto },
    count: { fontFamily: fonts.sansBold, fontSize: 13, color: t.palette.salvia },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
    vazio: { ...typography.bodyUi, color: t.ui.textoSuave, textAlign: 'center' },
    list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
    card: {
      backgroundColor: t.ui.superficie,
      borderWidth: 1,
      borderColor: t.ui.linha,
      borderRadius: 18,
      padding: 18,
      ...t.elevation.level1,
    },
    cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    cardEyebrow: {
      flex: 1,
      fontFamily: fonts.sansBold,
      fontSize: 10.5,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.palette.douradoAmanhecer,
    },
    cardHeadRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    cardData: { fontFamily: fonts.sans, fontSize: 11, color: t.ui.textoSuave },
    cardTexto: { fontFamily: fonts.serif, fontSize: 15.5, lineHeight: 24, color: t.ui.texto },
  });
