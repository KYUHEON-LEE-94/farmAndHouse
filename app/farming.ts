import type { Season } from "./fishing";

/** 작물 판매가 전체 배율. 농사 수입이 너무 빨라 0.9로 낮췄다(씨앗값은 그대로라 이익은 약 15~17% 감소). */
export const CROP_PRICE_SCALE = 0.9;

export type Crop = { id: string; name: string; icon: string; seasons: Season[]; seed: number; sell: number; seconds: number; difficulty: string; seasonalLimit?: number };
/** water: 물 준 시각들, fert: 준 거름 id. growSeconds는 심을 때(버프·거름 반영) 정해진 성장 시간. */
/** bug: 지금 앉아 있는 벌레가 날아온 시각, bugHits: 놓친 벌레 수(마리당 판매가 -10%). */
export type Plot = { cropId: string; plantedAt: number; growSeconds?: number; waterTotal?: number; water?: number[]; fert?: string; bug?: number; bugHits?: number } | null;
/** 거름은 미끼처럼 묶음(pack개)으로 사 두고, 한 칸에 1개씩 쓴다. price는 1개 값. */
/** waterSave: 이 거름을 주면 필요한 물 횟수가 그만큼 줄어든다(최소 1번). */
export type Fertilizer = { id: string; name: string; icon: string; price: number; pack: number; speed: number; quality: number; waterSave?: number; note: string };
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
  { id: "pea", name: "완두콩", icon: "🫛", seasons: ["봄"], seed: 30, sell: 75, seconds: 22, difficulty: "쉬움" },
  { id: "broccoli", name: "브로콜리", icon: "🥦", seasons: ["봄", "겨울"], seed: 50, sell: 140, seconds: 34, difficulty: "보통" },
  { id: "cherry", name: "체리", icon: "🍒", seasons: ["봄"], seed: 105, sell: 300, seconds: 52, difficulty: "어려움" },
  { id: "cucumber", name: "오이", icon: "🥒", seasons: ["여름"], seed: 30, sell: 76, seconds: 22, difficulty: "쉬움" },
  { id: "pepper", name: "고추", icon: "🌶️", seasons: ["여름"], seed: 50, sell: 140, seconds: 34, difficulty: "보통" },
  { id: "koreanmelon", name: "참외", icon: "🍈", seasons: ["여름"], seed: 65, sell: 180, seconds: 40, difficulty: "보통" },
  { id: "peach", name: "복숭아", icon: "🍑", seasons: ["여름"], seed: 115, sell: 330, seconds: 56, difficulty: "어려움" },
  { id: "peanut", name: "땅콩", icon: "🥜", seasons: ["가을"], seed: 35, sell: 85, seconds: 24, difficulty: "쉬움" },
  { id: "grape", name: "포도", icon: "🍇", seasons: ["가을"], seed: 70, sell: 190, seconds: 42, difficulty: "보통" },
  { id: "apple", name: "사과", icon: "🍎", seasons: ["가을"], seed: 110, sell: 320, seconds: 55, difficulty: "어려움" },
  { id: "pinemushroom", name: "송이버섯", icon: "🍄", seasons: ["가을"], seed: 140, sell: 380, seconds: 60, difficulty: "어려움" },
  { id: "garlic", name: "마늘", icon: "🧄", seasons: ["겨울"], seed: 35, sell: 86, seconds: 24, difficulty: "쉬움" },
  { id: "ginger", name: "생강", icon: "🫚", seasons: ["겨울"], seed: 60, sell: 170, seconds: 40, difficulty: "보통" },
  { id: "lettuce", name: "상추", icon: "🥬", seasons: ["봄"], seed: 30, sell: 80, seconds: 24, difficulty: "쉬움" },
  { id: "asparagus", name: "아스파라거스", icon: "🌱", seasons: ["봄"], seed: 90, sell: 250, seconds: 48, difficulty: "어려움" },
  { id: "eggplant", name: "가지", icon: "🍆", seasons: ["여름"], seed: 50, sell: 135, seconds: 30, difficulty: "보통" },
  { id: "blueberry", name: "블루베리", icon: "🫐", seasons: ["여름"], seed: 85, sell: 230, seconds: 46, difficulty: "보통" },
  { id: "carrot", name: "당근", icon: "🥕", seasons: ["가을"], seed: 40, sell: 100, seconds: 26, difficulty: "쉬움" },
  { id: "persimmon", name: "단감", icon: "🍊", seasons: ["가을"], seed: 95, sell: 270, seconds: 50, difficulty: "어려움" },
  { id: "napa", name: "배추", icon: "🥬", seasons: ["겨울"], seed: 45, sell: 120, seconds: 30, difficulty: "쉬움" },
  { id: "leek", name: "부추", icon: "🌿", seasons: ["겨울"], seed: 35, sell: 95, seconds: 24, difficulty: "보통" },
  { id: "royal-strawberry", name: "왕딸기", icon: "🍓", seasons: ["봄"], seed: 700, sell: 1500, seconds: 180, difficulty: "어려움", seasonalLimit: 30 },
  { id: "royal-melon", name: "황실 멜론", icon: "🍈", seasons: ["여름"], seed: 850, sell: 1800, seconds: 210, difficulty: "어려움", seasonalLimit: 30 },
  { id: "royal-grape", name: "루비 포도", icon: "🍇", seasons: ["가을"], seed: 1000, sell: 2200, seconds: 240, difficulty: "어려움", seasonalLimit: 30 },
  { id: "royal-ginseng", name: "설원 인삼", icon: "🌱", seasons: ["겨울"], seed: 1300, sell: 2800, seconds: 300, difficulty: "어려움", seasonalLimit: 30 },
];

