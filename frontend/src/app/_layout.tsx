import { useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Lora_400Regular,
  Lora_500Medium,
  Lora_600SemiBold,
  Lora_700Bold,
} from '@expo-google-fonts/lora';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { useTheme } from '@/theme/useTheme';
import { AuthProvider } from '@/auth/AuthContext';
import { EngagementProvider } from '@/engagement/EngagementContext';
import { AudioProvider } from '@/audio/AudioContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const t = useTheme();
  const scheme = useColorScheme();
  const [loaded] = useFonts({
    Lora_400Regular,
    Lora_500Medium,
    Lora_600SemiBold,
    Lora_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      contentStyle: { backgroundColor: t.ui.fundo },
    }),
    [t.ui.fundo]
  );

  if (!loaded) return null;

  return (
    <AuthProvider>
      <EngagementProvider>
        <AudioProvider>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <Stack initialRouteName="splash" screenOptions={screenOptions}>
            <Stack.Screen name="splash" options={{ animation: 'fade' }} />
            <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="capitulo/[numero]" />
            <Stack.Screen name="anotacoes" />
            <Stack.Screen name="favoritos" />
            <Stack.Screen name="player" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="premium" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          </Stack>
        </AudioProvider>
      </EngagementProvider>
    </AuthProvider>
  );
}
