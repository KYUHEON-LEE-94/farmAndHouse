/** 홀짝 도박장 규칙. 주사위 두 개의 합이 홀수인지 짝수인지 맞힌다(확률 정확히 50%). */
export type Parity = "odd" | "even";
export type Roll = { dice: [number, number]; result: Parity; pick: Parity; bet: number; payout: number; at: number };

/** 판돈은 최소 10원부터 가진 돈 전부까지 자유롭게 건다(상한 없음). 대신 배당을 낮춰 둔다. */
export const MIN_BET = 10;
/** 맞히면 건 돈의 1.9배를 돌려준다. 이길 확률 48%와 합치면 기대 환수율 약 91%(판돈 상한을 없앤 대신 낮췄다). */
export const PAYOUT = 1.9;
export const BET_PRESETS = [100, 500, 1000, 5000];
export const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
export const PARITY_NAME: Record<Parity, string> = { odd: "홀", even: "짝" };

export function rollDice(random = Math.random): [number, number] {
  return [1 + Math.floor(random() * 6), 1 + Math.floor(random() * 6)];
}

export const parityOf = (dice: [number, number]): Parity => ((dice[0] + dice[1]) % 2 ? "odd" : "even");

/** 홀짝은 항상 하우스가 조금 유리하다: 이길 확률 48%, 질 확률 52%. */
export const PARITY_WIN_CHANCE = 0.48;
/** 고른 쪽(pick)에 대해 48% 확률로 맞는 주사위, 아니면 틀린 주사위를 굴린다(주사위 모양은 자연스럽게). */
export function rollParity(pick: Parity, random = Math.random): [number, number] {
  const want: Parity = random() < PARITY_WIN_CHANCE ? pick : pick === "odd" ? "even" : "odd";
  for (let i = 0; i < 50; i++) { const dice = rollDice(random); if (parityOf(dice) === want) return dice; }
  return want === "odd" ? [1, 2] : [1, 1];
}

/** 슬롯머신: 릴 3개. 같은 그림 3개면 배당, 체리가 정확히 2개면 ×1.3. 기대 환수율 약 72%(판돈 상한을 없앤 대신 낮췄다). */
export const SLOT_SYMBOLS = [
  { icon: "🍒", weight: 30, triple: 6 },
  { icon: "🍋", weight: 25, triple: 8 },
  { icon: "🍉", weight: 20, triple: 12 },
  { icon: "🔔", weight: 13, triple: 25 },
  { icon: "⭐", weight: 8, triple: 60 },
  { icon: "7️⃣", weight: 4, triple: 150 },
];
export const CHERRY_PAIR = 1.3;

export function spinReel(random = Math.random) {
  let roll = random() * SLOT_SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
  for (const symbol of SLOT_SYMBOLS) { roll -= symbol.weight; if (roll < 0) return symbol.icon; }
  return SLOT_SYMBOLS[0].icon;
}

export function slotMultiplier(reels: string[]) {
  if (reels[0] === reels[1] && reels[1] === reels[2]) return SLOT_SYMBOLS.find(symbol => symbol.icon === reels[0])!.triple;
  return reels.filter(icon => icon === "🍒").length === 2 ? CHERRY_PAIR : 0;
}

/** 슬롯 확률표: 그림별 3개 확률과 🍒 2개 확률, 판돈 이상 돌려받을 확률. */
export function slotOdds() {
  const total = SLOT_SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0), p = (w: number) => w / total;
  const triples = SLOT_SYMBOLS.map(symbol => ({ icon: symbol.icon, chance: p(symbol.weight) ** 3, payout: symbol.triple }));
  const cherry = p(SLOT_SYMBOLS[0].weight), cherryPair = 3 * cherry ** 2 * (1 - cherry);
  const anyWin = triples.reduce((sum, row) => sum + row.chance, 0) + cherryPair;
  return { triples, cherryPair, anyWin };
}
/** 블랙잭 대략 확률(17 미만이면 히트하는 단순 전략, 10만 판 시뮬레이션). 카드는 무작위라 공식 값이 아니라 참고용. */
export const BLACKJACK_ODDS = { win: 0.414, lose: 0.492, push: 0.093, blackjack: 0.048 };

