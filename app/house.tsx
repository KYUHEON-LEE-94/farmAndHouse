import { petAbility } from "./pets";
import type { ReactNode } from "react";

export type FurnitureKind = "floor" | "rug" | "wall";
export type ShopGroup = "furniture" | "decor" | "structure" | "yard" | "pet" | "gacha";
/** size는 [가로, 높이, 깊이] 미터. 벽 부착 가구는 mount 높이(바닥에서 중심까지)에 걸린다. */
export type Furniture = { id: string; name: string; icon: string; price: number; color: string; kind: FurnitureKind; group: ShopGroup; size: [number, number, number]; mount?: number; fixedMount?: boolean; yard?: boolean; pet?: boolean; reward?: boolean; rare?: boolean; legend?: boolean; tier?: "junk" | "common" | "rare" | "legend" };
/** 바닥 가구는 x·z(방 중심 기준 미터)와 rot(도), 벽 가구는 wall(벽 번호)·u(벽 위치 0~1)·h(높이 m). story는 층(0=1층, 1=2층), 마당 소품은 층이 없다. */
/** host·side: 가벽(partition/arch)에 붙은 벽 장식이면 그 가벽 id와 붙은 면(1 앞, -1 뒤). */
export type PlacedItem = Furniture & { instanceId: string; x: number; z: number; rot: number; tint?: string; wall?: number; u?: number; h?: number; story?: number; host?: string; side?: number; locked?: boolean; nickname?: string; sx?: number; sz?: number };
/** 크기를 바꿀 수 있는 가구(실내 러그·카펫). sx·sz는 가로·세로 배율. */
export const isResizable = (item: Furniture) => item.kind === "rug" && !item.yard;
export const RUG_SCALE = { min: 0.5, max: 2.5, step: 0.1 };
export type Theme = { id: string; name: string; price: number; swatch: string };
export type RoomShape = "rect" | "square" | "ell";
export type Room = { points: [number, number][]; width: number; depth: number; area: number };

export const WALL_HEIGHT = 2.6;
/** 한 층의 높이(벽 + 바닥 슬래브). 2층 바닥은 이 높이에 놓인다. */
export const STORY_HEIGHT = 2.85;
export const SECOND_FLOOR_PRICE = 20000;

