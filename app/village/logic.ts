/**
 * 마을 복구 상태 전이(LIFE_CONTENT_EXPANSION_SPEC 5.4·6.3·6.4절). 화면 없이 테스트할 수 있는 순수 함수만 둔다.
 * 납품: 통합 창고에서 즉시 빼서 contributions에 아이템 키 그대로 보관(부분 납품 가능).
 * 취소: 그 단계에 낸 재료를 전부 돌려준다(창고 용량을 넘어도 잃지 않음). 완공: 재료·골드를 확인하고 단계 +1.
 */
import { ALL_FISH } from "../fishing";
import { parseItemKey, type Inventory } from "../items";
import { consumeOrder, usableOf, type ConsumeOptions } from "../stock";
import { FACILITIES, MAX_FACILITY_LEVEL, PLAZA_REWARDS, isOpenFacility, stageCost, type VillageReq } from "./data";
import type { VillageState } from "./types";

const fishAllowed = (id: string) => { const fish = ALL_FISH.find(entry => entry.id === id); return Boolean(fish) && fish!.rarity !== "전설" && fish!.rarity !== "신화"; };

/** 이 아이템 키가 요구 품목에 해당하는지. 농산물은 품질 무관·황금 제외, 물고기 "any"는 전설·신화 제외. */
export function reqMatches(req: VillageReq, key: string): boolean {
  if (!key.startsWith(`${req.category}:`)) return false;
  const ref = parseItemKey(key);
  if (req.category === "fish" && req.id === "any") return fishAllowed(ref.id);
  return ref.id === req.id && !ref.golden;
}

export const levelOf = (village: VillageState, facility: string) => village.facilityLevels[facility] ?? 0;

/** 지금 단계에서 요구 품목별로 이미 낸 수량·남은 수량. */
export function progressOf(village: VillageState, facility: string) {
  const cost = stageCost(facility, levelOf(village, facility));
  if (!cost) return null;
  const given = village.contributions[facility] ?? {};
  const rows = cost.needs.map(req => { const have = Object.entries(given).filter(([key]) => reqMatches(req, key)).reduce((sum, [, n]) => sum + n, 0); return { req, have: Math.min(have, req.count), left: Math.max(0, req.count - have) }; });
  return { gold: cost.gold, rows, itemsDone: rows.every(row => row.left === 0) };
}

/** 요구 품목 하나를 채울 수 있는 창고 묶음(6.3절 순서: 잠금·예약 제외 → 낮은 품질 → 낮은 가치 → 키 순서). */
export function candidatesFor(inventory: Inventory, req: VillageReq, opts: ConsumeOptions): string[] {
  if (req.category === "fish" && req.id === "any") {
    return Object.keys(inventory).filter(key => reqMatches(req, key) && usableOf(inventory, key, opts) > 0)
      .sort((a, b) => (ALL_FISH.find(f => f.id === parseItemKey(a).id)?.price ?? 0) - (ALL_FISH.find(f => f.id === parseItemKey(b).id)?.price ?? 0) || (a < b ? -1 : 1));
  }
  return consumeOrder(inventory, req.category, req.id, { ...opts, allowGolden: false });
}

/**
 * "부족한 것 제외하고 모두 납품"(5.4절): 남은 수량만큼, 지금 쓸 수 있는 만큼만 고른다(창고는 바꾸지 않음).
 * onlyIndex를 주면 그 요구 품목만.
 */
export function planDelivery(inventory: Inventory, village: VillageState, facility: string, opts: ConsumeOptions, onlyIndex?: number): Record<string, number> {
  const progress = progressOf(village, facility), take: Record<string, number> = {};
  if (!progress) return take;
  progress.rows.forEach((row, index) => {
    if (onlyIndex !== undefined && index !== onlyIndex) return;
    let left = row.left;
    for (const key of candidatesFor(inventory, row.req, opts)) {
      if (left <= 0) break;
      const n = Math.min(left, usableOf(inventory, key, opts) - (take[key] ?? 0));
      if (n > 0) { take[key] = (take[key] ?? 0) + n; left -= n; }
    }
  });
  return take;
}

export const takeCount = (take: Record<string, number>) => Object.values(take).reduce((sum, n) => sum + n, 0);