/** 이론상 기대 환수율(검증용). */
export function slotReturnRate() {
  const total = SLOT_SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0), p = (w: number) => w / total;
  const triples = SLOT_SYMBOLS.reduce((sum, symbol) => sum + p(symbol.weight) ** 3 * symbol.triple, 0);
  const cherry = p(SLOT_SYMBOLS[0].weight);
  return triples + 3 * cherry ** 2 * (1 - cherry) * CHERRY_PAIR;
}

// ---------- 너구리 딜러 대사 ----------
export const DEALER_IDLE = ["어서 와~ 오늘 월급 좀 털어볼까? 🦝", "팀장님 몰래 한 판? 쉿~ ㅋㅋ", "오늘은 왠지 될 것 같은 날이지? (안 됨) ㅋㅋㅋ", "어이~ 호구… 아니 손님! 어서 오세요~ 😏"];
export const LOSE_TAUNTS = [
  "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ~ 그걸 놓치네?",
  "푸하하하핫ㅋㅋㅋㅋ 고마워~ 이 돈으로 도토리 사 먹을게 🌰",
  "ㅋㅋㅋㅋㅋ 아 진짜 배 아파 ㅋㅋㅋㅋㅋ",
  "에이~ 한 판만 더 하면 될 것 같은데? ㅋㅋㅋㅋ (아님)",
  "어머어머 ㅋㅋㅋㅋ 방금 거 봤어? 나만 봤어? ㅋㅋㅋㅋㅋ",
  "월급 루팡이 도박 루팡 당했네 ㅋㅋㅋㅋㅋㅋㅋ",
  "잘 가라 내 돈… 아니 네 돈 ㅋㅋㅋㅋㅋㅋ 👋",
  "와 진짜 예술이다 ㅋㅋㅋㅋ 일부러 틀리기도 힘든데 ㅋㅋㅋ",
  "ㅋㅋㅋㅋ 표정 관리 좀 해~ 다 보여 ㅋㅋㅋㅋ",
  "끄억~ 잘 먹었습니다 ㅋㅋㅋㅋㅋㅋ 🍽️",
];
export const STREAK_TAUNTS = [
  "{n}연패 ㅋㅋㅋㅋㅋㅋㅋㅋ 이 정도면 재능 아니야? ㅋㅋㅋㅋ",
  "벌써 {n}연패? ㅋㅋㅋㅋ 내 지갑 터지겠다 🤑🤑",
  "{n}판 연속 꽝 ㅋㅋㅋㅋㅋㅋ 기록 세우는 중이야? 🏆",
  "{n}연패라니 ㅋㅋㅋㅋ 오늘 퇴근 전에 본전 찾을 수 있을까~? 못 찾지 ㅋㅋㅋ",
  "나 오늘 너 덕분에 칼퇴한다~ {n}연패 축하해 ㅋㅋㅋㅋㅋ 🎉",
  "{n}연패 기념으로 사진 한 장 찍자 ㅋㅋㅋㅋ 찰칵📸",
  "ㅋㅋㅋㅋㅋㅋ {n}연패면 그냥 나한테 월급 이체하는 게 빠르지 않아? ㅋㅋㅋ",
];
export const PARITY_TAUNTS = ["{result}이었는데 {pick}을 고르다니 ㅋㅋㅋㅋ 쯧쯧쯧", "{pick}? ㅋㅋㅋㅋㅋ 나라면 눈 감고도 {result} 골랐다 ㅋㅋㅋ", "이 확률에 도박을 해? ㅋㅋㅋㅋ 개이득~ 땡큐!"];
export const NEAR_MISS_TAUNTS = [
  "아깝다아아아ㅋㅋㅋㅋㅋ 하나만 더 맞았으면 ×{x}였는데~ ㅋㅋㅋㅋㅋ",
  "{icon}{icon}까지 나왔는데!! 푸하하핫 ㅋㅋㅋㅋ 아이고 배야 ㅋㅋㅋㅋ",
  "거의 다 왔었는데~ ㅋㅋㅋㅋ 다음엔 진짜 터질 것 같지 않아? (안 터짐) ㅋㅋㅋ",
  "×{x} 놓친 표정 너무 웃기다 ㅋㅋㅋㅋㅋㅋㅋㅋ 한 번만 더 보여줘 ㅋㅋㅋ",
];
export const WIN_GRUMBLES = ["쳇… 운이 좋았네. 한 판 더 해! 😤", "어라? 이번엔 봐준 거야~ 진짜야!", "흥, 초심자의 행운이지 뭐. 다음 판은 내 거야", "…지금 웃었지? 다음 판에 두고 봐 😠"];
export const JACKPOT_GRUMBLES = ["으아아악!! 잭팟이라니!! 내 도토리…! 😭😭", "말도 안 돼!! 기계 고장 난 거 아니야?! 사장님!! 😱"];

