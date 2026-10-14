export type Season = "봄" | "여름" | "가을" | "겨울";
export type FishRarity = "흔함" | "보통" | "희귀" | "전설";
export type Fish = { id: string; name: string; icon: string; season: Season; rarity: FishRarity; price: number; note: string };
/** barBonus: 낚시 미니게임 초록 막대 길이 보너스(트랙 비율). */
export type Bait = { id: string; name: string; icon: string; pack: number; price: number; normalBoost: number; rareBoost: number; legendBoost: number; barBonus: number; note: string };

// 전설 확률은 1% 고정. 미끼·낚싯대·버프·날씨·펫 어느 것도 바꾸지 않는다(배수가 겹쳐 전설이 쏟아진 사고 이후 고정).
export const LEGEND_CHANCE = 0.01;
export const RARITY_WEIGHT: Record<Exclude<FishRarity, "전설">, number> = { 흔함: 0.6, 보통: 0.3, 희귀: 0.1 };

export const BAITS: Bait[] = [
  { id: "worm", name: "지렁이", icon: "🪱", pack: 10, price: 100, normalBoost: 1, rareBoost: 1, legendBoost: 1, barBonus: 0, note: "기본 미끼" },
  { id: "paste", name: "떡밥", icon: "🍙", pack: 10, price: 250, normalBoost: 1.6, rareBoost: 1, legendBoost: 1.1, barBonus: 0.02, note: "보통 ×1.6" },
  { id: "shrimp", name: "민물새우", icon: "🦐", pack: 10, price: 600, normalBoost: 1.2, rareBoost: 2, legendBoost: 1.3, barBonus: 0.03, note: "희귀 ×2" },
  { id: "golden", name: "황금 미끼", icon: "✨", pack: 3, price: 1500, normalBoost: 1.5, rareBoost: 3.5, legendBoost: 1.8, barBonus: 0.06, note: "희귀 ×3.5" },
];
export const STARTER_BAIT: Record<string, number> = { worm: 10 };
/** 미끼가 하나도 없을 때 무료 낚시터에서 쓰는 맨손 낚시: 입질이 느리고 흔함·보통만 잡힌다(희귀·전설·특별 없음). */
export const BARE_HAND: Bait = { id: "barehand", name: "맨손 낚시", icon: "🫳", pack: 0, price: 0, normalBoost: 1, rareBoost: 0, legendBoost: 0, barBonus: 0, note: "미끼 없이 · 입질 느림 · 흔함·보통만" };

/**
 * 낚싯대: 미니게임 난이도를 낮춰 준다.
 * bar: 초록 막대 길이(트랙 비율), gain/drain: 게이지가 차고 줄어드는 속도 배수, treasure: 보물상자 확률.
 */
export type Rod = { id: string; name: string; icon: string; price: number; bar: number; gain: number; drain: number; treasure: number; legendBoost: number; note: string };
export const RODS: Rod[] = [
  { id: "bamboo", name: "대나무 낚싯대", icon: "🎋", price: 0, bar: 0.22, gain: 1, drain: 1, treasure: 0.18, legendBoost: 1, note: "기본 낚싯대" },
  { id: "fiberglass", name: "유리섬유 낚싯대", icon: "🎣", price: 2500, bar: 0.26, gain: 1.1, drain: 0.9, treasure: 0.2, legendBoost: 1.2, note: "게이지 +10%" },
  { id: "carbon", name: "카본 낚싯대", icon: "🪝", price: 7000, bar: 0.3, gain: 1.2, drain: 0.8, treasure: 0.22, legendBoost: 1.5, note: "게이지 +20%" },
  { id: "iridium", name: "이리듐 낚싯대", icon: "💎", price: 18000, bar: 0.35, gain: 1.32, drain: 0.7, treasure: 0.25, legendBoost: 2, note: "게이지 +32%" },
  { id: "golden", name: "전설의 황금 낚싯대", icon: "👑", price: 40000, bar: 0.4, gain: 1.45, drain: 0.6, treasure: 0.35, legendBoost: 2.5, note: "최고의 낚싯대" },
];

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

/** 계절 물고기 한 마리를 뽑는다. 전설은 기본 1%에 낚싯대·미끼·버프 배수를 적용한다. */
export function rollFish(season: Season, boost: { normal?: number; rare?: number; legend?: number } = {}, random = Math.random): Fish {
  const pool = FISH.filter(fish => fish.season === season);
  if (boost.legend !== 0 && random() < LEGEND_CHANCE) return pool.find(fish => fish.rarity === "전설")!;
  const multiplier = { 흔함: 1, 보통: boost.normal ?? 1, 희귀: boost.rare ?? 1 };
  const weights = pool.filter(fish => fish.rarity !== "전설").map(fish => {
    const rarity = fish.rarity as keyof typeof RARITY_WEIGHT;
    return { fish, weight: (RARITY_WEIGHT[rarity] * multiplier[rarity]) / pool.filter(other => other.rarity === rarity).length };
  });
  let roll = random() * weights.reduce((sum, item) => sum + item.weight, 0);
  for (const item of weights) { roll -= item.weight; if (roll <= 0) return item.fish; }
  return weights[0].fish;
}

