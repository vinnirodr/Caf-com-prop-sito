import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '@/theme/ccpTheme';
import { useTheme } from '@/theme/useTheme';

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.palette.douradoAmanhecer,
        tabBarInactiveTintColor: t.ui.textoSuave,
        tabBarStyle: {
          backgroundColor: t.ui.superficie,
          borderTopColor: t.ui.linha,
          height: 66,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontFamily: fonts.sansMedium, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="biblioteca"
        options={{
          title: 'Biblioteca',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="meu-espaco"
        options={{
          title: 'Meu Espaço',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
