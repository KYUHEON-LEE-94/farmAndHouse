import { BOSS_DROP_PITY, ENHANCE, MAT_DROP_PITY, ENHANCE_PITY, type Drop, type EnhanceStep, type Evolution, type RaidSave } from "./data";

/** 지금 무기의 다음 강화 단계(없으면 null). limit: 보이는 최고 단계(숨김 층의 +23 이상은 data.enhanceLimit으로 막는다) */
export const nextStep = (enhancement: number, limit = Infinity): EnhanceStep | null => (enhancement + 1 > limit ? null : ENHANCE.find(step => step.to === enhancement + 1) ?? null);

/** 재료가 충분한지(특수 키 포함 보유량 맵 기준). */
export const canPay = (need: Record<string, number>, have: Record<string, number>) => Object.entries(need).every(([id, n]) => (have[id] ?? 0) >= n);

/** 실제 하락 확률 = 실패 확률 × 실패 후 하락률. */
export const realDropChance = (step: EnhanceStep) => (1 - step.chance) * step.drop;

export type EnhanceRoll = { success: boolean; dropped: boolean; saved: boolean };

/** 이번 시도 성공률: 기본 + 누적 보정, 천장 도달이면 100%. left = 천장까지 남은 시도(이번 포함). */
export function pityChance(step: EnhanceStep, fails = 0) {
  const p = ENHANCE_PITY[step.to];
  if (!p) return { base: step.chance, bonus: 0, chance: step.chance, guaranteed: false, left: null as number | null, fails };
  const guaranteed = fails >= p.ceiling - 1, bonus = guaranteed ? 1 - step.chance : fails >= p.start ? Math.min(p.max, (fails - p.start + 1) * p.step) : 0;
  return { base: step.chance, bonus, chance: Math.min(1, step.chance + bonus), guaranteed, left: Math.max(1, p.ceiling - fails), fails };
}
/**
 * 강화 판정(11·14절). 성공이면 +1, 실패 후 하락 판정이 나면 −1(안정화석을 쓰기로 했으면 1개 소모하고 유지).
 * +10에 한 번 도달한 무기는 이후 강화에 실패해도 +10 아래로 내려가지 않는다(IMPLEMENTATION_GAP_AUDIT 10.1).
 * +10→+11 실패는 하락 판정 자체가 없고, +11 이상에서 하락해도 최저 +10이다. 그래서 안정화석은 +11 이상에서만 쓰인다.
 * +18도 같은 안전선(RAID_FLOOR_40_EXPANSION_AUDIT 4절): +18→+19 실패는 하락 없음, +19 이상에서 하락해도 최저 +18.
 * +22도 같은 안전선(RAID_FLOOR_50_IMPLEMENTATION_PLAN 2절): +22→+23 실패는 하락 없음, +23 이상에서 연속 하락해도 최저 +22. 새 저장 필드 없이
 * 현재 단계만으로 판정하므로 이미 +22 이상인 무기는 바로 보호되고, +21 이하 저장은 다시 +22에 닿은 뒤부터 보호된다.
 */
export function rollEnhance(enhancement: number, step: EnhanceStep, useStabilizer: boolean, stabilizers: number, random = Math.random, fails = 0): EnhanceRoll {
  if (random() < pityChance(step, fails).chance) return { success: true, dropped: false, saved: false };
  if (random() >= step.drop || enhancement <= 0 || enhancement === 10 || enhancement === 18 || enhancement === 22) return { success: false, dropped: false, saved: false };
  if (useStabilizer && stabilizers > 0) return { success: false, dropped: false, saved: true };
  return { success: false, dropped: true, saved: false };
}

/** 상자 굴리기: 드롭 목록 → 획득량. 반복 클리어면 보스·일반 재료 연속 미획득 천장을 적용하고 새 횟수를 돌려준다. */
export function rollDrops(drops: Drop[], floor: number, repeat: boolean, bossMiss: Record<string, number> = {}, random = Math.random) {
  const pities = repeat ? [BOSS_DROP_PITY[floor], ...(MAT_DROP_PITY[floor] ?? [])].filter(Boolean) : [], miss = { ...bossMiss }, gain: Record<string, number> = {};
  const due = (id: string) => pities.some(p => p.id === id && (bossMiss[id] ?? 0) >= p.misses);
  for (const [id, min, max, chance] of drops) {
    if (due(id) || random() < (chance ?? 1)) gain[id] = (gain[id] ?? 0) + min + Math.floor(random() * (max - min + 1));
  }
  for (const p of pities) miss[p.id] = gain[p.id] ? 0 : (miss[p.id] ?? 0) + 1;
  return { gain, bossMiss: miss, forced: pities.some(p => due(p.id)) };
}

/** 판정 결과를 저장에 반영한다. */
export function applyEnhance(raid: RaidSave, weaponId: string, roll: EnhanceRoll): RaidSave {
  const w = raid.weapons[weaponId];
  const enhancement = roll.success ? w.enhancement + 1 : roll.dropped ? Math.max(w.enhancement >= 22 ? 22 : w.enhancement >= 18 ? 18 : w.enhancement >= 10 ? 10 : 0, w.enhancement - 1) : w.enhancement;
  // 천장: 시도한 목표 단계의 실패 횟수(성공하면 0, 하락해도 유지)
  const to = w.enhancement + 1, fails = { ...(w.fails ?? {}) };
  if (ENHANCE_PITY[to]) { if (roll.success) delete fails[to]; else fails[to] = (fails[to] ?? 0) + 1; }
  return { ...raid, stabilizers: raid.stabilizers - (roll.saved ? 1 : 0), weapons: { ...raid.weapons, [weaponId]: { ...w, enhancement, fails } } };
}

export function setEvolution(raid: RaidSave, weaponId: string, evolution: Evolution): RaidSave {
  const w = raid.weapons[weaponId];
  return { ...raid, weapons: { ...raid.weapons, [weaponId]: { ...w, evolution } } };
}
