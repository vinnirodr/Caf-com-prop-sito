/**
 * Loja do Café com Propósito. Vitrine dos produtos cadastrados pela autora no
 * admin (livro físico em destaque, xícaras, camisetas, etc.). A compra em si
 * ainda não está ligada: se o produto tiver link, abre no navegador; senão,
 * mostra "Em breve".
 */
import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getProdutos, type Produto, type ProdutoCategoria } from '@/api/content';
import { API_BASE } from '@/api/config';
import Button from '@/components/Button';
import { fonts, spacing, radius } from '@/theme/ccpTheme';
import { useTheme, type Theme } from '@/theme/useTheme';

const CATEGORIA_LABEL: Record<ProdutoCategoria, string> = {
  livro: 'Livro',
  xicara: 'Xícara',
  camiseta: 'Camiseta',
  outro: 'Produto',
};

const ICONE_CATEGORIA: Record<ProdutoCategoria, React.ComponentProps<typeof Ionicons>['name']> = {
  livro: 'book-outline',
  xicara: 'cafe-outline',
  camiseta: 'shirt-outline',
  outro: 'gift-outline',
};

function precoFormatado(preco: string | null): string | null {
  if (!preco) return null;
  const n = Number(preco);
  if (Number.isNaN(n)) return null;
  return `R$ ${n.toFixed(2).replace('.', ',')}`;
}

function imagemUri(u: string | null): string | null {
  if (!u) return null;
  return u.startsWith('http') ? u : `${API_BASE}${u}`;
}

export default function Loja() {
  const t = useTheme();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(t), [t]);

  const [produtos, setProdutos] = useState<Produto[] | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    getProdutos()
      .then(setProdutos)
      .catch(() => setErro(true));
  }, []);

  const comprar = (p: Produto) => {
    if (p.link_compra) {
      Linking.openURL(p.link_compra).catch(() =>
        Alert.alert('Ops', 'Não foi possível abrir o link agora.')
      );
    } else {
      Alert.alert('Em breve', 'A compra deste produto estará disponível em breve. 🤎');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style={t.mode === 'dark' ? 'light' : 'dark'} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={24} color={t.palette.cafe} />
        </Pressable>
        <View style={styles.flex}>
          <Text style={styles.titulo}>Loja</Text>
          <Text style={styles.sub}>Leve o Café com Propósito para o seu dia a dia.</Text>
        </View>
      </View>

      {produtos === null && !erro ? (
        <View style={styles.center}>
          <ActivityIndicator color={t.palette.douradoAmanhecer} size="large" />
        </View>
      ) : erro ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={36} color={t.ui.linha} />
          <Text style={styles.msg}>Não foi possível carregar a loja. Tente mais tarde.</Text>
        </View>
      ) : produtos && produtos.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="bag-outline" size={36} color={t.ui.linha} />
          <Text style={styles.msg}>Os produtos chegam em breve. 🤎</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.lista} showsVerticalScrollIndicator={false}>
          {produtos?.map((p) => {
            const uri = imagemUri(p.imagem);
            const preco = precoFormatado(p.preco);
            return (
              <View key={p.id} style={[styles.card, p.destaque && styles.cardDestaque]}>
                {p.destaque && (
                  <View style={styles.selo}>
                    <Text style={styles.seloText}>Destaque</Text>
                  </View>
                )}
                <View style={styles.imagemBox}>
                  {uri ? (
                    <Image source={{ uri }} style={styles.imagem} resizeMode="cover" />
                  ) : (
                    <Ionicons name={ICONE_CATEGORIA[p.categoria]} size={44} color={t.ui.linha} />
                  )}
                </View>
                <View style={styles.corpo}>
                  <Text style={styles.categoria}>{CATEGORIA_LABEL[p.categoria]}</Text>
                  <Text style={styles.nome}>{p.nome}</Text>
                  {!!preco && <Text style={styles.preco}>{preco}</Text>}
                  {!!p.descricao && (
                    <Text style={styles.descricao} numberOfLines={3}>
                      {p.descricao}
                    </Text>
                  )}
                  <Button
                    label={p.link_compra ? 'Comprar' : 'Em breve'}
                    variant={p.destaque ? 'primary' : 'secondary'}
                    onPress={() => comprar(p)}
                    style={styles.botao}
                  />
                </View>
              </View>
            );
          })}
          <Text style={styles.rodape}>Mais novidades chegando. 🤎</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.ui.fundo },
    flex: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: 22,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: t.ui.linha,
    },
    titulo: { fontFamily: fonts.serif, fontSize: 26, color: t.palette.cafeEscuro },
    sub: { fontFamily: fonts.sans, fontSize: 12.5, color: t.ui.textoSuave, marginTop: 1 },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
    msg: { fontFamily: fonts.sans, fontSize: 14, color: t.ui.textoSuave, textAlign: 'center' },

    lista: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl },
    card: {
      backgroundColor: t.ui.superficie,
      borderWidth: 1,
      borderColor: t.ui.linha,
      borderRadius: 20,
      overflow: 'hidden',
      ...t.elevation.level1,
    },
    cardDestaque: { borderColor: t.palette.douradoSuave, borderWidth: 1.5, ...t.elevation.level2 },
    selo: {
      position: 'absolute',
      top: 12,
      left: 12,
      zIndex: 1,
      backgroundColor: t.palette.douradoAmanhecer,
      borderRadius: radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    seloText: {
      fontFamily: fonts.sansBold,
      fontSize: 10.5,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.palette.cafeEscuro,
    },
    imagemBox: {
      height: 180,
      backgroundColor: t.ui.painel,
      alignItems: 'center',
      justifyContent: 'center',
    },
    imagem: { width: '100%', height: '100%' },
    corpo: { padding: 18, gap: 4 },
    categoria: {
      fontFamily: fonts.sansBold,
      fontSize: 11,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      color: t.palette.douradoAmanhecer,
    },
    nome: { fontFamily: fonts.serif, fontSize: 20, color: t.palette.cafeEscuro, marginTop: 2 },
    preco: { fontFamily: fonts.sansBold, fontSize: 16, color: t.palette.cafe, marginTop: 2 },
    descricao: { fontFamily: fonts.sans, fontSize: 13.5, lineHeight: 20, color: t.ui.textoSuave, marginTop: 6 },
    botao: { marginTop: spacing.md },
    rodape: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: t.palette.salvia,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
  });
