/**
 * 11 · Cadastro. Cria a conta (nome, sobrenome, nascimento, telefone, e-mail
 * + confirmação, senha + confirmação, aceite de termos). Valida no cliente e
 * mostra erros do backend por campo. Sucesso → entra logado.
 */
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '@/components/Button';
import Field from '@/components/Field';
import { useAuth } from '@/auth/AuthContext';
import { ApiError } from '@/api/auth';
import { maskTelefone, maskData, dataParaISO } from '@/lib/masks';
import { fonts, palette, spacing } from '@/theme/ccpTheme';
import { useTheme } from '@/theme/useTheme';

export default function Cadastro() {
  const t = useTheme();
  const router = useRouter();
  const { cadastrar } = useAuth();

  const [f, setF] = useState({
    nome: '',
    sobrenome: '',
    nascimento: '',
    telefone: '',
    email: '',
    confirmarEmail: '',
    senha: '',
    confirmarSenha: '',
  });
  const [termos, setTermos] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const set = (k: keyof typeof f) => (v: string) => setF((prev) => ({ ...prev, [k]: v }));

  const validar = (): boolean => {
    const e: Record<string, string> = {};
    if (!f.nome.trim()) e.nome = 'Informe seu nome.';
    if (!f.email.trim()) e.email = 'Informe seu e-mail.';
    if (f.email.trim().toLowerCase() !== f.confirmarEmail.trim().toLowerCase())
      e.confirmarEmail = 'Os e-mails não conferem.';
    if (f.senha.length < 8) e.senha = 'Mínimo de 8 caracteres.';
    if (f.senha !== f.confirmarSenha) e.confirmarSenha = 'As senhas não conferem.';
    if (f.nascimento && !dataParaISO(f.nascimento)) e.nascimento = 'Data inválida.';
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const enviar = async () => {
    setErroGeral(null);
    if (!termos) {
      setErroGeral('É preciso aceitar os Termos de uso e a Política de privacidade.');
      return;
    }
    if (!validar()) return;

    setCarregando(true);
    try {
      await cadastrar({
        nome: f.nome.trim(),
        sobrenome: f.sobrenome.trim(),
        email: f.email.trim(),
        confirmar_email: f.confirmarEmail.trim(),
        telefone: f.telefone.trim(),
        data_nascimento: dataParaISO(f.nascimento),
        senha: f.senha,
        confirmar_senha: f.confirmarSenha,
        aceite_termos: termos,
      });
      router.replace('/(tabs)/meu-espaco');
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) {
        // Mapeia erros do backend (snake_case) para os campos do form.
        const map: Record<string, string> = {
          email: 'email',
          confirmar_email: 'confirmarEmail',
          senha: 'senha',
          confirmar_senha: 'confirmarSenha',
          nome: 'nome',
        };
        const novos: Record<string, string> = {};
        for (const [campo, msgs] of Object.entries(err.fields)) {
          const alvo = map[campo] ?? campo;
          if (Array.isArray(msgs) && msgs.length) novos[alvo] = String(msgs[0]);
        }
        setErros(novos);
        setErroGeral(err.message);
      } else {
        setErroGeral(
          err instanceof ApiError ? err.message : 'Não foi possível criar a conta. Tente de novo.'
        );
      }
    } finally {
      setCarregando(false);
    }
  };

  const abrirTermos = () => Alert.alert('Em breve', 'Os Termos e a Política chegam nos próximos blocos.');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.ui.fundo }]} edges={['top']}>
      <StatusBar style="dark" />
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={24} color={palette.cafe} />
        </Pressable>
        <View style={styles.flex}>
          <Text style={styles.titulo}>Criar conta</Text>
          <Text style={styles.sub}>Seus dados ficam protegidos.</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.row}>
            <Field label="Nome" value={f.nome} onChangeText={set('nome')} error={erros.nome} style={styles.col} />
            <Field label="Sobrenome" value={f.sobrenome} onChangeText={set('sobrenome')} style={styles.col} />
          </View>
          <View style={styles.row}>
            <Field
              label="Data de nascimento"
              value={f.nascimento}
              onChangeText={(v) => set('nascimento')(maskData(v))}
              placeholder="DD/MM/AAAA"
              keyboardType="number-pad"
              error={erros.nascimento}
              style={styles.col}
            />
            <Field
              label="Telefone"
              value={f.telefone}
              onChangeText={(v) => set('telefone')(maskTelefone(v))}
              placeholder="(11) 90000-0000"
              keyboardType="phone-pad"
              style={styles.col}
            />
          </View>
          <Field
            label="E-mail"
            icon="cafe-outline"
            value={f.email}
            onChangeText={set('email')}
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={erros.email}
            style={styles.single}
          />
          <Field
            label="Confirmar e-mail"
            icon="cafe-outline"
            value={f.confirmarEmail}
            onChangeText={set('confirmarEmail')}
            placeholder="repita o e-mail"
            keyboardType="email-address"
            autoCapitalize="none"
            error={erros.confirmarEmail}
            style={styles.single}
          />
          <View style={styles.row}>
            <Field label="Senha" icon="lock-closed-outline" secure value={f.senha} onChangeText={set('senha')} error={erros.senha} style={styles.col} />
            <Field label="Confirmar senha" icon="lock-closed-outline" secure value={f.confirmarSenha} onChangeText={set('confirmarSenha')} error={erros.confirmarSenha} style={styles.col} />
          </View>

          <Pressable style={styles.termos} onPress={() => setTermos((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: termos }}>
            <View style={[styles.check, termos && styles.checkOn]}>
              {termos && <Ionicons name="checkmark" size={14} color={palette.cafeEscuro} />}
            </View>
            <Text style={styles.termosText}>
              Aceito os <Text style={styles.link} onPress={abrirTermos}>Termos de uso</Text> e a{' '}
              <Text style={styles.link} onPress={abrirTermos}>Política de privacidade</Text>.
            </Text>
          </Pressable>

          {!!erroGeral && <Text style={styles.erroGeral}>{erroGeral}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Rodapé fixo */}
      <View style={styles.footer}>
        <Button label={carregando ? 'Criando…' : 'Criar conta'} onPress={enviar} disabled={carregando} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: 22,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFE6D9',
  },
  titulo: { fontFamily: fonts.serif, fontSize: 23, color: palette.cafeEscuro },
  sub: { fontFamily: fonts.sans, fontSize: 12, color: palette.salvia, marginTop: 1 },
  content: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 24 },
  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  col: { flex: 1 },
  single: { marginTop: 12 },
  termos: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 18 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#D8C4A8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkOn: { backgroundColor: palette.douradoAmanhecer, borderColor: palette.douradoAmanhecer },
  termosText: { flex: 1, fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 19, color: '#6E625A' },
  link: { fontFamily: fonts.sansBold, color: palette.douradoAmanhecer },
  erroGeral: { fontFamily: fonts.sans, fontSize: 13, color: palette.erro, marginTop: 14, textAlign: 'center' },
  footer: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 28, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#EAE0D4' },
});
