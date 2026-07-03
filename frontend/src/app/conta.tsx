/**
 * Minha Conta. Edita dados básicos; e-mail e senha têm fluxos próprios;
 * excluir conta é destrutivo e confirmado por senha (Task 10).
 */
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Field from '@/components/Field';
import Button from '@/components/Button';
import { useAuth } from '@/auth/AuthContext';
import { atualizarPerfil, ApiError, type PerfilPatch } from '@/api/auth';
import { maskDateBR, brParaISO, isoParaBR } from '@/lib/dateInput';
import { fonts, palette, spacing } from '@/theme/ccpTheme';
import { useTheme } from '@/theme/useTheme';

export default function Conta() {
  const t = useTheme();
  const router = useRouter();
  const { user, atualizarUsuario } = useAuth();

  const [nome, setNome] = useState(user?.nome ?? '');
  const [sobrenome, setSobrenome] = useState(user?.sobrenome ?? '');
  const [telefone, setTelefone] = useState(user?.telefone ?? '');
  const [nascimento, setNascimento] = useState(isoParaBR(user?.data_nascimento ?? null));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    setErro(null);
    const patch: PerfilPatch = { nome: nome.trim(), sobrenome: sobrenome.trim(), telefone: telefone.trim() };
    if (nascimento.trim()) {
      const iso = brParaISO(nascimento.trim());
      if (!iso) { setErro('Data de nascimento inválida. Use DD/MM/AAAA.'); return; }
      patch.data_nascimento = iso;
    } else {
      patch.data_nascimento = null;
    }
    setSalvando(true);
    try {
      const atualizado = await atualizarPerfil(patch);
      atualizarUsuario(atualizado);
      Alert.alert('Pronto', 'Seus dados foram salvos.');
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível salvar. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.ui.fundo }]} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.voltar} accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={24} color={palette.cafeEscuro} />
        </Pressable>
        <Text style={styles.titulo}>Minha Conta</Text>

        <Field label="Nome" value={nome} onChangeText={setNome} style={styles.field} />
        <Field label="Sobrenome" value={sobrenome} onChangeText={setSobrenome} style={styles.field} />
        <Field label="Telefone" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" style={styles.field} />
        <Field
          label="Data de nascimento"
          value={nascimento}
          onChangeText={(v) => setNascimento(maskDateBR(v))}
          placeholder="DD/MM/AAAA"
          keyboardType="number-pad"
          style={styles.field}
        />

        <View style={styles.emailRow}>
          <Field label="E-mail" value={user?.email ?? ''} editable={false} style={styles.emailField} />
          <Pressable onPress={() => router.push('/conta/email')} style={styles.alterar} hitSlop={6}>
            <Text style={styles.alterarText}>Alterar</Text>
          </Pressable>
        </View>

        {!!erro && <Text style={styles.erro}>{erro}</Text>}

        <Button label={salvando ? 'Salvando…' : 'Salvar'} onPress={salvar} disabled={salvando} style={styles.cta} />

        <View style={styles.acoes}>
          <Pressable style={styles.acaoItem} onPress={() => router.push('/conta/senha')} accessibilityRole="button">
            <Ionicons name="lock-closed-outline" size={18} color={palette.salvia} />
            <Text style={styles.acaoLabel}>Trocar senha</Text>
            <Ionicons name="chevron-forward" size={18} color={palette.salvia} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 30, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  voltar: { alignSelf: 'flex-start', marginBottom: spacing.sm },
  titulo: { fontFamily: fonts.serif, fontSize: 30, color: palette.cafeEscuro, marginBottom: spacing.md },
  field: { marginTop: 16 },
  emailRow: { marginTop: 16, flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  emailField: { flex: 1 },
  alterar: { paddingBottom: 16 },
  alterarText: { fontFamily: fonts.sansBold, fontSize: 13, color: palette.douradoAmanhecer },
  erro: { fontFamily: fonts.sans, fontSize: 13, color: palette.erro, marginTop: 14, textAlign: 'center' },
  cta: { marginTop: 24 },
  acoes: { marginTop: 28 },
  acaoItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#EAE0D4' },
  acaoLabel: { flex: 1, fontFamily: fonts.sansBold, fontSize: 15, color: palette.cafeEscuro },
});
