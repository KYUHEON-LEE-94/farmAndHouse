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
/** 물뿌리개 한 통으로 물을 줄 수 있는 횟수. 우물에서 무료로 다시 채운다. */
export const CAN_CAPACITY = 5;
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
