export type Season = "봄" | "여름" | "가을" | "겨울";
export type FishRarity = "흔함" | "보통" | "희귀" | "전설";
export type Fish = { id: string; name: string; icon: string; season: Season; rarity: FishRarity; price: number; note: string };
/** barBonus: 낚시 미니게임 초록 막대 길이 보너스(트랙 비율). */
export type Bait = { id: string; name: string; icon: string; pack: number; price: number; normalBoost: number; rareBoost: number; barBonus: number; note: string };

// 등급별 기본 확률. 전설은 기획상 0.1% 고정이며 미끼·버프로도 바뀌지 않는다.
export const LEGEND_CHANCE = 0.001;
export const RARITY_WEIGHT: Record<Exclude<FishRarity, "전설">, number> = { 흔함: 0.6, 보통: 0.3, 희귀: 0.1 };

export const BAITS: Bait[] = [
  { id: "worm", name: "지렁이", icon: "🪱", pack: 10, price: 100, normalBoost: 1, rareBoost: 1, barBonus: 0, note: "가장 기본적인 미끼" },
  { id: "paste", name: "떡밥", icon: "🍙", pack: 10, price: 250, normalBoost: 1.6, rareBoost: 1, barBonus: 0.02, note: "보통 등급이 잘 물어요 · 막대 조금 길게" },
  { id: "shrimp", name: "민물새우", icon: "🦐", pack: 10, price: 600, normalBoost: 1.2, rareBoost: 2, barBonus: 0.03, note: "희귀 등급 ×2 · 막대 길게" },
  { id: "golden", name: "황금 미끼", icon: "✨", pack: 3, price: 1500, normalBoost: 1.5, rareBoost: 3.5, barBonus: 0.06, note: "희귀 등급 ×3.5 · 막대 아주 길게" },
];
export const STARTER_BAIT: Record<string, number> = { worm: 10 };

