/**
 * 04 · Início. Header "céu" com saudação por horário + clima real (Open-Meteo),
 * card herói "Leitura de hoje" (capítulo do dia, vindo da API) e a frase para
 * guardar. Sem dados pessoais inventados (entram quando houver conta).
 */
import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Image, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getChapter, getBanners, mediaUrl, Chapter, Banner } from '@/api/content';
import { getCurrentWeather, Weather } from '@/api/weather';
import { saudacaoParaNome } from '@/lib/greeting';
import { useAuth } from '@/auth/AuthContext';
import { useEngagement } from '@/engagement/EngagementContext';
import { audioFontePara, temAudioDisponivel, bloqueadoPremium } from '@/lib/audio';
import { useAudioControls } from '@/audio/AudioContext';
import Button from '@/components/Button';
import { fonts, spacing, radius, typography } from '@/theme/ccpTheme';
import { gradients } from '@/theme/gradients';
import { useTheme, type Theme } from '@/theme/useTheme';

const TOTAL_CAPITULOS = 75;

export default function Inicio() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tocar } = useAudioControls();
  const { user } = useAuth();
  const { statusCapitulo } = useEngagement();
  const styles = useMemo(() => makeStyles(t), [t]);

  const ouvir = (cap: Chapter) => {
    if (bloqueadoPremium(cap, false)) {
      router.push('/premium');
      return;
    }
    const fonte = audioFontePara(cap);
    if (!fonte) return;
    tocar({ numero: cap.numero, titulo: cap.titulo }, fonte);
    router.push('/player');
  };

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);

  const saudacao = saudacaoParaNome(user?.nome);

  // "Leitura de hoje" = próximo capítulo não lido (retomar de onde parou).
  // Sem login/progresso, cai no capítulo 1.
  const capHoje = useMemo(() => {
    for (let n = 1; n <= TOTAL_CAPITULOS; n++) {
      if (statusCapitulo(n) !== 'lido') return n;
    }
    return TOTAL_CAPITULOS;
  }, [statusCapitulo]);

  // Clima e banner: uma vez.
  useEffect(() => {
    let active = true;
    getCurrentWeather().then((w) => active && setWeather(w));
    getBanners()
      .then((lista) => active && setBanner(lista[0] ?? null))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Capítulo da "leitura de hoje" — reage ao progresso.
  useEffect(() => {
    let active = true;
    setLoading(true);
    getChapter(capHoje)
      .then((c) => active && setChapter(c))
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [capHoje]);

  // Sem banner cadastrado, o app usa um padrão que abre a Loja.
  const abrirBanner = () => {
    if (!banner) return router.push('/loja');
    switch (banner.destino) {
      case 'link_externo':
        if (banner.link_externo) Linking.openURL(banner.link_externo).catch(() => {});
        return;
      case 'capitulo':
        if (banner.capitulo_numero) router.push(`/capitulo/${banner.capitulo_numero}`);
        return;
      case 'nenhum':
        return;
      default:
        return router.push('/loja');
    }
  };
  const bannerImg = mediaUrl(banner?.imagem ?? null);
  const bannerNaoClicavel = banner?.destino === 'nenhum';

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
                <View style={styles.weatherTop}>
                  <Ionicons name={weather.icon} size={17} color="#FBEAC8" />
                  <Text style={styles.weatherText}>{weather.tempC}°</Text>
                </View>
                {!!weather.local && (
                  <Text style={styles.weatherLocal} numberOfLines={1}>
                    {weather.local}
                  </Text>
                )}
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
                  <Text style={styles.eyebrow}>{capHoje > 1 ? 'Continue lendo' : 'Leitura de hoje'}</Text>
                  <Text style={styles.heroMeta}>Cap. {chapter.numero} de {TOTAL_CAPITULOS}</Text>
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
                  {(temAudioDisponivel(chapter) || chapter.audio_acesso === 'premium') && (
                    <Button
                      label="Ouvir"
                      variant="primary"
                      style={styles.heroBtn}
                      icon={
                        <Ionicons
                          name={bloqueadoPremium(chapter, false) ? 'lock-closed' : 'play'}
                          size={16}
                          color={t.palette.cafeEscuro}
                        />
                      }
                      onPress={() => ouvir(chapter)}
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

          {/* Banner da Início — personalizável no admin; sem cadastro, um padrão da Loja */}
          {bannerImg ? (
            <Pressable
              style={styles.bannerImgWrap}
              onPress={abrirBanner}
              disabled={bannerNaoClicavel}
              accessibilityRole="button"
              accessibilityLabel={banner?.titulo || 'Banner'}
            >
              <Image source={{ uri: bannerImg }} style={styles.bannerImg} resizeMode="cover" />
            </Pressable>
          ) : (
            <Pressable
              style={styles.banner}
              onPress={abrirBanner}
              disabled={bannerNaoClicavel}
              accessibilityRole="button"
              accessibilityLabel={banner?.titulo || 'Abrir a loja do Café com Propósito'}
            >
              <View style={styles.bannerIcon}>
                <Ionicons name="bag-handle-outline" size={22} color={t.palette.cafe} />
              </View>
              <View style={styles.bannerText}>
                <Text style={styles.bannerTitle}>{banner?.titulo || 'Conheça a Loja'}</Text>
                <Text style={styles.bannerSub}>
                  {banner?.subtitulo || 'Livro físico, xícaras, camisetas e mais'}
                </Text>
              </View>
              {!bannerNaoClicavel && (
                <Ionicons name="chevron-forward" size={20} color={t.palette.douradoAmanhecer} />
              )}
            </Pressable>
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
      alignItems: 'center',
      gap: 2,
      backgroundColor: 'rgba(255,255,255,0.16)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.22)',
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 8,
      maxWidth: 160,
    },
    weatherTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    weatherText: { fontFamily: fonts.sansBold, fontSize: 13, color: '#FAF7F2' },
    weatherLocal: { fontFamily: fonts.sans, fontSize: 11, color: '#F0E0C6' },
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

    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: t.ui.superficie,
      borderWidth: 1,
      borderColor: t.ui.linha,
      borderRadius: 18,
      padding: 16,
      ...t.elevation.level1,
    },
    bannerIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: t.ui.painel,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bannerText: { flex: 1, minWidth: 0 },
    bannerTitle: { fontFamily: fonts.serif, fontSize: 17, color: t.palette.cafeEscuro },
    bannerSub: { fontFamily: fonts.sans, fontSize: 12.5, color: t.ui.textoSuave, marginTop: 2 },

    bannerImgWrap: { borderRadius: 18, overflow: 'hidden', ...t.elevation.level1 },
    bannerImg: { width: '100%', aspectRatio: 2.4 },
  });
