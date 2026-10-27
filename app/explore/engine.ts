import { lunchPower, type LunchBuff } from "../cooking/lunch";
import type { RunSnapshot } from "./types";
/**
 * 채집·탐험 한 판의 순수 로직(LIFE_CONTENT_EXPANSION_SPEC 3·3.1.1·3.7절). 화면 없이 테스트할 수 있게 그리기와 입력은 ExploreGame.tsx가 맡는다.
 * 상태는 프레임마다 직접 바꾼다(토벌 엔진과 같은 방식). 저장할 것은 checkpointOf()·resultOf()로만 꺼낸다.
 */
import { FORAGE, REGIONS, type ForageItem } from "./data";

// ---------- 고정값(3.1.1절) ----------
export const VIEW_W = 960, VIEW_H = 540, WORLD_W = 1920, WORLD_H = 1080;
export const START = { x: WORLD_W / 2, y: WORLD_H / 2 };
export const START_SAFE_R = 160;
/** 첫 공개 판 길이 30초(2026-10-20 보상량 조정: 45초에서는 봇 중앙값 14개로 목표 8~11개 초과) */
export const READY_SECONDS = 3, RUN_SECONDS = 30;
export const PLAYER_SPEED = 240, PLAYER_R = 18;
/** 채집 시간: 일반 0.6초, 큰 자원·희귀 1.0초(같은 조정) */
export const GATHER_RANGE = 100, GATHER_SMALL = 0.6, GATHER_BIG = 1.0;
export const BAG_BASE = 16;
/** 위험에 맞으면 1.5초 경직, 남은 시간 2초 감소(3.2절). 체력 사망은 없다. */
export const STUN_SECONDS = 1.5, STUN_TIME_PENALTY = 2;
/** 체력(2026-10-21 결정): 위험에 맞을 때마다 1칸. 0이 되면 쓰러져 판이 끝나고, 가방 채집물의 40%(최소 1개)를 무작위로 잃는다. */
export const MAX_HP = 3, DOWN_LOSS_RATE = 0.4;
export const DODGE_SECONDS = 0.3, DODGE_COOLDOWN = 1.5, DODGE_SPEED = 620;
export const RETURN_HOLD = 1;
export const CHECKPOINT_EVERY = 10;
export const NODE_GAP = 120;
/** 희귀 자원 기본 등장 확률(판당 최대 1개). 5판 연속 미획득이면 6번째 판에 시작점 가까이 확정 등장(3.4절). */
export const RARE_BASE_CHANCE = 0.35, RARE_PITY_MISSES = 5;
/** 돌발 상황: 없음 75%, 네 가지 각 6.25%. 숨겨진 샛길 보너스(광차 정거장 3단계)는 샛길만 +5%p(3.7절). */
export const EVENT_EACH = 0.0625, SIDEPATH_BONUS = 0.05;
export const SIDEPATH_SECONDS = 8;
export const WEATHER_SECONDS = 8;
const MUD_SLOW = 0.45;
/** 빙판 접지력(클수록 덜 미끄러짐) */
export const ICE_GRIP = 2.5;
/** 약초·꽃류(약초 낫이 20% 확률로 1개 더) */
export const HERB_ITEMS = ["young-herb", "wildflower", "fragrant-herb", "winter-herb"];

