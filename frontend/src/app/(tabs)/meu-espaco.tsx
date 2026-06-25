/**
 * 09 · Meu Espaço. Cabeçalho + cartão de conta e a lista de menu.
 * Logado: mostra nome/e-mail e "Sair". Deslogado: convite para entrar.
 * Dados de jornada/favoritos entram com o bloco de engajamento.
 */
import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/auth/AuthContext';
import { fonts, spacing, radius } from '@/theme/ccpTheme';
import { gradients } from '@/theme/gradients';
import { useTheme, type Theme } from '@/theme/useTheme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const MENU: { icon: IconName; label: string }[] = [
  { icon: 'person-outline', label: 'Dados pessoais' },
  { icon: 'document-text-outline', label: 'Minhas anotações' },
  { icon: 'heart-outline', label: 'Favoritos' },
  { icon: 'settings-outline', label: 'Ajustes' },
];

const emBreve = () =>
  Alert.alert('Em breve', 'Esta área chega nos próximos blocos do desenvolvimento.');

export default function MeuEspaco() {
  const t = useTheme();
  const router = useRouter();
  const { user, sair } = useAuth();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [lembrete, setLembrete] = useState(true);

  const inicial = (user?.nome?.trim()?.[0] ?? '?').toUpperCase();
  const nomeCompleto = user ? `${user.nome} ${user.sobrenome}`.trim() : null;

  const confirmarSair = () =>
    Alert.alert('Sair da conta', 'Quer mesmo sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => sair() },
    ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Meu Espaço</Text>

        {/* Cartão de conta */}
        <Pressable
          style={styles.profileCard}
          onPress={user ? emBreve : () => router.push('/(auth)/entrar')}
          accessibilityRole="button"
          accessibilityLabel={user ? 'Ver dados da conta' : 'Entrar na sua conta'}
        >
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
          <View style={styles.profileText}>
            <Text style={styles.profileName}>{nomeCompleto ?? 'Entre na sua conta'}</Text>
            <Text style={styles.profileSub}>
              {user?.email ?? 'Para salvar progresso, favoritos e anotações'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#C9BAA8" />
        </Pressable>

        {/* Menu */}
        <View style={styles.menu}>
          {MENU.map((m) => (
            <Pressable
              key={m.label}
              style={[styles.menuItem, styles.menuDivider]}
              onPress={emBreve}
              accessibilityRole="button"
              accessibilityLabel={m.label}
            >
              <Ionicons name={m.icon} size={20} color={t.palette.cafe} />
              <Text style={styles.menuLabel}>{m.label}</Text>
              <Ionicons name="chevron-forward" size={18} color="#C9BAA8" />
            </Pressable>
          ))}

          {/* Lembrete diário — toggle visual */}
          <View style={styles.menuItem}>
            <Ionicons name="notifications-outline" size={20} color={t.palette.cafe} />
            <Text style={styles.menuLabel}>Lembrete diário</Text>
            <Pressable
              onPress={() => setLembrete((v) => !v)}
              accessibilityRole="switch"
              accessibilityState={{ checked: lembrete }}
              accessibilityLabel="Lembrete diário"
              style={[styles.switch, lembrete ? styles.switchOn : styles.switchOff]}
            >
              <View style={[styles.knob, lembrete ? styles.knobOn : styles.knobOff]} />
            </Pressable>
          </View>
        </View>

        {user && (
          <Pressable style={styles.sair} onPress={confirmarSair} accessibilityRole="button">
            <Ionicons name="log-out-outline" size={18} color={t.palette.erro} />
            <Text style={styles.sairText}>Sair da conta</Text>
          </Pressable>
        )}

        <Text style={styles.footer}>Café com Propósito · 75 capítulos para ler ou ouvir</Text>
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
    profileName: { fontFamily: fonts.serif, fontSize: 18, color: t.palette.cafeEscuro },
    profileSub: { fontFamily: fonts.sans, fontSize: 12.5, color: t.ui.textoSuave, marginTop: 2 },

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
    menuDivider: { borderBottomWidth: 1, borderBottomColor: '#F0E8DC' },
    menuLabel: { flex: 1, fontFamily: fonts.sans, fontSize: 15, color: t.ui.texto },

    switch: { width: 46, height: 27, borderRadius: 999, padding: 3, justifyContent: 'center' },
    switchOn: { backgroundColor: t.palette.douradoAmanhecer },
    switchOff: { backgroundColor: t.ui.linha },
    knob: { width: 21, height: 21, borderRadius: 999, backgroundColor: '#fff' },
    knobOn: { alignSelf: 'flex-end' },
    knobOff: { alignSelf: 'flex-start' },

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
