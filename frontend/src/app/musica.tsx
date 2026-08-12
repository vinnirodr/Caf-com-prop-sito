/**
 * Música de fundo — biblioteca e playlist. O usuário ouve cada faixa (preview),
 * monta sua playlist (seleção + ordem) e escolhe o modo (sequência/aleatório). As
 * faixas são do acervo próprio da autora (cadastradas no painel) — trilhas suaves
 * que tocam por baixo da leitura/narração. Preferências ficam no aparelho.
 */
import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { usarMusicaFundo } from '@/audio/BackgroundMusicContext';
import { mediaUrl, type MusicaFundo } from '@/api/content';
import type { MusicaModo } from '@/lib/storage';
import { fonts, spacing, radius } from '@/theme/ccpTheme';
import { useTheme, type Theme } from '@/theme/useTheme';

const MODOS: { valor: MusicaModo; label: string }[] = [
  { valor: 'sequencia', label: 'Em ordem' },
  { valor: 'aleatorio', label: 'Aleatório' },
];

export default function MusicaFundoTela() {
  const t = useTheme();
  const router = useRouter();
  const musica = usarMusicaFundo();
  const styles = useMemo(() => makeStyles(t), [t]);

  // Player de preview (audição), separado da música de fundo em si.
  const preview = useAudioPlayer();
  const pStatus = useAudioPlayerStatus(preview);
  const [previewId, setPreviewId] = useState<number | null>(null);

  // Pausa o preview ao sair da tela.
  useEffect(() => {
    return () => {
      try {
        preview.pause();
      } catch {
        /* ignora */
      }
    };
  }, [preview]);

  const ouvirPreview = (f: MusicaFundo) => {
    const uri = mediaUrl(f.url);
    if (!uri) return;
    if (previewId === f.id) {
      try {
        if (preview.playing) preview.pause();
        else preview.play();
      } catch {
        /* ignora */
      }
      return;
    }
    try {
      preview.replace({ uri });
      preview.loop = true;
      preview.volume = 1;
      preview.play();
      setPreviewId(f.id);
    } catch {
      /* ignora */
    }
  };

  const naPlaylist = musica.playlist;
  const disponiveis = musica.faixas.filter((f) => !musica.estaNaPlaylist(f.id));

  const Switch = ({ on, onPress }: { on: boolean; onPress: () => void }) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel="Música de fundo"
      style={[styles.switch, on ? styles.switchOn : styles.switchOff]}
    >
      <View style={[styles.knob, on ? styles.knobOn : styles.knobOff]} />
    </Pressable>
  );

  const renderPreview = (f: MusicaFundo) => {
    const tocandoEsta = previewId === f.id && pStatus.playing;
    return (
      <Pressable
        onPress={() => ouvirPreview(f)}
        hitSlop={8}
        style={styles.previewBtn}
        accessibilityLabel={tocandoEsta ? `Pausar ${f.titulo}` : `Ouvir ${f.titulo}`}
      >
        <Ionicons name={tocandoEsta ? 'pause' : 'play'} size={18} color={t.palette.cafeEscuro} />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style={t.mode === 'dark' ? 'light' : 'dark'} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={24} color={t.ui.texto} />
        </Pressable>
        <Text style={styles.titulo}>Música de fundo</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!musica.temFaixas ? (
          <View style={styles.card}>
            <Text style={styles.vazioTitulo}>Nenhuma faixa disponível ainda.</Text>
            <Text style={styles.rowSub}>
              As trilhas aparecem aqui assim que forem publicadas no aplicativo.
            </Text>
          </View>
        ) : (
          <>
            {/* Ligar/desligar + modo */}
            <View style={styles.card}>
              <View style={styles.row}>
                <Ionicons name="musical-notes-outline" size={20} color={t.ui.texto} />
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>Tocar durante a leitura</Text>
                  <Text style={styles.rowSub}>Uma trilha suave por baixo da leitura e da narração.</Text>
                </View>
                <Switch on={musica.ativa} onPress={musica.alternar} />
              </View>

              <View style={styles.segmented}>
                {MODOS.map((m) => {
                  const ativo = musica.modo === m.valor;
                  return (
                    <Pressable
                      key={m.valor}
                      onPress={() => musica.definirModo(m.valor)}
                      style={[styles.segment, ativo && styles.segmentActive]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: ativo }}
                    >
                      <Ionicons
                        name={m.valor === 'aleatorio' ? 'shuffle' : 'reorder-four-outline'}
                        size={16}
                        color={ativo ? t.ui.texto : t.ui.textoSuave}
                      />
                      <Text style={[styles.segmentText, ativo && styles.segmentTextActive]}>{m.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Minha playlist */}
            <View style={styles.card}>
              <Text style={styles.secao}>Minha playlist</Text>
              {naPlaylist.length === 0 ? (
                <Text style={styles.rowSub}>
                  Você ainda não escolheu faixas — por enquanto tocamos todas, na ordem abaixo.
                  Toque em “Adicionar” para montar a sua.
                </Text>
              ) : (
                naPlaylist.map((f, i) => (
                  <View key={f.id} style={styles.faixaRow}>
                    {renderPreview(f)}
                    <Text style={styles.faixaTitulo} numberOfLines={1}>
                      {f.titulo}
                    </Text>
                    <View style={styles.acoes}>
                      <Pressable
                        onPress={() => musica.mover(f.id, -1)}
                        disabled={i === 0}
                        hitSlop={6}
                        style={styles.acaoBtn}
                        accessibilityLabel={`Mover ${f.titulo} para cima`}
                      >
                        <Ionicons name="chevron-up" size={20} color={i === 0 ? t.ui.linha : t.ui.textoSuave} />
                      </Pressable>
                      <Pressable
                        onPress={() => musica.mover(f.id, 1)}
                        disabled={i === naPlaylist.length - 1}
                        hitSlop={6}
                        style={styles.acaoBtn}
                        accessibilityLabel={`Mover ${f.titulo} para baixo`}
                      >
                        <Ionicons
                          name="chevron-down"
                          size={20}
                          color={i === naPlaylist.length - 1 ? t.ui.linha : t.ui.textoSuave}
                        />
                      </Pressable>
                      <Pressable
                        onPress={() => musica.remover(f.id)}
                        hitSlop={6}
                        style={styles.acaoBtn}
                        accessibilityLabel={`Remover ${f.titulo} da playlist`}
                      >
                        <Ionicons name="remove-circle-outline" size={20} color={t.palette.salvia} />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Acervo — adicionar */}
            {disponiveis.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.secao}>Adicionar do acervo</Text>
                {disponiveis.map((f) => (
                  <View key={f.id} style={styles.faixaRow}>
                    {renderPreview(f)}
                    <Text style={styles.faixaTitulo} numberOfLines={1}>
                      {f.titulo}
                    </Text>
                    <Pressable
                      onPress={() => musica.adicionar(f.id)}
                      hitSlop={6}
                      style={styles.acaoBtn}
                      accessibilityLabel={`Adicionar ${f.titulo} à playlist`}
                    >
                      <Ionicons name="add-circle" size={24} color={t.palette.douradoAmanhecer} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        <Text style={styles.rodape}>
          As trilhas tocam bem baixinho por baixo da leitura e diminuem sozinhas quando a narração começa.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.ui.fundo },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: 22,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: t.ui.linha,
    },
    titulo: { fontFamily: fonts.serif, fontSize: 23, color: t.ui.texto },
    content: { padding: spacing.lg, gap: spacing.md },

    card: {
      backgroundColor: t.ui.superficie,
      borderWidth: 1,
      borderColor: t.ui.linha,
      borderRadius: 18,
      padding: 18,
      ...t.elevation.level1,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    rowText: { flex: 1, minWidth: 0 },
    rowLabel: { fontFamily: fonts.sansBold, fontSize: 15, color: t.ui.texto },
    rowSub: { fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 18, color: t.ui.textoSuave, marginTop: 2 },

    switch: { width: 46, height: 27, borderRadius: 999, padding: 3, justifyContent: 'center' },
    switchOn: { backgroundColor: t.palette.douradoAmanhecer },
    switchOff: { backgroundColor: t.ui.linha },
    knob: { width: 21, height: 21, borderRadius: 999, backgroundColor: '#fff' },
    knobOn: { alignSelf: 'flex-end' },
    knobOff: { alignSelf: 'flex-start' },

    segmented: {
      flexDirection: 'row',
      backgroundColor: t.ui.fundo,
      borderRadius: 12,
      padding: 4,
      gap: 4,
      marginTop: 18,
    },
    segment: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: 9,
      borderRadius: 9,
    },
    segmentActive: { backgroundColor: t.ui.superficie, ...t.elevation.level1 },
    segmentText: { fontFamily: fonts.sansMedium, fontSize: 13, color: t.ui.textoSuave },
    segmentTextActive: { fontFamily: fonts.sansBold, color: t.ui.texto },

    secao: {
      fontFamily: fonts.sansBold,
      fontSize: 12,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.palette.salvia,
      marginBottom: 10,
    },
    faixaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm + 2,
      paddingVertical: 8,
    },
    previewBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: t.palette.douradoSuave,
      alignItems: 'center',
      justifyContent: 'center',
    },
    faixaTitulo: { flex: 1, fontFamily: fonts.sans, fontSize: 14.5, color: t.ui.texto },
    acoes: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    acaoBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },

    vazioTitulo: { fontFamily: fonts.sansBold, fontSize: 15, color: t.ui.texto, marginBottom: 4 },

    rodape: {
      fontFamily: fonts.sans,
      fontSize: 12,
      lineHeight: 18,
      color: t.palette.salvia,
      textAlign: 'center',
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
    },
  });
