/**
 * 농산물 시장 정책: 포화 슬롯제 + 농협 일괄 출하.
 *
 * - 작물마다 시장 주기(5분 시세 한 번)당 FREE_PER_CYCLE개까지는 정상가.
 * - 그 이상 팔면 그 작물이 "포화 슬롯"에 들어가 1개당 -2%씩, 최대 -25%까지 내려간다.
 * - 포화 슬롯은 최대 3개. 4번째가 들어오면 가장 오래된 슬롯이 바로 풀리고,
 *   5분 시세가 바뀔 때마다 가장 오래된 슬롯 하나가 풀린다. 팔면 그 슬롯은 최신으로 갱신.
 * - 그래서 여러 작물을 키울수록 모든 작물이 동시에 포화되는 일(전역 디버프)은 생기지 않는다.
 * - 상태는 판매할 때 지난 주기만큼 한꺼번에 정리(normalize)하므로 접속하지 않아도 회복된다.
 */
export const FREE_PER_CYCLE = 5;
export const SAT_PER_UNIT = 0.02;
export const SAT_MAX = 0.25;
export const SAT_SLOTS = 3;
/** 농협 일괄 출하: 기준가(시세 변동·버프 없음)의 80%, 포화 없음. */
export const COOP_RATE = 0.8;

export type MarketSlot = { id: string; units: number };
/** cycle: 마지막으로 정리한 시세 주기, sold: 이번 주기 정상가 판매 수, slots: 오래된 것 → 최신 순. */
export type MarketState = { cycle: number; sold: Record<string, number>; slots: MarketSlot[] };
export const EMPTY_MARKET: MarketState = { cycle: 0, sold: {}, slots: [] };

/** 지난 시세 주기만큼 오래된 슬롯을 풀고, 새 주기면 정상가 판매 수를 초기화한다. */
export function normalizeMarket(state: MarketState | undefined, cycle: number): MarketState {
  const base = state ?? EMPTY_MARKET;
  if (base.cycle === cycle) return base;
  const passed = base.cycle ? Math.max(0, cycle - base.cycle) : 0;
  return { cycle, sold: {}, slots: base.slots.slice(Math.min(base.slots.length, passed)) };
}

/** 다음 1개를 팔 때의 가격 배수(미리보기용, 상태는 바꾸지 않음). */
export function nextFactor(state: MarketState, id: string) {
  const slot = state.slots.find(entry => entry.id === id);
  if (slot) return 1 - Math.min(SAT_MAX, (slot.units + 1) * SAT_PER_UNIT);
  return (state.sold[id] ?? 0) < FREE_PER_CYCLE ? 1 : 1 - SAT_PER_UNIT;
}

/** 지금 포화 정도(0~0.25). 슬롯에 없으면 0. */
export function saturationOf(state: MarketState, id: string) {
  const slot = state.slots.find(entry => entry.id === id);
  return slot ? Math.min(SAT_MAX, slot.units * SAT_PER_UNIT) : 0;
}
/** 이번 주기에 정상가로 더 팔 수 있는 개수(슬롯에 있으면 0). */
export function freeLeft(state: MarketState, id: string) {
  return state.slots.some(entry => entry.id === id) ? 0 : Math.max(0, FREE_PER_CYCLE - (state.sold[id] ?? 0));
}

/** 1개를 판다: 가격 배수와 바뀐 상태. */
export function takeOne(state: MarketState, id: string): { factor: number; state: MarketState } {
  let slots = state.slots, sold = state.sold;
  let slot = slots.find(entry => entry.id === id);
  if (!slot) {
    if ((sold[id] ?? 0) < FREE_PER_CYCLE) return { factor: 1, state: { ...state, sold: { ...sold, [id]: (sold[id] ?? 0) + 1 } } };
    slot = { id, units: 0 };
    slots = [...slots, slot];
    if (slots.length > SAT_SLOTS) slots = slots.slice(slots.length - SAT_SLOTS);
  }
  const units = slot.units + 1, factor = 1 - Math.min(SAT_MAX, units * SAT_PER_UNIT);
  // 판 슬롯은 최신(맨 뒤)으로 옮긴다.
  slots = [...slots.filter(entry => entry.id !== id), { id, units }];
  sold = { ...sold, [id]: (sold[id] ?? 0) + 1 };
  return { factor, state: { ...state, sold, slots } };
}

/** 같은 작물을 n개 연달아 팔 때 합계와 바뀐 상태. */
export function sellMany(state: MarketState, id: string, unitPrice: number, count: number) {
  let total = 0, current = state;
  for (let k = 0; k < count; k++) { const step = takeOne(current, id); total += unitPrice * step.factor; current = step.state; }
  return { total: Math.round(total), state: current };
}
