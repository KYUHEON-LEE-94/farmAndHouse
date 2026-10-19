/**
 * 통합 창고 공용 규칙: 잠금(itemLocks)·예약·재료 소비(LIFE_CONTENT_EXPANSION_SPEC 6.2·6.3절).
 *
 * 잠금은 아이템 키(`crop:tomato:1:0`, `fish:dace`, `forage:young-herb` …) → true 하나로 관리한다.
 * 예전 저장의 produceLocks(`tomato|1|0`)·fishLocks(`dace`)는 최초 로드 때 itemLocks로 옮기고, 이후에는 쓰지 않는다(읽기 호환만).
 */
import { fromSubKey, parseItemKey, subKey, type Inventory, type ItemCategory } from "./items";

export type ItemLocks = Record<string, boolean>;

const trueOnly = (value: unknown): ItemLocks =>
  value && typeof value === "object" ? Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([key, locked]) => key && locked === true).map(([key]) => [key, true])) : {};

/** 저장에서 잠금을 읽는다. itemLocks가 있으면 그대로, 없으면(구버전) produceLocks·fishLocks를 합쳐 만든다. */
export function restoreItemLocks(data: { itemLocks?: unknown; produceLocks?: unknown; fishLocks?: unknown }): ItemLocks {
  if (data.itemLocks && typeof data.itemLocks === "object") return trueOnly(data.itemLocks);
  const locks: ItemLocks = {};
  for (const sub of Object.keys(trueOnly(data.produceLocks))) locks[fromSubKey("crop", sub)] = true;
  for (const id of Object.keys(trueOnly(data.fishLocks))) locks[fromSubKey("fish", id)] = true;
  return locks;
}

/** 한 분류의 잠금을 예전 하위 키(농산물 `id|품질|황금`, 그 밖은 id) 보기로 꺼낸다. 기존 화면 코드 호환용. */
export function categoryLocks(locks: ItemLocks, category: ItemCategory): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of Object.keys(locks)) { const ref = parseItemKey(key); if (locks[key] && ref.category === category && key.startsWith(`${category}:`)) out[subKey(ref)] = true; }
  return out;
}

/** 한 분류의 잠금을 하위 키 보기로 통째로 바꾼다(다른 분류는 그대로). */
export function replaceCategoryLocks(locks: ItemLocks, category: ItemCategory, view: Record<string, boolean>): ItemLocks {
  const next: ItemLocks = {};
  for (const key of Object.keys(locks)) if (!key.startsWith(`${category}:`) && locks[key]) next[key] = true;
  for (const [sub, locked] of Object.entries(view)) if (locked) next[fromSubKey(category, sub)] = true;
  return next;
}

/** 하위 키 예약표(농산물 `id|품질|황금`, 물고기 id)를 아이템 키 예약표로 바꾼다. */
export function reservedToItemKeys(category: ItemCategory, view: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [sub, n] of Object.entries(view)) if (n > 0) out[fromSubKey(category, sub)] = n;
  return out;
}

/** 여러 예약표(미션·마을 …)를 합친다. */
export function mergeReserved(...tables: Record<string, number>[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const table of tables) for (const [key, n] of Object.entries(table)) if (n > 0) out[key] = (out[key] ?? 0) + n;
  return out;
}

export type ConsumeOptions = {
  locks: ItemLocks;
  /** 미션·마을 예약 수량(아이템 키 → 개수). mergeReserved로 합쳐서 넘긴다. */
  reserved?: Record<string, number>;
  /** 묶음의 개당 가치(낮은 것부터 쓴다). 없으면 0. */
  value?: (key: string) => number;
  /** false면 황금 묶음은 쓰지 않는다(기본 true: 황금은 마지막에 쓴다). */
  allowGolden?: boolean;
};

/** 키 하나에서 지금 쓸 수 있는 수량: 잠금이면 0, 아니면 보유 − 예약. */
export function usableOf(inventory: Inventory, key: string, opts: Pick<ConsumeOptions, "locks" | "reserved">) {
  if (opts.locks[key]) return 0;
  return Math.max(0, (inventory[key] ?? 0) - (opts.reserved?.[key] ?? 0));
}

export type Need = { category: ItemCategory; id: string; count: number };

/**
 * 같은 품목(분류+id)의 여러 묶음 중 소비할 순서(6.3절):
 * 1 잠금되지 않음 → 2 예약분이 아님(usableOf로 제외) → 3 낮은 품질·비황금 → 4 가치가 낮은 묶음 → 5 먼저 획득한 묶음.
 * 묶음별 획득 시각은 저장하지 않으므로 5번은 키 순서로 대신해 결과가 항상 같게 한다.
 */
export function consumeOrder(inventory: Inventory, category: ItemCategory, id: string, opts: ConsumeOptions): string[] {
  return Object.keys(inventory)
    .filter(key => { const ref = parseItemKey(key); return key.startsWith(`${category}:`) && ref.category === category && ref.id === id && (opts.allowGolden !== false || !ref.golden); })
    .filter(key => usableOf(inventory, key, opts) > 0)
    .sort((a, b) => { const x = parseItemKey(a), y = parseItemKey(b); return Number(x.golden) - Number(y.golden) || x.quality - y.quality || (opts.value?.(a) ?? 0) - (opts.value?.(b) ?? 0) || (a < b ? -1 : a > b ? 1 : 0); });
}

export type ConsumePlan = { ok: boolean; take: Record<string, number>; missing: Need[] };

/**
 * 필요한 재료를 어떤 묶음에서 몇 개 뺄지 정한다(창고는 바꾸지 않음).
 * 하나라도 모자라면 ok=false와 부족분을 돌려준다. 같은 품목이 여러 번 나오면 앞의 요구량을 빼고 계산한다.
 */
export function planConsume(inventory: Inventory, needs: Need[], opts: ConsumeOptions): ConsumePlan {
  const take: Record<string, number> = {}, missing: Need[] = [];
  for (const need of needs) {
    let left = Math.max(0, Math.floor(need.count));
    for (const key of consumeOrder(inventory, need.category, need.id, opts)) {
      if (left <= 0) break;
      const n = Math.min(left, usableOf(inventory, key, opts) - (take[key] ?? 0));
      if (n <= 0) continue;
      take[key] = (take[key] ?? 0) + n; left -= n;
    }
    if (left > 0) missing.push({ ...need, count: left });
  }
  return { ok: missing.length === 0, take, missing };
}

/** planConsume 결과를 창고에 반영한다(0 이하는 지움). */
export function applyTake(inventory: Inventory, take: Record<string, number>): Inventory {
  const next = { ...inventory };
  for (const [key, n] of Object.entries(take)) { const left = (next[key] ?? 0) - n; if (left > 0) next[key] = left; else delete next[key]; }
  return next;
}