export const FURNITURE: Furniture[] = [
  { id: "chair", name: "원목 의자", icon: "🪑", price: 500, color: "#c98f58", kind: "floor", group: "furniture", size: [0.5, 0.95, 0.5] },
  { id: "plant", name: "몬스테라", icon: "🪴", price: 750, color: "#6f9a5a", kind: "floor", group: "furniture", size: [0.7, 1.15, 0.7] },
  { id: "lamp", name: "스탠드 조명", icon: "💡", price: 900, color: "#e9c75d", kind: "floor", group: "furniture", size: [0.45, 1.6, 0.45] },
  { id: "table", name: "원목 테이블", icon: "🪵", price: 1100, color: "#c08a57", kind: "floor", group: "furniture", size: [1.3, 0.78, 0.75] },
  { id: "bookshelf", name: "책장", icon: "📚", price: 1400, color: "#a8744a", kind: "floor", group: "furniture", size: [0.95, 1.85, 0.38] },
  { id: "sofa", name: "폭신 소파", icon: "🛋️", price: 1600, color: "#c78979", kind: "floor", group: "furniture", size: [2, 0.85, 0.9] },
  { id: "bed", name: "포근한 침대", icon: "🛏️", price: 2200, color: "#8ba5bc", kind: "floor", group: "furniture", size: [1.6, 1, 2.1] },
  { id: "piano", name: "업라이트 피아노", icon: "🎹", price: 3800, color: "#57514f", kind: "floor", group: "furniture", size: [1.5, 1.3, 0.62] },
  { id: "rug", name: "둥근 러그", icon: "🟠", price: 600, color: "#b96555", kind: "rug", group: "furniture", size: [2.2, 0.02, 1.5] },
  { id: "armchair", name: "1인 소파", icon: "💺", price: 1300, color: "#8ba5bc", kind: "floor", group: "furniture", size: [0.95, 0.9, 0.9] },
  { id: "rocker", name: "흔들의자", icon: "🪑", price: 1200, color: "#a8744a", kind: "floor", group: "furniture", size: [0.7, 1, 0.95] },
  { id: "desk", name: "월루 업무 책상", icon: "💻", price: 1500, color: "#8a6a4a", kind: "floor", group: "furniture", size: [1.3, 1.15, 0.65] },
  { id: "wardrobe", name: "원목 옷장", icon: "🚪", price: 1900, color: "#b48a62", kind: "floor", group: "furniture", size: [1.2, 2, 0.6] },
  { id: "fishtank", name: "어항", icon: "🐠", price: 1800, color: "#4f6b5c", kind: "floor", group: "furniture", size: [1.1, 1.2, 0.45] },
  { id: "fridge", name: "냉장고", icon: "🧊", price: 2000, color: "#dfe8ea", kind: "floor", group: "furniture", size: [0.75, 1.8, 0.7] },
  { id: "tvstand", name: "TV와 거실장", icon: "📺", price: 2100, color: "#5b4a3a", kind: "floor", group: "furniture", size: [1.6, 1.1, 0.45] },
  { id: "kitchen", name: "주방 조리대", icon: "🍳", price: 2400, color: "#e9e1d3", kind: "floor", group: "furniture", size: [1.8, 0.95, 0.65] },
  { id: "bathtub", name: "욕조", icon: "🛁", price: 2600, color: "#f4f6f6", kind: "floor", group: "furniture", size: [1.7, 0.6, 0.8] },
  { id: "fireplace", name: "벽난로", icon: "🔥", price: 3200, color: "#b5654a", kind: "floor", group: "furniture", size: [1.4, 1.2, 0.5] },
  { id: "frame", name: "풍경 액자", icon: "🖼️", price: 450, color: "#d6b56d", kind: "wall", group: "decor", size: [0.75, 0.6, 0.05], mount: 1.6 },
  { id: "clock", name: "벽시계", icon: "🕰️", price: 650, color: "#7b8f7e", kind: "wall", group: "decor", size: [0.45, 0.45, 0.06], mount: 1.9 },
  { id: "shelf", name: "벽 선반", icon: "🪜", price: 550, color: "#b8875a", kind: "wall", group: "decor", size: [1, 0.45, 0.26], mount: 1.4 },
  { id: "curtain", name: "커튼", icon: "🎀", price: 500, color: "#e7b8a8", kind: "wall", group: "decor", size: [1.5, 1.6, 0.08], mount: 1.5 },
  { id: "mirror", name: "벽거울", icon: "🪞", price: 600, color: "#d6b56d", kind: "wall", group: "decor", size: [0.6, 1, 0.04], mount: 1.45 },
  { id: "walltv", name: "벽걸이 TV", icon: "📺", price: 1700, color: "#2b2b2b", kind: "wall", group: "decor", size: [1.3, 0.75, 0.06], mount: 1.5 },
  { id: "window", name: "창문", icon: "🪟", price: 300, color: "#fffaf0", kind: "wall", group: "structure", size: [1.2, 1.1, 0.12], mount: 1.45 },
  { id: "door", name: "나무 문", icon: "🚪", price: 400, color: "#b98352", kind: "wall", group: "structure", size: [0.95, 2.1, 0.12], mount: 1.05, fixedMount: true },
  { id: "partition", name: "가벽", icon: "🧱", price: 800, color: "#efe4cf", kind: "floor", group: "structure", size: [2, 2.4, 0.14] },
  { id: "arch", name: "아치 가벽", icon: "🏛️", price: 1200, color: "#efe4cf", kind: "floor", group: "structure", size: [2.2, 2.4, 0.14] },
  { id: "stairs", name: "원목 계단", icon: "🪜", price: 1500, color: "#b98352", kind: "floor", group: "structure", size: [1, 2.8, 2.6] },
  // 작물 도감 계절 완성 보상(상점에서 팔지 않음)
  { id: "blossomscarecrow", name: "벚꽃 허수아비", icon: "🌸", price: 3000, color: "#f3a6bf", kind: "floor", group: "yard", size: [0.9, 1.9, 0.4], yard: true, reward: true },
  { id: "melonparasol", name: "수박 파라솔", icon: "🍉", price: 3000, color: "#4f9a46", kind: "floor", group: "yard", size: [1.6, 2.1, 1.6], yard: true, reward: true },
  { id: "goldenstraw", name: "황금 볏짚 장식", icon: "🌾", price: 3000, color: "#e8c35a", kind: "floor", group: "yard", size: [1, 0.9, 0.8], yard: true, reward: true },
  { id: "tangerinestove", name: "귤 난로", icon: "🍊", price: 3000, color: "#c4573b", kind: "floor", group: "yard", size: [0.7, 1.2, 0.7], yard: true, reward: true },
  { id: "fence", name: "나무 울타리", icon: "🪵", price: 300, color: "#d9b98a", kind: "floor", group: "yard", size: [2, 0.9, 0.12], yard: true },
  { id: "flowerbed", name: "꽃밭", icon: "🌷", price: 450, color: "#e7899a", kind: "floor", group: "yard", size: [1.6, 0.5, 0.8], yard: true },
  { id: "stonepath", name: "징검돌 길", icon: "🪨", price: 250, color: "#b8b3a8", kind: "rug", group: "yard", size: [0.9, 0.05, 2.4], yard: true },
  { id: "appletree", name: "사과나무", icon: "🍎", price: 1300, color: "#6f9a5a", kind: "floor", group: "yard", size: [2, 3.2, 2], yard: true },
  { id: "bench", name: "정원 벤치", icon: "🪑", price: 700, color: "#9b7350", kind: "floor", group: "yard", size: [1.5, 0.85, 0.6], yard: true },
  { id: "mailbox", name: "빨간 우체통", icon: "📮", price: 350, color: "#c4574b", kind: "floor", group: "yard", size: [0.4, 1.2, 0.4], yard: true },
  { id: "streetlamp", name: "정원 가로등", icon: "🏮", price: 900, color: "#3f4a44", kind: "floor", group: "yard", size: [0.4, 2.4, 0.4], yard: true },
  { id: "pond", name: "작은 연못", icon: "🪷", price: 1600, color: "#6fa8c4", kind: "rug", group: "yard", size: [2.6, 0.1, 1.8], yard: true },
  { id: "doghouse", name: "강아지 집", icon: "🐶", price: 1100, color: "#c46a4b", kind: "floor", group: "yard", size: [1, 1.1, 1.1], yard: true },
  { id: "dog", name: "강아지", icon: "🐶", price: 3000, color: "#c08a52", kind: "floor", group: "pet", size: [0.45, 0.6, 0.8], pet: true, rare: true },
  { id: "cat", name: "고양이", icon: "🐱", price: 3000, color: "#e0a35a", kind: "floor", group: "pet", size: [0.35, 0.45, 0.65], pet: true, rare: true },
  { id: "rabbit", name: "토끼", icon: "🐰", price: 2500, color: "#f3efe7", kind: "floor", group: "pet", size: [0.3, 0.55, 0.45], pet: true, rare: true },
  { id: "duck", name: "오리", icon: "🦆", price: 2500, color: "#f6d16a", kind: "floor", group: "pet", size: [0.3, 0.45, 0.45], pet: true, rare: true },
  { id: "mole", name: "두더지", icon: "🐹", price: 3500, color: "#5c5350", kind: "floor", group: "pet", size: [0.3, 0.25, 0.42], pet: true, rare: true },
  { id: "weasel", name: "족제비", icon: "🦦", price: 4000, color: "#a8743e", kind: "floor", group: "pet", size: [0.22, 0.3, 0.75], pet: true, rare: true },
  { id: "tiger", name: "호랑이", icon: "🐯", price: 8000, color: "#e08a2e", kind: "floor", group: "pet", size: [0.7, 1, 1.7], pet: true, rare: true },
  { id: "chick", name: "병아리", icon: "🐥", price: 1000, color: "#f6d860", kind: "floor", group: "pet", size: [0.2, 0.25, 0.22], pet: true },
  { id: "grasshopper", name: "메뚜기", icon: "🦗", price: 1000, color: "#7fb04f", kind: "floor", group: "pet", size: [0.12, 0.12, 0.3], pet: true },
  { id: "snail", name: "달팽이", icon: "🐌", price: 1000, color: "#c98f58", kind: "floor", group: "pet", size: [0.15, 0.18, 0.28], pet: true },
  { id: "frog", name: "개구리", icon: "🐸", price: 1000, color: "#6fb34f", kind: "floor", group: "pet", size: [0.22, 0.18, 0.25], pet: true },
  { id: "squirrel", name: "다람쥐", icon: "🐿️", price: 1000, color: "#b5733d", kind: "floor", group: "pet", size: [0.18, 0.35, 0.45], pet: true },
  { id: "hamster", name: "햄스터", icon: "🐹", price: 1000, color: "#e8b77a", kind: "floor", group: "pet", size: [0.18, 0.15, 0.22], pet: true },
  { id: "turtle", name: "거북이", icon: "🐢", price: 1000, color: "#6f8f4f", kind: "floor", group: "pet", size: [0.35, 0.2, 0.45], pet: true },
  { id: "sparrow", name: "참새", icon: "🐦", price: 1000, color: "#a8784a", kind: "floor", group: "pet", size: [0.15, 0.2, 0.22], pet: true },
  { id: "dragon", name: "청룡", icon: "🐉", price: 50000, color: "#3f8fbf", kind: "floor", group: "pet", size: [0.5, 0.7, 1.4], pet: true, legend: true },
  { id: "phoenix", name: "주작", icon: "🐦‍🔥", price: 50000, color: "#e0533a", kind: "floor", group: "pet", size: [0.5, 0.6, 0.7], pet: true, legend: true },
  { id: "whitetiger", name: "백호", icon: "🐅", price: 50000, color: "#f4f2ec", kind: "floor", group: "pet", size: [0.6, 0.8, 1.4], pet: true, legend: true },
  { id: "blacktortoise", name: "현무", icon: "🐢", price: 50000, color: "#3b4a44", kind: "floor", group: "pet", size: [0.7, 0.45, 0.9], pet: true, legend: true },
  { id: "gumiho", name: "구미호", icon: "🦊", price: 50000, color: "#f3e3c4", kind: "floor", group: "pet", size: [0.4, 0.6, 0.9], pet: true, legend: true },
  { id: "sock", name: "짝 잃은 양말", icon: "🧦", price: 100, color: "#e7899a", kind: "floor", group: "gacha", size: [0.25, 0.08, 0.35], tier: "junk" },
  { id: "emptycan", name: "빈 깡통", icon: "🥫", price: 100, color: "#b9c3c6", kind: "floor", group: "gacha", size: [0.15, 0.2, 0.15], tier: "junk" },
  { id: "newspaper", name: "지난 신문", icon: "📰", price: 100, color: "#e8e2d0", kind: "floor", group: "gacha", size: [0.5, 0.12, 0.35], tier: "junk" },
  { id: "pebble", name: "그냥 돌멩이", icon: "🪨", price: 100, color: "#8a8780", kind: "floor", group: "gacha", size: [0.3, 0.2, 0.25], tier: "junk" },
  { id: "tissue", name: "휴지 한 칸", icon: "🧻", price: 100, color: "#fffdf8", kind: "floor", group: "gacha", size: [0.15, 0.02, 0.15], tier: "junk" },
  { id: "beanbag", name: "빈백 소파", icon: "🫘", price: 1500, color: "#8ba5bc", kind: "floor", group: "gacha", size: [0.9, 0.6, 0.9], tier: "common" },
  { id: "guitar", name: "기타 스탠드", icon: "🎸", price: 4000, color: "#c4573b", kind: "floor", group: "gacha", size: [0.45, 1.1, 0.35], tier: "rare" },
  { id: "teddy", name: "곰인형", icon: "🧸", price: 1500, color: "#c8925a", kind: "floor", group: "gacha", size: [0.45, 0.55, 0.4], tier: "common" },
  { id: "cactus", name: "선인장 화분", icon: "🌵", price: 1500, color: "#5f9e4f", kind: "floor", group: "gacha", size: [0.4, 0.9, 0.4], tier: "common" },
  { id: "pumpkinlamp", name: "호박 랜턴", icon: "🎃", price: 1500, color: "#e2883a", kind: "floor", group: "gacha", size: [0.5, 0.45, 0.5], tier: "common" },
  { id: "arcade", name: "오락기", icon: "🕹️", price: 1500, color: "#5a4fa8", kind: "floor", group: "gacha", size: [0.7, 1.7, 0.7], tier: "common" },
  { id: "moai", name: "모아이 석상", icon: "🗿", price: 4000, color: "#8a8780", kind: "floor", group: "gacha", size: [0.6, 1.5, 0.6], tier: "rare" },
  { id: "discoball", name: "미러볼", icon: "🪩", price: 4000, color: "#c9d3dc", kind: "floor", group: "gacha", size: [0.6, 1.9, 0.6], tier: "rare" },
  { id: "throne", name: "왕좌", icon: "🪑", price: 4000, color: "#a5302a", kind: "floor", group: "gacha", size: [1, 1.8, 0.8], tier: "rare" },
  { id: "goldtoilet", name: "황금 변기", icon: "🚽", price: 15000, color: "#e8c35a", kind: "floor", group: "gacha", size: [0.5, 0.8, 0.7], tier: "legend" },
  { id: "unicorn", name: "유니콘 흔들목마", icon: "🦄", price: 15000, color: "#f6f1fb", kind: "floor", group: "gacha", size: [0.5, 1.1, 1.2], tier: "legend" },
  { id: "scarecrow", name: "허수아비", icon: "🧑‍🌾", price: 500, color: "#d6a64b", kind: "floor", group: "yard", size: [0.9, 1.8, 0.3], yard: true },
];

/** 펫 뽑기: 1회 비용. 전설 펫 0.1%(5종 균등), 능력 펫 10%(7종 균등), 나머지는 일반 펫(8종 균등). */
export const GACHA_PRICE = 1000;
export const GACHA_LEGEND_CHANCE = 0.001;
export const GACHA_RARE_CHANCE = 0.1;

export function rollPet(random = Math.random) {
  const roll = random(), pets = FURNITURE.filter(item => item.pet);
  const pool = roll < GACHA_LEGEND_CHANCE ? pets.filter(item => item.legend) : roll < GACHA_LEGEND_CHANCE + GACHA_RARE_CHANCE ? pets.filter(item => item.rare) : pets.filter(item => !item.rare && !item.legend);
  return pool[Math.floor(random() * pool.length)];
}

/**
 * 가구 뽑기: 가챠샵 전용 가구. 꽝(빈 상자)도 나오고, 한 번 뽑은 상품은 다시 나오지 않는다.
 * 남은 상품이 있는 등급만 가중치로 고르고, 꽝은 항상 후보다. 모두 모으면 더 뽑을 수 없다.
 */
