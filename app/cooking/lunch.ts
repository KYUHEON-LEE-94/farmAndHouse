/**
 * 도시락 버프 저장 상태(LIFE_CONTENT_EXPANSION_SPEC 4.2·4.4·6.2절).
 * 도시락은 하나만 활성화하고, 현실 시간과 행동 횟수 중 먼저 끝나는 쪽에서 종료한다.
 */
export type LunchBuff = {
  dishId: string;
  grade: 0 | 1 | 2;
  expiresAt: number;
  actionsLeft: number;
};

/** 등급별 지속 시간(분)과 행동 제한(탐험·사냥 판 / 토벌 판), 4.4절. */
export const LUNCH_DURATION: Record<0 | 1 | 2, { minutes: number; runs: number; raids: number }> = {
  0: { minutes: 30, runs: 5, raids: 3 },
  1: { minutes: 40, runs: 7, raids: 4 },
  2: { minutes: 50, runs: 9, raids: 5 },
};

/** 저장값 검증. 끝났거나 잘못된 버프는 버린다(오프라인 동안에도 현실 시간이 흐른다). */
export function restoreLunchBuff(raw: unknown, now = Date.now()): LunchBuff | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Partial<LunchBuff>;
  if (typeof b.dishId !== "string" || !b.dishId || (b.grade !== 0 && b.grade !== 1 && b.grade !== 2)) return null;
  const expiresAt = Number(b.expiresAt), actionsLeft = Math.floor(Number(b.actionsLeft));
  if (!Number.isFinite(expiresAt) || expiresAt <= now || !Number.isFinite(actionsLeft) || actionsLeft <= 0) return null;
  return { dishId: b.dishId, grade: b.grade, expiresAt, actionsLeft };
}

/** 도시락 해금(2.1·6.2절): 서로 다른 기존 전투 음식 3종 제작. */
export const LUNCH_UNLOCK_KINDS = 3;
export const lunchUnlocked = (cookedDishIds: string[], battleDishIds: string[]) =>
  new Set(cookedDishIds.filter(id => battleDishIds.includes(id))).size >= LUNCH_UNLOCK_KINDS;
