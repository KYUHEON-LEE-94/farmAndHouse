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

// ---------- 너구리 딜러 대사 ----------
export const DEALER_IDLE = ["어서 와~ 오늘 월급 좀 털어볼까? 🦝", "팀장님 몰래 한 판? 쉿~", "오늘은 왠지 될 것 같은 날이지?"];
export const LOSE_TAUNTS = ["어이쿠~ 그걸 놓치네? ㅋㅋ", "고마워~ 이 돈으로 도토리 사 먹을게 🌰", "어허, 오늘 운이 영 아니네~", "에이~ 한 판만 더 하면 될 것 같은데?", "방금 거 진짜 아까웠다~ (아님)", "월급 루팡이 도박 루팡 당했네 ㅋㅋㅋ"];
export const STREAK_TAUNTS = ["벌써 {n}연패? 내 지갑이 두둑해지네~ 🤑", "{n}판 연속 꽝! 이 정도면 재능 아니야? ㅋㅋ", "{n}연패라니… 오늘 퇴근 전에 본전은 찾을 수 있을까~?", "나 오늘 너 덕분에 칼퇴한다~ {n}연패 축하해!"];
export const PARITY_TAUNTS = ["{result}이었는데 {pick}을 고르다니~ 쯧쯧", "{pick}? 나라면 {result} 골랐지~ ㅋㅋ"];
export const NEAR_MISS_TAUNTS = ["아깝다아아!!! 하나만 더 맞았으면 ×{x}였는데~ ㅋㅋ", "{icon}{icon}까지 나왔는데!! 아이고 배야 ㅋㅋㅋ", "거의 다 왔었는데~ 다음엔 진짜 터질 것 같지 않아?"];
export const WIN_GRUMBLES = ["쳇… 운이 좋았네. 한 판 더 해!", "어라? 이번엔 봐준 거야~", "흥, 다음 판은 내가 이긴다!"];
export const JACKPOT_GRUMBLES = ["으아악!! 잭팟이라니!! 내 도토리…! 😭", "말도 안 돼!! 기계 고장 난 거 아니야?!"];

export function dealerLine(lines: string[], vars: Record<string, string | number> = {}) {
  const line = lines[Math.floor(Math.random() * lines.length)];
  return line.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ""));
}
