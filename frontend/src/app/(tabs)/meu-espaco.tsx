/**
 * 09 · Meu Espaço. Cabeçalho + cartão de conta e a lista de menu.
 * Logado: mostra nome/e-mail e "Sair". Deslogado: convite para entrar.
 * Dados de jornada/favoritos entram com o bloco de engajamento.
 */
import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/auth/AuthContext';
import { useEngagement } from '@/engagement/EngagementContext';
import { usePremium } from '@/subscription/PremiumContext';
import { mediaUrl } from '@/api/content';
import { fonts, spacing, radius } from '@/theme/ccpTheme';
import { gradients } from '@/theme/gradients';
import { useTheme, type Theme } from '@/theme/useTheme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type Rota = '/anotacoes' | '/favoritos' | '/conta' | '/assinaturas' | '/ajustes' | '/apoiar';

// Rotas pessoais exigem login; Ajustes e Apoiar funcionam sem conta (não dependem de perfil).
const MENU: { icon: IconName; label: string; rota: Rota; requerLogin: boolean }[] = [
  { icon: 'person-outline', label: 'Dados pessoais', rota: '/conta', requerLogin: true },
  { icon: 'document-text-outline', label: 'Minhas anotações', rota: '/anotacoes', requerLogin: true },
  { icon: 'heart-outline', label: 'Favoritos', rota: '/favoritos', requerLogin: true },
  { icon: 'gift-outline', label: 'Apoiar o projeto', rota: '/apoiar', requerLogin: false },
  { icon: 'card-outline', label: 'Assinaturas', rota: '/assinaturas', requerLogin: true },
  { icon: 'settings-outline', label: 'Ajustes', rota: '/ajustes', requerLogin: false },
];