export const FURNITURE_GACHA_PRICE = 2000;
export const FURNITURE_GACHA_WEIGHTS = { miss: 30, junk: 25, common: 25, rare: 15, legend: 5 } as const;
export const TIER_NAME = { junk: "쓸데없는 상품", common: "일반", rare: "희귀", legend: "전설" } as const;
export type GachaTier = keyof typeof TIER_NAME;

export const gachaPool = (collected: string[]) => FURNITURE.filter(item => item.group === "gacha" && !collected.includes(item.id));

/** 남은 상품 기준 실제 등급별 확률(꽝 포함). */
export function furnitureGachaOdds(collected: string[]) {
  const remaining = gachaPool(collected);
  const weights = Object.entries(FURNITURE_GACHA_WEIGHTS).filter(([tier]) => tier === "miss" || remaining.some(item => item.tier === tier));
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  return weights.map(([tier, weight]) => ({ tier: tier as GachaTier | "miss", chance: weight / total, left: remaining.filter(item => item.tier === tier).length }));
}

/** 뽑기 결과: 상품 또는 꽝(null). 남은 상품이 없으면 undefined. */
export function rollGachaFurniture(collected: string[], random = Math.random): Furniture | null | undefined {
  if (!gachaPool(collected).length) return undefined;
  let roll = random();
  for (const { tier, chance } of furnitureGachaOdds(collected)) {
    roll -= chance;
    if (roll > 0) continue;
    if (tier === "miss") return null;
    const pool = gachaPool(collected).filter(item => item.tier === tier);
    return pool[Math.floor(random() * pool.length)];
  }
  return null;
}

/** 능력 펫마다 하나씩, 집에 있는 동안 항상 적용되는 작은 고유 효과. */
export const PET_BUFFS: Record<string, { title: string; text: string }> = {
  dog: { title: "든든한 경비견", text: petAbility("dog", 1, true) },
  cat: { title: "생선 냄새", text: petAbility("cat", 1, true) },
  rabbit: { title: "알뜰 장보기", text: petAbility("rabbit", 1, true) },
  duck: { title: "물놀이 친구", text: petAbility("duck", 1, true) },
  mole: { title: "땅 고르기", text: petAbility("mole", 1, true) },
  weasel: { title: "해충 사냥꾼", text: petAbility("weasel", 1, true) },
  tiger: { title: "산군의 위엄", text: petAbility("tiger", 1, true) },
  dragon: { title: "청룡의 비", text: petAbility("dragon", 1, true) },
  phoenix: { title: "주작의 불꽃", text: petAbility("phoenix", 1, true) },
  whitetiger: { title: "백호의 포효", text: petAbility("whitetiger", 1, true) },
  blacktortoise: { title: "현무의 물줄기", text: petAbility("blacktortoise", 1, true) },
  gumiho: { title: "구미호의 홀림", text: petAbility("gumiho", 1, true) },
};

export const TINTS = ["#c78979", "#e2b85a", "#81a96b", "#8ba5bc", "#9a7bb0", "#57514f", "#efe6d6"];

export const WALLPAPERS: Theme[] = [
  { id: "stripe", name: "크림 스트라이프", price: 0, swatch: "repeating-linear-gradient(90deg,#f4e9d4 0 5px,#e9d8b8 5px 8px)" },
  { id: "flower", name: "들꽃 무늬", price: 400, swatch: "radial-gradient(circle at 30% 30%,#e7aeb0 2px,transparent 3px),radial-gradient(circle at 75% 70%,#b6cd9b 2px,transparent 3px),#f7e7e2" },
  { id: "mint", name: "민트 체크", price: 650, swatch: "linear-gradient(#cfe3d5 2px,transparent 2px) 0 0/8px 8px,linear-gradient(90deg,#cfe3d5 2px,transparent 2px) 0 0/8px 8px,#e4f0e7" },
  { id: "panel", name: "원목 판넬", price: 900, swatch: "repeating-linear-gradient(90deg,#c99d6e 0 7px,#a87a4c 7px 8px)" },
];

export const FLOORS: Theme[] = [
  { id: "oak", name: "원목 마루", price: 0, swatch: "repeating-linear-gradient(90deg,#c9965f 0 7px,#a97a48 7px 8px)" },
  { id: "walnut", name: "월넛 마루", price: 500, swatch: "repeating-linear-gradient(90deg,#7a5236 0 7px,#5f3f29 7px 8px)" },
  { id: "tile", name: "체크 타일", price: 700, swatch: "conic-gradient(#efe4cf 25%,#c97b5d 0 50%,#efe4cf 0 75%,#c97b5d 0) 0 0/12px 12px" },
];

/** 집 단계별 평수. price는 그 단계로 증축하는 비용. */
export const HOUSE_SIZES = [
  { level: 1, name: "작은 농막", pyeong: 8, price: 0 },
  { level: 2, name: "아담한 농가", pyeong: 12, price: 4500 },
  { level: 3, name: "햇살 농가", pyeong: 18, price: 9000 },
  { level: 4, name: "넓은 전원주택", pyeong: 25, price: 15000 },
  { level: 5, name: "꿈의 전원주택", pyeong: 34, price: 24000 },
  { level: 6, name: "언덕 위 대저택", pyeong: 45, price: 36000 },
];
/** 마당 단계: 집 둘레로 확보되는 여유 폭(m). */
export const YARD_SIZES = [
  { level: 1, name: "작은 앞마당", margin: 3, price: 0 },
  { level: 2, name: "넓은 마당", margin: 5, price: 3000 },
  { level: 3, name: "정원 딸린 마당", margin: 7.5, price: 8000 },
];

export function yardBounds(room: Room, yardLevel: number) {
  const margin = (YARD_SIZES.find(size => size.level === yardLevel) ?? YARD_SIZES[0]).margin;
  return { minX: -room.width / 2 - margin, maxX: room.width / 2 + margin, minZ: -room.depth / 2 - margin * 0.6, maxZ: room.depth / 2 + margin * 1.3 };
}

/** 마당 소품은 마당 경계 안, 집 벽 바깥에만 둘 수 있다. */
export function fitsInYard(room: Room, yardLevel: number, x: number, z: number, margin = 0.35) {
  const b = yardBounds(room, yardLevel);
  if (x < b.minX + margin || x > b.maxX - margin || z < b.minZ + margin || z > b.maxZ - margin) return false;
  return ![[0, 0], [margin, 0], [-margin, 0], [0, margin], [0, -margin]].some(([dx, dz]) => pointInRoom(room.points, x + dx, z + dz));
}
export const SHAPES: { id: RoomShape; name: string; note: string }[] = [
  { id: "rect", name: "직사각형", note: "가로로 긴 기본 구조" },
  { id: "square", name: "정사각형", note: "어느 방향이든 균형 잡힌 구조" },
  { id: "ell", name: "ㄱ자", note: "한쪽 모서리가 꺾인 구조" },
];
export const REMODEL_PRICE = 800;
const PYEONG_M2 = 3.3058;

/** 평수와 구조로 방 바닥 다각형을 만든다. 0번 벽은 항상 뒷벽(-z)이다. */
export function roomFor(level: number, shape: RoomShape): Room {
  const area = (HOUSE_SIZES.find(size => size.level === level) ?? HOUSE_SIZES[0]).pyeong * PYEONG_M2;
  if (shape === "ell") {
    const cut = 0.42, depth = Math.sqrt(area / (1 - cut * cut) / 1.25), width = depth * 1.25;
    const [w, d, cw, cd] = [width / 2, depth / 2, width * cut, depth * cut];
    return { width, depth, area, points: [[-w, -d], [w, -d], [w, d - cd], [w - cw, d - cd], [w - cw, d], [-w, d]] };
  }
  const aspect = shape === "square" ? 1 : 1.45, depth = Math.sqrt(area / aspect), width = depth * aspect;
  return { width, depth, area, points: [[-width / 2, -depth / 2], [width / 2, -depth / 2], [width / 2, depth / 2], [-width / 2, depth / 2]] };
}

