/**
 * 04 · Início. Header "céu" com saudação por horário + clima real (Open-Meteo),
 * card herói "Leitura de hoje" (capítulo do dia, vindo da API) e a frase para
 * guardar. Sem dados pessoais inventados (entram quando houver conta).
 */
import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getChapter, Chapter } from '@/api/content';
import { getCurrentWeather, Weather } from '@/api/weather';
import { saudacaoPorHorario } from '@/lib/greeting';
import Button from '@/components/Button';
import { fonts, spacing, radius, typography } from '@/theme/ccpTheme';
import { gradients } from '@/theme/gradients';
import { useTheme, type Theme } from '@/theme/useTheme';

/** Capítulo apresentado como "leitura de hoje" (agendamento real fica p/ depois). */
const CAP_HOJE = 1;

export default function Inicio() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(t), [t]);

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<Weather | null>(null);

  const saudacao = saudacaoPorHorario().replace(',', '');

  useEffect(() => {
    let active = true;
    getChapter(CAP_HOJE)
      .then((c) => active && setChapter(c))
      .catch(() => {})
      .finally(() => active && setLoading(false));
    getCurrentWeather().then((w) => active && setWeather(w));
    return () => {
      active = false;
    };
  }, []);

  return (
    <View style={styles.fill}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {/* Header céu */}
        <LinearGradient
          colors={gradients.ceu.colors}
          locations={gradients.ceu.locations}
          start={gradients.ceu.start}
          end={gradients.ceu.end}
          style={[styles.header, { paddingTop: insets.top + spacing.md }]}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.hello}>Que bom ter você aqui</Text>
              <Text style={styles.greeting}>{saudacao}</Text>
            </View>
            {weather && (
              <View style={styles.weather}>
                <Ionicons name={weather.icon} size={17} color="#FBEAC8" />
                <Text style={styles.weatherText}>{weather.tempC}°</Text>
              </View>
            )}
          </View>
          <Text style={styles.headerQuote}>
            "Que este dia comece devagar, com fé e um bom café."
          </Text>
        </LinearGradient>

        {/* Conteúdo */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={t.palette.douradoAmanhecer} />
            </View>
          ) : chapter ? (
            <>
              <View style={styles.heroCard}>
                <View style={styles.heroHead}>
                  <Text style={styles.eyebrow}>Leitura de hoje</Text>
                  <Text style={styles.heroMeta}>Cap. {chapter.numero} de 75</Text>
                </View>
                <Text style={styles.heroTitle}>{chapter.titulo}</Text>
                {!!chapter.versiculo_ref && (
                  <Text style={styles.heroVerse} numberOfLines={2}>
                    {chapter.versiculo_texto
                      ? `"${chapter.versiculo_texto}" — ${chapter.versiculo_ref}`
                      : chapter.versiculo_ref}
                  </Text>
                )}
                <View style={styles.heroButtons}>
                  <Button
                    label="Ler agora"
                    variant="secondary"
                    style={styles.heroBtn}
                    onPress={() => router.push(`/capitulo/${chapter.numero}`)}
                  />
                  {chapter.tem_audio && (
                    <Button
                      label="Ouvir"
                      variant="primary"
                      style={styles.heroBtn}
                      icon={<Ionicons name="play" size={16} color={t.palette.cafeEscuro} />}
                      onPress={() => router.push(`/capitulo/${chapter.numero}`)}
                    />
                  )}
                </View>
              </View>

              {!!chapter.frase_guardar && (
                <View style={styles.guardarCard}>
                  <Text style={styles.guardarLabel}>Para guardar no coração</Text>
                  <Text style={styles.guardarText}>"{chapter.frase_guardar}"</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.loadingCard}>
              <Ionicons name="cloud-offline-outline" size={32} color={t.ui.linha} />
              <Text style={styles.errorText}>
                Não foi possível carregar a leitura de hoje. Puxe a Biblioteca para
                tentar de novo.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    fill: { flex: 1, backgroundColor: t.ui.fundo },
    header: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
    },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    hello: { fontFamily: fonts.sans, fontSize: 13, color: '#F0E0C6' },
    greeting: { fontFamily: fonts.serif, fontSize: 30, color: '#FAF7F2', marginTop: 2 },
    weather: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      backgroundColor: 'rgba(255,255,255,0.16)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.22)',
      borderRadius: radius.pill,
      paddingHorizontal: 13,
      paddingVertical: 8,
    },
    weatherText: { fontFamily: fonts.sansBold, fontSize: 13, color: '#FAF7F2' },
    headerQuote: {
      fontFamily: fonts.serif,
      fontStyle: 'italic',
      fontSize: 14.5,
      lineHeight: 22,
      color: '#F4E6CF',
      marginTop: spacing.md,
      maxWidth: 280,
    },

    content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
    loadingCard: {
      backgroundColor: t.ui.superficie,
      borderWidth: 1,
      borderColor: t.ui.linha,
      borderRadius: radius.lg,
      padding: spacing.xl,
      alignItems: 'center',
      gap: spacing.sm,
      ...t.elevation.level1,
    },
    errorText: { ...typography.bodyUi, color: t.ui.textoSuave, textAlign: 'center' },

    heroCard: {
      backgroundColor: t.ui.superficie,
      borderWidth: 1,
      borderColor: t.ui.linha,
      borderRadius: 20,
      padding: 22,
      ...t.elevation.level2,
    },
    heroHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm + 4 },
    eyebrow: {
      fontFamily: fonts.sansBold,
      fontSize: 11,
      letterSpacing: 1.6,
      textTransform: 'uppercase',
      color: t.palette.douradoAmanhecer,
    },
    heroMeta: { fontFamily: fonts.sansBold, fontSize: 11, color: t.palette.salvia },
    heroTitle: { fontFamily: fonts.serif, fontSize: 23, lineHeight: 28, color: t.palette.cafeEscuro },
    heroVerse: {
      fontFamily: fonts.serif,
      fontStyle: 'italic',
      fontSize: 14,
      lineHeight: 21,
      color: t.ui.textoSuave,
      marginTop: spacing.sm,
    },
    heroButtons: { flexDirection: 'row', gap: spacing.sm + 2, marginTop: spacing.lg },
    heroBtn: { flex: 1, height: 50 },

    guardarCard: {
      backgroundColor: t.ui.painel,
      borderWidth: 1,
      borderColor: t.ui.linha,
      borderRadius: 18,
      padding: 18,
    },
    guardarLabel: {
      fontFamily: fonts.sansBold,
      fontSize: 10.5,
      letterSpacing: 1.6,
      textTransform: 'uppercase',
      color: '#B07F3C',
      marginBottom: spacing.sm,
    },
    guardarText: {
      fontFamily: fonts.serif,
      fontStyle: 'italic',
      fontSize: 16,
      lineHeight: 23,
      color: t.palette.cafeEscuro,
    },
  });
