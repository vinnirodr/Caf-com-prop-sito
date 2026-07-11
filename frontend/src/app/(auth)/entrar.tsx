/**
 * 03 · Entrar. Login por e-mail + senha, com Google e recuperação de senha.
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { abrirLink, URL_PRIVACIDADE, URL_TERMOS } from '@/lib/links';
import BrandSeal from '@/components/BrandSeal';
import Button from '@/components/Button';
import Field from '@/components/Field';
import { useAuth } from '@/auth/AuthContext';
import { ApiError } from '@/api/auth';
import { fonts, palette, spacing } from '@/theme/ccpTheme';
import { useTheme } from '@/theme/useTheme';

export default function Entrar() {
  const t = useTheme();
  const router = useRouter();
  const { proximo } = useLocalSearchParams<{ proximo?: string }>();
  const { entrar, entrarComGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const podeEnviar = email.trim().length > 3 && senha.length > 0 && !carregando;

  const enviar = async () => {
    setErro(null);
    setCarregando(true);
    try {
      await entrar(email.trim(), senha);
      router.replace(proximo ? (proximo as never) : '/(tabs)/meu-espaco');
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível entrar. Tente de novo.');
    } finally {
      setCarregando(false);
    }
  };

  const entrarGoogle = async () => {
    setErro(null);
    setCarregando(true);
    try {
      const ok = await entrarComGoogle();
      if (ok) router.replace(proximo ? (proximo as never) : '/(tabs)/meu-espaco');
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível entrar com o Google.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.ui.fundo }]} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BrandSeal size={60} variant="min" color={palette.cafe} />
          <Text style={styles.titulo}>Bem-vindo de volta</Text>
          <Text style={styles.sub}>Entre para continuar de onde parou.</Text>

          <Field
            label="E-mail"
            icon="cafe-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            style={styles.field}
          />
          <Field
            label="Senha"
            icon="lock-closed-outline"
            secure
            value={senha}
            onChangeText={setSenha}
            placeholder="••••••••"
            style={styles.field}
          />

          <Pressable
            onPress={() =>
              router.push({
                pathname: '/(auth)/recuperar-senha',
                params: email.trim() ? { email: email.trim() } : {},
              })
            }
            style={styles.esqueci}
            hitSlop={6}
          >
            <Text style={styles.esqueciText}>Esqueci a senha</Text>
          </Pressable>

          {!!erro && <Text style={styles.erro}>{erro}</Text>}

          <Button label={carregando ? 'Entrando…' : 'Entrar'} onPress={enviar} disabled={!podeEnviar} style={styles.cta} />

          <View style={styles.divisor}>
            <View style={styles.linha} />
            <Text style={styles.ou}>ou</Text>
            <View style={styles.linha} />
          </View>

          <Pressable style={styles.google} onPress={entrarGoogle} accessibilityRole="button">
            <View style={styles.googleBadge}>
              <Text style={styles.googleG}>G</Text>
            </View>
            <Text style={styles.googleText}>Continuar com Google</Text>
          </Pressable>

          <Button
            label="Criar conta nova"
            variant="outline"
            onPress={() => router.push({ pathname: '/(auth)/cadastro', params: proximo ? { proximo } : {} })}
            style={styles.criar}
          />

          <Pressable
            onPress={() => router.replace('/(tabs)')}
            style={styles.entrarDepois}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={styles.entrarDepoisText}>Entrar depois</Text>
          </Pressable>

          <View style={styles.flexSpacer} />
          <Text style={styles.termos}>
            Ao entrar, você concorda com os{' '}
            <Text style={styles.termosLink} onPress={() => abrirLink(URL_TERMOS)}>Termos</Text> e a{' '}
            <Text style={styles.termosLink} onPress={() => abrirLink(URL_PRIVACIDADE)}>
              Política de Privacidade
            </Text>
            .
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  flexSpacer: { flex: 1, minHeight: spacing.lg },
  content: { flexGrow: 1, paddingHorizontal: 30, paddingTop: spacing.md, paddingBottom: spacing.lg },
  titulo: { fontFamily: fonts.serif, fontSize: 32, color: palette.cafeEscuro, marginTop: 14, letterSpacing: -0.3 },
  sub: { fontFamily: fonts.sans, fontSize: 15, color: '#6E625A', marginTop: 8 },
  field: { marginTop: 18 },
  esqueci: { alignSelf: 'flex-end', marginTop: 12 },
  esqueciText: { fontFamily: fonts.sansBold, fontSize: 13, color: palette.douradoAmanhecer },
  erro: { fontFamily: fonts.sans, fontSize: 13, color: palette.erro, marginTop: 14, textAlign: 'center' },
  cta: { marginTop: 18 },
  divisor: { flexDirection: 'row', alignItems: 'center', gap: 14, marginVertical: 18 },
  linha: { flex: 1, height: 1, backgroundColor: '#EAE0D4' },
  ou: { fontFamily: fonts.sans, fontSize: 12, color: palette.salvia },
  google: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm + 2,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#EAE0D4',
    height: 52,
    borderRadius: 14,
  },
  googleBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F2E9D8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: { fontFamily: fonts.serifBold, fontSize: 14, color: palette.cafe },
  googleText: { fontFamily: fonts.sansBold, fontSize: 15, color: palette.cafeEscuro },
  criar: { marginTop: 12 },
  entrarDepois: { alignSelf: 'center', marginTop: 16, paddingVertical: 4 },
  entrarDepoisText: { fontFamily: fonts.sansBold, fontSize: 13, color: palette.salvia },
  termos: { fontFamily: fonts.sans, fontSize: 12, color: palette.salvia, textAlign: 'center', lineHeight: 18 },
  termosLink: { fontFamily: fonts.sansBold, color: palette.douradoAmanhecer },
});
