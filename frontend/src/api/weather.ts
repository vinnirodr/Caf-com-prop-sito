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
  /** Cidade e estado do usuário, já formatados (ex.: "Curitiba, PR"). */
  local?: string;
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

// Nome do estado → sigla (UF). O reverse geocode costuma devolver o nome por
// extenso no Android; deixamos o chip curto.
const UF: Record<string, string> = {
  acre: 'AC', alagoas: 'AL', amapá: 'AP', amazonas: 'AM', bahia: 'BA',
  ceará: 'CE', 'distrito federal': 'DF', 'espírito santo': 'ES', goiás: 'GO',
  maranhão: 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS',
  'minas gerais': 'MG', pará: 'PA', paraíba: 'PB', paraná: 'PR',
  pernambuco: 'PE', piauí: 'PI', 'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN', 'rio grande do sul': 'RS', rondônia: 'RO',
  roraima: 'RR', 'santa catarina': 'SC', 'são paulo': 'SP', sergipe: 'SE',
  tocantins: 'TO',
};

function siglaEstado(regiao?: string | null): string | undefined {
  if (!regiao) return undefined;
  const limpo = regiao.trim();
  if (/^[A-Za-z]{2}$/.test(limpo)) return limpo.toUpperCase(); // já é sigla
  return UF[limpo.toLowerCase()] ?? limpo;
}

/** Descobre "Cidade, UF" a partir das coordenadas. Falha vira undefined. */
async function descobrirLocal(latitude: number, longitude: number): Promise<string | undefined> {
  try {
    const [addr] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (!addr) return undefined;
    const cidade = addr.city ?? addr.subregion ?? addr.district ?? undefined;
    const uf = siglaEstado(addr.region);
    if (cidade && uf) return `${cidade}, ${uf}`;
    return cidade ?? uf;
  } catch {
    return undefined;
  }
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

    const local = await descobrirLocal(latitude, longitude);
    return { tempC: Math.round(temp), icon: iconForCode(code), local };
  } catch {
    return null;
  }
}