export const FERTILIZERS: Fertilizer[] = [
  { id: "compost", name: "퇴비", icon: "🍂", price: 15, pack: 10, speed: 0.15, quality: 0, note: "남은 성장 시간 -15%" },
  { id: "premium", name: "고급 비료", icon: "🧪", price: 50, pack: 10, speed: 0.25, quality: 1, note: "남은 시간 -25% · 품질 +1" },
  { id: "golden", name: "황금 비료", icon: "🌟", price: 140, pack: 5, speed: 0.3, quality: 2, waterSave: 1, note: "남은 시간 -30% · 품질 +2 · 물주기 1번 줄임" },
];

/** 처음 시작할 때(또는 예전 저장) 주는 거름. */
export const STARTER_FERT: Record<string, number> = { compost: 5 };

export const QUALITIES: Quality[] = [
  { id: "normal", name: "보통", stars: "", multiplier: 1 },
  { id: "good", name: "좋음", stars: "★", multiplier: 1.12 },
  { id: "best", name: "최상", stars: "★★", multiplier: 1.3 },
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
  { id: "long", name: "긴 물뿌리개", icon: "🪈", price: 7000, capacity: 15, w: 6, h: 1, note: "가로 6칸 · 물 15" },
  { id: "gold", name: "황금 물뿌리개", icon: "🌟", price: 10000, capacity: 18, w: 4, h: 2, note: "4×2칸 · 물 18" },
  { id: "sprinkler", name: "스프링클러", icon: "⛲", price: 20000, capacity: 24, w: 6, h: 2, note: "6×2칸 · 물 24" },
];

/** 수확 도구(맨손 상위 단계): w×h 범위의 다 자란 작물을 한 번에 수확한다. */
export type HarvestTool = { id: string; name: string; icon: string; price: number; w: number; h: number; note: string };
export const HARVEST_TOOLS: HarvestTool[] = [
  { id: "hand", name: "맨손", icon: "✋", price: 0, w: 1, h: 1, note: "1칸" },
  { id: "hoe", name: "호미", icon: "⛏️", price: 2000, w: 2, h: 1, note: "가로 2칸" },
  { id: "sickle", name: "낫", icon: "🌾", price: 6000, w: 4, h: 1, note: "가로 4칸" },
  { id: "scythe", name: "큰 낫", icon: "🪓", price: 10000, w: 6, h: 1, note: "가로 6칸" },
  { id: "rake", name: "황금 갈퀴", icon: "🔱", price: 15000, w: 4, h: 2, note: "4×2칸" },
  { id: "combine", name: "콤바인", icon: "🚜", price: 28000, w: 6, h: 2, note: "6×2칸" },
];