/**
 * 낚시 장소. 유료 장소는 입장권(minutes분)을 사야 하고, 시간이 지나면 다시 사야 한다.
 * normalBoost/rareBoost는 미끼·버프와 곱해진다. 전설은 낚싯대와 미끼 배수를 사용한다.
 */
export type FishingSpot = { id: string; name: string; icon: string; price: number; minutes: number; normalBoost: number; rareBoost: number; treasureBonus: number; note: string };
export const SPOTS: FishingSpot[] = [
  { id: "river", name: "강가", icon: "🏞️", price: 0, minutes: 0, normalBoost: 1, rareBoost: 1, treasureBonus: 0, note: "무료 · 기본 낚시터" },
  { id: "lake", name: "호숫가", icon: "⛰️", price: 0, minutes: 0, normalBoost: 1.3, rareBoost: 1, treasureBonus: 0, note: "무료 · 보통 등급 ×1.3" },
  { id: "sea", name: "바다 방파제", icon: "🌊", price: 1500, minutes: 10, normalBoost: 1.2, rareBoost: 1.8, treasureBonus: 0.03, note: "희귀 ×1.8 · 보통 ×1.2" },
  { id: "valley", name: "깊은 계곡", icon: "🏔️", price: 3000, minutes: 10, normalBoost: 1.5, rareBoost: 2.5, treasureBonus: 0.05, note: "희귀 ×2.5 · 보통 ×1.5" },
  { id: "reservoir", name: "비밀 저수지", icon: "🌌", price: 8000, minutes: 10, normalBoost: 2, rareBoost: 4, treasureBonus: 0.1, note: "희귀 ×4 · 보통 ×2 · 보물상자 +10%" },
];

/**
 * 특별 물고기: 계절과 무관하게 특정 날씨나 유료 낚시 장소에서만 잡힌다(희귀 등급 난이도).
 * 조건이 맞으면 입질 때 SPECIAL_CHANCE 확률로 이 물고기가 걸린다(전설 판정 다음).
 */
export type SpecialFish = Fish & { weather?: string; spot?: string; condition: string };
export const SPECIAL_CHANCE = 0.08;
export const SPECIAL_FISH: SpecialFish[] = [
  { id: "sun-goldfish", name: "햇살 금붕어", icon: "🐡", season: "봄", rarity: "희귀", price: 450, note: "햇빛을 받아 비늘이 금빛으로 빛나요.", weather: "clear", condition: "☀️ 맑은 날" },
  { id: "rain-sweetfish", name: "빗방울 은어", icon: "💧", season: "봄", rarity: "희귀", price: 480, note: "빗소리를 따라 수면 가까이 올라와요.", weather: "rain", condition: "🌧️ 비 오는 날" },
  { id: "thunder-eel", name: "번개 장어", icon: "⚡", season: "봄", rarity: "희귀", price: 650, note: "몸에서 찌릿찌릿 전기가 흘러요.", weather: "storm", condition: "⛈️ 천둥번개 치는 날" },
  { id: "snow-smelt", name: "눈꽃 빙어", icon: "❄️", season: "봄", rarity: "희귀", price: 520, note: "몸에 눈꽃 무늬가 새겨져 있어요.", weather: "snow", condition: "🌨️ 눈 오는 날" },
  { id: "fog-catfish", name: "안개 메기", icon: "🌫️", season: "봄", rarity: "희귀", price: 500, note: "안개 속에서만 모습을 드러내요.", weather: "fog", condition: "🌫️ 안개 낀 날" },
  { id: "sea-bream", name: "참돔", icon: "🐟", season: "봄", rarity: "희귀", price: 700, note: "바다의 여왕. 붉은 비늘이 아름다워요.", spot: "sea", condition: "🌊 바다 방파제" },
  { id: "valley-chub", name: "어름치", icon: "🐠", season: "봄", rarity: "희귀", price: 850, note: "맑은 계곡에만 사는 천연기념물.", spot: "valley", condition: "🏔️ 깊은 계곡" },
  { id: "moon-carp", name: "달빛 잉어", icon: "🌙", season: "봄", rarity: "희귀", price: 1200, note: "비밀 저수지의 달빛을 먹고 자랐대요.", spot: "reservoir", condition: "🌌 비밀 저수지" },
];

/** 지금 날씨·장소에서 잡힐 수 있는 특별 물고기 중 하나(없으면 null). */
export function rollSpecialFish(weather: string | undefined, spot: string, random = Math.random): SpecialFish | null {
  const pool = SPECIAL_FISH.filter(fish => (fish.weather && fish.weather === weather) || (fish.spot && fish.spot === spot));
  if (!pool.length || random() >= SPECIAL_CHANCE * pool.length) return null;
  return pool[Math.floor(random() * pool.length)];
}
