/**
 * 온실(LIFE_CONTENT_EXPANSION_SPEC 5.2절, 2026-10-27 결정: 1단계부터 재배칸).
 * 단계별 재배칸 1/2/4칸, 현재 계절이 아닌 작물 중 고른 2종만 심는다. 기존 36칸 밭과 별개라 밭 칸 수에 영향이 없다.
 * 온실 작물은 물주기·벌레·시듦이 없고 품질은 보통으로 고정한다(제철 밭보다 편하지만 덜 비싸게).
 */
import { CROPS, type Crop } from "../farming";
import type { Season } from "../fishing";

export const GREENHOUSE_SLOTS = [0, 1, 2, 4];
/** 고를 수 있는 비계절 작물 수 */
export const GREENHOUSE_PICKS = 2;
/** 온실 재배 시간 배율(제철 밭보다 조금 느리게) */
export const GREENHOUSE_GROW_MUL = 1.25;

export type GreenhouseSlot = { cropId: string; plantedAt: number; growSeconds: number } | null;
export type GreenhouseState = { picks: string[]; slots: GreenhouseSlot[] };
export const EMPTY_GREENHOUSE: GreenhouseState = { picks: [], slots: [] };

/** 지금 계절에 온실에서 키울 수 있는 작물(현재 계절 작물·계절 한정 작물 제외). 쉬는 시간에는 모두 비계절로 본다. */
export const offSeasonCrops = (season: Season | "휴식"): Crop[] => CROPS.filter(crop => !crop.seasonalLimit && !(crop.seasons as string[]).includes(season));
export const slotsOf = (level: number) => GREENHOUSE_SLOTS[Math.max(0, Math.min(3, Math.floor(level)))];

export function restoreGreenhouse(raw: unknown): GreenhouseState {
  if (!raw || typeof raw !== "object") return { ...EMPTY_GREENHOUSE };
  const r = raw as Partial<GreenhouseState>, known = new Set(CROPS.map(crop => crop.id));
  const picks = Array.isArray(r.picks) ? [...new Set(r.picks.filter((id): id is string => typeof id === "string" && known.has(id)))].slice(0, GREENHOUSE_PICKS) : [];
  const slots = Array.isArray(r.slots) ? r.slots.slice(0, 4).map(slot => slot && typeof slot === "object" && known.has(slot.cropId) && Number.isFinite(slot.plantedAt) && Number.isFinite(slot.growSeconds) && slot.growSeconds > 0 ? { cropId: slot.cropId, plantedAt: slot.plantedAt, growSeconds: slot.growSeconds } : null) : [];
  return { picks, slots };
}

export const growProgress = (slot: NonNullable<GreenhouseSlot>, now: number) => Math.min(1, Math.max(0, (now - slot.plantedAt) / (slot.growSeconds * 1000)));
export const isReady = (slot: GreenhouseSlot, now: number) => Boolean(slot && now >= slot.plantedAt + slot.growSeconds * 1000);
/** 온실 재배 시간(초): 작물 기본 시간 × 1.25(버프·펫은 받지 않는다) */
export const greenhouseSeconds = (crop: Crop) => Math.round(crop.seconds * GREENHOUSE_GROW_MUL);
