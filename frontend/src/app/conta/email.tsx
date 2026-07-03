/** Alterar e-mail: novo e-mail + senha atual (v1 sem verificação por e-mail). */
import { useState } from 'react';
import { Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Field from '@/components/Field';
import Button from '@/components/Button';
import { useAuth } from '@/auth/AuthContext';
import { trocarEmail, ApiError } from '@/api/auth';
import { fonts, palette, spacing } from '@/theme/ccpTheme';
import { useTheme } from '@/theme/useTheme';

export default function AlterarEmail() {
  const t = useTheme();
  const router = useRouter();
  const { user, atualizarUsuario } = useAuth();
  const [novo, setNovo] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const podeEnviar = novo.trim().length > 3 && senha.length > 0 && !salvando;

  const enviar = async () => {
    setErro(null);
    setSalvando(true);
    try {
      const atualizado = await trocarEmail(novo.trim(), senha);
      atualizarUsuario(atualizado);
      Alert.alert('Pronto', 'Seu e-mail foi alterado.');
      router.back();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível alterar o e-mail.');
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
        <Text style={styles.titulo}>Alterar e-mail</Text>
        <Text style={styles.sub}>E-mail atual: {user?.email}</Text>

        <Field label="Novo e-mail" value={novo} onChangeText={setNovo} keyboardType="email-address" autoCapitalize="none" style={styles.field} />
        <Field label="Senha atual" secure value={senha} onChangeText={setSenha} style={styles.field} />

        {!!erro && <Text style={styles.erro}>{erro}</Text>}
        <Button label={salvando ? 'Salvando…' : 'Alterar e-mail'} onPress={enviar} disabled={!podeEnviar} style={styles.cta} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 30, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  voltar: { alignSelf: 'flex-start', marginBottom: spacing.sm },
  titulo: { fontFamily: fonts.serif, fontSize: 30, color: palette.cafeEscuro, marginBottom: 6 },
  sub: { fontFamily: fonts.sans, fontSize: 14, color: '#6E625A', marginBottom: spacing.md },
  field: { marginTop: 16 },
  erro: { fontFamily: fonts.sans, fontSize: 13, color: palette.erro, marginTop: 14, textAlign: 'center' },
  cta: { marginTop: 24 },
});