export function pointInRoom(points: [number, number][], x: number, z: number) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, zi] = points[i], [xj, zj] = points[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** 중심점과 주변 네 점이 모두 방 안이면 둘 수 있다. */
export function fitsInRoom(points: [number, number][], x: number, z: number, margin = 0.2) {
  return [[0, 0], [margin, 0], [-margin, 0], [0, margin], [0, -margin]].every(([dx, dz]) => pointInRoom(points, x + dx, z + dz));
}

/** 벽 번호의 시작점, 방향, 길이, 안쪽 법선. */
export function wallInfo(points: [number, number][], index: number) {
  const [ax, az] = points[index % points.length], [bx, bz] = points[(index + 1) % points.length];
  const length = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / length, dz = (bz - az) / length;
  const [mx, mz] = [(ax + bx) / 2, (az + bz) / 2];
  const normal: [number, number] = pointInRoom(points, mx - dz * 0.05, mz + dx * 0.05) ? [-dz, dx] : [dz, -dx];
  return { start: [ax, az] as [number, number], dir: [dx, dz] as [number, number], length, normal };
}

function PianoKeys() {
  const step = 148 / 14;
  return <>{Array.from({ length: 13 }).map((_, key) => <rect key={`w${key}`} x={6 + (key + 1) * step - .3} y="86" width=".6" height="15" fill="#d9d2c3" />)}{[0, 1, 3, 4, 5, 7, 8, 10, 11, 12].map(key => <rect key={key} x={6 + (key + 1) * step - 3} y="86" width="6" height="9" fill="#2b2522" />)}</>;
}

const ART: Record<string, { viewBox: string; body: ReactNode }> = {
  chair: { viewBox: "0 0 60 100", body: <><rect className="d" x="12" y="4" width="36" height="42" rx="6" /><rect className="m" x="16" y="8" width="28" height="34" rx="4" /><rect className="l" x="20" y="14" width="20" height="5" rx="2" /><rect className="l" x="20" y="25" width="20" height="5" rx="2" /><rect className="d" x="11" y="58" width="6" height="40" rx="2" /><rect className="d" x="43" y="58" width="6" height="40" rx="2" /><rect className="l" x="6" y="46" width="48" height="9" rx="4" /><rect className="d" x="6" y="53" width="48" height="6" rx="2" /></> },
  plant: { viewBox: "0 0 80 124", body: <><g stroke="#4c6b3d" strokeWidth="2" fill="none"><path d="M40 82 Q38 60 26 46" /><path d="M40 82 Q44 58 54 40" /><path d="M40 82 V26" /><path d="M40 82 Q34 72 28 66" /><path d="M40 82 Q48 72 52 64" /></g><ellipse className="m" cx="25" cy="45" rx="18" ry="11" transform="rotate(-35 25 45)" /><ellipse className="d" cx="55" cy="40" rx="18" ry="11" transform="rotate(30 55 40)" /><ellipse className="l" cx="40" cy="22" rx="12" ry="19" /><ellipse className="d" cx="28" cy="66" rx="15" ry="8" transform="rotate(-15 28 66)" /><ellipse className="m" cx="53" cy="63" rx="15" ry="8" transform="rotate(20 53 63)" /><path d="M22 84 H58 L54 122 H26 Z" fill="#c9784f" /><rect x="18" y="79" width="44" height="8" rx="3" fill="#b0623f" /></> },
  lamp: { viewBox: "0 0 50 150", body: <><rect x="23" y="34" width="4" height="106" fill="#5b4a3a" /><ellipse cx="25" cy="144" rx="15" ry="5" fill="#4a3b2e" /><path className="m" d="M8 36 L16 6 H34 L42 36 Z" /><path className="l" d="M16 6 H34 L35.5 12 H14.5 Z" /><ellipse cx="25" cy="37" rx="9" ry="2.5" fill="#fff4c7" /></> },
  table: { viewBox: "0 0 160 100", body: <><rect className="d" x="12" y="30" width="10" height="68" rx="3" /><rect className="d" x="138" y="30" width="10" height="68" rx="3" /><rect className="d" x="40" y="30" width="7" height="56" rx="3" opacity=".7" /><rect className="d" x="113" y="30" width="7" height="56" rx="3" opacity=".7" /><path className="l" d="M14 10 H146 L160 22 H0 Z" /><rect className="m" x="0" y="22" width="160" height="10" rx="3" /><path d="M72 4 H88 L86 16 H74 Z" fill="#7da0b5" /><circle cx="76" cy="0" r="5" fill="#f2b5c4" /><circle cx="84" cy="1" r="5" fill="#f6d16a" /></> },
  bookshelf: { viewBox: "0 0 100 170", body: <><rect className="d" x="0" y="0" width="100" height="170" rx="4" /><rect x="8" y="8" width="84" height="154" fill="#3a2716" opacity=".45" /><rect className="m" x="4" y="56" width="92" height="6" /><rect className="m" x="4" y="108" width="92" height="6" /><g><rect x="12" y="20" width="9" height="36" fill="#c4574b" /><rect x="22" y="16" width="8" height="40" fill="#e2b85a" /><rect x="31" y="22" width="10" height="34" fill="#4f7a6a" /><rect x="44" y="26" width="9" height="30" fill="#8ba5bc" transform="rotate(-12 48 56)" /><rect x="64" y="18" width="10" height="38" fill="#9a7bb0" /><rect x="75" y="24" width="12" height="32" fill="#efe6d6" /><rect x="12" y="74" width="10" height="34" fill="#efe6d6" /><rect x="23" y="70" width="8" height="38" fill="#57514f" /><rect x="32" y="76" width="11" height="32" fill="#c78979" /><circle cx="70" cy="96" r="11" fill="#81a96b" /><rect x="63" y="96" width="14" height="12" fill="#c9784f" /><rect x="12" y="132" width="34" height="30" rx="2" fill="#d9c39b" /><rect x="52" y="124" width="9" height="38" fill="#4f7a6a" /><rect x="62" y="128" width="9" height="34" fill="#e2b85a" /><rect x="72" y="122" width="10" height="40" fill="#c4574b" /></g></> },
  sofa: { viewBox: "0 0 200 104", body: <><rect className="m" x="14" y="8" width="172" height="54" rx="18" /><rect className="l" x="26" y="18" width="70" height="38" rx="12" /><rect className="l" x="104" y="18" width="70" height="38" rx="12" /><rect className="m" x="10" y="52" width="180" height="30" rx="9" /><rect className="l" x="24" y="50" width="152" height="9" rx="4" /><rect className="d" x="0" y="34" width="32" height="54" rx="14" /><rect className="d" x="168" y="34" width="32" height="54" rx="14" /><rect x="16" y="86" width="8" height="16" rx="2" fill="#5b3d26" /><rect x="176" y="86" width="8" height="16" rx="2" fill="#5b3d26" /></> },
  bed: { viewBox: "0 0 220 124", body: <><rect className="d" x="8" y="0" width="204" height="78" rx="18" /><rect className="m" x="18" y="10" width="184" height="40" rx="12" opacity=".55" /><rect x="6" y="56" width="208" height="30" rx="8" fill="#fbf6ec" /><ellipse cx="62" cy="58" rx="36" ry="12" fill="#fffdf7" /><ellipse cx="158" cy="58" rx="36" ry="12" fill="#fffdf7" /><rect className="m" x="6" y="68" width="208" height="38" rx="8" /><rect className="l" x="6" y="68" width="208" height="9" rx="4" /><rect x="14" y="104" width="10" height="18" rx="2" fill="#6d4a2e" /><rect x="196" y="104" width="10" height="18" rx="2" fill="#6d4a2e" /></> },
  piano: { viewBox: "0 0 160 140", body: <><rect className="m" x="6" y="8" width="148" height="78" rx="4" /><rect className="d" x="0" y="0" width="160" height="12" rx="4" /><rect x="44" y="26" width="72" height="24" rx="2" fill="#f3ead6" /><g stroke="#b9ab8f" strokeWidth="1"><line x1="50" y1="33" x2="110" y2="33" /><line x1="50" y1="38" x2="110" y2="38" /><line x1="50" y1="43" x2="104" y2="43" /></g><rect className="d" x="0" y="78" width="160" height="8" rx="2" /><rect x="6" y="86" width="148" height="15" fill="#fbf8f0" /><PianoKeys /><rect className="m" x="6" y="101" width="148" height="8" /><rect className="d" x="14" y="109" width="10" height="29" /><rect className="d" x="136" y="109" width="10" height="29" /><rect x="70" y="130" width="6" height="8" rx="2" fill="#d6b56d" /><rect x="84" y="130" width="6" height="8" rx="2" fill="#d6b56d" /></> },
  rug: { viewBox: "0 0 200 60", body: <><ellipse className="d" cx="100" cy="31" rx="99" ry="28" /><ellipse className="m" cx="100" cy="30" rx="96" ry="27" /><ellipse className="l" cx="100" cy="30" rx="80" ry="21" /><ellipse className="m" cx="100" cy="30" rx="62" ry="15" /><ellipse className="l" cx="100" cy="30" rx="40" ry="9" opacity=".7" /></> },
  frame: { viewBox: "0 0 80 64", body: <><rect className="m" x="0" y="0" width="80" height="64" rx="3" /><rect className="d" x="5" y="5" width="70" height="54" /><rect x="8" y="8" width="64" height="48" fill="#bfe0e6" /><circle cx="56" cy="20" r="6" fill="#f6d16a" /><path d="M8 46 Q24 30 40 42 T72 36 V56 H8 Z" fill="#8bb46f" /><path d="M8 50 Q30 42 50 50 T72 48 V56 H8 Z" fill="#6f9a5a" /></> },
  clock: { viewBox: "0 0 64 64", body: <><circle className="d" cx="32" cy="32" r="31" /><circle className="m" cx="32" cy="32" r="28" /><circle cx="32" cy="32" r="23" fill="#fffaf0" />{[0, 90, 180, 270].map(angle => <rect key={angle} x="31" y="11" width="2" height="5" fill="#57514f" transform={`rotate(${angle} 32 32)`} />)}<rect x="31" y="18" width="2" height="15" rx="1" fill="#2f3d33" transform="rotate(35 32 32)" /><rect x="31" y="22" width="2" height="11" rx="1" fill="#2f3d33" transform="rotate(-70 32 32)" /><circle cx="32" cy="32" r="2.2" fill="#c4574b" /></> },
  shelf: { viewBox: "0 0 140 70", body: <><rect x="10" y="20" width="9" height="30" rx="2" fill="#c4574b" /><rect x="20" y="16" width="8" height="34" rx="2" fill="#4f7a6a" /><rect x="29" y="24" width="9" height="26" rx="2" fill="#e2b85a" transform="rotate(12 33 50)" /><path d="M58 30 H78 L76 50 H60 Z" fill="#c9784f" /><ellipse cx="62" cy="24" rx="8" ry="5" fill="#81a96b" transform="rotate(-30 62 24)" /><ellipse cx="74" cy="22" rx="8" ry="5" fill="#6f9a5a" transform="rotate(30 74 22)" /><rect x="96" y="30" width="16" height="20" rx="4" fill="#cfe3e8" opacity=".9" /><rect x="94" y="27" width="20" height="4" rx="2" fill="#b98352" /><rect x="118" y="36" width="12" height="14" rx="6" fill="#efe6d6" /><rect className="m" x="0" y="50" width="140" height="7" rx="2" /><path className="d" d="M14 57 h8 l-8 12 Z" /><path className="d" d="M118 57 h8 v12 Z" /></> },
  armchair: { viewBox: "0 0 100 90", body: <><rect className="m" x="10" y="4" width="80" height="50" rx="14" /><rect className="l" x="16" y="48" width="68" height="20" rx="8" /><rect className="d" x="0" y="34" width="20" height="44" rx="9" /><rect className="d" x="80" y="34" width="20" height="44" rx="9" /><rect className="m" x="14" y="64" width="72" height="16" rx="5" /><rect x="16" y="80" width="6" height="10" fill="#5b3d26" /><rect x="78" y="80" width="6" height="10" fill="#5b3d26" /></> },
  rocker: { viewBox: "0 0 90 110", body: <><rect className="m" x="22" y="4" width="46" height="56" rx="8" /><rect className="l" x="28" y="12" width="34" height="6" rx="2" /><rect className="l" x="28" y="26" width="34" height="6" rx="2" /><rect className="l" x="16" y="58" width="58" height="10" rx="4" /><rect className="d" x="20" y="68" width="6" height="26" /><rect className="d" x="64" y="68" width="6" height="26" /><path className="d" d="M4 92 Q45 112 86 92 L86 98 Q45 118 4 98 Z" /></> },
  desk: { viewBox: "0 0 140 110", body: <><rect x="40" y="2" width="60" height="40" rx="3" fill="#222" /><rect x="44" y="6" width="52" height="32" fill="#cfe8c8" /><g fill="#7fb07a">{[10, 16, 22, 28].map(y => <rect key={y} x="47" y={y} width="46" height="2" />)}</g><rect x="66" y="42" width="8" height="12" fill="#333" /><rect className="m" x="0" y="54" width="140" height="10" rx="2" /><rect className="d" x="6" y="64" width="8" height="46" /><rect className="d" x="126" y="64" width="8" height="46" /><rect className="d" x="96" y="64" width="34" height="34" /><rect x="50" y="48" width="40" height="5" rx="1" fill="#ddd" /><rect x="108" y="40" width="10" height="14" rx="3" fill="#efe6d6" /></> },
  wardrobe: { viewBox: "0 0 90 150", body: <><rect className="m" x="0" y="4" width="90" height="146" rx="3" /><rect className="d" x="-2" y="0" width="94" height="8" rx="2" /><rect className="d" x="44" y="10" width="2" height="136" /><rect className="l" x="6" y="14" width="34" height="128" rx="2" opacity=".35" /><rect className="l" x="50" y="14" width="34" height="128" rx="2" opacity=".35" /><rect x="36" y="70" width="4" height="16" rx="2" fill="#e2b85a" /><rect x="50" y="70" width="4" height="16" rx="2" fill="#e2b85a" /></> },
  fishtank: { viewBox: "0 0 120 110", body: <><rect x="4" y="2" width="112" height="56" rx="3" fill="#9fd3e6" opacity=".75" /><rect x="4" y="46" width="112" height="12" fill="#e8d6a8" /><path d="M30 26 l12 -7 v14 z M42 26 a9 6 0 1 0 0.1 0" fill="#f08a3a" /><path d="M78 36 l10 -6 v12 z M88 36 a8 5 0 1 0 0.1 0" fill="#e2483a" /><rect x="94" y="30" width="3" height="16" fill="#4f7a3e" /><rect className="m" x="0" y="58" width="120" height="52" rx="3" /><rect className="d" x="0" y="58" width="120" height="6" /></> },
  fridge: { viewBox: "0 0 70 150", body: <><rect className="m" x="0" y="0" width="70" height="150" rx="6" /><rect className="d" x="0" y="54" width="70" height="3" /><rect x="56" y="18" width="5" height="26" rx="2" fill="#8a9598" /><rect x="56" y="66" width="5" height="40" rx="2" fill="#8a9598" /><rect x="10" y="10" width="14" height="10" rx="2" fill="#f2b5c4" /></> },
  tvstand: { viewBox: "0 0 140 100", body: <><rect x="20" y="0" width="100" height="58" rx="3" fill="#1d1d1d" /><rect x="24" y="4" width="92" height="50" fill="#5a8fb5" /><path d="M24 40 Q50 26 70 38 T116 34 V54 H24 Z" fill="#7fb460" /><rect className="m" x="0" y="62" width="140" height="38" rx="3" /><rect className="d" x="6" y="68" width="62" height="26" rx="2" opacity=".5" /><rect className="d" x="72" y="68" width="62" height="26" rx="2" opacity=".5" /></> },
  kitchen: { viewBox: "0 0 160 90", body: <><rect x="0" y="16" width="160" height="8" fill="#7d7a74" /><rect className="m" x="4" y="24" width="152" height="66" /><rect x="24" y="10" width="40" height="8" rx="2" fill="#b9c3c6" /><path d="M40 10 V0 H50" fill="none" stroke="#8a9598" strokeWidth="3" /><circle cx="110" cy="13" r="7" fill="#222" /><circle cx="134" cy="13" r="7" fill="#222" />{[8, 58, 108].map(x => <rect key={x} className="d" x={x} y="32" width="44" height="52" rx="2" opacity=".35" />)}</> },
  bathtub: { viewBox: "0 0 160 80", body: <><rect className="m" x="0" y="10" width="160" height="58" rx="18" /><rect x="10" y="12" width="140" height="14" rx="7" fill="#a9d8f0" /><circle cx="40" cy="12" r="6" fill="#fff" /><circle cx="52" cy="10" r="5" fill="#fff" /><circle cx="120" cy="12" r="6" fill="#fff" /><circle cx="22" cy="72" r="6" fill="#d6b56d" /><circle cx="138" cy="72" r="6" fill="#d6b56d" /></> },
  fireplace: { viewBox: "0 0 120 100", body: <><rect className="m" x="6" y="12" width="108" height="88" /><g className="d" opacity=".35">{[24, 40, 56, 72, 88].map(y => <rect key={y} x="6" y={y} width="108" height="2" />)}</g><rect x="0" y="4" width="120" height="10" rx="2" fill="#efe2c8" /><path d="M34 100 V60 A26 26 0 0 1 86 60 V100 Z" fill="#2a1a10" /><path d="M48 98 Q46 80 58 70 Q56 84 66 78 Q74 88 70 98 Z" fill="#f08a3a" /><path d="M54 98 Q54 88 60 82 Q62 90 66 98 Z" fill="#ffd25a" /></> },
  curtain: { viewBox: "0 0 120 120", body: <><rect x="0" y="0" width="120" height="5" rx="2" fill="#8a6a48" /><path className="m" d="M4 5 H46 Q40 60 50 118 H4 Z" /><path className="m" d="M116 5 H74 Q80 60 70 118 H116 Z" /><g className="d" opacity=".3"><rect x="14" y="5" width="3" height="113" /><rect x="28" y="5" width="3" height="113" /><rect x="88" y="5" width="3" height="113" /><rect x="102" y="5" width="3" height="113" /></g></> },
  mirror: { viewBox: "0 0 60 100", body: <><rect className="m" x="0" y="0" width="60" height="100" rx="30" /><rect x="6" y="6" width="48" height="88" rx="24" fill="#dfeef3" /><path d="M16 30 L30 16 M16 44 L40 20" stroke="#fff" strokeWidth="3" /></> },
  walltv: { viewBox: "0 0 130 76", body: <><rect className="m" x="0" y="0" width="130" height="76" rx="3" /><rect x="5" y="5" width="120" height="66" fill="#5a8fb5" /><path d="M5 52 Q40 34 64 48 T125 42 V71 H5 Z" fill="#7fb460" /><circle cx="100" cy="20" r="7" fill="#ffe08a" /></> },
  dog: { viewBox: "0 0 100 90", body: <><ellipse className="m" cx="46" cy="56" rx="30" ry="18" /><rect className="d" x="22" y="66" width="8" height="22" rx="3" /><rect className="d" x="58" y="66" width="8" height="22" rx="3" /><path className="d" d="M14 50 Q2 40 8 30" stroke="#7a5236" strokeWidth="6" fill="none" /><circle className="m" cx="74" cy="34" r="18" /><ellipse className="d" cx="62" cy="34" rx="7" ry="14" /><ellipse cx="88" cy="40" rx="8" ry="6" fill="#efd9b8" /><circle cx="93" cy="38" r="3" fill="#222" /><circle cx="78" cy="30" r="3" fill="#222" /></> },
  cat: { viewBox: "0 0 100 90", body: <><path className="d" d="M18 60 Q2 50 10 24" stroke="#b9772f" strokeWidth="6" fill="none" /><ellipse className="m" cx="44" cy="60" rx="28" ry="16" /><rect className="m" x="24" y="68" width="7" height="20" rx="3" /><rect className="m" x="56" y="68" width="7" height="20" rx="3" /><circle className="m" cx="72" cy="38" r="17" /><path className="m" d="M58 28 L60 10 L70 22 Z M86 28 L84 10 L74 22 Z" /><circle cx="66" cy="38" r="3" fill="#222" /><circle cx="80" cy="38" r="3" fill="#222" /><path d="M70 46 l3 2 l3 -2" stroke="#222" fill="none" /></> },
  rabbit: { viewBox: "0 0 80 100", body: <><ellipse className="m" cx="40" cy="70" rx="26" ry="22" /><circle className="m" cx="40" cy="42" r="16" /><ellipse className="m" cx="32" cy="14" rx="6" ry="18" /><ellipse className="m" cx="48" cy="14" rx="6" ry="18" /><ellipse cx="32" cy="14" rx="3" ry="13" fill="#f2b5c4" /><ellipse cx="48" cy="14" rx="3" ry="13" fill="#f2b5c4" /><circle cx="34" cy="42" r="2.5" fill="#222" /><circle cx="46" cy="42" r="2.5" fill="#222" /><circle cx="40" cy="49" r="2.5" fill="#f2899a" /></> },
  duck: { viewBox: "0 0 90 90", body: <><ellipse className="m" cx="42" cy="58" rx="30" ry="20" /><path className="d" d="M14 52 L4 44 L16 46 Z" /><circle className="m" cx="62" cy="30" r="15" /><path d="M74 30 L90 34 L74 38 Z" fill="#f08a3a" /><circle cx="66" cy="26" r="3" fill="#222" /><rect x="34" y="76" width="4" height="12" fill="#f08a3a" /><rect x="48" y="76" width="4" height="12" fill="#f08a3a" /></> },
  mole: { viewBox: "0 0 100 70", body: <><ellipse className="m" cx="46" cy="42" rx="38" ry="24" /><ellipse cx="86" cy="44" rx="8" ry="6" fill="#f2899a" /><circle cx="74" cy="34" r="2.5" fill="#111" /><ellipse cx="62" cy="64" rx="9" ry="5" fill="#f2b5c4" /><ellipse cx="30" cy="64" rx="9" ry="5" fill="#f2b5c4" /></> },
  weasel: { viewBox: "0 0 120 70", body: <><path className="d" d="M14 44 Q4 40 2 26" stroke="#7a5236" strokeWidth="7" fill="none" /><rect className="m" x="14" y="34" width="72" height="20" rx="10" /><rect className="m" x="20" y="48" width="6" height="18" rx="3" /><rect className="m" x="72" y="48" width="6" height="18" rx="3" /><circle className="m" cx="94" cy="34" r="14" /><ellipse cx="100" cy="40" rx="9" ry="6" fill="#f3e3c4" /><circle cx="96" cy="30" r="2.5" fill="#222" /><circle cx="108" cy="38" r="2.5" fill="#222" /><circle className="m" cx="88" cy="22" r="5" /></> },
  tiger: { viewBox: "0 0 120 90", body: <><path className="m" d="M12 50 Q0 36 8 22" stroke="#e08a2e" strokeWidth="7" fill="none" /><ellipse className="m" cx="54" cy="54" rx="40" ry="22" /><g fill="#2a1d14">{[30, 44, 58, 72].map(x => <path key={x} d={`M${x} 34 l4 0 l-3 18 z`} />)}</g><rect className="m" x="24" y="64" width="10" height="24" rx="4" /><rect className="m" x="70" y="64" width="10" height="24" rx="4" /><circle className="m" cx="92" cy="34" r="20" /><circle className="m" cx="78" cy="16" r="6" /><circle className="m" cx="106" cy="16" r="6" /><ellipse cx="96" cy="44" rx="11" ry="8" fill="#f8efe0" /><circle cx="86" cy="30" r="3" fill="#222" /><circle cx="100" cy="30" r="3" fill="#222" /><path d="M86 22 l4 6 M98 22 l-2 6" stroke="#2a1d14" strokeWidth="2.5" /></> },
  chick: { viewBox: "0 0 80 80", body: <><circle className="m" cx="40" cy="48" r="24" /><circle className="m" cx="40" cy="24" r="14" /><path d="M52 24 L62 27 L52 30 Z" fill="#f08a3a" /><circle cx="44" cy="20" r="2.5" fill="#222" /><path className="d" d="M14 46 Q22 40 26 50" /></> },
  grasshopper: { viewBox: "0 0 110 60", body: <><ellipse className="m" cx="50" cy="30" rx="34" ry="11" /><circle className="m" cx="88" cy="26" r="11" /><circle cx="92" cy="22" r="3" fill="#222" /><path d="M40 30 L28 6 L18 48" stroke="#4f7a3e" strokeWidth="4" fill="none" /><path d="M94 18 Q104 4 108 8" stroke="#4f7a3e" strokeWidth="2" fill="none" /><path className="l" d="M24 24 Q50 10 76 24 Z" /></> },
  snail: { viewBox: "0 0 100 70", body: <><path d="M8 62 H88 Q96 62 94 54 L80 50 Z" fill="#e8d3b0" /><circle className="m" cx="46" cy="36" r="26" /><circle className="l" cx="46" cy="36" r="16" /><circle className="m" cx="46" cy="36" r="7" /><path d="M86 52 L90 30 M80 52 L82 32" stroke="#e8d3b0" strokeWidth="3" /><circle cx="90" cy="29" r="3" fill="#222" /></> },
  frog: { viewBox: "0 0 100 70", body: <><ellipse className="m" cx="50" cy="46" rx="38" ry="20" /><circle className="m" cx="32" cy="22" r="12" /><circle className="m" cx="68" cy="22" r="12" /><circle cx="32" cy="20" r="6" fill="#fff" /><circle cx="68" cy="20" r="6" fill="#fff" /><circle cx="33" cy="21" r="3" fill="#222" /><circle cx="69" cy="21" r="3" fill="#222" /><path d="M38 50 Q50 58 62 50" stroke="#2f5a2a" strokeWidth="3" fill="none" /></> },
  squirrel: { viewBox: "0 0 100 90", body: <><path className="d" d="M22 78 Q0 50 18 18 Q30 0 40 20 Q24 44 40 70 Z" /><ellipse className="m" cx="54" cy="62" rx="20" ry="18" /><circle className="m" cx="68" cy="36" r="14" /><circle className="m" cx="62" cy="22" r="5" /><circle cx="73" cy="34" r="2.5" fill="#222" /><ellipse cx="80" cy="40" rx="5" ry="4" fill="#f3e3c4" /></> },
  hamster: { viewBox: "0 0 90 70", body: <><ellipse className="m" cx="45" cy="42" rx="36" ry="24" /><ellipse cx="45" cy="50" rx="24" ry="14" fill="#fff6e8" /><circle className="m" cx="22" cy="20" r="7" /><circle className="m" cx="68" cy="20" r="7" /><circle cx="34" cy="34" r="3" fill="#222" /><circle cx="56" cy="34" r="3" fill="#222" /><circle cx="45" cy="42" r="3" fill="#f2899a" /></> },
  turtle: { viewBox: "0 0 110 70", body: <><ellipse cx="88" cy="44" rx="14" ry="10" fill="#9cc57a" /><circle cx="94" cy="40" r="2.5" fill="#222" /><path className="m" d="M14 50 Q20 10 56 10 Q92 10 96 50 Z" /><g className="d" opacity=".5"><path d="M40 14 L36 50 M70 14 L74 50 M24 32 H88" stroke="#2f4a2a" strokeWidth="3" /></g><rect x="22" y="48" width="12" height="14" rx="5" fill="#9cc57a" /><rect x="74" y="48" width="12" height="14" rx="5" fill="#9cc57a" /></> },
  sparrow: { viewBox: "0 0 90 70", body: <><ellipse className="m" cx="40" cy="40" rx="26" ry="18" /><path className="d" d="M14 36 L0 30 L10 44 Z" /><circle className="m" cx="62" cy="28" r="13" /><path d="M74 28 L84 31 L74 34 Z" fill="#e2b85a" /><circle cx="66" cy="25" r="2.5" fill="#222" /><ellipse cx="44" cy="48" rx="14" ry="8" fill="#efe2c8" /></> },
  dragon: { viewBox: "0 0 120 80", body: <><path className="m" d="M10 60 Q30 30 50 50 T90 40 Q100 36 108 30" stroke="#3f8fbf" strokeWidth="14" fill="none" strokeLinecap="round" /><circle className="m" cx="104" cy="28" r="13" /><path d="M98 16 l-4 -12 M108 16 l2 -12" stroke="#e8c35a" strokeWidth="3" /><path d="M116 32 q8 4 2 10" stroke="#e8c35a" strokeWidth="2" fill="none" /><circle cx="108" cy="25" r="2.5" fill="#222" /><g fill="#e8c35a">{[24, 44, 64, 84].map(x => <path key={x} d={`M${x} 40 l4 -8 l4 8 z`} />)}</g></> },
  phoenix: { viewBox: "0 0 100 90", body: <><path d="M20 60 Q0 40 10 10 Q24 34 30 44 Q30 20 42 6 Q44 36 48 46 Z" fill="#f6b03a" /><ellipse className="m" cx="54" cy="56" rx="24" ry="18" /><circle className="m" cx="74" cy="34" r="12" /><path d="M84 34 L96 38 L84 42 Z" fill="#e2b85a" /><circle cx="77" cy="31" r="2.5" fill="#222" /><path d="M70 22 Q74 10 82 16" stroke="#f6d16a" strokeWidth="3" fill="none" /></> },
  whitetiger: { viewBox: "0 0 120 90", body: <><path d="M12 50 Q0 36 8 22" stroke="#d8d4cc" strokeWidth="7" fill="none" /><ellipse className="m" cx="54" cy="54" rx="40" ry="22" /><g fill="#2a2a32">{[30, 44, 58, 72].map(x => <path key={x} d={`M${x} 34 l4 0 l-3 18 z`} />)}</g><rect className="m" x="24" y="64" width="10" height="24" rx="4" /><rect className="m" x="70" y="64" width="10" height="24" rx="4" /><circle className="m" cx="92" cy="34" r="20" /><circle cx="86" cy="30" r="3.5" fill="#5fb0dc" /><circle cx="100" cy="30" r="3.5" fill="#5fb0dc" /><path d="M86 20 l4 6 M98 20 l-2 6" stroke="#2a2a32" strokeWidth="2.5" /></> },
  blacktortoise: { viewBox: "0 0 120 80", body: <><path className="m" d="M14 56 Q20 14 60 14 Q100 14 104 56 Z" /><g opacity=".6" stroke="#8fd3c4" strokeWidth="3" fill="none"><path d="M40 18 L36 56 M80 18 L84 56 M22 36 H98" /></g><circle cx="108" cy="50" r="10" fill="#4f6b5c" /><circle cx="112" cy="47" r="2.5" fill="#f3d675" /><path d="M14 54 Q0 60 8 70 Q16 74 20 66" stroke="#5f9e4f" strokeWidth="6" fill="none" /></> },
  gumiho: { viewBox: "0 0 120 90", body: <>{[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => <path key={i} d={`M30 56 Q${4 + i * 3} ${20 + i * 5} ${i * 4} ${4 + i * 6}`} stroke="#f3e3c4" strokeWidth="9" strokeLinecap="round" fill="none" />)}<ellipse className="m" cx="58" cy="58" rx="28" ry="16" /><circle className="m" cx="86" cy="40" r="16" /><path className="m" d="M76 30 L74 12 L86 26 Z M96 30 L98 12 L88 26 Z" /><circle cx="82" cy="40" r="2.5" fill="#c4302b" /><circle cx="94" cy="40" r="2.5" fill="#c4302b" /></> },
  teddy: { viewBox: "0 0 80 90", body: <><circle className="m" cx="22" cy="18" r="10" /><circle className="m" cx="58" cy="18" r="10" /><circle className="m" cx="40" cy="32" r="22" /><ellipse className="m" cx="40" cy="68" rx="24" ry="20" /><ellipse cx="40" cy="40" rx="9" ry="7" fill="#f3e3c4" /><circle cx="32" cy="28" r="3" fill="#222" /><circle cx="48" cy="28" r="3" fill="#222" /><circle cx="40" cy="38" r="3" fill="#3b2a20" /><path d="M30 60 L50 60 L40 70 Z" fill="#c4302b" /></> },
  cactus: { viewBox: "0 0 60 100", body: <><rect className="m" x="22" y="10" width="16" height="64" rx="8" /><path className="m" d="M22 44 H12 V26 a5 5 0 0 1 10 0 Z" /><path className="m" d="M38 36 H48 V20 a5 5 0 0 0 -10 0 Z" /><circle cx="30" cy="8" r="5" fill="#f2899a" /><path d="M14 74 H46 L42 98 H18 Z" fill="#c9784f" /></> },
  pumpkinlamp: { viewBox: "0 0 90 80", body: <><ellipse className="m" cx="45" cy="46" rx="40" ry="30" /><g className="d" opacity=".35"><ellipse cx="30" cy="46" rx="10" ry="28" /><ellipse cx="60" cy="46" rx="10" ry="28" /></g><path d="M26 38 l8 -8 l8 8 z M48 38 l8 -8 l8 8 z M28 56 Q45 68 62 56 Q45 62 28 56" fill="#ffd25a" /><rect x="40" y="10" width="8" height="10" rx="2" fill="#5f7a3a" /></> },
  arcade: { viewBox: "0 0 70 120", body: <><rect className="m" x="6" y="0" width="58" height="120" rx="4" /><rect x="12" y="10" width="46" height="34" rx="3" fill="#1d1d2e" /><path d="M16 36 h8 v-8 h8 v8 h8 v-14 h8" stroke="#5fe08a" strokeWidth="3" fill="none" /><rect className="d" x="4" y="50" width="62" height="16" /><circle cx="24" cy="58" r="5" fill="#e0533a" /><circle cx="44" cy="58" r="4" fill="#f6d16a" /><circle cx="54" cy="58" r="4" fill="#5fb0dc" /></> },
  moai: { viewBox: "0 0 70 110", body: <><path className="m" d="M14 110 V40 Q14 8 36 6 Q58 8 56 40 V110 Z" /><rect className="d" x="16" y="30" width="38" height="8" rx="3" /><path className="d" d="M30 38 L28 70 H42 L40 38 Z" opacity=".5" /><rect className="d" x="24" y="78" width="22" height="6" rx="3" /><rect className="d" x="10" y="40" width="6" height="34" rx="3" /></> },
  discoball: { viewBox: "0 0 70 120", body: <><rect x="33" y="40" width="4" height="70" fill="#5b4a3a" /><ellipse cx="35" cy="112" rx="18" ry="6" fill="#4a3b2e" /><circle className="m" cx="35" cy="26" r="24" /><g stroke="#fff" strokeWidth="1.2" opacity=".7"><path d="M11 26 H59 M15 14 H55 M15 38 H55 M35 2 V50 M23 4 Q18 26 23 48 M47 4 Q52 26 47 48" fill="none" /></g><circle cx="26" cy="16" r="4" fill="#fff" /></> },
  throne: { viewBox: "0 0 90 120", body: <><path className="m" d="M14 120 V20 Q14 4 45 2 Q76 4 76 20 V120 Z" /><path d="M24 40 L32 24 L45 34 L58 24 L66 40 Z" fill="#e8c35a" /><rect className="l" x="22" y="48" width="46" height="34" rx="6" /><rect className="d" x="4" y="70" width="18" height="34" rx="5" /><rect className="d" x="68" y="70" width="18" height="34" rx="5" /><rect x="10" y="80" width="70" height="12" rx="4" fill="#e8c35a" /></> },
  goldtoilet: { viewBox: "0 0 80 100", body: <><rect className="m" x="44" y="0" width="30" height="54" rx="6" /><path className="m" d="M6 50 H66 Q66 80 44 84 L46 100 H24 L26 84 Q6 80 6 50 Z" /><ellipse className="l" cx="36" cy="50" rx="30" ry="9" /><circle cx="18" cy="20" r="3" fill="#fff6d8" /><circle cx="60" cy="14" r="3" fill="#fff6d8" /></> },
  unicorn: { viewBox: "0 0 120 110", body: <><path className="d" d="M6 100 Q60 120 114 100" stroke="#e7b8f2" strokeWidth="6" fill="none" /><ellipse className="m" cx="56" cy="62" rx="34" ry="20" /><rect className="m" x="30" y="70" width="8" height="28" rx="3" /><rect className="m" x="74" y="70" width="8" height="28" rx="3" /><path className="m" d="M80 52 L96 20 L110 26 L100 56 Z" /><path d="M100 20 L108 0 L104 22 Z" fill="#f3d675" /><path d="M84 30 Q70 40 74 56 M90 26 Q76 34 78 50" stroke="#f2899a" strokeWidth="6" fill="none" /><path d="M24 58 Q8 60 10 78" stroke="#9ac7f2" strokeWidth="7" fill="none" /><circle cx="102" cy="32" r="2.5" fill="#222" /></> },
  sock: { viewBox: "0 0 80 80", body: <><path className="m" d="M30 6 H52 V44 Q52 50 58 54 L66 60 Q72 66 66 72 Q60 78 52 72 L32 58 Q26 54 28 46 Z" /><rect className="l" x="30" y="6" width="22" height="8" /><rect className="d" x="30" y="22" width="22" height="4" opacity=".5" /></> },
  emptycan: { viewBox: "0 0 60 80", body: <><rect className="m" x="12" y="10" width="36" height="62" rx="4" /><ellipse cx="30" cy="10" rx="18" ry="5" fill="#d9e1e3" /><rect x="12" y="30" width="36" height="20" fill="#c4573b" opacity=".7" /><path d="M20 40 h20" stroke="#fff" strokeWidth="2" /></> },
  newspaper: { viewBox: "0 0 90 70", body: <><rect className="m" x="6" y="10" width="78" height="54" rx="2" transform="rotate(-4 45 37)" /><g fill="#8a8780"><rect x="14" y="18" width="40" height="6" /><rect x="14" y="30" width="62" height="3" /><rect x="14" y="37" width="62" height="3" /><rect x="14" y="44" width="40" height="3" /><rect x="58" y="16" width="18" height="12" fill="#b9c3c6" /></g></> },
  pebble: { viewBox: "0 0 80 60", body: <><path className="m" d="M10 44 Q6 22 28 14 Q50 6 66 18 Q78 30 70 44 Q60 54 36 52 Q16 52 10 44 Z" /><path className="l" d="M24 22 Q36 16 48 20" stroke="#b9b5ad" strokeWidth="4" fill="none" /></> },
  tissue: { viewBox: "0 0 70 50", body: <><path className="m" d="M8 30 L34 14 L62 28 L36 44 Z" stroke="#ddd" /><path d="M20 28 L40 18" stroke="#e5e5e5" strokeDasharray="2 2" /></> },
  beanbag: { viewBox: "0 0 100 80", body: <><path className="m" d="M10 70 Q4 40 30 24 Q50 12 70 24 Q96 40 90 70 Z" /><path className="d" d="M30 46 Q50 36 70 46" stroke="#5f7a90" strokeWidth="4" fill="none" opacity=".5" /><ellipse cx="50" cy="72" rx="42" ry="6" fill="#00000022" /></> },
  guitar: { viewBox: "0 0 60 110", body: <><rect x="27" y="4" width="6" height="56" fill="#5b4a3a" /><rect x="24" y="0" width="12" height="10" rx="2" fill="#3b2a1e" /><ellipse className="m" cx="30" cy="72" rx="20" ry="16" /><ellipse className="m" cx="30" cy="92" rx="24" ry="16" /><circle cx="30" cy="80" r="6" fill="#3b2a1e" /><path d="M14 108 L30 96 L46 108" stroke="#2a2a2a" strokeWidth="3" fill="none" /></> },
  stairs: { viewBox: "0 0 100 100", body: <>{[0, 1, 2, 3, 4].map(i => <rect key={i} className={i % 2 ? "m" : "l"} x={i * 18} y={80 - i * 18} width={100 - i * 18} height="20" />)}</> },
  fence: { viewBox: "0 0 140 70", body: <><rect className="d" x="0" y="22" width="140" height="8" /><rect className="d" x="0" y="46" width="140" height="8" />{[4, 34, 64, 94, 124].map(x => <path key={x} className="m" d={`M${x} 70 V12 L${x + 6} 2 L${x + 12} 12 V70 Z`} />)}</> },
  flowerbed: { viewBox: "0 0 120 60", body: <><rect className="d" x="0" y="34" width="120" height="26" rx="4" /><rect x="6" y="30" width="108" height="10" rx="4" fill="#6b4a32" />{[14, 34, 54, 74, 94, 108].map((x, i) => <g key={x}><rect x={x - 1} y="14" width="2" height="18" fill="#4f7a3e" /><circle cx={x} cy="12" r="7" className={i % 2 ? "m" : "l"} /></g>)}</> },
  stonepath: { viewBox: "0 0 60 120", body: <>{[[18, 14], [40, 40], [20, 66], [40, 94]].map(([x, y]) => <ellipse key={y} className="m" cx={x} cy={y} rx="14" ry="10" />)}</> },
  appletree: { viewBox: "0 0 100 130", body: <><rect x="44" y="70" width="12" height="60" fill="#7a5236" /><circle className="m" cx="50" cy="48" r="40" /><circle className="l" cx="36" cy="36" r="16" opacity=".5" />{[[30, 52], [60, 34], [68, 62], [44, 70], [52, 20]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="5" fill="#d8453a" />)}</> },
  bench: { viewBox: "0 0 140 80", body: <><rect className="m" x="0" y="8" width="140" height="10" rx="3" /><rect className="m" x="0" y="22" width="140" height="10" rx="3" /><rect className="l" x="0" y="42" width="140" height="12" rx="3" /><rect x="10" y="54" width="8" height="26" fill="#3f4a44" /><rect x="122" y="54" width="8" height="26" fill="#3f4a44" /><rect x="10" y="8" width="6" height="46" fill="#3f4a44" /><rect x="124" y="8" width="6" height="46" fill="#3f4a44" /></> },
  mailbox: { viewBox: "0 0 50 120", body: <><rect x="21" y="44" width="8" height="76" fill="#5b4a3a" /><path className="m" d="M4 22 A21 18 0 0 1 46 22 V50 H4 Z" /><rect className="d" x="4" y="30" width="42" height="4" /><rect x="40" y="10" width="4" height="22" fill="#e2b85a" /></> },
  streetlamp: { viewBox: "0 0 50 150", body: <><rect className="m" x="22" y="30" width="6" height="114" /><rect className="d" x="12" y="140" width="26" height="10" rx="2" /><path className="m" d="M10 30 L18 8 H32 L40 30 Z" /><rect x="16" y="16" width="18" height="12" fill="#fff1b8" /></> },
  pond: { viewBox: "0 0 200 120", body: <><ellipse cx="100" cy="62" rx="98" ry="56" fill="#a9a398" /><ellipse className="m" cx="100" cy="60" rx="86" ry="46" /><ellipse className="l" cx="76" cy="46" rx="26" ry="10" opacity=".6" /><circle cx="130" cy="70" r="9" fill="#6f9a5a" /><circle cx="133" cy="66" r="4" fill="#f2b5c4" /></> },
  doghouse: { viewBox: "0 0 100 100", body: <><path className="d" d="M0 44 L50 4 L100 44 Z" /><rect className="m" x="10" y="40" width="80" height="60" /><path d="M36 100 V70 A14 14 0 0 1 64 70 V100 Z" fill="#3b2a1e" /><rect x="40" y="48" width="20" height="8" rx="2" fill="#efe6d6" /></> },
  blossomscarecrow: { viewBox: "0 0 90 150", body: <><rect x="42" y="30" width="6" height="120" fill="#7a5236" /><rect x="6" y="58" width="78" height="6" fill="#7a5236" /><circle cx="45" cy="30" r="15" fill="#efd9a8" /><path d="M24 58 H66 L60 104 H30 Z" fill="#f6d6e0" />{[[22, 14], [45, 8], [68, 14], [12, 52], [78, 52]].map(([x, y]) => <circle key={`${x}-${y}`} className="m" cx={x} cy={y} r="9" />)}</> },
  melonparasol: { viewBox: "0 0 140 150", body: <><rect x="68" y="40" width="5" height="105" fill="#7a5236" /><path className="m" d="M10 48 Q70 -10 130 48 Z" /><path d="M10 48 Q70 30 130 48" fill="#e05a4e" /><path d="M40 20 L35 47 M70 6 V47 M100 20 L105 47" stroke="#2f6a2a" strokeWidth="5" /><ellipse cx="70" cy="146" rx="30" ry="4" fill="#4a3b2e" /></> },
  goldenstraw: { viewBox: "0 0 120 90", body: <><rect className="m" x="8" y="40" width="104" height="46" rx="10" /><rect className="m" x="26" y="8" width="68" height="36" rx="10" /><path d="M8 58 H112 M26 24 H94" stroke="#b8862a" strokeWidth="4" /><path d="M54 8 L60 0 L66 8" fill="#c4573b" /></> },
  tangerinestove: { viewBox: "0 0 80 130", body: <><rect className="m" x="12" y="40" width="56" height="70" rx="8" /><rect x="22" y="66" width="36" height="28" rx="4" fill="#f3a03a" /><rect x="34" y="6" width="12" height="36" fill="#5b4a3a" />{[24, 40, 56].map(x => <circle key={x} cx={x} cy="34" r="8" fill="#f39a2a" />)}<rect x="16" y="110" width="8" height="16" fill="#4a3b2e" /><rect x="56" y="110" width="8" height="16" fill="#4a3b2e" /></> },
  scarecrow: { viewBox: "0 0 90 150", body: <><rect x="42" y="30" width="6" height="120" fill="#7a5236" /><rect x="6" y="58" width="78" height="6" fill="#7a5236" /><circle cx="45" cy="30" r="15" fill="#efd9a8" /><path className="m" d="M22 18 H68 L58 4 H32 Z" /><rect className="m" x="16" y="14" width="58" height="6" rx="3" /><path d="M24 58 H66 L60 104 H30 Z" fill="#6f8fb5" /><rect x="26" y="66" width="38" height="6" fill="#c4574b" /></> },
  window: { viewBox: "0 0 100 92", body: <><rect className="m" x="0" y="0" width="100" height="92" rx="3" /><rect x="7" y="7" width="86" height="78" fill="#bfe0ec" /><path d="M7 62 Q30 48 52 58 T93 54 V85 H7 Z" fill="#9cc57a" /><rect className="m" x="47" y="7" width="6" height="78" /><rect className="m" x="7" y="42" width="86" height="6" /><rect className="d" x="-4" y="86" width="108" height="6" rx="2" /></> },
  door: { viewBox: "0 0 90 180", body: <><rect x="0" y="0" width="90" height="180" fill="#efe2c8" /><rect className="m" x="8" y="8" width="74" height="172" rx="2" /><rect className="d" x="18" y="20" width="54" height="56" rx="3" opacity=".55" /><rect className="d" x="18" y="92" width="54" height="74" rx="3" opacity=".55" /><circle cx="70" cy="98" r="5" fill="#e2b85a" /></> },
  partition: { viewBox: "0 0 160 120", body: <><rect className="m" x="0" y="0" width="160" height="120" /><rect className="d" x="0" y="108" width="160" height="12" opacity=".6" /><rect className="l" x="0" y="0" width="160" height="6" /></> },
  arch: { viewBox: "0 0 160 120", body: <><path className="m" d="M0 0 H160 V120 H112 V58 A32 32 0 0 0 48 58 V120 H0 Z" /><rect className="d" x="0" y="108" width="48" height="12" opacity=".6" /><rect className="d" x="112" y="108" width="48" height="12" opacity=".6" /><rect className="l" x="0" y="0" width="160" height="6" /></> },
};

export function FurnitureArt({ id, flip }: { id: string; flip?: boolean }) {
  const art = ART[id];
  if (!art) return null;
  return <svg className="art" viewBox={art.viewBox} style={flip ? { transform: "scaleX(-1)" } : undefined} aria-hidden="true">{art.body}</svg>;
}
