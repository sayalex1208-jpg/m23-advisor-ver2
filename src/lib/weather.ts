// Weather for the farm, from Open-Meteo (free, no key, non-commercial use).
// The phone asks Open-Meteo directly. Only a rounded location (~1 km) is sent;
// the exact spot stays on the phone. The last forecast is kept so the card
// still shows something without signal.

import { useCallback, useEffect, useState } from "react";

export type FarmLocation = {
  lat: number;
  lon: number;
  accuracy: number | null; // metres, from GPS; null for a chosen province
  label: string | null; // province name when picked from the list
  capturedAt: string;
};

export type Forecast = {
  fetchedAt: string;
  current: { temp: number; humidity: number; code: number; wind: number };
  days: {
    date: string;
    code: number;
    max: number;
    min: number;
    rainMm: number;
    rainChance: number;
    minHumidity: number;
  }[];
  // Dawn (4-8 am) per day: what acid dew depends on.
  dawns: { date: string; maxHumidity: number; southWind: boolean }[];
};

// Main cashew provinces, by their provincial town (for farmers who don't share GPS).
export const PROVINCES: { km: string; en: string; lat: number; lon: number }[] = [
  { km: "បន្ទាយស្រី សៀមរាប", en: "Banteay Srey, Siem Reap", lat: 13.6, lon: 103.96 },
  { km: "កំពង់ធំ", en: "Kampong Thom", lat: 12.71, lon: 104.89 },
  { km: "ព្រះវិហារ", en: "Preah Vihear", lat: 13.81, lon: 104.98 },
  { km: "ឧត្ដរមានជ័យ", en: "Oddar Meanchey", lat: 14.18, lon: 103.52 },
  { km: "រតនគិរី", en: "Ratanakiri", lat: 13.74, lon: 106.99 },
  { km: "ក្រចេះ", en: "Kratie", lat: 12.49, lon: 106.02 },
  { km: "ស្ទឹងត្រែង", en: "Stung Treng", lat: 13.53, lon: 105.97 },
  { km: "មណ្ឌលគិរី", en: "Mondulkiri", lat: 12.45, lon: 107.2 },
  { km: "កំពង់ចាម", en: "Kampong Cham", lat: 12.0, lon: 105.46 },
  { km: "ត្បូងឃ្មុំ", en: "Tbong Khmum", lat: 11.91, lon: 105.65 },
  { km: "បន្ទាយមានជ័យ", en: "Banteay Meanchey", lat: 13.59, lon: 102.97 },
  { km: "បាត់ដំបង", en: "Battambang", lat: 13.1, lon: 103.2 },
  { km: "ប៉ៃលិន", en: "Pailin", lat: 12.85, lon: 102.61 },
  { km: "កំពង់ស្ពឺ", en: "Kampong Speu", lat: 11.45, lon: 104.52 },
];

const CACHE_KEY = "m23.weather";
const FRESH_MS = 60 * 60 * 1000;
const round = (n: number) => Math.round(n * 100) / 100;

async function fetchForecast(lat: number, lon: number): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: String(round(lat)),
    longitude: String(round(lon)),
    current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
    hourly: "relative_humidity_2m,wind_direction_10m",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,relative_humidity_2m_min",
    timezone: "Asia/Phnom_Penh",
    forecast_days: "5",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Weather service error ${res.status}`);
  const d = await res.json();

  const days: Forecast["days"] = d.daily.time.map((date: string, i: number) => ({
    date,
    code: d.daily.weather_code[i],
    max: d.daily.temperature_2m_max[i],
    min: d.daily.temperature_2m_min[i],
    rainMm: d.daily.precipitation_sum[i] ?? 0,
    rainChance: d.daily.precipitation_probability_max[i] ?? 0,
    minHumidity: d.daily.relative_humidity_2m_min[i],
  }));

  const dawns: Forecast["dawns"] = days.map(({ date }) => {
    const hours = (d.hourly.time as string[])
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => t.startsWith(date) && +t.slice(11, 13) >= 4 && +t.slice(11, 13) <= 8);
    const humidities = hours.map(({ i }) => d.hourly.relative_humidity_2m[i] as number);
    // Wind blowing FROM the south: direction between south-east and south-west.
    const southWind = hours.some(({ i }) => {
      const dir = d.hourly.wind_direction_10m[i] as number;
      return dir >= 135 && dir <= 225;
    });
    return { date, maxHumidity: Math.max(...humidities), southWind };
  });

  return {
    fetchedAt: new Date().toISOString(),
    current: {
      temp: d.current.temperature_2m,
      humidity: d.current.relative_humidity_2m,
      code: d.current.weather_code,
      wind: d.current.wind_speed_10m,
    },
    days,
    dawns,
  };
}

type Cached = { key: string; forecast: Forecast };

function readCache(key: string): Forecast | null {
  try {
    const c: Cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null");
    return c && c.key === key ? c.forecast : null;
  } catch {
    return null;
  }
}

export function useWeather(location: FarmLocation | null) {
  const key = location ? `${round(location.lat)},${round(location.lon)}` : null;
  const [forecast, setForecast] = useState<Forecast | null>(() => (key ? readCache(key) : null));
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  const load = useCallback(
    async (force: boolean) => {
      if (!location || !key) return;
      const cached = readCache(key);
      if (cached) setForecast(cached);
      if (!force && cached && Date.now() - Date.parse(cached.fetchedAt) < FRESH_MS) return;
      setState("loading");
      try {
        const fresh = await fetchForecast(location.lat, location.lon);
        setForecast(fresh);
        setState("idle");
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ key, forecast: fresh } satisfies Cached));
        } catch {
          // Not cached; shown for this visit only.
        }
      } catch {
        setState("error");
      }
    },
    [key, location],
  );

  useEffect(() => {
    if (!key) setForecast(null);
    load(false);
  }, [key, load]);

  return { forecast, state, refresh: () => load(true) };
}

// WMO weather codes, as Open-Meteo reports them.
export type Sky = "clear" | "cloudy" | "fog" | "rain" | "storm";
export function skyFor(code: number): { sky: Sky; km: string; en: string } {
  if (code <= 1) return { sky: "clear", km: "មេឃស្រឡះ", en: "Clear" };
  if (code <= 3) return { sky: "cloudy", km: "មានពពក", en: "Cloudy" };
  if (code === 45 || code === 48) return { sky: "fog", km: "អ័ព្ទ", en: "Fog" };
  if (code >= 95) return { sky: "storm", km: "ផ្គររន្ទះ", en: "Thunderstorm" };
  if (code >= 51 && code <= 57) return { sky: "rain", km: "ភ្លៀងរលឹម", en: "Drizzle" };
  return { sky: "rain", km: "ភ្លៀង", en: "Rain" };
}