/** 납품 반영: 창고에서 빼고 시설 납품 기록에 더한다. 창고에 없는 수량은 무시한다(중복 납품 방지). */
export function applyDelivery(inventory: Inventory, village: VillageState, facility: string, take: Record<string, number>) {
  const nextInventory = { ...inventory }, given = { ...(village.contributions[facility] ?? {}) };
  for (const [key, want] of Object.entries(take)) {
    const n = Math.min(want, nextInventory[key] ?? 0);
    if (n <= 0) continue;
    nextInventory[key] -= n; if (nextInventory[key] <= 0) delete nextInventory[key];
    given[key] = (given[key] ?? 0) + n;
  }
  return { inventory: nextInventory, village: { ...village, contributions: { ...village.contributions, [facility]: given } } };
}

/** 복구 취소: 이 단계에 낸 재료를 전부 돌려준다. 이미 완공한 단계는 그대로. */
export function cancelDelivery(inventory: Inventory, village: VillageState, facility: string) {
  const given = village.contributions[facility] ?? {}, nextInventory = { ...inventory };
  for (const [key, n] of Object.entries(given)) if (n > 0) nextInventory[key] = (nextInventory[key] ?? 0) + n;
  const contributions = { ...village.contributions }; delete contributions[facility];
  return { inventory: nextInventory, village: { ...village, contributions }, refunded: takeCount(given) };
}

/** 완공 가능 여부: 재료를 다 냈고 골드가 충분한지. */
export function canComplete(village: VillageState, facility: string, money: number) {
  const progress = progressOf(village, facility);
  return Boolean(progress && progress.itemsDone && money >= progress.gold);
}

/**
 * 완공(골드 지불 → 즉시 완공, 5.1절). 남는 납품분(요구량 초과)은 없도록 planDelivery가 막지만, 혹시 있으면 돌려준다.
 * 광장 보상은 claimedCosmetics에 없을 때만 한 번 지급한다.
 */
export function completeStage(inventory: Inventory, village: VillageState, facility: string, money: number) {
  const progress = progressOf(village, facility);
  if (!progress || !progress.itemsDone || money < progress.gold) return null;
  const level = levelOf(village, facility) + 1;
  // 요구량을 넘게 들어간 묶음만 돌려준다
  const given = { ...(village.contributions[facility] ?? {}) }, nextInventory = { ...inventory };
  for (const row of progress.rows) {
    let use = row.req.count;
    for (const key of Object.keys(given).filter(k => reqMatches(row.req, k)).sort()) { const n = Math.min(use, given[key]); given[key] -= n; use -= n; }
  }
  for (const [key, n] of Object.entries(given)) if (n > 0) nextInventory[key] = (nextInventory[key] ?? 0) + n;
  const contributions = { ...village.contributions }; delete contributions[facility];
  const reward = facility === "plaza" ? PLAZA_REWARDS[level] : undefined;
  const fresh = reward && !village.claimedCosmetics.includes(reward.id) ? reward : undefined;
  return {
    inventory: nextInventory,
    village: { ...village, facilityLevels: { ...village.facilityLevels, [facility]: Math.min(MAX_FACILITY_LEVEL, level) }, contributions, claimedCosmetics: fresh ? [...village.claimedCosmetics, fresh.id] : village.claimedCosmetics },
    gold: progress.gold, level, reward: fresh ?? null,
  };
}

/** 지금 완공할 수 있는 시설(망치 표시용). */
export const completable = (village: VillageState, money: number) => FACILITIES.filter(facility => isOpenFacility(facility.id) && canComplete(village, facility.id, money)).map(facility => facility.id);

/**
 * 추천 복구(5.6절): 이미 낸 양 + 지금 창고에서 낼 수 있는 양이 가장 많이 채워지는 시설. 자동 소비하지 않는다.
 * 같으면 첫 공개 추천 순서(안내소 → 공방 거리 → 광장).
 */
export function recommendFacility(inventory: Inventory, village: VillageState, opts: ConsumeOptions): string | null {
  let best: string | null = null, bestRatio = -1;
  for (const facility of FACILITIES) {
    const progress = progressOf(village, facility.id);
    if (!progress) continue;
    const take = planDelivery(inventory, village, facility.id, opts), total = progress.rows.reduce((sum, row) => sum + row.req.count, 0);
    const ratio = (progress.rows.reduce((sum, row) => sum + row.have, 0) + takeCount(take)) / total;
    if (ratio > bestRatio + 1e-9) { best = facility.id; bestRatio = ratio; }
  }
  return best;
}
