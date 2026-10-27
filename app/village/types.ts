import { restoreGreenhouse, type GreenhouseState } from "./greenhouse";
/**
 * 마을 복구 저장 상태(LIFE_CONTENT_EXPANSION_SPEC 5·6.2절). 개인 계정의 영구 진행이며 독립 재고를 두지 않는다.
 * contributions: 시설별 부분 납품량(아이템 키 → 개수). 납품한 재료는 통합 창고에서 이미 빠진 상태다.
 */
import { FACILITIES, MAX_FACILITY_LEVEL } from "./data";

export type VillageState = {
  unlocked: boolean;
  facilityLevels: Record<string, number>;
  contributions: Record<string, Record<string, number>>;
  claimedCosmetics: string[];
  /** 온실 재배칸·고른 작물(생활 2단계). 예전 저장에는 없다 */
  greenhouse?: GreenhouseState;
};

export const EMPTY_VILLAGE: VillageState = { unlocked: false, facilityLevels: {}, contributions: {}, claimedCosmetics: [] };

export function restoreVillage(raw: unknown): VillageState {
  if (!raw || typeof raw !== "object") return { ...EMPTY_VILLAGE };
  const r = raw as Partial<VillageState>;
  const known = new Set(FACILITIES.map(facility => facility.id));
  const levels: Record<string, number> = {};
  for (const [id, level] of Object.entries(r.facilityLevels ?? {})) if (known.has(id)) { const n = Math.floor(Number(level)); if (n > 0) levels[id] = Math.min(MAX_FACILITY_LEVEL, n); }
  const contributions: Record<string, Record<string, number>> = {};
  for (const [id, items] of Object.entries(r.contributions ?? {})) {
    if (!known.has(id) || !items || typeof items !== "object") continue;
    const kept = Object.fromEntries(Object.entries(items).filter(([, n]) => typeof n === "number" && n > 0).map(([key, n]) => [key, Math.floor(n as number)]));
    if (Object.keys(kept).length) contributions[id] = kept;
  }
  const claimed = Array.isArray(r.claimedCosmetics) ? [...new Set(r.claimedCosmetics.filter((id): id is string => typeof id === "string"))] : [];
  return { unlocked: r.unlocked === true, facilityLevels: levels, contributions, claimedCosmetics: claimed, ...(r.greenhouse ? { greenhouse: restoreGreenhouse(r.greenhouse) } : {}) };
}

/**
 * 마을 예약 수량(아이템 키 → 개수). 6.3절 소비 우선순위의 "미션·마을 예약분 제외"에 쓴다.
 * 지금 정책(5.4절)은 납품 즉시 창고에서 빼므로 창고에 남은 마을 예약분은 없다. 납품 전 예약 기능이 생기면 여기서 돌려준다.
 */
export const villageReserved = (): Record<string, number> => ({});
