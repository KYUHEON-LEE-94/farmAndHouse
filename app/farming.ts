import type { Season } from "./fishing";

export type Crop = { id: string; name: string; icon: string; seasons: Season[]; seed: number; sell: number; seconds: number; difficulty: string };
/** water: 물 준 시각들, fert: 준 거름 id. growSeconds는 심을 때(버프·거름 반영) 정해진 성장 시간. */
/** bug: 지금 앉아 있는 벌레가 날아온 시각, bugHits: 놓친 벌레 수(마리당 판매가 -10%). */
export type Plot = { cropId: string; plantedAt: number; growSeconds?: number; water?: number[]; fert?: string; bug?: number; bugHits?: number } | null;
export type Fertilizer = { id: string; name: string; icon: string; price: number; speed: number; quality: number; note: string };
export type Quality = { id: "normal" | "good" | "best"; name: string; stars: string; multiplier: number };

export const CROPS: Crop[] = [
  { id: "strawberry", name: "딸기", icon: "🍓", seasons: ["봄"], seed: 60, sell: 160, seconds: 36, difficulty: "보통" },
  { id: "potato", name: "감자", icon: "🥔", seasons: ["봄"], seed: 35, sell: 85, seconds: 24, difficulty: "쉬움" },
  { id: "cabbage", name: "양배추", icon: "🥬", seasons: ["봄", "가을"], seed: 45, sell: 120, seconds: 32, difficulty: "보통" },
  { id: "tomato", name: "토마토", icon: "🍅", seasons: ["여름"], seed: 55, sell: 145, seconds: 32, difficulty: "보통" },
  { id: "corn", name: "옥수수", icon: "🌽", seasons: ["여름"], seed: 70, sell: 200, seconds: 44, difficulty: "어려움" },
  { id: "watermelon", name: "수박", icon: "🍉", seasons: ["여름"], seed: 110, sell: 320, seconds: 54, difficulty: "어려움" },
  { id: "sweetpotato", name: "고구마", icon: "🍠", seasons: ["가을"], seed: 65, sell: 180, seconds: 40, difficulty: "보통" },
  { id: "pumpkin", name: "호박", icon: "🎃", seasons: ["가을"], seed: 95, sell: 280, seconds: 50, difficulty: "어려움" },
  { id: "radish", name: "무", icon: "🥕", seasons: ["가을", "겨울"], seed: 40, sell: 95, seconds: 26, difficulty: "쉬움" },
  { id: "spinach", name: "시금치", icon: "🌿", seasons: ["겨울"], seed: 30, sell: 80, seconds: 20, difficulty: "쉬움" },
  { id: "greenonion", name: "대파", icon: "🧅", seasons: ["겨울"], seed: 50, sell: 130, seconds: 36, difficulty: "보통" },
  { id: "tangerine", name: "감귤", icon: "🍊", seasons: ["겨울"], seed: 120, sell: 360, seconds: 58, difficulty: "어려움" },
];

export const FERTILIZERS: Fertilizer[] = [
  { id: "compost", name: "퇴비", icon: "🍂", price: 15, speed: 0.15, quality: 0, note: "남은 성장 시간 -15%" },
  { id: "premium", name: "고급 비료", icon: "🧪", price: 50, speed: 0.25, quality: 1, note: "남은 시간 -25% · 품질 +1" },
  { id: "golden", name: "황금 비료", icon: "🌟", price: 120, speed: 0.3, quality: 2, note: "남은 시간 -30% · 품질 +2" },
];

export const QUALITIES: Quality[] = [
  { id: "normal", name: "보통", stars: "", multiplier: 1 },
  { id: "good", name: "좋음", stars: "★", multiplier: 1.25 },
  { id: "best", name: "최상", stars: "★★", multiplier: 1.6 },
];

/** 성장 시간이 40초 이상이면 물 줄 시점이 3번, 아니면 2번. */
export const waterCheckpoints = (growSeconds: number) => (growSeconds >= 40 ? 3 : 2);

/** 벌레가 앉아 있는 시간(초)과, 놓칠 때마다 깎이는 판매가 비율. */
/** 기본 물뿌리개 용량. 우물에서 무료로 다시 채운다. */
export const CAN_CAPACITY = 5;