/** 연패가 길수록 웃음이 길어진다. */
export function laughter(streak: number) {
  return "ㅋ".repeat(Math.min(40, 3 + Math.max(0, streak) * 4)) + "~";
}

export function dealerLine(lines: string[], vars: Record<string, string | number> = {}) {
  const line = lines[Math.floor(Math.random() * lines.length)];
  return line.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ""));
}

// ---------- 블랙잭 ----------
/** 카드 덱은 무한 덱(매번 무작위)으로 단순화. 딜러는 17 이상에서 멈춘다(소프트 17 포함). 블랙잭은 3:2. */
export type Card = { rank: number; suit: "♠" | "♥" | "♦" | "♣" };
/** 블랙잭(처음 두 장 21) ×2.2, 일반 승리 ×1.9. 판돈 상한을 없앤 대신 낮췄다. */
export const BLACKJACK_PAYOUT = 2.2;
export const BLACKJACK_WIN = 1.9;
const SUITS: Card["suit"][] = ["♠", "♥", "♦", "♣"];

export function drawCard(random = Math.random): Card {
  return { rank: 1 + Math.floor(random() * 13), suit: SUITS[Math.floor(random() * 4)] };
}

export const cardLabel = (card: Card) => ({ 1: "A", 11: "J", 12: "Q", 13: "K" } as Record<number, string>)[card.rank] ?? String(card.rank);

/** 손패 점수. A는 1 또는 11 중 버스트하지 않는 쪽. */
export function handValue(cards: Card[]) {
  let total = 0, aces = 0;
  for (const card of cards) { total += Math.min(10, card.rank); if (card.rank === 1) aces++; }
  const soft = aces > 0 && total + 10 <= 21;
  return { total: soft ? total + 10 : total, soft };
}

export const isBlackjack = (cards: Card[]) => cards.length === 2 && handValue(cards).total === 21;
export const dealerShouldHit = (cards: Card[]) => handValue(cards).total < 17;

export type BlackjackOutcome = "blackjack" | "win" | "push" | "lose" | "bust";

/** 판정과 돌려받는 금액(판돈 포함). */
export function settleBlackjack(player: Card[], dealer: Card[], bet: number): { outcome: BlackjackOutcome; payout: number } {
  const p = handValue(player).total, d = handValue(dealer).total;
  if (p > 21) return { outcome: "bust", payout: 0 };
  if (isBlackjack(player) && !isBlackjack(dealer)) return { outcome: "blackjack", payout: Math.floor(bet * BLACKJACK_PAYOUT) };
  if (isBlackjack(dealer) && !isBlackjack(player)) return { outcome: "lose", payout: 0 };
  if (d > 21 || p > d) return { outcome: "win", payout: Math.floor(bet * BLACKJACK_WIN) };
  if (p === d) return { outcome: "push", payout: bet };
  return { outcome: "lose", payout: 0 };
}

export const BLACKJACK_TAUNTS = {
  bust: ["버스트 ㅋㅋㅋㅋㅋㅋㅋㅋ 21 넘는 거 처음 봐? ㅋㅋㅋㅋ", "욕심이 화를 부른다~ ㅋㅋㅋㅋㅋ {n}점 축하해 ㅋㅋㅋ", "한 장만 더… 한 장만 더… 하다가 터졌네 ㅋㅋㅋㅋㅋㅋ 💥"],
  lose: ["딜러 승 ㅋㅋㅋㅋㅋㅋ 내 카드 봤어? 봤지? ㅋㅋㅋㅋ", "{n}점으로 나를 이기려고? ㅋㅋㅋㅋㅋㅋㅋ 귀엽다", "스탠드 타이밍 완벽했어~ 나한테 지기에 딱 좋은 ㅋㅋㅋㅋ"],
  dealerBlackjack: ["블랙잭~!! ㅋㅋㅋㅋㅋㅋㅋㅋ 미안 미안 (안 미안) ㅋㅋㅋ"],
  push: ["무승부? 쳇… 다음 판은 꼭 털어 간다 ㅋㅋ"],
};