// ---------- 난수 ----------
export function rngOf(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ---------- 타입 ----------
export type NodeSize = "small" | "big" | "rare";
export type ForageNode = { id: string; item: string; x: number; y: number; size: NodeSize; left: number };
/**
 * 위험 요소(2026-10-21 견제 강화): 벌떼는 가까이 오면 쫓아오고, 멧돼지는 돌아다니다 예고 후 돌진한다. 진흙은 감속만.
 * 캠프(시작 지점 반경 START_SAFE_R)는 안전지대라 그 안으로 들어가면 추적을 멈춘다. 위치·상태를 저장해 이어 하기 때 그대로 되살린다.
 */
export type Hazard =
  | { id: string; kind: "bees"; cx: number; cy: number; orbit: number; r: number; speed: number; phase: number; x: number; y: number; mode: "patrol" | "chase" | "return"; ang: number; lostFor: number }
  | { id: string; kind: "boar"; x: number; y: number; r: number; hx: number; hy: number; mode: "roam" | "aim" | "charge" | "rest"; until: number; dx: number; dy: number; wx: number; wy: number; n: number; /** 여름 물뱀·겨울 늑대(동작은 멧돼지와 같다) */ skin?: "snake" | "wolf" }
  | { id: string; kind: "mud"; x: number; y: number; r: number; /** 여름 물웅덩이·가을 가시덤불(감속은 진흙과 같다), 겨울 빙판(감속 대신 미끄러짐) */ skin?: "puddle" | "thorn" | "ice" }
  /** 독버섯(여름 습지): 주기마다 0.8초 예고 고리 → 0.6초 포자 구름. 시간으로만 정해져 저장할 상태가 없다. */
  | { id: string; kind: "spores"; x: number; y: number; r: number; period: number; offset: number; /** 가을 낙석·겨울 고드름(같은 예고 → 낙하 주기) */ skin?: "rock" | "icicle" };

/** 벌떼: 감지 200px, 추적 초당 140px(플레이어 240보다 느림), 둥지에서 340px 넘거나 1.2초 놓치면 복귀(봇 1,000판 조정, 문서 16절) */
export const BEE_AGGRO = 200, BEE_CHASE_SPEED = 140, BEE_LEASH = 340, BEE_LOSE_SECONDS = 1.2, BEE_RETURN_SPEED = 220;
/** 멧돼지: 배회 초당 70px, 감지 260px, 0.9초 예고 → 0.5초 돌진(초당 460px), 3.5초 휴식 */
export const BOAR_ROAM_SPEED = 70, BOAR_AGGRO = 260, BOAR_AIM = 0.9, BOAR_CHARGE_SPEED = 460, BOAR_CHARGE_TIME = 0.5, BOAR_REST = 3.5;
export const inCamp = (x: number, y: number) => dist(x, y, START.x, START.y) < START_SAFE_R;
/** 독버섯 포자: 반경 85px, 3.2~4초 주기, 예고 0.8초 → 구름 0.6초(구름 안에서 회피 중이 아니면 피격) */
export const SPORE_TELE = 0.8, SPORE_CLOUD = 0.6;
/** 독버섯 주기 상태: 예고(0~1 진행도) 또는 구름. 그 밖에는 null */
export function sporePhase(h: { period: number; offset: number }, t: number): { kind: "tele"; k: number } | { kind: "cloud" } | null {
  const c = ((t + h.offset) % h.period + h.period) % h.period, start = h.period - SPORE_TELE - SPORE_CLOUD;
  if (c >= h.period - SPORE_CLOUD) return { kind: "cloud" };
  if (c >= start) return { kind: "tele", k: (c - start) / SPORE_TELE };
  return null;
}
/** 지역 일반 재료 중 '약초'(다친 동물 치료에 쓰는 첫 번째 재료) */
export const herbOf = (regionId: string) => regionItems(regionId).commons[0];
export type EventKind = "merchant" | "sidepath" | "injured" | "weather";
export const EVENT_INFO: Record<EventKind, { icon: string; name: string; text: string; accept: string; decline: string | null }> = {
  merchant: { icon: "🧳", name: "길 잃은 상인", text: "길을 잃은 상인이 채집 재료 2개를 나눠 달래요. 고마움의 표시로 미끼를 준대요.", accept: "재료 2개 전달 → 기본 미끼 2개", decline: "지나가기" },
  sidepath: { icon: "🌿", name: "숨겨진 샛길", text: "덤불 사이로 샛길이 보여요. 들어가면 희귀 자원이 있는 방이 나오지만 시간이 8초 줄어요.", accept: "8초 써서 들어가기", decline: "무시하기" },
  injured: { icon: "🦔", name: "다친 동물", text: "다친 동물이 있어요. 약초 1개로 치료해 줄까요?", accept: "약초 1개 사용 → 재료 2개", decline: "지나가기" },
  weather: { icon: "🌦️", name: "갑작스러운 날씨", text: "소나기가 몰려와요! 표시된 안전지대로 8초 안에 들어가면 재료 2개를 더 얻어요.", accept: "안전지대로 가기", decline: null },
};

export type MapOptions = {
  regionId: string;
  /** 현재 계절 지역이면 일반 노드 floor(기본 × 0.2)곳 추가 */
  inSeason: boolean;
  /** 안내소 2단계 집중 탐색 재료(없으면 null) */
  focusItem?: string | null;
  /** 탐험 안내소 단계(1: 미니맵 자원 표시, 3: 큰 자원 1곳 추가 교체) */
  guideLevel?: number;
  /** 희귀 연속 미획득 횟수(5 이상이면 이번 판 확정 등장) */
  rareMisses?: number;
  /** 숨겨진 샛길 확률 보너스(광차 정거장 3단계) */
  sidepathBonus?: boolean;
};

export type ExploreMap = { nodes: ForageNode[]; hazards: Hazard[]; event: { kind: EventKind; at: number } | null; rareGuaranteed: boolean; baseNodes: number };

export function regionItems(regionId: string) {
  const region = REGIONS.find(entry => entry.id === regionId) ?? REGIONS[0];
  const items = FORAGE.filter(item => item.season === region.season);
  return { region, commons: items.filter(item => !item.rare), rare: items.find(item => item.rare) as ForageItem };
}

/** 돌발 상황 추첨(한 판 최대 하나). */
export function rollEvent(roll: number, sidepathBonus = false): EventKind | null {
  const side = EVENT_EACH + (sidepathBonus ? SIDEPATH_BONUS : 0);
  const table: [EventKind, number][] = [["merchant", EVENT_EACH], ["sidepath", side], ["injured", EVENT_EACH], ["weather", EVENT_EACH]];
  let acc = 0;
  for (const [kind, p] of table) { acc += p; if (roll < acc) return kind; }
  return null;
}

/**
 * 지도 생성(3.1.1절 생성 순서): 기본 노드·재료 배정 → 계절 추가 노드 → 집중 탐색 → 기본 큰 자원 2곳 → 안내소 3단계 큰 자원 1곳.
 * 시작점 240px 안에 최소 2곳, 600px 안에 최소 6곳, 노드 간격 120px 이상, 위험은 시작 영역·노드와 떨어뜨린다.
 */
export function generateMap(seed: number, opts: MapOptions): ExploreMap {
  const rnd = rngOf(seed), { commons, rare } = regionItems(opts.regionId);
  const nodes: ForageNode[] = [];
  const free = (x: number, y: number, gap = NODE_GAP) => nodes.every(node => dist(node.x, node.y, x, y) >= gap);
  const place = (minR: number, maxR: number, tries = 400): { x: number; y: number } => {
    for (let i = 0; i < tries; i++) {
      const a = rnd() * Math.PI * 2, r = minR + rnd() * (maxR - minR);
      const x = START.x + Math.cos(a) * r, y = START.y + Math.sin(a) * r;
      if (x < 70 || y < 70 || x > WORLD_W - 70 || y > WORLD_H - 70) continue;
      if (free(x, y)) return { x, y };
    }
    // 빈자리를 못 찾으면 격자로 훑는다(결정적)
    for (let gy = 90; gy < WORLD_H - 70; gy += 60) for (let gx = 90; gx < WORLD_W - 70; gx += 60) { const r = dist(gx, gy, START.x, START.y); if (r >= minR && r <= maxR && free(gx, gy)) return { x: gx, y: gy }; }
    return { x: START.x + minR, y: START.y };
  };
  const baseCount = 12 + Math.floor(rnd() * 3);
  // 재료 배정: 3종을 돌아가며 채워 종류마다 최소 3곳(12곳이면 4·4·4)
  const offset = Math.floor(rnd() * commons.length);
  const far = Math.hypot(WORLD_W, WORLD_H);
  for (let i = 0; i < baseCount; i++) {
    const ring = i < 2 ? [100, 240] : i < 6 ? [250, 600] : [600, far];
    const at = place(ring[0], ring[1]);
    nodes.push({ id: `n${i}`, item: commons[(i + offset) % commons.length].id, x: at.x, y: at.y, size: "small", left: 1 });
  }
  if (opts.inSeason) for (let i = 0; i < Math.floor(baseCount * 0.2); i++) { const at = place(300, far); nodes.push({ id: `s${i}`, item: commons[Math.floor(rnd() * commons.length)].id, x: at.x, y: at.y, size: "small", left: 1 }); }
  // 집중 탐색: 계절 추가 후 일반 노드 총수의 30%(내림)를 고른 재료로 교체(원래 그 재료인 노드 제외)
  if (opts.focusItem && commons.some(item => item.id === opts.focusItem)) {
    const want = Math.floor(nodes.length * 0.3), candidates = nodes.filter(node => node.item !== opts.focusItem);
    for (let i = 0; i < want && candidates.length; i++) candidates.splice(Math.floor(rnd() * candidates.length), 1)[0].item = opts.focusItem;
  }
  const smalls = () => nodes.filter(node => node.size === "small");
  const makeBig = (n: number) => { for (let i = 0; i < n; i++) { const list = smalls(); if (!list.length) return; const node = list[Math.floor(rnd() * list.length)]; node.size = "big"; node.left = 2; } };
  makeBig(2);
  if ((opts.guideLevel ?? 0) >= 3) makeBig(1);
  // 희귀: 판당 최대 1개. 천장이면 시작 화면 안(시작점 150~260px)에 확정
  const rareGuaranteed = (opts.rareMisses ?? 0) >= RARE_PITY_MISSES;
  if (rareGuaranteed || rnd() < RARE_BASE_CHANCE) { const at = rareGuaranteed ? place(150, 260) : place(400, far); nodes.push({ id: "r0", item: rare.id, x: at.x, y: at.y, size: "rare", left: 1 }); }
  // 위험 2종: 벌떼(순찰)·진흙(감속). 시작 영역과 노드에서 떨어뜨려 위험을 밟지 않는 길을 남긴다.
  const hazards: Hazard[] = [];
  const hazardFree = (x: number, y: number, reach: number) =>
    dist(x, y, START.x, START.y) > START_SAFE_R + reach + 40 && nodes.every(node => dist(node.x, node.y, x, y) > reach + 60) && hazards.every(h => dist(h.kind === "bees" ? h.cx : h.x, h.kind === "bees" ? h.cy : h.y, x, y) > reach + 120);
  const spot = (reach: number) => { for (let i = 0; i < 300; i++) { const x = 120 + rnd() * (WORLD_W - 240), y = 120 + rnd() * (WORLD_H - 240); if (hazardFree(x, y, reach)) return { x, y }; } return null; };
  const season = regionItems(opts.regionId).region.season, summer = season === "여름";
  // 봄 숲길: 벌떼 3·멧돼지 2·진흙 4 / 여름 습지: 독버섯 5·물뱀 2·물웅덩이 4 / 가을 골짜기: 낙석 6·멧돼지 2·가시덤불 4 / 겨울 동굴: 고드름 6·늑대 2·빙판 4(3.3절)
  const fallSkin = season === "가을" ? "rock" as const : season === "겨울" ? "icicle" as const : undefined;
  if (summer) for (let i = 0; i < 5; i++) { const at = spot(85); if (at) hazards.push({ id: `p${i}`, kind: "spores", x: at.x, y: at.y, r: 85, period: 3.2 + rnd() * 0.8, offset: rnd() * 4 }); }
  else if (fallSkin) for (let i = 0; i < 6; i++) { const at = spot(70); if (at) hazards.push({ id: `p${i}`, kind: "spores", x: at.x, y: at.y, r: 70, period: 3.6 + rnd() * 1.2, offset: rnd() * 5, skin: fallSkin }); }
  else for (let i = 0; i < 3; i++) { const orbit = 60 + rnd() * 30, at = spot(orbit + 22); if (at) { const phase = rnd() * Math.PI * 2; hazards.push({ id: `b${i}`, kind: "bees", cx: at.x, cy: at.y, orbit, r: 22, speed: 1.3 + rnd() * 0.6, phase, x: at.x + Math.cos(phase) * orbit, y: at.y + Math.sin(phase * 1.3) * orbit * 0.7, mode: "patrol", ang: phase, lostFor: 0 }); } }
  for (let i = 0; i < 2; i++) { const at = spot(90); if (at) hazards.push({ id: `w${i}`, kind: "boar", x: at.x, y: at.y, r: 24, hx: at.x, hy: at.y, mode: "roam", until: 0, dx: 1, dy: 0, wx: at.x, wy: at.y, n: 0, ...(summer ? { skin: "snake" as const } : season === "겨울" ? { skin: "wolf" as const } : {}) }); }
  for (let i = 0; i < 4; i++) { const r = 55 + rnd() * 35, at = spot(r); if (at) hazards.push({ id: `m${i}`, kind: "mud", x: at.x, y: at.y, r, ...(summer ? { skin: "puddle" as const } : season === "가을" ? { skin: "thorn" as const } : season === "겨울" ? { skin: "ice" as const } : {}) }); }
  const kind = rollEvent(rnd(), opts.sidepathBonus);
  return { nodes, hazards, event: kind ? { kind, at: 7 + rnd() * 12 } : null, rareGuaranteed, baseNodes: baseCount };
}

// ---------- 한 판 상태 ----------
export type Phase = "ready" | "play" | "event" | "done";
export type ExploreInput = { mx: number; my: number; /** 이번 프레임에 채집을 시작(F 누름·버튼·노드 클릭) */ gather: boolean; gatherTarget?: string | null; dodge: boolean; returnHeld: boolean };
export const NO_INPUT: ExploreInput = { mx: 0, my: 0, gather: false, dodge: false, returnHeld: false };

export type RunState = {
  runId: string; seed: number; regionId: string; startedAt: number;
  lunch: LunchBuff | null;
  map: ExploreMap; nodes: ForageNode[]; hazards: Hazard[];
  phase: Phase; readyLeft: number; t: number; timeLeft: number;
  player: { x: number; y: number; stunUntil: number; dodgeUntil: number; dodgeCd: number; dx: number; dy: number; faceX: number; faceY: number; vx?: number; vy?: number };
  bag: Record<string, number>; bagCap: number;
  gather: { nodeId: string; progress: number; need: number } | null;
  returnHold: number;
  event: { kind: EventKind; at: number; state: "waiting" | "open" | "active" | "done"; until?: number; zone?: { x: number; y: number; r: number }; success?: boolean } | null;
  rewards: { bait: number };
  hitCd: Record<string, number>;
  lastCheckpointAt: number;
  /** 처음 지도 옵션(이어 하기 때 같은 지도를 다시 만든다) */
  mapOpts: RunSnapshot["mapOpts"];
  /** 피격·채집·이벤트처럼 저장해야 할 변화가 생김(다음 프레임에 바로 저장) */
  dirty: boolean;
  stuns: number;
  hp: number;
  /** 쓰러져서 잃은 채집물 */
  lost: Record<string, number>;
  endReason: "time" | "return" | "down" | null;
  /** 화면 알림(최근 하나) */
  toast: { text: string; until: number } | null;
  /** 탐험 장비 채집 시간 감소(채집 장갑 0.2) */
  gearGather?: number;
  /** 움직이면서 채집(바람결 채집망) */
  gearMoveGather?: boolean;
  /** 위험 경직 시간 감소(탐험 장화 0.35) */
  gearStun?: number;
  /** 약초·꽃 추가 획득 확률(약초 낫 0.2) */
  gearHerb?: number;
};

export function createRun(opts: MapOptions & { seed: number; runId: string; startedAt: number; bagBonus?: number; gatherBonus?: number; moveGather?: boolean; stunCut?: number; herbBonus?: number; lunch?: LunchBuff | null; bag?: Record<string, number>; snapshot?: RunSnapshot }): RunState {
  const snap = opts.snapshot;
  // 이어 하기: 지도는 처음과 같은 옵션으로 다시 만든다(같은 시드 → 같은 노드·위험·이벤트)
  const mapOpts = snap?.mapOpts ?? { inSeason: opts.inSeason, focusItem: opts.focusItem ?? null, guideLevel: opts.guideLevel ?? 0, rareMisses: opts.rareMisses ?? 0 };
  const map = generateMap(opts.seed, { ...opts, ...mapOpts });
  const nodes = map.nodes.map(node => ({ ...node, left: snap?.nodeLeft[node.id] ?? node.left }));
  if (snap) for (const extra of snap.extraNodes) if (!nodes.some(node => node.id === extra.id)) nodes.push({ ...extra });
  const s: RunState = {
    runId: opts.runId, seed: opts.seed, regionId: opts.regionId, startedAt: opts.startedAt, mapOpts,
    lunch: snap ? snap.lunch : opts.lunch ?? null,
    map, nodes, hazards: restoreHazards(map.hazards, snap?.hazards),
    phase: "ready", readyLeft: READY_SECONDS, t: snap?.t ?? 0, timeLeft: snap?.timeLeft ?? RUN_SECONDS,
    player: { x: snap?.x ?? START.x, y: snap?.y ?? START.y, stunUntil: snap?.stunUntil ?? 0, dodgeUntil: 0, dodgeCd: 0, dx: 0, dy: 0, faceX: 1, faceY: 0 },
    bag: { ...(opts.bag ?? {}) }, bagCap: BAG_BASE + (opts.bagBonus ?? 0),
    gather: null, returnHold: 0,
    event: snap ? (snap.event ? { ...snap.event, ...(snap.event.state === "open" ? { state: "waiting" as const, at: snap.t } : {}) } : null) : map.event ? { ...map.event, state: "waiting" } : null,
    rewards: { bait: snap?.bait ?? 0 }, hitCd: { ...(snap?.hitCd ?? {}) }, lastCheckpointAt: snap?.t ?? 0, stuns: snap?.stuns ?? 0, hp: snap?.hp ?? MAX_HP, lost: {}, endReason: null, toast: null, gearGather: opts.gatherBonus ?? 0, gearMoveGather: opts.moveGather === true, gearStun: opts.stunCut ?? 0, gearHerb: opts.herbBonus ?? 0,
    // 판이 시작되거나 이어지자마자 한 번 저장한다
    dirty: true,
  };
  if (snap) toast(s, "🔄 지난 탐험을 이어서 해요", 2.4);
  return s;
}

/** 이어 하기: 저장된 몬스터 위치·상태를 같은 id에 덮어쓴다(진흙 등 고정 요소는 지도 그대로). */
function restoreHazards(base: Hazard[], saved?: unknown[]): Hazard[] {
  return base.map(h => {
    const found = Array.isArray(saved) ? saved.find(entry => entry && typeof entry === "object" && (entry as Hazard).id === h.id && (entry as Hazard).kind === h.kind) as Hazard | undefined : undefined;
    return found && h.kind !== "mud" && h.kind !== "spores" && Number.isFinite(found.x) && Number.isFinite(found.y) ? { ...h, ...found } as Hazard : { ...h };
  });
}

export const bagCount = (s: Pick<RunState, "bag">) => Object.values(s.bag).reduce((sum, n) => sum + n, 0);
const addBag = (s: RunState, id: string, n: number) => { if (n > 0) s.bag[id] = (s.bag[id] ?? 0) + n; };
const toast = (s: RunState, text: string, sec = 1.6) => { s.toast = { text, until: s.t + sec }; };

/** 채집 가능한 가장 가까운 노드(범위 100px 안). */
export function nearestNode(s: RunState, targetId?: string | null) {
  const p = s.player;
  const live = s.nodes.filter(node => node.left > 0 && dist(node.x, node.y, p.x, p.y) <= GATHER_RANGE);
  if (targetId) return live.find(node => node.id === targetId) ?? null;
  return live.sort((a, b) => dist(a.x, a.y, p.x, p.y) - dist(b.x, b.y, p.x, p.y))[0] ?? null;
}

/** 벌떼: 둥지를 돌다가(patrol) 가까이 오면 쫓아오고(chase), 너무 멀어지거나 놓치면 둥지로 돌아간다(return). */
function updateBees(s: RunState, h: Extract<Hazard, { kind: "bees" }>, dt: number, safe: boolean) {
  const p = s.player, d = dist(h.x, h.y, p.x, p.y);
  const step = (tx: number, ty: number, speed: number) => { const l = dist(h.x, h.y, tx, ty); if (l > 0.001) { const k = Math.min(1, (speed * dt) / l); h.x += (tx - h.x) * k; h.y += (ty - h.y) * k; } return l; };
  if (h.mode === "patrol") {
    h.ang += h.speed * dt;
    step(h.cx + Math.cos(h.ang) * h.orbit, h.cy + Math.sin(h.ang * 1.3) * h.orbit * 0.7, BEE_RETURN_SPEED);
    if (!safe && d < BEE_AGGRO) { h.mode = "chase"; h.lostFor = 0; }
  } else if (h.mode === "chase") {
    step(p.x, p.y, BEE_CHASE_SPEED);
    h.lostFor = d > BEE_AGGRO * 1.4 ? h.lostFor + dt : 0;
    if (safe || h.lostFor >= BEE_LOSE_SECONDS || dist(h.x, h.y, h.cx, h.cy) > BEE_LEASH) h.mode = "return";
  } else {
    const home = { x: h.cx + Math.cos(h.ang) * h.orbit, y: h.cy + Math.sin(h.ang * 1.3) * h.orbit * 0.7 };
    if (step(home.x, home.y, BEE_RETURN_SPEED) < 12) h.mode = "patrol";
  }
}

/** 멧돼지: 둥지 근처를 배회하다 플레이어가 가까우면 0.7초 노려보고(예고선) 직선 돌진, 그 뒤 쉰다. */
function updateBoar(s: RunState, h: Extract<Hazard, { kind: "boar" }>, dt: number, safe: boolean) {
  const p = s.player, d = dist(h.x, h.y, p.x, p.y);
  if (h.mode === "roam") {
    const l = dist(h.x, h.y, h.wx, h.wy);
    if (l < 8) { const rnd = rngOf(s.seed + h.n * 7919 + h.id.charCodeAt(1)); h.n++; const a = rnd() * Math.PI * 2, r = 60 + rnd() * 160; h.wx = clamp(h.hx + Math.cos(a) * r, 60, WORLD_W - 60); h.wy = clamp(h.hy + Math.sin(a) * r, 60, WORLD_H - 60); }
    else { const k = Math.min(1, (BOAR_ROAM_SPEED * dt) / l); h.x += (h.wx - h.x) * k; h.y += (h.wy - h.y) * k; }
    if (!safe && d < BOAR_AGGRO) { h.mode = "aim"; h.until = s.t + BOAR_AIM; h.dx = (p.x - h.x) / (d || 1); h.dy = (p.y - h.y) / (d || 1); }
  } else if (h.mode === "aim") {
    if (s.t >= h.until) { h.mode = "charge"; h.until = s.t + BOAR_CHARGE_TIME; }
  } else if (h.mode === "charge") {
    h.x = clamp(h.x + h.dx * BOAR_CHARGE_SPEED * dt, h.r, WORLD_W - h.r); h.y = clamp(h.y + h.dy * BOAR_CHARGE_SPEED * dt, h.r, WORLD_H - h.r);
    // 캠프 안으로는 돌진해 들어오지 않는다
    if (s.t >= h.until || inCamp(h.x, h.y)) { h.mode = "rest"; h.until = s.t + BOAR_REST; }
  } else if (s.t >= h.until) { h.mode = "roam"; h.wx = h.x; h.wy = h.y; }
}

function stun(s: RunState, cry = "🐝 따끔!") {
  const p = s.player;
  s.stuns++; s.hp = Math.max(0, s.hp - 1); s.gather = null; s.dirty = true;
  if (s.hp <= 0) return knockDown(s);
  p.stunUntil = s.t + STUN_SECONDS * (1 - (s.gearStun ?? 0)); p.vx = 0; p.vy = 0; s.timeLeft = Math.max(0, s.timeLeft - STUN_TIME_PENALTY);
  toast(s, `${cry} 체력 ${s.hp}/${MAX_HP} · 1.5초 멈춤 · 시간 −2초`);
}

/** 가방에서 잃을 채집물(쓰러짐): 전체의 40%(내림, 가방이 비어 있지 않으면 최소 1개)를 낱개 단위로 무작위 선택. */
export function lossOf(bag: Record<string, number>, seed: number): Record<string, number> {
  const units = Object.keys(bag).sort().flatMap(id => Array.from({ length: Math.max(0, bag[id]) }, () => id));
  if (!units.length) return {};
  const rnd = rngOf(seed ^ 0x0d0a0), lost: Record<string, number> = {};
  for (let n = Math.max(1, Math.floor(units.length * DOWN_LOSS_RATE)); n > 0; n--) { const id = units.splice(Math.floor(rnd() * units.length), 1)[0]; lost[id] = (lost[id] ?? 0) + 1; }
  return lost;
}

/** 쓰러짐: 판이 끝나고 채집물 일부를 잃는다. */
function knockDown(s: RunState) {
  s.lost = lossOf(s.bag, s.seed);
  for (const [id, n] of Object.entries(s.lost)) { s.bag[id] -= n; if (s.bag[id] <= 0) delete s.bag[id]; }
  toast(s, "💫 쓰러졌어요! 채집물 일부를 떨어뜨렸어요", 3);
  finish(s, "down");
}

/** 한 프레임 진행. 이벤트 선택 창이 열려 있으면(phase "event") 시간이 멈춘다. */
export function step(s: RunState, input: ExploreInput, dt: number) {
  if (s.phase === "done" || s.phase === "event") return;
  if (s.phase === "ready") { s.readyLeft -= dt; if (s.readyLeft <= 0) s.phase = "play"; return; }
  s.t += dt; s.timeLeft -= dt;
  const p = s.player;
  const stunned = s.t < p.stunUntil, dodging = s.t < p.dodgeUntil;
  if (p.dodgeCd > 0) p.dodgeCd -= dt;
  // 이동
  let mx = input.mx, my = input.my; const len = Math.hypot(mx, my); if (len > 1) { mx /= len; my /= len; }
  if (len > 0.05) { p.faceX = mx; p.faceY = my; }
  if (input.dodge && !stunned && !dodging && p.dodgeCd <= 0) {
    const fx = len > 0.05 ? mx : p.faceX, fy = len > 0.05 ? my : p.faceY, fl = Math.hypot(fx, fy) || 1;
    p.dx = fx / fl; p.dy = fy / fl; p.dodgeUntil = s.t + DODGE_SECONDS; p.dodgeCd = DODGE_COOLDOWN; s.gather = null;
  }
  if (s.t < p.dodgeUntil) { p.x += p.dx * DODGE_SPEED * dt; p.y += p.dy * DODGE_SPEED * dt; }
  else if (!stunned) {
    const under = s.hazards.find(h => h.kind === "mud" && dist(h.x, h.y, p.x, p.y) < h.r) as Extract<Hazard, { kind: "mud" }> | undefined;
    const onIce = under?.skin === "ice", slow = under && !onIce ? 1 - MUD_SLOW : 1;
    const speed = PLAYER_SPEED * (1 + lunchPower(s.lunch, "explore", Date.now(), "speed"));
    // 빙판: 속도가 서서히 바뀌어 미끄러진다(약 0.4초 관성)
    const tvx = mx * speed * slow, tvy = my * speed * slow, k = onIce ? Math.min(1, dt * ICE_GRIP) : 1;
    p.vx = (p.vx ?? 0) + (tvx - (p.vx ?? 0)) * k; p.vy = (p.vy ?? 0) + (tvy - (p.vy ?? 0)) * k;
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
  p.x = clamp(p.x, PLAYER_R, WORLD_W - PLAYER_R); p.y = clamp(p.y, PLAYER_R, WORLD_H - PLAYER_R);
  // 몬스터 움직임과 피격(회피 중·경직 중에는 맞지 않음). 캠프 안의 플레이어는 쫓지 않는다.
  const safe = inCamp(p.x, p.y);
  for (const h of s.hazards) {
    if (h.kind === "mud") continue;
    if (h.kind === "spores") {
      // 포자 구름: 캠프 안·회피 중·경직 중에는 맞지 않는다. 같은 독버섯은 한 주기에 한 번만
      if (sporePhase(h, s.t)?.kind === "cloud" && !safe && s.t >= p.stunUntil && s.t >= p.dodgeUntil && (s.hitCd[h.id] ?? 0) <= s.t && dist(h.x, h.y, p.x, p.y) < h.r + PLAYER_R * 0.5) {
        s.hitCd[h.id] = s.t + SPORE_CLOUD + 0.1; stun(s, h.skin === "rock" ? "🪨 쿵!" : h.skin === "icicle" ? "🧊 콕!" : "🍄 콜록!"); if ((s.phase as Phase) === "done") return;
      }
      continue;
    }
    if (h.kind === "bees") updateBees(s, h, dt, safe); else updateBoar(s, h, dt, safe);
    if (s.t >= p.stunUntil && s.t >= p.dodgeUntil && (s.hitCd[h.id] ?? 0) <= s.t && dist(h.x, h.y, p.x, p.y) < h.r + PLAYER_R) {
      s.hitCd[h.id] = s.t + (h.kind === "bees" ? 3 : 1.5);
      if (h.kind === "bees") { h.mode = "return"; h.lostFor = 0; } else { h.mode = "rest"; h.until = s.t + BOAR_REST; }
      stun(s, h.kind === "bees" ? "🐝 따끔!" : h.skin === "snake" ? "🐍 앗!" : h.skin === "wolf" ? "🐺 으르렁!" : "🐗 쿵!"); if ((s.phase as Phase) === "done") return;
    }
  }
  // 채집
  if (input.gather && !s.gather && !stunned && s.t >= p.dodgeUntil) {
    const node = nearestNode(s, input.gatherTarget);
    if (node) {
      if (bagCount(s) >= s.bagCap) toast(s, "🎒 가방이 가득 찼어요! R을 1초 눌러 귀환하세요.", 2.2);
      else s.gather = { nodeId: node.id, progress: 0, need: (node.size === "small" ? GATHER_SMALL : GATHER_BIG) * (1 - lunchPower(s.lunch, "explore", Date.now(), "gather")) * (node.size === "small" ? 1 - (s.gearGather ?? 0) : 1) };
    }
  }
  // 채집 중 움직이면 채집이 멈춘다(2026-10-27). 바람결 채집망을 장착하면 범위 안에서는 움직여도 계속 캔다
  if (s.gather && len > 0.05 && !s.gearMoveGather) { s.gather = null; toast(s, "🚶 움직여서 채집을 멈췄어요", 1.2); }
  if (s.gather) {
    const node = s.nodes.find(entry => entry.id === s.gather!.nodeId);
    if (!node || node.left <= 0 || dist(node.x, node.y, p.x, p.y) > GATHER_RANGE + 10) s.gather = null;
    else if (!stunned) {
      s.gather.progress += dt;
      if (s.gather.progress >= s.gather.need) {
        const room = s.bagCap - bagCount(s), take = Math.min(node.left, room);
        // 큰 자원은 남은 칸이 1개면 1개만 담고 나머지는 노드에 남긴다(중복 지급 없음)
        addBag(s, node.item, take); node.left -= take; s.gather = null; s.dirty = true;
        // 약초 낫: 약초·꽃류는 20% 확률로 1개 더(가방에 자리가 있을 때)
        const extra = take > 0 && (s.gearHerb ?? 0) > 0 && HERB_ITEMS.includes(node.item) && bagCount(s) < s.bagCap && rngOf(s.seed ^ Math.floor(s.t * 997))() < (s.gearHerb ?? 0) ? 1 : 0;
        addBag(s, node.item, extra);
        const info = FORAGE.find(item => item.id === node.item);
        toast(s, `${info?.icon ?? "🌿"} ${info?.name ?? node.item} +${take + extra}${extra ? " (약초 낫)" : ""}${node.size === "rare" ? " ✨희귀!" : ""}`);
      }
    }
  }
  // 돌발 상황
  const ev = s.event;
  if (ev && ev.state === "waiting" && s.t >= ev.at) { ev.state = "open"; s.phase = "event"; s.dirty = true; return; }
  if (ev && ev.state === "active" && ev.kind === "weather" && ev.zone) {
    if (dist(ev.zone.x, ev.zone.y, p.x, p.y) < ev.zone.r) { ev.state = "done"; ev.success = true; s.dirty = true; giveCommons(s, 2); toast(s, "🌦️ 안전지대 도착! 재료 2개 추가", 2); }
    else if (s.t >= (ev.until ?? 0)) { ev.state = "done"; ev.success = false; s.dirty = true; toast(s, "🌧️ 소나기가 지나갔어요"); }
  }
  // 귀환·시간 종료
  s.returnHold = input.returnHeld && !stunned ? s.returnHold + dt : 0;
  if (s.returnHold >= RETURN_HOLD) return finish(s, "return");
  if (s.timeLeft <= 0) { s.timeLeft = 0; finish(s, "time"); }
}

function finish(s: RunState, reason: "time" | "return" | "down") { s.phase = "done"; s.endReason = reason; s.gather = null; }

/** 지역 일반 재료 n개를 무작위로 더한다(이벤트 보상, 가방 상한과 별개). */
function giveCommons(s: RunState, n: number) {
  const { commons } = regionItems(s.regionId), rnd = rngOf(s.seed ^ Math.floor(s.t * 1000));
  for (let i = 0; i < n; i++) addBag(s, commons[Math.floor(rnd() * commons.length)].id, 1);
}

/** 이벤트 선택이 가능한지(재료가 모자라면 수락 버튼을 막는다). */
export function canAccept(s: RunState): boolean {
  const ev = s.event; if (!ev) return false;
  const { commons } = regionItems(s.regionId);
  if (ev.kind === "merchant") return commons.reduce((sum, item) => sum + (s.bag[item.id] ?? 0), 0) >= 2;
  if (ev.kind === "injured") return (s.bag[herbOf(s.regionId).id] ?? 0) >= 1;
  if (ev.kind === "sidepath") return s.timeLeft > SIDEPATH_SECONDS + 2;
  return true;
}

/** 이벤트 선택. 선택하지 않아도 손해는 없다(3.7절). */
export function resolveEvent(s: RunState, accept: boolean) {
  const ev = s.event; if (!ev || ev.state !== "open") return;
  s.phase = "play"; s.dirty = true;
  if (!accept || !canAccept(s)) { ev.state = "done"; ev.success = false; return; }
  const p = s.player, { commons, rare } = regionItems(s.regionId);
  if (ev.kind === "merchant") {
    let need = 2;
    for (const item of [...commons].sort((a, b) => (s.bag[b.id] ?? 0) - (s.bag[a.id] ?? 0))) { const take = Math.min(need, s.bag[item.id] ?? 0); if (take > 0) { s.bag[item.id] -= take; if (!s.bag[item.id]) delete s.bag[item.id]; need -= take; } }
    s.rewards.bait += 2; ev.state = "done"; ev.success = true; toast(s, "🧳 상인에게 받은 기본 미끼 +2", 2);
  } else if (ev.kind === "injured") {
    const herb = herbOf(s.regionId).id; s.bag[herb] -= 1; if (!s.bag[herb]) delete s.bag[herb];
    giveCommons(s, 2); ev.state = "done"; ev.success = true; toast(s, "🦔 고마워요! 재료 2개를 받았어요", 2);
  } else if (ev.kind === "sidepath") {
    // 샛길 보너스 희귀 1개: 기본 희귀와 합쳐 한 판 최대 2개
    s.timeLeft -= SIDEPATH_SECONDS;
    const a = Math.atan2(START.y - p.y, START.x - p.x) + Math.PI, x = clamp(p.x + Math.cos(a) * 160, 70, WORLD_W - 70), y = clamp(p.y + Math.sin(a) * 160, 70, WORLD_H - 70);
    if (s.nodes.filter(node => node.size === "rare").length < 2) s.nodes.push({ id: "r1", item: rare.id, x, y, size: "rare", left: 1 });
    ev.state = "done"; ev.success = true; toast(s, "🌿 샛길 안쪽에 희귀 자원이 있어요! (시간 −8초)", 2.4);
  } else if (ev.kind === "weather") {
    const a = Math.atan2(p.y - START.y, p.x - START.x) + 1.4;
    ev.zone = { x: clamp(p.x + Math.cos(a) * 280, 90, WORLD_W - 90), y: clamp(p.y + Math.sin(a) * 280, 90, WORLD_H - 90), r: 70 };
    ev.until = s.t + WEATHER_SECONDS; ev.state = "active";
  }
}

// ---------- 저장·결과 ----------
/** 저장할 때: 피격·채집·이벤트 같은 변화가 생겼거나(즉시) 마지막 저장 뒤 10초. 끝난 판은 정산이 맡는다. */
export const checkpointDue = (s: RunState) => s.phase !== "done" && (s.dirty || s.t - s.lastCheckpointAt >= CHECKPOINT_EVERY);

/** 이어 하기용 전체 상태(같은 지도·체력·위치·남은 시간·노드 잔량·이벤트·피격 대기). */
export function snapshotOf(s: RunState): RunSnapshot {
  const base = new Map(s.map.nodes.map(node => [node.id, node.left]));
  const nodeLeft: Record<string, number> = {};
  for (const node of s.nodes) if (base.has(node.id) && base.get(node.id) !== node.left) nodeLeft[node.id] = node.left;
  return {
    mapOpts: { ...s.mapOpts }, t: s.t, timeLeft: s.timeLeft, hp: s.hp, x: s.player.x, y: s.player.y, stunUntil: s.player.stunUntil,
    nodeLeft, extraNodes: s.nodes.filter(node => !base.has(node.id)).map(node => ({ ...node })),
    event: s.event ? { ...s.event, zone: s.event.zone ? { ...s.event.zone } : undefined } : null,
    bait: s.rewards.bait, stuns: s.stuns, hitCd: { ...s.hitCd }, lunch: s.lunch ? { ...s.lunch } : null,
    hazards: s.hazards.map(h => ({ ...h })),
  };
}

/** 체크포인트: 확정 채집 품목 + 이어 하기 상태. */
export function checkpointOf(s: RunState) {
  s.lastCheckpointAt = s.t; s.dirty = false;
  return { runId: s.runId, regionId: s.regionId, seed: s.seed, startedAt: s.startedAt, bag: { ...s.bag }, gathered: s.nodes.filter(node => node.left < (node.size === "big" ? 2 : 1)).map(node => node.id), snap: snapshotOf(s) };
}

/** 체크포인트로 같은 판을 다시 만든다(준비 3초 뒤 이어 하기). */
export type GearOpts = { bagBonus?: number; gatherBonus?: number; moveGather?: boolean; stunCut?: number; herbBonus?: number };
export function resumeRun(cp: { runId: string; regionId: string; seed: number; startedAt: number; bag: Record<string, number>; snap: RunSnapshot }, gear: GearOpts = {}): RunState {
  return createRun({ seed: cp.seed, runId: cp.runId, startedAt: cp.startedAt, regionId: cp.regionId, inSeason: cp.snap.mapOpts.inSeason, bag: cp.bag, snapshot: cp.snap, ...gear });
}

export type RunResult = { runId: string; regionId: string; bag: Record<string, number>; bait: number; rareFound: boolean; reason: "time" | "return" | "down" | "resume"; stuns: number; seconds: number; lost?: Record<string, number> };
export function resultOf(s: RunState): RunResult {
  const { rare } = regionItems(s.regionId);
  return { runId: s.runId, regionId: s.regionId, bag: { ...s.bag }, bait: s.rewards.bait, rareFound: (s.bag[rare.id] ?? 0) > 0, reason: s.endReason ?? "return", stuns: s.stuns, seconds: Math.round(s.t), lost: { ...s.lost } };
}

/** 희귀 천장 갱신(지역별): 희귀를 얻으면 0, 못 얻으면 +1. */
export const nextRareMisses = (misses: number, rareFound: boolean) => (rareFound ? 0 : misses + 1);