/** 심기 도구: w×h 범위의 빈 밭에 고른 씨앗을 한 번에 심는다(씨앗값은 칸마다). */
export const PLANT_TOOLS: HarvestTool[] = [
  { id: "seedhand", name: "손 심기", icon: "🫘", price: 0, w: 1, h: 1, note: "1칸" },
  { id: "trowel", name: "모종삽", icon: "🥄", price: 1500, w: 2, h: 1, note: "가로 2칸" },
  { id: "seeder", name: "씨앗 파종기", icon: "🧺", price: 5000, w: 4, h: 1, note: "가로 4칸" },
  { id: "rowseeder", name: "줄 파종기", icon: "🛞", price: 9000, w: 6, h: 1, note: "가로 6칸" },
  { id: "tractor", name: "꼬마 트랙터", icon: "🚜", price: 14000, w: 4, h: 2, note: "4×2칸" },
  { id: "bigtractor", name: "대형 트랙터", icon: "🚛", price: 25000, w: 6, h: 2, note: "6×2칸" },
];

/** 거름 뿌리개: w×h 범위의 자라는 작물에 고른 거름을 한 번에 준다(거름값은 칸마다). */
export const SPREADERS: HarvestTool[] = [
  { id: "pinch", name: "한 줌 뿌리기", icon: "🤏", price: 0, w: 1, h: 1, note: "1칸" },
  { id: "jar", name: "거름 바가지", icon: "🫙", price: 2000, w: 2, h: 1, note: "가로 2칸" },
  { id: "cart", name: "비료 수레", icon: "🛒", price: 6000, w: 4, h: 1, note: "가로 4칸" },
  { id: "longcart", name: "긴 비료 수레", icon: "🚃", price: 9000, w: 6, h: 1, note: "가로 6칸" },
  { id: "drone", name: "살포 드론", icon: "🚁", price: 15000, w: 4, h: 2, note: "4×2칸" },
  { id: "bigdrone", name: "대형 살포 드론", icon: "🛸", price: 26000, w: 6, h: 2, note: "6×2칸" },
];

/** 밭은 8칸에서 시작해 2칸씩 최대 36칸(6열 × 6줄)까지 넓힌다. 도구 범위(1·2·4·6·4×2·6×2)는 이 열 수에 맞춘다. */
export const START_PLOTS = 8;
export const MAX_PLOTS = 36;
export function fieldPrice(owned: number) { return 2400 + (owned - START_PLOTS) * 700; }
/** 밭 칸 수에 따른 열 수(넓은 화면 기준): 16칸까지 4열, 그 이상은 한 줄 6칸. */
export function fieldColumns(total: number) { return total <= 16 ? 4 : 6; }

/** 밭 격자(columns열)에서 index를 기준으로 w×h 범위의 밭 번호들. 가장자리에서는 안쪽으로 밀어 넣는다. */
export function canArea(index: number, columns: number, total: number, can: { w: number; h: number }) {
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
  // 물 줄 횟수는 작물 고유 성장 시간으로 고정한다(비료·버프로 시간이 줄어도 3칸→2칸으로 바뀌지 않게).
  const n = plot.waterTotal ?? waterCheckpoints(crop.seconds), water = plot.water ?? [];
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
  const nextGrow = Math.max(elapsed, elapsed + Math.max(0, grow - elapsed) * (1 - fertilizer.speed));
  // 성장 구간이 짧아지면 이미 준 물도 같은 진행률 위치로 옮긴다.
  // 덕분에 비료를 준 순간 물주기 판정이 사라지거나 다음 물칸이 건너뛰지 않는다.
  const ratio = grow > 0 ? nextGrow / grow : 1;
  const water = (plot.water ?? []).map(time => plot.plantedAt + (time - plot.plantedAt) * ratio);
  const fertilized = { ...plot, fert: fertilizer.id, water, growSeconds: Math.round(nextGrow) };
  if (!fertilizer.waterSave) return fertilized;
  // 황금 비료: 필요한 물 횟수를 줄인다(최소 1번). 이미 준 물 횟수는 그대로 인정해 새 칸의 앞쪽부터 채운다.
  const n = plot.waterTotal ?? waterCheckpoints(crop.seconds), nextN = Math.max(1, n - fertilizer.waterSave);
  if (nextN === n) return fertilized;
  const done = Math.min(nextN, plotStatus(fertilized, crop, now).satisfied), growMs = fertilized.growSeconds * 1000;
  const marks = Array.from({ length: done }, (_, k) => plot.plantedAt + (growMs * (k + 1)) / (nextN + 1) + 1);
  return { ...fertilized, waterTotal: nextN, water: marks };
}

