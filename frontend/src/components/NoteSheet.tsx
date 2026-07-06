/**
 * Bottom sheet para criar/editar uma anotação de um capítulo.
 * Cuida da chamada à API e devolve a anotação salva via onSaved.
 */
import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '@/components/Button';
import { criarAnotacao, editarAnotacao, type Anotacao } from '@/api/engagement';
import { useKeyboardHeight } from '@/lib/useKeyboardHeight';
import { fonts, palette, radius, spacing } from '@/theme/ccpTheme';
import { useTheme } from '@/theme/useTheme';

type Props = {
  visible: boolean;
  onClose: () => void;
  capitulo: number;
  tituloCapitulo?: string;
  anotacaoExistente?: Anotacao | null;
  onSaved?: (a: Anotacao) => void;
};

export default function NoteSheet({
  visible,
  onClose,
  capitulo,
  tituloCapitulo,
  anotacaoExistente,
  onSaved,
}: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const [texto, setTexto] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (visible) setTexto(anotacaoExistente?.texto ?? '');
  }, [visible, anotacaoExistente]);

  const salvar = async () => {
    if (!texto.trim()) return;
    setSalvando(true);
    try {
      const a = anotacaoExistente
        ? await editarAnotacao(anotacaoExistente.id, texto.trim())
        : await criarAnotacao(capitulo, texto.trim());
      onSaved?.(a);
      onClose();
    } catch {
      // mantém o sheet aberto; usuário tenta de novo
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      {/* O pan do Android não sobe a janela do Modal, então levantamos o sheet
          pela altura do teclado. Sem teclado, respeitamos o inset inferior. */}
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: t.ui.superficie,
            paddingBottom: keyboardHeight > 0 ? spacing.md : insets.bottom + spacing.md,
            marginBottom: keyboardHeight,
          },
        ]}
      >
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>
            {anotacaoExistente ? 'Editar anotação' : 'Nova anotação'}
          </Text>
          <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Fechar">
            <Ionicons name="close" size={22} color={t.ui.textoSuave} />
          </Pressable>
        </View>
        {!!tituloCapitulo && <Text style={styles.cap}>Cap. {capitulo} · {tituloCapitulo}</Text>}

        <TextInput
          style={[styles.input, { color: t.ui.texto, backgroundColor: t.ui.painel }]}
          placeholder="Escreva o que tocou seu coração…"
          placeholderTextColor={t.ui.textoSuave}
          value={texto}
          onChangeText={setTexto}
          multiline
          autoFocus
          textAlignVertical="top"
        />

        <Button
          label={salvando ? 'Salvando…' : 'Salvar'}
          onPress={salvar}
          disabled={salvando || !texto.trim()}
          icon={salvando ? <ActivityIndicator color={palette.cafeEscuro} size="small" /> : undefined}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(42,36,34,0.45)' },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: '#D8C4A8',
    marginBottom: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.serif, fontSize: 20, color: palette.cafeEscuro },
  cap: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: palette.douradoAmanhecer,
    marginTop: 4,
  },
  input: {
    minHeight: 120,
    borderRadius: radius.md,
    padding: spacing.md,
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 24,
    marginVertical: spacing.md,
  },
});
