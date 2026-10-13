/** 홀짝 도박장 규칙. 주사위 두 개의 합이 홀수인지 짝수인지 맞힌다(확률 정확히 50%). */
export type Parity = "odd" | "even";
export type Roll = { dice: [number, number]; result: Parity; pick: Parity; bet: number; payout: number; at: number };

export const MIN_BET = 100;
export const MAX_BET = 10000;
/** 맞히면 건 돈의 1.95배를 돌려준다(하우스 몫 2.5%라 장기적으로는 잃는다). */
export const PAYOUT = 1.95;
export const BET_PRESETS = [100, 500, 1000, 5000];
export const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
export const PARITY_NAME: Record<Parity, string> = { odd: "홀", even: "짝" };

export function rollDice(random = Math.random): [number, number] {
  return [1 + Math.floor(random() * 6), 1 + Math.floor(random() * 6)];
}

export const parityOf = (dice: [number, number]): Parity => ((dice[0] + dice[1]) % 2 ? "odd" : "even");

/** 슬롯머신: 릴 3개. 같은 그림 3개면 배당, 체리가 정확히 2개면 ×1.5. 기대 환수율 약 90%. */
export const SLOT_SYMBOLS = [
  { icon: "🍒", weight: 30, triple: 8 },
  { icon: "🍋", weight: 25, triple: 10 },
  { icon: "🍉", weight: 20, triple: 15 },
  { icon: "🔔", weight: 13, triple: 30 },
  { icon: "⭐", weight: 8, triple: 80 },
  { icon: "7️⃣", weight: 4, triple: 300 },
];
export const CHERRY_PAIR = 1.5;

export function spinReel(random = Math.random) {
  let roll = random() * SLOT_SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
  for (const symbol of SLOT_SYMBOLS) { roll -= symbol.weight; if (roll < 0) return symbol.icon; }
  return SLOT_SYMBOLS[0].icon;
}

export function slotMultiplier(reels: string[]) {
  if (reels[0] === reels[1] && reels[1] === reels[2]) return SLOT_SYMBOLS.find(symbol => symbol.icon === reels[0])!.triple;
  return reels.filter(icon => icon === "🍒").length === 2 ? CHERRY_PAIR : 0;
}

/** 이론상 기대 환수율(검증용). */
export function slotReturnRate() {
  const total = SLOT_SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0), p = (w: number) => w / total;
  const triples = SLOT_SYMBOLS.reduce((sum, symbol) => sum + p(symbol.weight) ** 3 * symbol.triple, 0);
  const cherry = p(SLOT_SYMBOLS[0].weight);
  return triples + 3 * cherry ** 2 * (1 - cherry) * CHERRY_PAIR;
}