/** 계절이 바뀌기 5분 전에 보여 줄 비유 문구. 다음 계절 기준(직접 "곧 여름"이라고 말하지 않는다). */
export const SEASON_WARN_SECONDS = 300;
export const SEASON_OMENS: Record<"여름" | "가을" | "겨울", string[]> = {
  여름: ["햇살이 점점 따가워지는 것 같아요… 🌞", "어디선가 매미 소리가 들릴 듯 말 듯해요.", "바람이 미지근해졌어요. 그늘이 반가워지네요."],
  가을: ["바람 끝이 선선해졌어요. 🍂", "하늘이 부쩍 높아 보여요. 잠자리가 한 마리 지나가요.", "나뭇잎 끝이 살짝 물들기 시작했어요."],
  겨울: ["입김이 하얗게 나오기 시작했어요. ❄️", "나뭇가지가 앙상해졌어요. 손끝이 시려요.", "아침 공기가 차갑게 코끝을 스쳐요."],
};
/** 오늘 날짜로 문구 하나를 고른다(하루 동안은 같은 문구). */
export function seasonOmen(next: "여름" | "가을" | "겨울", date = new Date()) {
  const list = SEASON_OMENS[next];
  return list[date.getDate() % list.length];
}

/**
 * 농산물 창고: 저장 키는 작물 × 품질(× 황금)이지만, 용량은 **총 보관 수량**으로 센다(여러 작물을 모아도 불리하지 않게).
 * 기본 100개, 넓힐 때마다 +50개, 최대 400개. 보관 중인 작물은 썩지 않는다. 벌레 피해가 있던 작물은 품질 한 단계 낮춰 보관한다.
 */
export const STORAGE_START = 100;
export const STORAGE_STEP = 50;
export const STORAGE_MAX = 400;
export function storagePrice(capacity: number) { return 3000 + ((capacity - STORAGE_START) / STORAGE_STEP) * 2000; }
/** 예전 저장(묶음 칸 20~60)을 수량 용량으로 옮긴다: 20칸 → 100개, 칸 10개마다 +50개. */
export function migrateStorageSlots(slots: number) { return Math.min(STORAGE_MAX, STORAGE_START + Math.max(0, Math.round((slots - 20) / 10)) * STORAGE_STEP); }
export function produceKey(cropId: string, quality: number, golden: boolean) { return `${cropId}|${quality}|${golden ? 1 : 0}`; }
export function parseProduceKey(key: string) {
  const [cropId, quality, golden] = key.split("|");
  return { cropId, quality: Math.max(0, Math.min(QUALITIES.length - 1, Number(quality) || 0)), golden: golden === "1" };
}
/** 수확한 작물을 보관할 때의 품질 단계(벌레 피해가 있으면 한 단계 낮춤). */
export function storedQuality(qualityId: string, bugMultiplier: number) {
  const index = Math.max(0, QUALITIES.findIndex(quality => quality.id === qualityId));
  return bugMultiplier < 1 ? Math.max(0, index - 1) : index;
}

/**
 * 시장 포화: 같은 작물을 팔수록 그 작물 시세가 잠깐 내려가고(1개당 -2%, 최대 -40%),
 * 1분에 2%씩 회복한다. 한 작물만 심는 것보다 여러 작물을 섞는 쪽이 유리해진다.
 * 압력(pressure)은 "최근에 판 개수"이며 1분에 1씩 줄어든다.
 */
export const SATURATION_PER_UNIT = 0.02;
export const SATURATION_MAX = 0.4;
export const SATURATION_RECOVER_PER_MIN = 1;
export type MarketPressure = Record<string, { p: number; at: number }>;
export function pressureNow(entry: { p: number; at: number } | undefined, now: number) {
  return entry ? Math.max(0, entry.p - ((now - entry.at) / 60000) * SATURATION_RECOVER_PER_MIN) : 0;
}
export function saturationFactor(pressure: number) { return 1 - Math.min(SATURATION_MAX, pressure * SATURATION_PER_UNIT); }
/** 지금 압력 p에서 n개를 연달아 팔 때, 개당 값 unit의 합계(1개 팔 때마다 값이 내려간다). */
export function saturatedTotal(unit: number, pressure: number, count: number) {
  let total = 0;
  for (let k = 0; k < count; k++) total += unit * saturationFactor(pressure + k);
  return Math.round(total);
}

