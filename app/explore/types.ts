/**
 * 탐험 저장 상태(LIFE_CONTENT_EXPANSION_SPEC 6.2절). 저장 버전 5는 그대로 두고, 필드가 없으면 기본값으로 채운다.
 */
import { REGIONS } from "./data";

/** 진행 중인 판의 체크포인트(10초 간격·정상 귀환 시 저장). 2단계에서 채집 상태를 채운다. */
export type ExplorationCheckpoint = {
  runId: string;
  regionId: string;
  seed: number;
  startedAt: number;
  /** 확정 채집한 품목(forage id → 개수) */
  bag: Record<string, number>;
  /** 이미 채집한 노드 id */
  gathered: string[];
};

export type ExplorationState = {
  unlocked: boolean;
  totalRuns: number;
  rareMissesByRegion: Record<string, number>;
  ownedTools: string[];
  equippedTool: string | null;
  discoveredFinds: Record<string, number>;
  checkpoint?: ExplorationCheckpoint;
};

export const EMPTY_EXPLORATION: ExplorationState = { unlocked: false, totalRuns: 0, rareMissesByRegion: {}, ownedTools: [], equippedTool: null, discoveredFinds: {} };

const isRecordOfNumbers = (value: unknown): value is Record<string, number> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value) && Object.values(value as object).every(n => typeof n === "number" && Number.isFinite(n));
const counts = (value: unknown) => (isRecordOfNumbers(value) ? Object.fromEntries(Object.entries(value).filter(([, n]) => n > 0).map(([k, n]) => [k, Math.floor(n)])) : {});

function restoreCheckpoint(raw: unknown): ExplorationCheckpoint | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const c = raw as Partial<ExplorationCheckpoint>;
  if (typeof c.runId !== "string" || !REGIONS.some(region => region.id === c.regionId) || typeof c.seed !== "number" || typeof c.startedAt !== "number") return undefined;
  return { runId: c.runId, regionId: c.regionId!, seed: c.seed, startedAt: c.startedAt, bag: counts(c.bag), gathered: Array.isArray(c.gathered) ? c.gathered.filter((id): id is string => typeof id === "string") : [] };
}

/** 저장에서 읽은 값을 검증해 기본값과 합친다(잘못된 값은 버린다). */
export function restoreExploration(raw: unknown): ExplorationState {
  if (!raw || typeof raw !== "object") return { ...EMPTY_EXPLORATION };
  const r = raw as Partial<ExplorationState>;
  const tools = Array.isArray(r.ownedTools) ? r.ownedTools.filter((id): id is string => typeof id === "string") : [];
  return {
    unlocked: r.unlocked === true,
    totalRuns: Math.max(0, Math.floor(Number(r.totalRuns) || 0)),
    rareMissesByRegion: counts(r.rareMissesByRegion),
    ownedTools: tools,
    equippedTool: typeof r.equippedTool === "string" && tools.includes(r.equippedTool) ? r.equippedTool : null,
    discoveredFinds: counts(r.discoveredFinds),
    checkpoint: restoreCheckpoint(r.checkpoint),
  };
}

/** 탐험 해금 조건(2.1절): 밭 12칸 보유 또는 첫 낚시 성공. 기존 계정도 접속 시 자동 해금. */
export const explorationUnlockMet = (ownedPlots: number, fishLog: Record<string, number>) =>
  ownedPlots >= 12 || Object.values(fishLog).some(n => n > 0);

/** 마을 해금 조건(2.1절): 채집 탐험 3회 완료. */
export const villageUnlockMet = (exploration: Pick<ExplorationState, "totalRuns">) => exploration.totalRuns >= 3;
