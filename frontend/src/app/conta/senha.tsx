/** Trocar senha: senha atual + nova (com confirmação). */
import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Field from '@/components/Field';
import Button from '@/components/Button';
import { trocarSenha, ApiError } from '@/api/auth';
import { fonts, palette, spacing } from '@/theme/ccpTheme';
import { useTheme, type Theme } from '@/theme/useTheme';

export default function TrocarSenha() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const router = useRouter();
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const podeEnviar = atual.length > 0 && nova.length >= 8 && confirmar.length > 0 && !salvando;

  const enviar = async () => {
    setErro(null);
    if (nova !== confirmar) { setErro('A nova senha e a confirmação não conferem.'); return; }
    setSalvando(true);
    try {
      await trocarSenha(atual, nova);
      Alert.alert('Pronto', 'Sua senha foi alterada.');
      router.back();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível trocar a senha.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style={t.mode === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.voltar} accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={24} color={t.ui.texto} />
        </Pressable>
        <Text style={styles.titulo}>Trocar senha</Text>

        <Field label="Senha atual" secure value={atual} onChangeText={setAtual} style={styles.field} />
        <Field label="Nova senha" secure value={nova} onChangeText={setNova} placeholder="Mínimo 8 caracteres" style={styles.field} />
        <Field label="Confirmar nova senha" secure value={confirmar} onChangeText={setConfirmar} style={styles.field} />

        {!!erro && <Text style={styles.erro}>{erro}</Text>}
        <Button label={salvando ? 'Salvando…' : 'Salvar nova senha'} onPress={enviar} disabled={!podeEnviar} style={styles.cta} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.ui.fundo },
    content: { paddingHorizontal: 30, paddingTop: spacing.sm, paddingBottom: spacing.lg },
    voltar: { alignSelf: 'flex-start', marginBottom: spacing.sm },
    titulo: { fontFamily: fonts.serif, fontSize: 30, color: t.ui.texto, marginBottom: spacing.md },
    field: { marginTop: 16 },
    erro: { fontFamily: fonts.sans, fontSize: 13, color: palette.erro, marginTop: 14, textAlign: 'center' },
    cta: { marginTop: 24 },
  });
