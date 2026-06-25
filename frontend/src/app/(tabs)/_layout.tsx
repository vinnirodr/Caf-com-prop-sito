import { Tabs } from 'expo-router';
import TabBar from '@/components/TabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="biblioteca" options={{ title: 'Biblioteca' }} />
      <Tabs.Screen name="meu-espaco" options={{ title: 'Meu Espaço' }} />
    </Tabs>
  );
}
