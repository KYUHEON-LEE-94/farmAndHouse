/**
 * 실제 날씨 반영. Open-Meteo(무료, API 키 없음)에서 현재 날씨를 가져와 게임 효과로 바꾼다.
 * 위치는 기본 서울이고, 사용자가 원하면 브라우저 위치를 쓴다.
 */
export type WeatherKind = "clear" | "cloudy" | "fog" | "rain" | "snow" | "storm";
export type WeatherState = { kind: WeatherKind; temp: number; place: string; fetchedAt: number };
export type WeatherEffect = {
  icon: string; name: string; notes: string[];
  growth: number; price: number; fishRare: number; goldenChance: number; bugChance: number; autoWater: boolean;
};

export const DEFAULT_PLACE = { name: "서울", lat: 37.5665, lon: 126.978 };
export const WEATHER_REFRESH_MINUTES = 30;

/** WMO 날씨 코드 → 게임 날씨. */
export function kindFromCode(code: number): WeatherKind {
  if (code >= 95) return "storm";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if (code === 45 || code === 48) return "fog";
  if (code === 3 || code === 2) return "cloudy";
  return "clear";
}

export async function fetchWeather(lat: number, lon: number, place: string): Promise<WeatherState> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&current=temperature_2m,weather_code&timezone=auto`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`weather ${response.status}`);
  const data = await response.json();
  return { kind: kindFromCode(data.current.weather_code), temp: Math.round(data.current.temperature_2m), place, fetchedAt: Date.now() };
}

/**
 * 날씨·기온별 게임 효과(곱해지는 배수).
 * growth: 성장 시간(낮을수록 빠름), price: 작물 판매가, fishRare: 희귀 물고기, goldenChance: 황금 작물 확률, bugChance: 벌레 출현 배수.
 */
export function weatherEffect(state: WeatherState | null): WeatherEffect {
  const base: WeatherEffect = { icon: "🌤️", name: "날씨 정보 없음", notes: [], growth: 1, price: 1, fishRare: 1, goldenChance: 0.02, bugChance: 1, autoWater: false };
  if (!state) return base;
  const effect: WeatherEffect = { ...base, notes: [] };
  switch (state.kind) {
    case "clear": Object.assign(effect, { icon: "☀️", name: "맑음", growth: 0.95, goldenChance: 0.06 }); effect.notes.push("성장 −5%", "황금 작물 확률 6%"); break;
    case "cloudy": Object.assign(effect, { icon: "☁️", name: "흐림", fishRare: 1.15 }); effect.notes.push("희귀 물고기 ×1.15"); break;
    case "fog": Object.assign(effect, { icon: "🌫️", name: "안개", fishRare: 1.3, bugChance: 0.7 }); effect.notes.push("희귀 물고기 ×1.3", "벌레 −30%"); break;
    case "rain": Object.assign(effect, { icon: "🌧️", name: "비", fishRare: 1.3, autoWater: true, price: 0.95, bugChance: 0.5 }); effect.notes.push("목마른 밭에 자동으로 물", "희귀 물고기 ×1.3", "벌레 −50%", "판매가 −5%"); break;
    case "snow": Object.assign(effect, { icon: "🌨️", name: "눈", growth: 1.1, price: 1.1, fishRare: 1.2 }); effect.notes.push("성장 +10%(느림)", "판매가 +10%", "희귀 물고기 ×1.2"); break;
    case "storm": Object.assign(effect, { icon: "⛈️", name: "천둥번개", fishRare: 1.6, bugChance: 0, growth: 1.05 }); effect.notes.push("벌레 없음", "희귀 물고기 ×1.6", "성장 +5%(느림)"); break;
  }
  if (state.temp >= 30) { effect.growth *= 1.1; effect.price *= 1.05; effect.notes.push("폭염: 성장 +10%(느림) · 판매가 +5%"); }
  if (state.temp <= -5) { effect.growth *= 1.15; effect.price *= 1.08; effect.notes.push("한파: 성장 +15%(느림) · 판매가 +8%"); }
  return effect;
}
