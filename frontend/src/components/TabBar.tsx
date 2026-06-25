/**
 * Tab bar customizada — card branco flutuante arredondado com sombra quente,
 * item ativo em dourado (fiel ao protótipo). Usada via prop `tabBar` do <Tabs>.
 */
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { useMemo } from 'react';
import { fonts, radius, spacing } from '@/theme/ccpTheme';
import { useTheme, type Theme } from '@/theme/useTheme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<string, { on: IconName; off: IconName }> = {
  index: { on: 'home', off: 'home-outline' },
  biblioteca: { on: 'library', off: 'library-outline' },
  'meu-espaco': { on: 'person', off: 'person-outline' },
};

export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(t), [t]);

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = (options.title ?? route.name) as string;
          const focused = state.index === index;
          const icon = ICONS[route.name] ?? { on: 'ellipse', off: 'ellipse-outline' };
          const color = focused ? t.palette.douradoAmanhecer : t.ui.textoSuave;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.item}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={label}
            >
              <Ionicons name={focused ? icon.on : icon.off} size={23} color={color} />
              <Text style={[styles.label, { color, fontFamily: focused ? fonts.sansBold : fonts.sansMedium }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    wrap: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      backgroundColor: 'transparent',
    },
    bar: {
      flexDirection: 'row',
      backgroundColor: t.ui.superficie,
      borderWidth: 1,
      borderColor: t.ui.linha,
      borderRadius: radius.lg,
      paddingVertical: 10,
      paddingHorizontal: spacing.sm,
      ...t.elevation.level2,
    },
    item: { flex: 1, alignItems: 'center', gap: 4 },
    label: { fontSize: 11 },
  });
