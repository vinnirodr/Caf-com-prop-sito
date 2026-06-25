/**
 * Clima atual via Open-Meteo (sem chave de API). Usa a localização do
 * dispositivo (expo-location). Se a permissão for negada ou algo falhar,
 * retorna null — a UI simplesmente esconde o chip de clima.
 */
import * as Location from 'expo-location';
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type Weather = {
  tempC: number;
  icon: IoniconName;
};

/** Mapeia o código WMO da Open-Meteo para um ícone do Ionicons. */
function iconForCode(code: number): IoniconName {
  if (code === 0) return 'sunny-outline';
  if (code <= 3) return 'partly-sunny-outline';
  if (code === 45 || code === 48) return 'cloud-outline';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rainy-outline';
  if (code >= 71 && code <= 77) return 'snow-outline';
  if (code >= 95) return 'thunderstorm-outline';
  return 'cloud-outline';
}

export async function getCurrentWeather(): Promise<Weather | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
    });
    const { latitude, longitude } = pos.coords;

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}` +
      `&longitude=${longitude}&current=temperature_2m,weather_code`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      current?: { temperature_2m?: number; weather_code?: number };
    };
    const temp = data.current?.temperature_2m;
    const code = data.current?.weather_code;
    if (temp == null || code == null) return null;

    return { tempC: Math.round(temp), icon: iconForCode(code) };
  } catch {
    return null;
  }
}