export default function MeuEspaco() {
  const t = useTheme();
  const router = useRouter();
  const { user, sair } = useAuth();
  const { resumo } = useEngagement();
  const { premium } = usePremium();
  const styles = useMemo(() => makeStyles(t), [t]);

  const pct = resumo && resumo.total > 0 ? Math.round((resumo.lidos / resumo.total) * 100) : 0;
  const abrirItem = (item: { rota: Rota; requerLogin: boolean }) => {
    if (item.requerLogin && !user) return router.push('/(auth)/entrar');
    router.push(item.rota);
  };

  const inicial = (user?.nome?.trim()?.[0] ?? '?').toUpperCase();
  const nomeCompleto = user ? `${user.nome} ${user.sobrenome}`.trim() : null;

  const confirmarSair = () =>
    Alert.alert('Sair da conta', 'Quer mesmo sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await sair();
          router.replace('/(auth)/entrar');
        },
      },
    ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Meu Espaço</Text>

        {/* Cartão de conta */}
        <Pressable
          style={styles.profileCard}
          onPress={user ? () => router.push('/conta') : () => router.push('/(auth)/entrar')}
          accessibilityRole="button"
          accessibilityLabel={user ? 'Ver dados da conta' : 'Entrar na sua conta'}
        >
          {user?.avatar ? (
            <Image
              source={{ uri: mediaUrl(user.avatar) ?? undefined }}
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <LinearGradient
              colors={gradients.avatar.colors}
              start={gradients.avatar.start}
              end={gradients.avatar.end}
              style={styles.avatar}
            >
              {user ? (
                <Text style={styles.avatarLetra}>{inicial}</Text>
              ) : (
                <Ionicons name="person" size={24} color="#FAF7F2" />
              )}
            </LinearGradient>
          )}
          <View style={styles.profileText}>
            <View style={styles.profileNameRow}>
              <Text style={styles.profileName}>{nomeCompleto ?? 'Entre na sua conta'}</Text>
              {premium && (
                <View style={styles.premiumPill}>
                  <Text style={styles.premiumPillText}>Premium</Text>
                </View>
              )}
            </View>
            <Text style={styles.profileSub}>
              {user?.email ?? 'Para salvar progresso, favoritos e anotações'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={t.ui.textoSuave} />
        </Pressable>

        {/* Jornada (logado) */}
        {user && resumo && (
          <View style={styles.jornada}>
            <View style={styles.jornadaHead}>
              <Text style={styles.jornadaLabel}>Sua jornada</Text>
              <Text style={styles.jornadaValor}>{resumo.lidos} de {resumo.total}</Text>
            </View>
            <View style={styles.barra}>
              <LinearGradient
                colors={gradients.progresso.colors}
                start={gradients.progresso.start}
                end={gradients.progresso.end}
                style={[styles.barraFill, { width: `${pct}%` }]}
              />
            </View>
            <View style={styles.chips}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>{resumo.favoritos} favoritos</Text>
              </View>
              <View style={styles.chip}>
                <Text style={styles.chipText}>{resumo.anotacoes} anotações</Text>
              </View>
            </View>
          </View>
        )}

        {/* Menu */}
        <View style={styles.menu}>
          {MENU.map((m, i) => (
            <Pressable
              key={m.label}
              style={[styles.menuItem, i < MENU.length - 1 && styles.menuDivider]}
              onPress={() => abrirItem(m)}
              accessibilityRole="button"
              accessibilityLabel={m.label}
            >
              <Ionicons name={m.icon} size={20} color={t.palette.cafe} />
              <Text style={styles.menuLabel}>{m.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={t.ui.textoSuave} />
            </Pressable>
          ))}
        </View>

        {user && (
          <Pressable style={styles.sair} onPress={confirmarSair} accessibilityRole="button">
            <Ionicons name="log-out-outline" size={18} color={t.palette.erro} />
            <Text style={styles.sairText}>Sair da conta</Text>
          </Pressable>
        )}

        <Text style={styles.footer}>Café com Propósito · capítulos para ler ou ouvir</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.ui.fundo },
    content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl, gap: spacing.md },
    title: { fontFamily: fonts.serif, fontSize: 30, color: t.palette.cafeEscuro },

    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: t.ui.superficie,
      borderWidth: 1,
      borderColor: t.ui.linha,
      borderRadius: 18,
      padding: 18,
      ...t.elevation.level1,
    },
    avatar: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
    avatarLetra: { fontFamily: fonts.serif, fontSize: 22, color: '#FAF7F2' },
    profileText: { flex: 1, minWidth: 0 },
    profileNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    profileName: { fontFamily: fonts.serif, fontSize: 18, color: t.palette.cafeEscuro, flexShrink: 1 },
    profileSub: { fontFamily: fonts.sans, fontSize: 12.5, color: t.ui.textoSuave, marginTop: 2 },
    premiumPill: {
      backgroundColor: t.ui.painel,
      borderRadius: radius.pill,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    premiumPillText: { fontFamily: fonts.sansBold, fontSize: 11, color: t.palette.douradoAmanhecer },

    jornada: {
      backgroundColor: t.ui.superficie,
      borderWidth: 1,
      borderColor: t.ui.linha,
      borderRadius: 18,
      padding: 18,
      ...t.elevation.level1,
    },
    jornadaHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    jornadaLabel: { fontFamily: fonts.sans, fontSize: 13, color: t.ui.textoSuave },
    jornadaValor: { fontFamily: fonts.sansBold, fontSize: 13, color: t.palette.cafeEscuro },
    barra: { height: 10, borderRadius: 5, backgroundColor: t.ui.linha, overflow: 'hidden' },
    barraFill: { height: 10, borderRadius: 5 },
    chips: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' },
    chip: { backgroundColor: t.ui.painel, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
    chipText: { fontFamily: fonts.sansBold, fontSize: 12, color: t.palette.douradoAmanhecer },

    menu: {
      backgroundColor: t.ui.superficie,
      borderWidth: 1,
      borderColor: t.ui.linha,
      borderRadius: 18,
      overflow: 'hidden',
      ...t.elevation.level1,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: 18,
      paddingVertical: 14,
    },
    menuDivider: { borderBottomWidth: 1, borderBottomColor: t.ui.linha },
    menuLabel: { flex: 1, fontFamily: fonts.sans, fontSize: 15, color: t.ui.texto },

    sair: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: 14,
    },
    sairText: { fontFamily: fonts.sansBold, fontSize: 14, color: t.palette.erro },

    footer: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: t.palette.salvia,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
  });
