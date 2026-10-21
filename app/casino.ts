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
export const DEALER_IDLE = [
  "어서 와~ 카드는 내가 섞고, 표정은 네가 관리해. ㅋㅋ",
  "오늘도 정상 영업! 내 도토리 금고만 비정상으로 귀엽지~",
  "꼬리는 흔들려도 포커페이스는 안 흔들린다구. 아마도.",
  "농사는 정직하지. 나는? …일단 앉아 봐. 히히.",
  "내가 웃어도 오해는 마~ 원래 이렇게 생겼어. ㅋㅋ",
  "여기 딜러 누구냐고? 귀여운 쪽. 그래, 나.",
];
export const LOSE_TAUNTS = [
  "도토리 적립 완료~ 아, 네 이름 말고 내 이름으로. ㅋㅋ",
  "방금 자신만만한 표정, 한 번만 다시 해 줘. 풉.",
  "내 꼬리 봤어? 기뻐서 혼자 흔들리는 거야. ㅋㅋ",
  "이 돈은 잘 키워서 훌륭한 도토리로 만들게~",
  "웃으면 안 되는데… 입꼬리가 퇴근을 안 하네. 히히.",
  "영수증 줄까? 품목은 ‘너굴이 간식’. ㅋㅋ",
  "표정 풀어~ 나는 이미 풀렸어. 아주 활짝.",
  "방금 판, 내 꼬리가 기립박수 쳤다. ㅋㅋ",
];
export const STREAK_TAUNTS = [
  "{n}연패… 내 도토리 창고에 네 이름표 붙여야겠는데?",
  "{n}판째 웃었더니 볼 아파. 잠깐 표정 관리 좀 할게. 풉.",
  "{n}연패라니… 놀릴 대사보다 네 기록이 더 빨리 쌓이네.",
  "{n}연패. 나도 웃다 지쳤어~ 물 한 잔은 공짜야.",
  "{n}연패 도장 찍었어. …씨앗 살 돈은 남겨 둔 거지?",
];
export const PARITY_TAUNTS = [
  "{pick}이라고 할 때부터 멋있더라. 결과는 {result}이지만. 풉.",
  "네 선택은 {pick}, 주사위 대답은 {result}. 둘이 안 친하네~",
  "{result} 등장! {pick}은 오늘 출근 안 했대. ㅋㅋ",
  "{pick}에 건 그 자신감… {result}이 아주 공손히 가져갔네.",
];
export const NEAR_MISS_TAUNTS = [
  "{icon}{icon}까지는 좋았지? 마지막 친구가 눈치가 없네~ 메롱.",
  "×{x}는 구경만! 마지막 그림이 문을 닫아 버렸네. 히히.",
  "{icon} 둘이서 먼저 퇴근했대. 셋째는 야근이래~ 메롱.",
  "방금 ‘오!’ 했지? 나는 ‘어라?’ 했어. 표정 들켰다~",
  "×{x} 앞에서 멈춤! 내 꼬리도 잠깐 긴장했잖아. 풉.",
];
export const WIN_GRUMBLES = [
  "…축하해. 방금 말 작았다고? 두 번은 안 해. 흥.",
  "내 도토리 예산이 걸어 나가네… 잘 챙겨 가라.",
  "웃지 마. 아니, 웃어도 돼. 나 안 보고 웃어.",
  "꽤 하네? 칭찬 아니고… 사실 확인이야.",
  "흥, 정산은 정확하게 해 줄게. 나 그런 너구리야.",
  "이겼으니까 어깨 펴. 내 어깨는 잠깐 내려갈게…",
];
export const JACKPOT_GRUMBLES = [
  "잠깐. 내 도토리 금고도 마음의 준비가 필요하거든?!",
  "잭팟…? 내 간식 계획서 처음부터 다시 써야 하잖아!",
  "축… 하… 해… 지금 꼬리까지 축 처진 거 안 보여?",
  "금고 열어! …아니, 천천히 열어. 나 작별 인사 좀.",
];

/** Repeated laughs stay short enough for a narrow dealer booth. */
export function laughter(streak: number) {
  return streak >= 6 ? "풉… 아, 볼 아파 ㅋㅋ" : streak >= 3 ? "푸하하! ㅋㅋㅋ" : "풉, ㅋㅋ";
}

/** Avoid immediately repeating the rendered line; injected RNG keeps selection testable. */
export function dealerLine(lines: readonly string[], vars: Record<string, string | number> = {}, previous = "", random = Math.random) {
  const rendered = lines.map(line => line.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? "")));
  const fresh = rendered.filter(line => line !== previous);
  const pool = fresh.length ? fresh : rendered;
  return pool.length ? pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))] : "…꼬리 정리 중이야.";
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
  bust: [
    "{n}점! 21이 결승선인데… 혼자 한 바퀴 더 돌았네. ㅋㅋ",
    "한 장만 더~ 했더니 {n}점. 카드가 열정이 넘치네.",
    "{n}점 손님~ 21번 출구를 지나치셨습니다. 메롱.",
  ],
  lose: [
    "{n}점도 멋있어. 내 카드 옆에 놓으니까 조금 작네~",
    "카드 공개 끝! 내 입꼬리도 공개. 씨익~",
    "스탠드? 좋아. 나는 기립박수. 내 카드한테. ㅋㅋ",
  ],
  dealerBlackjack: [
    "두 장이면 충분하지~ 블랙잭! 내 꼬리도 브이 했어.",
    "A랑 친구가 딱 맞춰 왔네. 블랙잭 출석 완료~",
  ],
  push: [
    "동점? 흥, 악수는 생략하고 판돈만 돌려줄게.",
    "서로 못 이긴 걸로! 표정도 원래대로 돌려놔~",
    "비겼네. 네 돈은 네 주머니로, 내 자존심은 제자리로.",
  ],
};