export const FISH: Fish[] = [
  { id: "minnow", name: "피라미", icon: "🐟", season: "봄", rarity: "흔함", price: 35, note: "봄 개울에서 떼 지어 다녀요." },
  { id: "chub", name: "버들치", icon: "🐟", season: "봄", rarity: "흔함", price: 40, note: "맑은 계곡 상류의 터줏대감." },
  { id: "ricefish", name: "송사리", icon: "🐟", season: "봄", rarity: "흔함", price: 30, note: "논두렁 물웅덩이의 작은 친구." },
  { id: "crucian", name: "붕어", icon: "🐟", season: "봄", rarity: "보통", price: 70, note: "물이 데워지면 활발해져요." },
  { id: "carp", name: "잉어", icon: "🐠", season: "봄", rarity: "보통", price: 90, note: "힘이 좋아 손맛이 일품이에요." },
  { id: "barbel", name: "누치", icon: "🐟", season: "봄", rarity: "보통", price: 80, note: "모래 바닥을 훑고 다녀요." },
  { id: "mandarinfish", name: "쏘가리", icon: "🐠", season: "봄", rarity: "희귀", price: 220, note: "맑은 여울의 귀한 손님." },
  { id: "lenok", name: "열목어", icon: "🐠", season: "봄", rarity: "희귀", price: 260, note: "차고 깨끗한 물에만 사는 천연기념물." },
  { id: "legend-spring", name: "벚꽃 잉어왕", icon: "🌸", season: "봄", rarity: "전설", price: 30000, note: "벚꽃잎이 비늘이 되었다는 연못의 주인." },
  { id: "sweetfish", name: "은어", icon: "🐟", season: "여름", rarity: "흔함", price: 45, note: "수박 향이 나는 여름 물고기." },
  { id: "darkchub", name: "갈겨니", icon: "🐟", season: "여름", rarity: "흔함", price: 35, note: "여울에서 반짝이며 뛰어올라요." },
  { id: "gudgeon", name: "모래무지", icon: "🐟", season: "여름", rarity: "흔함", price: 40, note: "모래 속에 몸을 숨겨요." },
  { id: "catfish", name: "메기", icon: "🐡", season: "여름", rarity: "보통", price: 85, note: "소나기 뒤에 잘 물어요." },
  { id: "bagrid", name: "빠가사리", icon: "🐡", season: "여름", rarity: "보통", price: 90, note: "잡으면 '빠각빠각' 소리를 내요." },
  { id: "kkeuri", name: "끄리", icon: "🐟", season: "여름", rarity: "보통", price: 75, note: "성질 급한 여름 사냥꾼." },
  { id: "eel", name: "민물장어", icon: "🐍", season: "여름", rarity: "희귀", price: 260, note: "여름 보양식의 대명사." },
  { id: "snakehead", name: "가물치", icon: "🐊", season: "여름", rarity: "희귀", price: 240, note: "연못의 무법자." },
  { id: "legend-summer", name: "천둥 메기", icon: "⚡", season: "여름", rarity: "전설", price: 30000, note: "천둥이 칠 때만 수면에 오른다는 거대 메기." },
  { id: "dace", name: "황어", icon: "🐟", season: "가을", rarity: "흔함", price: 40, note: "가을 물살을 거슬러 올라요." },
  { id: "bitterling", name: "납자루", icon: "🐟", season: "가을", rarity: "흔함", price: 30, note: "조개 속에 알을 낳는 작은 물고기." },
  { id: "pondsmelt", name: "참붕어", icon: "🐟", season: "가을", rarity: "흔함", price: 35, note: "저수지 어디에나 있어요." },
  { id: "bass", name: "꺽지", icon: "🐠", season: "가을", rarity: "보통", price: 80, note: "바위틈에 숨어 사는 토종 물고기." },
  { id: "skygazer", name: "강준치", icon: "🐟", season: "가을", rarity: "보통", price: 85, note: "하늘을 보는 입이 특징이에요." },
  { id: "goby", name: "망둥어", icon: "🐟", season: "가을", rarity: "보통", price: 70, note: "가을 강 하구의 단골손님." },
  { id: "salmon", name: "연어", icon: "🍣", season: "가을", rarity: "희귀", price: 280, note: "고향 강으로 돌아온 연어." },
  { id: "geumgang", name: "금강모치", icon: "🐠", season: "가을", rarity: "희귀", price: 250, note: "깊은 산골 계곡에서만 만나요." },
  { id: "legend-autumn", name: "황금 연어", icon: "🏆", season: "가을", rarity: "전설", price: 30000, note: "단풍빛 비늘을 두른 전설 속 연어." },
  { id: "smelt", name: "빙어", icon: "🐟", season: "겨울", rarity: "흔함", price: 30, note: "얼음 구멍 낚시의 단골." },
  { id: "loach", name: "미꾸라지", icon: "🐟", season: "겨울", rarity: "흔함", price: 35, note: "진흙 속에서 겨울잠을 자다 깼어요." },
  { id: "sleeper", name: "동사리", icon: "🐟", season: "겨울", rarity: "흔함", price: 40, note: "돌 밑에 꼼짝 않고 숨어 있어요." },
  { id: "trout", name: "송어", icon: "🐟", season: "겨울", rarity: "보통", price: 90, note: "차가운 물을 좋아해요." },
  { id: "rainbow", name: "무지개송어", icon: "🐠", season: "겨울", rarity: "보통", price: 95, note: "옆구리에 무지개가 떠요." },
  { id: "swiri", name: "쉬리", icon: "🐟", season: "겨울", rarity: "보통", price: 85, note: "물살 센 여울의 날쌘돌이." },
  { id: "masu", name: "산천어", icon: "🐠", season: "겨울", rarity: "희귀", price: 240, note: "계곡 얼음 밑의 보석." },
  { id: "golden-mandarin", name: "황쏘가리", icon: "🐠", season: "겨울", rarity: "희귀", price: 300, note: "온몸이 금빛인 천연기념물." },
  { id: "legend-winter", name: "얼음 용왕 철갑상어", icon: "🐉", season: "겨울", rarity: "전설", price: 30000, note: "언 강 깊은 곳에서 백 년을 산 수호자." },
];

/** 계절 물고기 한 마리를 뽑는다. 같은 등급 안에서는 균등, 등급 간에는 가중치. 전설은 항상 0.1%. */
export function rollFish(season: Season, boost: { normal?: number; rare?: number } = {}, random = Math.random): Fish {
  const pool = FISH.filter(fish => fish.season === season);
  if (random() < LEGEND_CHANCE) return pool.find(fish => fish.rarity === "전설")!;
  const multiplier = { 흔함: 1, 보통: boost.normal ?? 1, 희귀: boost.rare ?? 1 };
  const weights = pool.filter(fish => fish.rarity !== "전설").map(fish => {
    const rarity = fish.rarity as keyof typeof RARITY_WEIGHT;
    return { fish, weight: (RARITY_WEIGHT[rarity] * multiplier[rarity]) / pool.filter(other => other.rarity === rarity).length };
  });
  let roll = random() * weights.reduce((sum, item) => sum + item.weight, 0);
  for (const item of weights) { roll -= item.weight; if (roll <= 0) return item.fish; }
  return weights[0].fish;
}
