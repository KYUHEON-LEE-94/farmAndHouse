/**
 * 요리 제작 이력과 진행 중 일괄 조리(LIFE_CONTENT_EXPANSION_SPEC 4.7·6.2절).
 * 이번 1단계는 저장 형식·구버전 호환·검증만 만든다. 일괄 조리 흐름은 3단계에서 연결한다.
 */
import { parseItemKey, type Inventory } from "../items";

export type CookingBatch = {
  batchId: string;
  dishId: string;
  quantity: number;
  consumed: Record<string, number>;
  seed: number;
  /** 완료한 단계 점수(단계당 0~2, 최대 3단계) */
  results: Array<0 | 1 | 2>;
  facilityLevelAtStart: number;
};

export const BATCH_MAX_STEPS = 3;
/** 공방 거리 단계별 한 번에 만들 수 있는 도시락 수(4.7절): 0~1단계 1개, 2단계 3개, 3단계 5개. */
export const batchLimit = (facilityLevel: number) => (facilityLevel >= 3 ? 5 : facilityLevel >= 2 ? 3 : 1);

/**
 * 요리 제작 이력 복원(6.2절).
 * - 필드가 있으면(빈 배열이라도) 그대로 쓰고 재고에서 다시 보충하지 않는다.
 * - 구버전 저장(필드 없음)은 현재 재고에 남은 유효한 전투 음식 id를 최초 1회 제작 이력으로 인정한다.
 */
export function restoreCookedDishIds(raw: unknown, inventory: Inventory, battleDishIds: string[]): string[] {
  if (Array.isArray(raw)) return [...new Set(raw.filter((id): id is string => typeof id === "string" && id.length > 0))];
  const owned = Object.entries(inventory).filter(([, n]) => n > 0).map(([key]) => parseItemKey(key)).filter(ref => ref.category === "dish" && battleDishIds.includes(ref.id)).map(ref => ref.id);
  return [...new Set(owned)];
}

/** 완성품을 지급할 때만 기록한다(같은 레시피는 1종). */
export const addCookedDish = (ids: string[], dishId: string) => (ids.includes(dishId) ? ids : [...ids, dishId]);

/** 진행 중 배치 검증(6.2절): 점수 0~2·최대 3단계, 수량·레시피 확인. 잘못되면 버린다. */
export function restoreCookingBatch(raw: unknown, validDishIds: string[]): CookingBatch | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Partial<CookingBatch>;
  if (typeof b.batchId !== "string" || !b.batchId || typeof b.dishId !== "string" || !validDishIds.includes(b.dishId)) return null;
  const quantity = Number(b.quantity), level = Number(b.facilityLevelAtStart ?? 0);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > batchLimit(level)) return null;
  if (!Array.isArray(b.results) || b.results.length > BATCH_MAX_STEPS || !b.results.every(n => n === 0 || n === 1 || n === 2)) return null;
  if (typeof b.seed !== "number" || !Number.isFinite(b.seed)) return null;
  const consumed = b.consumed && typeof b.consumed === "object" ? Object.fromEntries(Object.entries(b.consumed).filter(([, n]) => typeof n === "number" && n > 0)) : {};
  return { batchId: b.batchId, dishId: b.dishId, quantity, consumed, seed: b.seed, results: b.results as Array<0 | 1 | 2>, facilityLevelAtStart: level };
}