/** 물뿌리개: capacity는 한 통 물양, w×h는 한 번 부을 때 물이 들어가는 밭 범위(가로×세로). 한 번 부을 때 물 1을 쓴다. */
export type WateringCan = { id: string; name: string; icon: string; price: number; capacity: number; w: number; h: number; note: string };
export const CANS: WateringCan[] = [
  { id: "tin", name: "양철 물뿌리개", icon: "🪣", price: 0, capacity: CAN_CAPACITY, w: 1, h: 1, note: "1칸 · 물 5" },
  { id: "copper", name: "구리 물뿌리개", icon: "🟠", price: 1500, capacity: 8, w: 2, h: 1, note: "가로 2칸 · 물 8" },
  { id: "steel", name: "강철 물뿌리개", icon: "⚙️", price: 4000, capacity: 12, w: 4, h: 1, note: "가로 4칸 · 물 12" },
  { id: "gold", name: "황금 물뿌리개", icon: "🌟", price: 10000, capacity: 18, w: 4, h: 2, note: "4×2칸 · 물 18" },
];

/** 밭 격자(columns열)에서 index를 기준으로 w×h 범위의 밭 번호들. 가장자리에서는 안쪽으로 밀어 넣는다. */
export function canArea(index: number, columns: number, total: number, can: WateringCan) {
  // 좁은 화면(2열)에서는 가로 범위를 열 수에 맞게 줄이고, 줄어든 만큼 세로로 늘려 같은 칸 수를 유지한다.
  const w = Math.min(can.w, columns), h = Math.min(Math.ceil(total / columns), can.h * Math.ceil(can.w / w));
  const rows = Math.ceil(total / columns), col = index % columns, row = Math.floor(index / columns);
  const c0 = Math.max(0, Math.min(col, columns - w)), r0 = Math.max(0, Math.min(row, rows - h));
  const area: number[] = [];
  for (let r = r0; r < r0 + h; r++) for (let c = c0; c < c0 + w; c++) { const i = r * columns + c; if (i < total) area.push(i); }
  return area;
}
export const BUG_SECONDS = 8;
export const BUG_PENALTY = 0.1;
export const BUG_CHECK_SECONDS = 8;
export const BUG_CHANCE = 0.4;

/**
 * 밭 한 칸의 현재 상태.
 * 물 줄 시점 k는 성장 구간을 (n+1)등분한 지점이고, 그 시점부터 다음 시점(마지막은 수확 가능 시각) 전까지
 * 한 번이라도 물을 주면 그 시점은 "충족"된다. 아직 충족되지 않은 구간에 있으면 목마른 상태다.
 */
export function plotStatus(plot: NonNullable<Plot>, crop: Crop, now: number, bugPenalty = BUG_PENALTY) {
  const grow = (plot.growSeconds ?? crop.seconds) * 1000, ready = plot.plantedAt + grow;
  const progress = Math.min(100, ((now - plot.plantedAt) / grow) * 100);
  const n = waterCheckpoints(grow / 1000), water = plot.water ?? [];
  const checkpoints = Array.from({ length: n }, (_, k) => plot.plantedAt + (grow * (k + 1)) / (n + 1));
  const windows = checkpoints.map((start, k) => ({ start, end: checkpoints[k + 1] ?? ready }));
  const satisfied = windows.filter(window => water.some(time => time >= window.start && time < window.end)).length;
  const current = windows.find(window => now >= window.start && now < window.end);
  const thirsty = Boolean(current && !water.some(time => time >= current.start && time < current.end));
  const fert = FERTILIZERS.find(item => item.id === plot.fert);
  const score = (satisfied === n ? 2 : satisfied >= n - 1 ? 1 : 0) + (fert?.quality ?? 0);
  const quality = QUALITIES[score >= 4 ? 2 : score >= 2 ? 1 : 0];
  const bugMultiplier = Math.max(0.5, 1 - bugPenalty * (plot.bugHits ?? 0));
  return { progress, ready: now >= ready, thirsty, satisfied, total: n, fert, quality, bugMultiplier, remaining: Math.max(0, Math.ceil((ready - now) / 1000)) };
}

/** 자라는 중인 작물에 거름을 주면 남은 성장 시간만 줄어든다. */
export function applyFertilizer(plot: NonNullable<Plot>, crop: Crop, fertilizer: Fertilizer, now: number): NonNullable<Plot> {
  const grow = plot.growSeconds ?? crop.seconds, elapsed = (now - plot.plantedAt) / 1000;
  return { ...plot, fert: fertilizer.id, growSeconds: Math.round(elapsed + Math.max(0, grow - elapsed) * (1 - fertilizer.speed)) };
}
