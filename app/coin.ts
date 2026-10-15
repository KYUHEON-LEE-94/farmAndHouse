import { TEST_MODE } from "./testMode";
/**
 * 도박장 코인 거래소(게임머니 전용, 실제 시세·현금과 무관). 주식창처럼 코인 10종이 동시에 거래된다.
 *
 * - 자리(slot) 10개에 코인이 하나씩 상장된다. 시세는 5분마다 바뀐다.
 * - 시세는 시각(5분 칸)·자리·회차 번호의 해시로만 정해져 새로고침해도 다시 뽑히지 않고, 모든 사람이 같은 시세를 본다.
 * - 코인이 상장될 때 운명이 정해진다: COIN_DELIST_CHANCE(80%)는 최대 COIN_MAX_TICKS번 갱신 안의 어느 순간 상장 폐지(0원),
 *   나머지는 끝까지 살아남아 마지막 시세로 자동 정산된다. 끝나면 그 자리에 바로 새 코인이 상장된다.
 * - 갱신마다 직전 시세 대비 −90% ~ +200%(최대 3배), 하락 65% · 상승 35%. 상장 폐지는 −100%.
 */
export const COIN_RELEASED = true;
export const COIN_ENABLED = COIN_RELEASED || TEST_MODE;

export const COIN_SLOTS = 10;
export const COIN_TICK_MS = 5 * 60_000;
export const COIN_MAX_TICKS = 12;
export const COIN_DELIST_CHANCE = 0.8;
export const COIN_MAX_UP = 2;
export const COIN_DOWN_CHANCE = 0.65;
/** 한 번에 살 수 있는 최소 개수(주식처럼 정수 개수로 사고판다). */
export const COIN_MIN_QTY = 1;

const NAMES = [
  ["월루", "🪙"], ["너구리", "🦝"], ["당근", "🥕"], ["고등어", "🐟"], ["도토리", "🌰"], ["퇴근", "🏃"], ["야근", "🌙"], ["김치", "🥬"],
  ["달팽이", "🐌"], ["황금변기", "🚽"], ["멍멍", "🐶"], ["감자", "🥔"], ["붕어빵", "🐠"], ["팀장님", "👔"], ["월급", "💸"], ["커피", "☕"],
  ["치킨", "🍗"], ["떡볶이", "🌶️"], ["고양이", "🐱"], ["로켓", "🚀"], ["달나라", "🌕"], ["삼겹살", "🥓"], ["반차", "🌤️"], ["회식", "🍻"],
] as const;

/** 기준 시각(이 5분 칸이 0번 칸). */
const EPOCH_TICK = Math.floor(Date.UTC(2026, 9, 15) / COIN_TICK_MS);

function hash(a: number, b: number, c = 0) {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35) ^ Math.imul(c + 0x27d4eb2f, 0x165667b1);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

export type Coin = {
  slot: number; gen: number; name: string; icon: string; start: number;
  /** 끝나는 칸(이 칸에 폐지·정산되고 새 코인이 상장된다). */
  end: number; delisted: boolean;
  /** prices[k] = start+k 칸의 시세(k=0이 상장가). 마지막 값은 정산가(폐지면 0). */
  prices: number[];
};

function makeCoin(slot: number, gen: number, start: number): Coin {
  const seed = slot * 100_003 + gen;
  // 같은 시세판에 같은 이름이 두 번 나오지 않게, 자리마다 겹치지 않는 이름 묶음(slot, slot+10, slot+20)에서 고른다.
  const own = [slot, slot + 10, slot + 20].filter(i => i < NAMES.length);
  const [name, icon] = NAMES[own[Math.floor(hash(seed, 1) * own.length)]];
  const delisted = hash(seed, 2) < COIN_DELIST_CHANCE;
  // 처음 상장되는 코인들은 수명을 섞어 한꺼번에 끝나지 않게 한다.
  const life = delisted ? 1 + Math.floor(hash(seed, 3) * COIN_MAX_TICKS) : COIN_MAX_TICKS;
  const end = start + life;
  const prices = [Math.round(100 + hash(seed, 4) * 900)];
  for (let k = 1; k <= life; k++) {
    if (delisted && k === life) { prices.push(0); break; }
    const up = hash(seed, 5, k) >= COIN_DOWN_CHANCE, u = hash(seed, 6, k);
    const mult = up ? 1 + u * COIN_MAX_UP : 0.1 + u * 0.9;
    prices.push(Math.max(1, Math.round(prices[k - 1] * mult)));
  }
  return { slot, gen, name: `${name}코인`, icon, start, end, delisted, prices };
}

const chains: Coin[][] = Array.from({ length: COIN_SLOTS }, () => []);
/** 자리 slot의 gen번째 코인(필요한 만큼 앞에서부터 만든다). */
export function coinOf(slot: number, gen: number) {
  const chain = chains[slot];
  // 자리마다 첫 상장 시각을 조금씩 어긋나게 한다.
  if (!chain.length) chain.push(makeCoin(slot, 0, EPOCH_TICK - Math.floor(hash(slot, 9) * COIN_MAX_TICKS)));
  while (chain.length <= gen) { const last = chain[chain.length - 1]; chain.push(makeCoin(slot, last.gen + 1, last.end)); }
  return chain[gen];
}
function coinAtTick(slot: number, tick: number) {
  const chain = chains[slot];
  if (!chain.length) coinOf(slot, 0);
  while (chain[chain.length - 1].end <= tick) coinOf(slot, chain.length);
  let lo = 0, hi = chain.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (chain[mid].start <= tick) lo = mid; else hi = mid - 1; }
  return chain[lo];
}

export const coinTick = (now: number) => Math.max(EPOCH_TICK, Math.floor(now / COIN_TICK_MS));
export const coinKey = (slot: number, gen: number) => `${slot}:${gen}`;

export type CoinQuote = { coin: Coin; key: string; step: number; price: number; history: number[]; change: number;
  /** 이번 칸에 같은 자리에서 끝난 직전 코인(소식 표시용). */
  ended: Coin | null };

/** 지금 거래소의 코인 10종 시세. */
export function coinBoard(now: number): { quotes: CoinQuote[]; nextAt: number } {
  const tick = coinTick(now);
  const quotes = Array.from({ length: COIN_SLOTS }, (_, slot) => {
    const coin = coinAtTick(slot, tick), k = tick - coin.start, prev = coin.gen > 0 ? coinOf(slot, coin.gen - 1) : null;
    return { coin, key: coinKey(slot, coin.gen), step: k, price: coin.prices[k], history: coin.prices.slice(0, k + 1),
      change: k > 0 ? coin.prices[k] / coin.prices[k - 1] - 1 : 0, ended: prev && prev.end === tick ? prev : null };
  });
  return { quotes, nextAt: (tick + 1) * COIN_TICK_MS };
}

/** 보유: "자리:회차" → 개수·들인 돈. */
export type CoinHoldings = Record<string, { units: number; spent: number }>;

/** 끝난 코인의 보유분 정산(폐지면 0원, 생존이면 마지막 시세). 아직 거래 중이면 null. */
export function settleCoin(key: string, units: number, now: number) {
  const [slot, gen] = key.split(":").map(Number);
  if (!(slot >= 0 && slot < COIN_SLOTS) || !(gen >= 0)) return { coin: null, payout: 0 };
  const coin = coinOf(slot, gen);
  if (coinTick(now) < coin.end) return null;
  return { coin, payout: coin.delisted ? 0 : Math.floor(units * coin.prices[coin.prices.length - 1]) };
}
