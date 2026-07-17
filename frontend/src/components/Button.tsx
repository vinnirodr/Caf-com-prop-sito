/**
 * Botão do design system. Três variantes (protótipo):
 *  - primary   : fundo dourado, texto café escuro (ação principal)
 *  - secondary : fundo café, texto claro
 *  - outline   : transparente, borda, texto café
 * Alvo ≥ 44px, raio 14, leve "scale" ao pressionar.
 */
import { ReactNode, useMemo } from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, View } from 'react-native';
import { fonts, palette, spacing } from '@/theme/ccpTheme';
import { useTheme, type Theme } from '@/theme/useTheme';

type Variant = 'primary' | 'secondary' | 'outline';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: ReactNode;
  style?: ViewStyle;
  disabled?: boolean;
};

export default function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  style,
  disabled,
}: Props) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.inner}>
        {icon}
        <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    base: {
      height: 54,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    inner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    pressed: { transform: [{ scale: 0.98 }], opacity: 0.95 },
    disabled: { backgroundColor: t.ui.linha, borderColor: 'transparent' },

    primary: { backgroundColor: palette.douradoAmanhecer },
    secondary: { backgroundColor: palette.cafe },
    outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: t.ui.linha },

    label: { fontFamily: fonts.sansBold, fontSize: 16 },
    primaryLabel: { color: palette.cafeEscuro },
    secondaryLabel: { color: '#FAF7F2' },
    outlineLabel: { color: t.ui.texto },
  });
