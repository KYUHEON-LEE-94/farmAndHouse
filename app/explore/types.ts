/**
 * 탐험 저장 상태(LIFE_CONTENT_EXPANSION_SPEC 6.2절). 저장 버전 5는 그대로 두고, 필드가 없으면 기본값으로 채운다.
 */
import { REGIONS } from "./data";

/**
 * 진행 중인 판 전체 상태(2026-10-21 이어 하기). 재접속하면 같은 지도·체력·위치·남은 시간으로 이어 한다.
 * 지도는 seed + mapOpts로 다시 만들고, 바뀐 부분(노드 잔량·샛길 노드·이벤트·피격 대기)만 덮어쓴다.
 */
export type RunSnapshot = {
  mapOpts: { inSeason: boolean; focusItem: string | null; guideLevel: number; rareMisses: number };
  t: number; timeLeft: number; hp: number; x: number; y: number; stunUntil: number;
  /** 노드 id → 남은 수량(처음과 달라진 것만) */
  nodeLeft: Record<string, number>;
  /** 판 도중 생긴 노드(숨겨진 샛길 희귀) */
  extraNodes: { id: string; item: string; x: number; y: number; size: "small" | "big" | "rare"; left: number }[];
  event: { kind: "merchant" | "sidepath" | "injured" | "weather"; at: number; state: "waiting" | "open" | "active" | "done"; until?: number; zone?: { x: number; y: number; r: number }; success?: boolean } | null;
  bait: number; stuns: number; hitCd: Record<string, number>;
  /** 입장 때 적용한 도시락(이어 할 때도 같은 효과) */
  lunch: { dishId: string; grade: 0 | 1 | 2; expiresAt: number; actionsLeft: number } | null;
  /** 몬스터(벌떼·멧돼지) 위치와 상태. 없으면(예전 저장) 지도 기본값 */
  hazards?: unknown[];
};

/** 진행 중인 판의 체크포인트(피격·채집·이벤트 직후와 10초 간격 저장). snap이 있으면 재접속 때 이어 하고, 없으면(예전 저장) 가방만 한 번 지급한다. */
export type ExplorationCheckpoint = {
  runId: string;
  regionId: string;
  seed: number;
  startedAt: number;
  /** 확정 채집한 품목(forage id → 개수) */
  bag: Record<string, number>;
  /** 이미 채집한 노드 id */
  gathered: string[];
  snap?: RunSnapshot;
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
  const base = { runId: c.runId, regionId: c.regionId!, seed: c.seed, startedAt: c.startedAt, bag: counts(c.bag), gathered: Array.isArray(c.gathered) ? c.gathered.filter((id): id is string => typeof id === "string") : [] };
  const snap = restoreSnapshot((c as { snap?: unknown }).snap);
  return snap ? { ...base, snap } : base;
}

/** 이어 하기 상태 검증. 숫자가 이상하면 이어 하지 않고 예전 방식(가방 지급)으로 처리된다. */
function restoreSnapshot(raw: unknown): RunSnapshot | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Partial<RunSnapshot>, num = (v: unknown) => typeof v === "number" && Number.isFinite(v);
  if (!r.mapOpts || !num(r.t) || !num(r.timeLeft) || !num(r.hp) || !num(r.x) || !num(r.y)) return undefined;
  if ((r.timeLeft as number) <= 0 || (r.hp as number) <= 0) return undefined;
  const o = r.mapOpts;
  return {
    mapOpts: { inSeason: o.inSeason === true, focusItem: typeof o.focusItem === "string" ? o.focusItem : null, guideLevel: Math.max(0, Math.floor(Number(o.guideLevel) || 0)), rareMisses: Math.max(0, Math.floor(Number(o.rareMisses) || 0)) },
    t: r.t as number, timeLeft: r.timeLeft as number, hp: Math.floor(r.hp as number), x: r.x as number, y: r.y as number, stunUntil: num(r.stunUntil) ? r.stunUntil as number : 0,
    nodeLeft: isRecordOfNumbers(r.nodeLeft) ? r.nodeLeft : {},
    extraNodes: Array.isArray(r.extraNodes) ? r.extraNodes.filter(n => n && typeof n.id === "string" && typeof n.item === "string" && num(n.x) && num(n.y) && num(n.left)) : [],
    event: r.event && typeof r.event === "object" && typeof r.event.kind === "string" ? r.event : null,
    bait: Math.max(0, Math.floor(Number(r.bait) || 0)), stuns: Math.max(0, Math.floor(Number(r.stuns) || 0)),
    hitCd: isRecordOfNumbers(r.hitCd) ? r.hitCd : {},
    lunch: r.lunch && typeof r.lunch === "object" && typeof r.lunch.dishId === "string" ? r.lunch : null,
    hazards: Array.isArray(r.hazards) ? r.hazards : undefined,
  };
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
