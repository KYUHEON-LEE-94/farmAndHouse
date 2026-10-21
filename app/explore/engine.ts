import { lunchPower, type LunchBuff } from "../cooking/lunch";
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
export type Hazard =
  | { id: string; kind: "bees"; cx: number; cy: number; orbit: number; r: number; speed: number; phase: number; x: number; y: number }
  | { id: string; kind: "mud"; x: number; y: number; r: number };
export type EventKind = "merchant" | "sidepath" | "injured" | "weather";
export const EVENT_INFO: Record<EventKind, { icon: string; name: string; text: string; accept: string; decline: string | null }> = {
  merchant: { icon: "🧳", name: "길 잃은 상인", text: "길을 잃은 상인이 채집 재료 2개를 나눠 달래요. 고마움의 표시로 미끼를 준대요.", accept: "재료 2개 전달 → 기본 미끼 2개", decline: "지나가기" },
  sidepath: { icon: "🌿", name: "숨겨진 샛길", text: "덤불 사이로 샛길이 보여요. 들어가면 희귀 자원이 있는 방이 나오지만 시간이 8초 줄어요.", accept: "8초 써서 들어가기", decline: "무시하기" },
  injured: { icon: "🦔", name: "다친 동물", text: "다친 고슴도치가 있어요. 어린 약초 1개로 치료해 줄까요?", accept: "어린 약초 1개 사용 → 재료 2개", decline: "지나가기" },
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
  for (let i = 0; i < 3; i++) { const orbit = 60 + rnd() * 30, at = spot(orbit + 22); if (at) hazards.push({ id: `b${i}`, kind: "bees", cx: at.x, cy: at.y, orbit, r: 22, speed: 1.3 + rnd() * 0.6, phase: rnd() * Math.PI * 2, x: at.x + orbit, y: at.y }); }
  for (let i = 0; i < 4; i++) { const r = 55 + rnd() * 35, at = spot(r); if (at) hazards.push({ id: `m${i}`, kind: "mud", x: at.x, y: at.y, r }); }
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
  player: { x: number; y: number; stunUntil: number; dodgeUntil: number; dodgeCd: number; dx: number; dy: number; faceX: number; faceY: number };
  bag: Record<string, number>; bagCap: number;
  gather: { nodeId: string; progress: number; need: number } | null;
  returnHold: number;
  event: { kind: EventKind; at: number; state: "waiting" | "open" | "active" | "done"; until?: number; zone?: { x: number; y: number; r: number }; success?: boolean } | null;
  rewards: { bait: number };
  hitCd: Record<string, number>;
  lastCheckpointAt: number;
  stuns: number;
  hp: number;
  /** 쓰러져서 잃은 채집물 */
  lost: Record<string, number>;
  endReason: "time" | "return" | "down" | null;
  /** 화면 알림(최근 하나) */
  toast: { text: string; until: number } | null;
};

