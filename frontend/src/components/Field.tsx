/**
 * Campo de formulário do design system: rótulo + input com borda, ícone
 * opcional à esquerda e olho para senha. Mostra erro abaixo quando houver.
 */
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, palette, spacing } from '@/theme/ccpTheme';
import { useTheme } from '@/theme/useTheme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type Props = TextInputProps & {
  label: string;
  icon?: IconName;
  secure?: boolean;
  error?: string;
};

export default function Field({ label, icon, secure, error, style, ...rest }: Props) {
  const t = useTheme();
  const [hidden, setHidden] = useState(!!secure);
  const [focused, setFocused] = useState(false);

  return (
    <View style={style}>
      <Text style={[s.label, { color: palette.cafeEscuro }]}>{label}</Text>
      <View
        style={[
          s.box,
          { backgroundColor: t.ui.superficie, borderColor: error ? palette.erro : focused ? palette.douradoAmanhecer : t.ui.linha },
          focused && !error && s.boxFocus,
        ]}
      >
        {icon && <Ionicons name={icon} size={18} color={palette.salvia} />}
        <TextInput
          style={[s.input, { color: t.ui.texto }]}
          placeholderTextColor={t.ui.textoSuave}
          secureTextEntry={hidden}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
        {secure && (
          <Pressable onPress={() => setHidden((v) => !v)} hitSlop={8} accessibilityLabel={hidden ? 'Mostrar senha' : 'Ocultar senha'}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={18} color={palette.salvia} />
          </Pressable>
        )}
      </View>
      {!!error && <Text style={s.error}>{error}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  label: { fontFamily: fonts.sansBold, fontSize: 12.5, marginBottom: 6 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  boxFocus: {
    shadowColor: palette.douradoAmanhecer,
    shadowOpacity: 0.16,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  input: { flex: 1, fontFamily: fonts.sans, fontSize: 15, padding: 0 },
  error: { fontFamily: fonts.sans, fontSize: 12, color: palette.erro, marginTop: 5 },
});