/** 작물 도감: 계절 작물을 모두 한 번씩 수확하면 받는 마당 장식. */
export const CROP_BOOK_REWARDS: Record<Season, string> = { 봄: "blossomscarecrow", 여름: "melonparasol", 가을: "goldenstraw", 겨울: "tangerinestove" };
export type CropRecord = { n: number; best: number; golden: number; top: number };

function cycleRoll(crop: Crop, bucket: number, salt: number) {
  let hash = bucket * 374761393 + salt * 668265263;
  for (const char of crop.id) hash = Math.imul(hash ^ char.charCodeAt(0), 1274126177);
  hash = Math.imul(hash ^ (hash >>> 13), 2246822519);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967295;
}

/**
 * 5분 시세: 재배 시간과 가격을 연결한다(비싸면서 빨리 자라는 작물이 나오지 않게).
 * 초당 목표 순이익(난이도별) × 재배 시간 = 순이익, 씨앗값은 판매가의 45~60%(어려울수록 싸다).
 * 순이익은 시세마다 ±25% 흔들려서 5분마다 더 좋은 작물을 고르는 재미는 남긴다.
 */
const PROFIT_PER_SEC: Record<string, number> = { 쉬움: 1.8, 보통: 1.9, 어려움: 2.1 };
const SEED_RATIO: Record<string, number> = { 쉬움: 0.575, 보통: 0.525, 어려움: 0.475 };
export function cycleCrop(crop: Crop, bucket: number) {
  if (crop.seasonalLimit) return { price: Math.round(crop.sell * (0.9 + cycleRoll(crop, bucket, 17) * 0.2)), seconds: crop.seconds, seed: crop.seed };
  const seconds = Math.round(20 + cycleRoll(crop, bucket, 41) * 45);
  const profit = seconds * (PROFIT_PER_SEC[crop.difficulty] ?? 1.9) * (0.75 + cycleRoll(crop, bucket, 17) * 0.5);
  const ratio = (SEED_RATIO[crop.difficulty] ?? 0.525) - 0.025 + cycleRoll(crop, bucket, 73) * 0.05;
  const price = Math.round(profit / (1 - ratio));
  return { price, seconds, seed: Math.max(10, Math.round(price * ratio)) };
}


/** Each crop belongs to exactly one limited season per local game day.
 * Keeping all four counters prevents changing operating hours from restoring a spent allowance. */
export type PlantingLedger = { date: string; counts: Record<string, number> };
export function restorePlantingLedger(value: unknown): PlantingLedger {
  const empty: PlantingLedger = { date: '', counts: {} };
  if (!value || typeof value !== 'object') return empty;
  const data = value as Partial<PlantingLedger>;
  if (typeof data.date !== 'string' || !data.counts || typeof data.counts !== 'object') return empty;
  const counts: Record<string, number> = {};
  for (const crop of CROPS) {
    const n = data.counts[crop.id];
    if (crop.seasonalLimit && typeof n === 'number' && Number.isFinite(n)) counts[crop.id] = Math.min(crop.seasonalLimit, Math.max(0, Math.floor(n)));
  }
  return { date: data.date, counts };
}
export function plantingAllowance(crop: Crop, ledger: PlantingLedger, date: string) {
  if (!crop.seasonalLimit) return Infinity;
  return Math.max(0, crop.seasonalLimit - (ledger.date === date ? ledger.counts[crop.id] ?? 0 : 0));
}
export function reservePlanting(crop: Crop, ledger: PlantingLedger, date: string, requested: number) {
  const count = Math.min(Math.max(0, Math.floor(requested)), plantingAllowance(crop, ledger, date));
  if (!crop.seasonalLimit || !count) return { count, ledger };
  const counts = ledger.date === date ? ledger.counts : {};
  return { count, ledger: { date, counts: { ...counts, [crop.id]: (counts[crop.id] ?? 0) + count } } };
}