export function createRun(opts: MapOptions & { seed: number; runId: string; startedAt: number; bagBonus?: number; lunch?: LunchBuff | null; resume?: { bag: Record<string, number>; gathered: string[] } }): RunState {
  const map = generateMap(opts.seed, opts);
  const nodes = map.nodes.map(node => ({ ...node }));
  if (opts.resume) for (const node of nodes) if (opts.resume.gathered.includes(node.id)) node.left = 0;
  return {
    runId: opts.runId, seed: opts.seed, regionId: opts.regionId, startedAt: opts.startedAt,
    lunch: opts.lunch ?? null,
    map, nodes, hazards: map.hazards.map(h => ({ ...h })),
    phase: "ready", readyLeft: READY_SECONDS, t: 0, timeLeft: RUN_SECONDS,
    player: { x: START.x, y: START.y, stunUntil: 0, dodgeUntil: 0, dodgeCd: 0, dx: 0, dy: 0, faceX: 1, faceY: 0 },
    bag: { ...(opts.resume?.bag ?? {}) }, bagCap: BAG_BASE + (opts.bagBonus ?? 0),
    gather: null, returnHold: 0,
    event: map.event ? { ...map.event, state: "waiting" } : null,
    rewards: { bait: 0 }, hitCd: {}, lastCheckpointAt: 0, stuns: 0, hp: MAX_HP, lost: {}, endReason: null, toast: null,
  };
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

function stun(s: RunState) {
  const p = s.player;
  s.stuns++; s.hp = Math.max(0, s.hp - 1); s.gather = null;
  if (s.hp <= 0) return knockDown(s);
  p.stunUntil = s.t + STUN_SECONDS; s.timeLeft = Math.max(0, s.timeLeft - STUN_TIME_PENALTY);
  toast(s, `🐝 따끔! 체력 ${s.hp}/${MAX_HP} · 1.5초 멈춤 · 시간 −2초`);
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
    const slow = s.hazards.some(h => h.kind === "mud" && dist(h.x, h.y, p.x, p.y) < h.r) ? 1 - MUD_SLOW : 1;
    p.x += mx * PLAYER_SPEED * slow * dt; p.y += my * PLAYER_SPEED * slow * dt;
  }
  p.x = clamp(p.x, PLAYER_R, WORLD_W - PLAYER_R); p.y = clamp(p.y, PLAYER_R, WORLD_H - PLAYER_R);
  // 벌떼 순찰과 피격(회피 중·경직 중에는 맞지 않음)
  for (const h of s.hazards) {
    if (h.kind !== "bees") continue;
    const a = h.phase + s.t * h.speed; h.x = h.cx + Math.cos(a) * h.orbit; h.y = h.cy + Math.sin(a * 1.3) * h.orbit * 0.7;
    if (s.t >= p.stunUntil && s.t >= p.dodgeUntil && (s.hitCd[h.id] ?? 0) <= s.t && dist(h.x, h.y, p.x, p.y) < h.r + PLAYER_R) { s.hitCd[h.id] = s.t + 3; stun(s); if ((s.phase as Phase) === "done") return; }
  }
  // 채집
  if (input.gather && !s.gather && !stunned && s.t >= p.dodgeUntil) {
    const node = nearestNode(s, input.gatherTarget);
    if (node) {
      if (bagCount(s) >= s.bagCap) toast(s, "🎒 가방이 가득 찼어요! R을 1초 눌러 귀환하세요.", 2.2);
      else s.gather = { nodeId: node.id, progress: 0, need: (node.size === "small" ? GATHER_SMALL : GATHER_BIG) * (1 - lunchPower(s.lunch, "explore")) };
    }
  }
  if (s.gather) {
    const node = s.nodes.find(entry => entry.id === s.gather!.nodeId);
    if (!node || node.left <= 0 || dist(node.x, node.y, p.x, p.y) > GATHER_RANGE + 10) s.gather = null;
    else if (!stunned) {
      s.gather.progress += dt;
      if (s.gather.progress >= s.gather.need) {
        const room = s.bagCap - bagCount(s), take = Math.min(node.left, room);
        // 큰 자원은 남은 칸이 1개면 1개만 담고 나머지는 노드에 남긴다(중복 지급 없음)
        addBag(s, node.item, take); node.left -= take; s.gather = null;
        const info = FORAGE.find(item => item.id === node.item);
        toast(s, `${info?.icon ?? "🌿"} ${info?.name ?? node.item} +${take}${node.size === "rare" ? " ✨희귀!" : ""}`);
      }
    }
  }
  // 돌발 상황
  const ev = s.event;
  if (ev && ev.state === "waiting" && s.t >= ev.at) { ev.state = "open"; s.phase = "event"; return; }
  if (ev && ev.state === "active" && ev.kind === "weather" && ev.zone) {
    if (dist(ev.zone.x, ev.zone.y, p.x, p.y) < ev.zone.r) { ev.state = "done"; ev.success = true; giveCommons(s, 2); toast(s, "🌦️ 안전지대 도착! 재료 2개 추가", 2); }
    else if (s.t >= (ev.until ?? 0)) { ev.state = "done"; ev.success = false; toast(s, "🌧️ 소나기가 지나갔어요"); }
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
  if (ev.kind === "injured") return (s.bag["young-herb"] ?? 0) >= 1;
  if (ev.kind === "sidepath") return s.timeLeft > SIDEPATH_SECONDS + 2;
  return true;
}

/** 이벤트 선택. 선택하지 않아도 손해는 없다(3.7절). */
export function resolveEvent(s: RunState, accept: boolean) {
  const ev = s.event; if (!ev || ev.state !== "open") return;
  s.phase = "play";
  if (!accept || !canAccept(s)) { ev.state = "done"; ev.success = false; return; }
  const p = s.player, { commons, rare } = regionItems(s.regionId);
  if (ev.kind === "merchant") {
    let need = 2;
    for (const item of [...commons].sort((a, b) => (s.bag[b.id] ?? 0) - (s.bag[a.id] ?? 0))) { const take = Math.min(need, s.bag[item.id] ?? 0); if (take > 0) { s.bag[item.id] -= take; if (!s.bag[item.id]) delete s.bag[item.id]; need -= take; } }
    s.rewards.bait += 2; ev.state = "done"; ev.success = true; toast(s, "🧳 상인에게 받은 기본 미끼 +2", 2);
  } else if (ev.kind === "injured") {
    s.bag["young-herb"] -= 1; if (!s.bag["young-herb"]) delete s.bag["young-herb"];
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
export const checkpointDue = (s: RunState) => s.phase !== "ready" && s.phase !== "done" && s.t - s.lastCheckpointAt >= CHECKPOINT_EVERY;
/** 10초 체크포인트에 남길 내용(확정 채집 품목과 이미 캔 노드). */
export function checkpointOf(s: RunState) {
  s.lastCheckpointAt = s.t;
  return { runId: s.runId, regionId: s.regionId, seed: s.seed, startedAt: s.startedAt, bag: { ...s.bag }, gathered: s.nodes.filter(node => node.left < (node.size === "big" ? 2 : 1)).map(node => node.id) };
}

export type RunResult = { runId: string; regionId: string; bag: Record<string, number>; bait: number; rareFound: boolean; reason: "time" | "return" | "down" | "resume"; stuns: number; seconds: number; lost?: Record<string, number> };
export function resultOf(s: RunState): RunResult {
  const { rare } = regionItems(s.regionId);
  return { runId: s.runId, regionId: s.regionId, bag: { ...s.bag }, bait: s.rewards.bait, rareFound: (s.bag[rare.id] ?? 0) > 0, reason: s.endReason ?? "return", stuns: s.stuns, seconds: Math.round(s.t), lost: { ...s.lost } };
}

/** 희귀 천장 갱신(지역별): 희귀를 얻으면 0, 못 얻으면 +1. */
export const nextRareMisses = (misses: number, rareFound: boolean) => (rareFound ? 0 : misses + 1);
