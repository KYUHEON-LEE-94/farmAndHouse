export type Season = "봄" | "여름" | "가을" | "겨울";
export type FishRarity = "흔함" | "보통" | "희귀" | "전설";
export type Fish = { id: string; name: string; icon: string; season: Season; rarity: FishRarity; price: number; note: string };

// 등급별 기본 확률. 전설은 기획상 0.1% 고정이며 어떤 버프로도 바뀌지 않는다.
export const LEGEND_CHANCE = 0.001;
export const RARITY_WEIGHT: Record<Exclude<FishRarity, "전설">, number> = { 흔함: 0.6, 보통: 0.3, 희귀: 0.1 };

export const FISH: Fish[] = [
  { id: "minnow", name: "피라미", icon: "🐟", season: "봄", rarity: "흔함", price: 35, note: "봄 개울에서 떼 지어 다녀요." },
  { id: "crucian", name: "붕어", icon: "🐟", season: "봄", rarity: "보통", price: 70, note: "물이 데워지면 활발해져요." },
  { id: "mandarinfish", name: "쏘가리", icon: "🐠", season: "봄", rarity: "희귀", price: 220, note: "맑은 여울의 귀한 손님." },
  { id: "legend-spring", name: "벚꽃 잉어왕", icon: "🌸", season: "봄", rarity: "전설", price: 30000, note: "벚꽃잎이 비늘이 되었다는 연못의 주인." },
  { id: "sweetfish", name: "은어", icon: "🐟", season: "여름", rarity: "흔함", price: 45, note: "수박 향이 나는 여름 물고기." },
  { id: "catfish", name: "메기", icon: "🐡", season: "여름", rarity: "보통", price: 85, note: "소나기 뒤에 잘 물어요." },
  { id: "eel", name: "민물장어", icon: "🐍", season: "여름", rarity: "희귀", price: 260, note: "여름 보양식의 대명사." },
  { id: "legend-summer", name: "천둥 메기", icon: "⚡", season: "여름", rarity: "전설", price: 30000, note: "천둥이 칠 때만 수면에 오른다는 거대 메기." },
  { id: "dace", name: "황어", icon: "🐟", season: "가을", rarity: "흔함", price: 40, note: "가을 물살을 거슬러 올라요." },
  { id: "bass", name: "꺽지", icon: "🐠", season: "가을", rarity: "보통", price: 80, note: "바위틈에 숨어 사는 토종 물고기." },
  { id: "salmon", name: "연어", icon: "🍣", season: "가을", rarity: "희귀", price: 280, note: "고향 강으로 돌아온 연어." },
  { id: "legend-autumn", name: "황금 연어", icon: "🏆", season: "가을", rarity: "전설", price: 30000, note: "단풍빛 비늘을 두른 전설 속 연어." },
  { id: "smelt", name: "빙어", icon: "🐟", season: "겨울", rarity: "흔함", price: 30, note: "얼음 구멍 낚시의 단골." },
  { id: "trout", name: "송어", icon: "🐟", season: "겨울", rarity: "보통", price: 90, note: "차가운 물을 좋아해요." },
  { id: "masu", name: "산천어", icon: "🐠", season: "겨울", rarity: "희귀", price: 240, note: "계곡 얼음 밑의 보석." },
  { id: "legend-winter", name: "얼음 용왕 철갑상어", icon: "🐉", season: "겨울", rarity: "전설", price: 30000, note: "언 강 깊은 곳에서 백 년을 산 수호자." },
];

/** 계절 물고기 한 마리를 뽑는다. rareBoost는 버프로 희귀 확률을 늘릴 때 쓴다(전설 확률은 불변). */
export function rollFish(season: Season, rareBoost = 1, random = Math.random): Fish {
  const pool = FISH.filter(fish => fish.season === season);
  if (random() < LEGEND_CHANCE) return pool.find(fish => fish.rarity === "전설")!;
  const weights = pool.filter(fish => fish.rarity !== "전설").map(fish => ({ fish, weight: RARITY_WEIGHT[fish.rarity as keyof typeof RARITY_WEIGHT] * (fish.rarity === "희귀" ? rareBoost : 1) }));
  let roll = random() * weights.reduce((sum, item) => sum + item.weight, 0);
  for (const item of weights) { roll -= item.weight; if (roll <= 0) return item.fish; }
  return weights[0].fish;
}
