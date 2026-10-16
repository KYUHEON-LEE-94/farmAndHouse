import { ENHANCE, type EnhanceStep, type Evolution, type RaidSave } from "./data";

/** 지금 무기의 다음 강화 단계(없으면 null). */
export const nextStep = (enhancement: number): EnhanceStep | null => ENHANCE.find(step => step.to === enhancement + 1) ?? null;

/** 재료가 충분한지(특수 키 포함 보유량 맵 기준). */
export const canPay = (need: Record<string, number>, have: Record<string, number>) => Object.entries(need).every(([id, n]) => (have[id] ?? 0) >= n);

/** 실제 하락 확률 = 실패 확률 × 실패 후 하락률. */
export const realDropChance = (step: EnhanceStep) => (1 - step.chance) * step.drop;

export type EnhanceRoll = { success: boolean; dropped: boolean; saved: boolean };
/**
 * 강화 판정(11·14절). 성공이면 +1, 실패 후 하락 판정이 나면 −1(안정화석을 쓰기로 했으면 1개 소모하고 유지).
 * +10에 한 번 도달한 무기는 이후 강화에 실패해도 +10 아래로 내려가지 않는다(IMPLEMENTATION_GAP_AUDIT 10.1).
 * +10→+11 실패는 하락 판정 자체가 없고, +11 이상에서 하락해도 최저 +10이다. 그래서 안정화석은 +11 이상에서만 쓰인다.
 */
export function rollEnhance(enhancement: number, step: EnhanceStep, useStabilizer: boolean, stabilizers: number, random = Math.random): EnhanceRoll {
  if (random() < step.chance) return { success: true, dropped: false, saved: false };
  if (random() >= step.drop || enhancement <= 0 || enhancement === 10) return { success: false, dropped: false, saved: false };
  if (useStabilizer && stabilizers > 0) return { success: false, dropped: false, saved: true };
  return { success: false, dropped: true, saved: false };
}

/** 판정 결과를 저장에 반영한다. */
export function applyEnhance(raid: RaidSave, weaponId: string, roll: EnhanceRoll): RaidSave {
  const w = raid.weapons[weaponId];
  const enhancement = roll.success ? w.enhancement + 1 : roll.dropped ? Math.max(w.enhancement >= 10 ? 10 : 0, w.enhancement - 1) : w.enhancement;
  return { ...raid, stabilizers: raid.stabilizers - (roll.saved ? 1 : 0), weapons: { ...raid.weapons, [weaponId]: { ...w, enhancement } } };
}

export function setEvolution(raid: RaidSave, weaponId: string, evolution: Evolution): RaidSave {
  const w = raid.weapons[weaponId];
  return { ...raid, weapons: { ...raid.weapons, [weaponId]: { ...w, evolution } } };
}
