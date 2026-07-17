/** Recuperação de senha por código OTP. Duas fases: pedir código → redefinir. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Field from '@/components/Field';
import Button from '@/components/Button';
import { esqueciSenha, redefinirSenha, ApiError } from '@/api/auth';
import { fonts, palette, spacing } from '@/theme/ccpTheme';
import { useTheme, type Theme } from '@/theme/useTheme';

export default function RecuperarSenha() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const router = useRouter();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();

  const [fase, setFase] = useState<'pedir' | 'redefinir'>('pedir');
  const [email, setEmail] = useState(emailParam ?? '');
  const [codigo, setCodigo] = useState('');
  const [nova, setNova] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [segundos, setSegundos] = useState(0); // contagem para reenviar
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const iniciarContagem = () => {
    setSegundos(40);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setSegundos((s) => {
        if (s <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const pedir = async () => {
    setErro(null);
    setCarregando(true);
    try {
      await esqueciSenha(email.trim());
      setFase('redefinir');
      iniciarContagem();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível enviar o código.');
    } finally {
      setCarregando(false);
    }
  };

  const redefinir = async () => {
    setErro(null);
    if (nova !== confirmar) {
      setErro('A nova senha e a confirmação não conferem.');
      return;
    }
    setCarregando(true);
    try {
      await redefinirSenha(email.trim(), codigo.trim(), nova);
      Alert.alert('Pronto', 'Sua senha foi redefinida. Entre com a nova senha.');
      router.replace({ pathname: '/(auth)/entrar', params: { email: email.trim() } });
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível redefinir a senha.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style={t.mode === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.voltar} accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={24} color={t.ui.texto} />
        </Pressable>
        <Text style={styles.titulo}>Recuperar senha</Text>

        {fase === 'pedir' ? (
          <>
            <Text style={styles.sub}>Informe seu e-mail e enviaremos um código de 6 dígitos.</Text>
            <Field
              label="E-mail"
              icon="cafe-outline"
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.field}
            />
            {!!erro && <Text style={styles.erro}>{erro}</Text>}
            <Button
              label={carregando ? 'Enviando…' : 'Enviar código'}
              onPress={pedir}
              disabled={carregando || email.trim().length < 4}
              style={styles.cta}
            />
          </>
        ) : (
          <>
            <Text style={styles.sub}>
              Enviamos um código para {email.trim()}. Digite-o abaixo com a nova senha.
            </Text>
            <Field
              label="Código"
              icon="mail-outline"
              value={codigo}
              onChangeText={setCodigo}
              placeholder="000000"
              keyboardType="number-pad"
              style={styles.field}
            />
            <Field label="Nova senha" secure value={nova} onChangeText={setNova} placeholder="Mínimo 8 caracteres" style={styles.field} />
            <Field label="Confirmar nova senha" secure value={confirmar} onChangeText={setConfirmar} style={styles.field} />
            {!!erro && <Text style={styles.erro}>{erro}</Text>}
            <Button
              label={carregando ? 'Salvando…' : 'Redefinir senha'}
              onPress={redefinir}
              disabled={carregando || codigo.trim().length === 0 || nova.length < 8}
              style={styles.cta}
            />
            <Pressable
              onPress={pedir}
              style={styles.reenviar}
              hitSlop={6}
              disabled={carregando || segundos > 0}
            >
              <Text style={[styles.reenviarText, (carregando || segundos > 0) && styles.reenviarInativo]}>
                {segundos > 0 ? `Reenviar em ${segundos}s` : 'Reenviar código'}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.ui.fundo },
    content: { paddingHorizontal: 30, paddingTop: spacing.sm, paddingBottom: spacing.lg },
    voltar: { alignSelf: 'flex-start', marginBottom: spacing.sm },
    titulo: { fontFamily: fonts.serif, fontSize: 30, color: t.ui.texto, marginBottom: 8 },
    sub: { fontFamily: fonts.sans, fontSize: 14, color: t.ui.textoSuave, marginBottom: spacing.sm, lineHeight: 20 },
    field: { marginTop: 16 },
    erro: { fontFamily: fonts.sans, fontSize: 13, color: palette.erro, marginTop: 14, textAlign: 'center' },
    cta: { marginTop: 24 },
    reenviar: { alignSelf: 'center', marginTop: 18 },
    reenviarText: { fontFamily: fonts.sansBold, fontSize: 13, color: palette.douradoAmanhecer },
    reenviarInativo: { color: palette.salvia },
  });
