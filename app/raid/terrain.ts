/**
 * 스크롤 전장 지형(HUNTING_RAID.md 50절). 월드 1,680×960, 시작점은 가운데.
 * 구간별 템플릿 3종 중 하나를 시드로 고르고, 허용된 자리 안에서만 위치를 흔든다(50.9 안전 규칙).
 */
export const WORLD_W = 1680, WORLD_H = 960;
export const START = { x: WORLD_W / 2, y: WORLD_H / 2 };
export const SAFE_RADIUS = 180;

export type Rect = { x: number; y: number; w: number; h: number };
export type Flower = { x: number; y: number; hits: number; dmg: number; exploded: boolean; golden?: boolean };
export type Gate = { rect: Rect; closed: boolean; next: number; moving: boolean };
export type Terrain = {
  seed: number; zone: "field" | "canal" | "maple" | "frost" | "ancient" | "core";
  /** 고대 숲 이끼 길(플레이어 이동 +8%), 심장부 가속 지대(모두 +12%), 수문·균열벽 전환 주기(초) */
  moss?: Rect[]; boost?: Rect[]; gatePeriod?: number;
  walls: Rect[]; grass: Rect[]; mud: Rect[]; wind: (Rect & { dx: number; dy: number })[];
  flowers: Flower[];
  deep: Rect[]; bridges: Rect[]; shallow: Rect[]; puddles: { x: number; y: number; r: number }[]; gates: Gate[];
  /** 전투 기회 지형: 들판은 황금 폭발 꽃, 수로는 정령 샘. 25~35초마다 자리를 옮긴다. */
  chance: { x: number; y: number; r: number; next: number; used: boolean } | null;
};

function rng(seed: number) { let s = (seed >>> 0) || 1; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
const inside = (r: Rect, x: number, y: number, pad = 0) => x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;
const nearStart = (r: Rect) => { const cx = Math.max(r.x, Math.min(START.x, r.x + r.w)), cy = Math.max(r.y, Math.min(START.y, r.y + r.h)); return Math.hypot(cx - START.x, cy - START.y) < SAFE_RADIUS; };

export function makeTerrain(floor: number, seed: number): Terrain {
  const r = rng(seed * 7919 + floor * 104729), canal = floor > 5 && floor <= 10, zone = floor <= 5 ? "field" : floor <= 10 ? "canal" : floor <= 15 ? "maple" : floor <= 20 ? "frost" : floor <= 25 ? "ancient" : "core";
  const t: Terrain = { seed, zone, walls: [], grass: [], mud: [], wind: [], flowers: [], deep: [], bridges: [], shallow: [], puddles: [], gates: [], chance: null };
  const template = Math.floor(r() * 3);
  const place = (list: Rect[], make: () => Rect, n: number, avoid: Rect[][] = []) => {
    for (let k = 0, tries = 0; k < n && tries < 80; tries++) {
      const rect = make();
      if (nearStart(rect) || rect.x < 30 || rect.y < 30 || rect.x + rect.w > WORLD_W - 30 || rect.y + rect.h > WORLD_H - 30) continue;
      if (avoid.flat().some(o => !(rect.x + rect.w + 90 < o.x || o.x + o.w + 90 < rect.x || rect.y + rect.h + 90 < o.y || o.y + o.h + 90 < rect.y))) continue;
      list.push(rect); k++;
    }
  };
  if (zone === "ancient") {
    // 고대 숲(21~25층, 6.1절): 굵은 뿌리벽(투사체도 막힘) + 이끼 길(플레이어 +8%) + 포자 웅덩이(모두 감속)
    t.moss = [];
    place(t.walls, () => { const horiz = r() < 0.5, len = 160 + r() * 120; return horiz ? { x: r() * WORLD_W, y: r() * WORLD_H, w: len, h: 34 } : { x: r() * WORLD_W, y: r() * WORLD_H, w: 34, h: len }; }, 4 + Math.min(3, floor - 21), [t.walls]);
    place(t.moss, () => { const horiz = r() < 0.5; return horiz ? { x: r() * WORLD_W, y: r() * WORLD_H, w: 360 + r() * 200, h: 70 } : { x: r() * WORLD_W, y: r() * WORLD_H, w: 70, h: 300 + r() * 160 }; }, 2, [t.walls]);
    place(t.shallow, () => ({ x: r() * WORLD_W, y: r() * WORLD_H, w: 140 + r() * 90, h: 100 + r() * 70 }), 2 + (floor >= 23 ? 1 : 0), [t.walls, t.moss]);
  } else if (zone === "core") {
    // 탑의 심장부(26~30층, 6.2절): 기둥 + 20초마다 바뀌는 균열벽(2초 전 예고) + 가속 지대(모두 +12%)
    t.boost = [];
    place(t.walls, () => { const w = 60 + r() * 40, h = 60 + r() * 40; return { x: r() * WORLD_W, y: r() * WORLD_H, w, h }; }, 5 + Math.min(3, floor - 26), [t.walls]);
    const rift: Rect[] = []; place(rift, () => { const horiz = r() < 0.5, len = 180 + r() * 80; return horiz ? { x: r() * WORLD_W, y: r() * WORLD_H, w: len, h: 20 } : { x: r() * WORLD_W, y: r() * WORLD_H, w: 20, h: len }; }, 3, [t.walls]);
    t.gates = rift.map((rect, i) => ({ rect, closed: i === 0, next: 20, moving: true })); t.gatePeriod = 20;
    place(t.boost, () => ({ x: r() * WORLD_W, y: r() * WORLD_H, w: 220 + r() * 80, h: 110 }), 2, [t.walls, rift]);
  } else if (zone === "maple") {
    // 단풍 미궁(11~15층): 덤불 울타리 미로 + 낙엽 더미(적 감속) + 단풍 덤불(모두 감속). 층이 오를수록 울타리가 늘어난다.
    place(t.walls, () => { const horiz = r() < 0.5, len = 150 + r() * 120; return horiz ? { x: r() * WORLD_W, y: r() * WORLD_H, w: len, h: 24 } : { x: r() * WORLD_W, y: r() * WORLD_H, w: 24, h: len }; }, 5 + (floor - 11), [t.walls]);
    place(t.grass, () => ({ x: r() * WORLD_W, y: r() * WORLD_H, w: 150 + r() * 120, h: 100 + r() * 90 }), 2, [t.walls]);
    if (floor >= 12) place(t.mud, () => ({ x: r() * WORLD_W, y: r() * WORLD_H, w: 130 + r() * 90, h: 90 + r() * 70 }), 2 + (floor >= 14 ? 1 : 0), [t.walls]);
    if (floor >= 14) place(t.wind as Rect[], () => { const a = [0, Math.PI / 2, Math.PI, -Math.PI / 2][Math.floor(r() * 4)]; return Object.assign({ x: r() * WORLD_W, y: r() * WORLD_H, w: 260, h: 120 }, { dx: Math.cos(a), dy: Math.sin(a) }); }, 1, [t.walls]);
  } else if (zone === "frost") {
    // 서리 광산(16~20층): 얼음 기둥(짧은 벽) + 눈 더미(모두 감속) + 빙판 웅덩이(적 감속).
    place(t.walls, () => { const w = 50 + r() * 50, h = 50 + r() * 50; return { x: r() * WORLD_W, y: r() * WORLD_H, w, h }; }, 6 + (floor - 16), [t.walls]);
    place(t.shallow, () => ({ x: r() * WORLD_W, y: r() * WORLD_H, w: 160 + r() * 110, h: 100 + r() * 80 }), 3, [t.walls]);
    if (floor >= 17) place(t.mud, () => ({ x: r() * WORLD_W, y: r() * WORLD_H, w: 130 + r() * 90, h: 90 + r() * 70 }), 2, [t.walls, t.shallow]);
  } else if (!canal) {
    // 1층: 긴 풀·폭발 꽃 → 2층 돌담 → 3층 진흙 → 4층 바람길 → 5층 전부(50.3)
    place(t.grass, () => ({ x: r() * WORLD_W, y: r() * WORLD_H, w: 160 + r() * 140, h: 110 + r() * 100 }), 2 + Math.floor(r() * 3));
    if (floor >= 2) place(t.walls, () => { const horiz = (template + Math.floor(r() * 2)) % 2 === 0, len = 100 + r() * 80; return horiz ? { x: r() * WORLD_W, y: r() * WORLD_H, w: len, h: 22 } : { x: r() * WORLD_W, y: r() * WORLD_H, w: 22, h: len }; }, 3 + Math.floor(r() * 3), [t.walls]);
    if (floor >= 3) place(t.mud, () => ({ x: r() * WORLD_W, y: r() * WORLD_H, w: 130 + r() * 90, h: 90 + r() * 70 }), 2, [t.walls]);
    if (floor >= 4) place(t.wind as Rect[], () => { const a = [0, Math.PI / 2, Math.PI, -Math.PI / 2][Math.floor(r() * 4)]; return Object.assign({ x: r() * WORLD_W, y: r() * WORLD_H, w: 260, h: 120 }, { dx: Math.cos(a), dy: Math.sin(a) }); }, 2, [t.walls]);
    const flowers = 4 + Math.floor(r() * 4);
    for (let k = 0, tries = 0; k < flowers && tries < 60; tries++) {
      const x = 80 + r() * (WORLD_W - 160), y = 80 + r() * (WORLD_H - 160);
      if (Math.hypot(x - START.x, y - START.y) < SAFE_RADIUS || t.walls.some(w => inside(w, x, y, 30))) continue;
      t.flowers.push({ x, y, hits: 0, dmg: 0, exploded: false }); k++;
    }
  } else {
    // 수로: 깊은 물 강 한 줄 + 돌다리 3개(항상 2개 이상 열림), 얕은 물, 전도성 웅덩이, 수문(50.4)
    const top = template !== 1, ry = top ? 110 + r() * 40 : WORLD_H - 270 - r() * 40, rh = 120;
    t.deep.push({ x: 0, y: ry, w: WORLD_W, h: rh });
    const slots = [[220, 420], [740, 940], [1260, 1460]];
    for (const [a, b] of slots) { const w = 100 + r() * 40, x = a + r() * (b - a - w); t.bridges.push({ x, y: ry - 6, w, h: rh + 12 }); }
    // 다리 자리는 깊은 물이 아니다: 강을 다리 사이 조각으로 나눈다.
    const pieces: Rect[] = []; let from = 0;
    for (const br of [...t.bridges].sort((p, q) => p.x - q.x)) { pieces.push({ x: from, y: ry, w: br.x - from, h: rh }); from = br.x + br.w; }
    pieces.push({ x: from, y: ry, w: WORLD_W - from, h: rh }); t.deep = pieces;
    place(t.shallow, () => ({ x: r() * WORLD_W, y: r() * WORLD_H, w: 170 + r() * 120, h: 110 + r() * 80 }), 3, [t.deep]);
    for (let k = 0, tries = 0; k < 4 && tries < 60; tries++) {
      const x = 100 + r() * (WORLD_W - 200), y = 100 + r() * (WORLD_H - 200);
      if (Math.hypot(x - START.x, y - START.y) < SAFE_RADIUS || t.deep.some(d => inside(d, x, y, 60))) continue;
      t.puddles.push({ x, y, r: 55 + r() * 20 }); k++;
    }
    // 수문: 6~7층은 가운데 다리를 막은 채 고정, 8층부터 45초마다 다리 하나씩 번갈아 닫힌다(2초 전 예고).
    t.gates = t.bridges.map((b, i) => ({ rect: { x: b.x, y: ry + rh / 2 - 12, w: b.w, h: 24 }, closed: floor < 8 ? i === 1 : i === 0, next: 45, moving: floor >= 8 }));
  }
  return t;
}

/** 기회 지형이 폭발 꽃(들판·단풍)인지, 회복 샘(수로·서리 모닥불)인지 */
export const fieldLike = (t: Pick<Terrain, "zone">) => t.zone === "field" || t.zone === "maple" || t.zone === "ancient";

/** 이동을 막는 사각형(돌담·깊은 물·닫힌 수문). */
export function blockers(t: Terrain): Rect[] { return [...t.walls, ...t.deep, ...t.gates.filter(g => g.closed).map(g => g.rect)]; }

/** 원을 사각형들 밖으로 밀어낸다(미끄러지듯). */
export function pushOut(x: number, y: number, rad: number, rects: Rect[]) {
  for (const b of rects) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w)), cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
    if (d >= rad) continue;
    if (d > 0.001) { x = cx + (dx / d) * rad; y = cy + (dy / d) * rad; }
    else { // 중심이 안에 들어간 경우: 가장 가까운 변으로
      const left = x - b.x, right = b.x + b.w - x, up = y - b.y, down = b.y + b.h - y, m = Math.min(left, right, up, down);
      if (m === left) x = b.x - rad; else if (m === right) x = b.x + b.w + rad; else if (m === up) y = b.y - rad; else y = b.y + b.h + rad;
    }
  }
  return { x: Math.max(rad, Math.min(WORLD_W - rad, x)), y: Math.max(rad, Math.min(WORLD_H - rad, y)) };
}
export const blockedAt = (t: Terrain, x: number, y: number, pad = 0) => blockers(t).some(b => inside(b, x, y, pad));
/** 선분이 사각형을 지나는지(투사체 막기). */
export function segmentHits(rects: Rect[], x1: number, y1: number, x2: number, y2: number) {
  for (const b of rects) for (let k = 0; k <= 4; k++) { const px = x1 + (x2 - x1) * k / 4, py = y1 + (y2 - y1) * k / 4; if (inside(b, px, py)) return true; }
  return false;
}
/** 이동속도 배율. player=true면 플레이어 기준(긴 풀 −10%, 얕은 물 −15%), 일반 적은 진흙 −15% 추가. */
export function slowAt(t: Terrain, x: number, y: number, player: boolean) {
  let m = 1;
  if (t.grass.some(g => inside(g, x, y))) m *= 0.9;
  if (t.shallow.some(g => inside(g, x, y))) m *= 0.85;
  if (player && t.moss?.some(g => inside(g, x, y))) m *= 1.08;
  if (t.boost?.some(g => inside(g, x, y))) m *= 1.12;
  if (!player && t.mud.some(g => inside(g, x, y))) m *= 0.85;
  return m;
}
export const inMud = (t: Terrain, x: number, y: number) => t.mud.some(g => inside(g, x, y));
export const windAt = (t: Terrain, x: number, y: number) => t.wind.find(w => inside(w, x, y)) ?? null;
/** 강 반대편이면 가장 가까운 열린 다리 입구를 목표로 삼는다(수로 길찾기). */
export function routeTarget(t: Terrain, fromX: number, fromY: number, toX: number, toY: number) {
  if (!t.deep.length) return { x: toX, y: toY };
  const river = t.deep[0], top = river.y, bottom = river.y + river.h;
  const side = (y: number) => (y < top ? -1 : y > bottom ? 1 : 0);
  const a = side(fromY), b = side(toY);
  if (a === b || a === 0) return { x: toX, y: toY };
  const open = t.bridges.filter((br, i) => !t.gates[i]?.closed);
  const pick = (open.length ? open : t.bridges).reduce((best, br) => (Math.abs(br.x + br.w / 2 - fromX) < Math.abs(best.x + best.w / 2 - fromX) ? br : best));
  const cx = pick.x + pick.w / 2;
  return Math.abs(fromX - cx) > pick.w / 2 - 10 ? { x: cx, y: a < 0 ? top - 20 : bottom + 20 } : { x: cx, y: b < 0 ? top - 30 : bottom + 30 };
}

// ---------- 몬스터 길찾기: 흐름장(flow field) ----------
/** 격자 한 칸 크기(px). 플레이어 칸에서 모든 칸까지의 최단 거리를 구해 두고, 몬스터는 거리가 줄어드는 이웃 칸으로 간다. */
export const FLOW_CELL = 30;
export type Flow = { cols: number; rows: number; dist: Float32Array; blocked: Uint8Array; tc: number };
const FLOW_DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]] as const;
/** 벽·깊은 물·닫힌 수문을 피해 (tx, ty)까지 가는 거리 지도. 대각선은 양옆 칸이 열려 있을 때만(모서리 끼임 방지). */
export function buildFlow(t: Terrain, tx: number, ty: number, pad = 12): Flow {
  const cols = Math.ceil(WORLD_W / FLOW_CELL), rows = Math.ceil(WORLD_H / FLOW_CELL), n = cols * rows, rects = blockers(t);
  const blocked = new Uint8Array(n), dist = new Float32Array(n).fill(Infinity);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const x = (c + 0.5) * FLOW_CELL, y = (r + 0.5) * FLOW_CELL; if (rects.some(b => inside(b, x, y, pad))) blocked[r * cols + c] = 1; }
  const tc = Math.min(cols - 1, Math.max(0, Math.floor(tx / FLOW_CELL))) + Math.min(rows - 1, Math.max(0, Math.floor(ty / FLOW_CELL))) * cols;
  // 작은 이진 힙 다익스트라
  const heap: number[] = [], key = (i: number) => dist[i];
  const push = (i: number) => { heap.push(i); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (key(heap[p]) <= key(heap[k])) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop()!; if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && key(heap[l]) < key(heap[m])) m = l; if (r < heap.length && key(heap[r]) < key(heap[m])) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  dist[tc] = 0; push(tc);
  const done = new Uint8Array(n);
  while (heap.length) {
    const i = pop(); if (done[i]) continue; done[i] = 1;
    const c = i % cols, r = (i - c) / cols;
    for (const [dx, dy, cost] of FLOW_DIRS) {
      const nc = c + dx, nr = r + dy; if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const j = nr * cols + nc; if (blocked[j]) continue;
      if (dx && dy && (blocked[r * cols + nc] || blocked[nr * cols + c])) continue;
      const nd = dist[i] + cost; if (nd < dist[j]) { dist[j] = nd; push(j); }
    }
  }
  return { cols, rows, dist, blocked, tc };
}
/** (x, y)에서 목표 쪽으로 가는 다음 지점. 몇 칸 앞을 내다보고 막힌 데가 없으면 그 칸으로 곧장(움직임이 덜 각진다). 길이 없으면 null. */
export function flowNext(f: Flow, x: number, y: number) {
  let c = Math.min(f.cols - 1, Math.max(0, Math.floor(x / FLOW_CELL))), r = Math.min(f.rows - 1, Math.max(0, Math.floor(y / FLOW_CELL)));
  let i = r * f.cols + c;
  if (!Number.isFinite(f.dist[i])) {
    // 벽 가장자리에 걸친 칸: 가까운 열린 이웃에서 시작
    let best = -1;
    for (const [dx, dy] of FLOW_DIRS) { const nc = c + dx, nr = r + dy; if (nc < 0 || nr < 0 || nc >= f.cols || nr >= f.rows) continue; const j = nr * f.cols + nc; if (Number.isFinite(f.dist[j]) && (best < 0 || f.dist[j] < f.dist[best])) best = j; }
    if (best < 0) return null;
    return { x: (best % f.cols + 0.5) * FLOW_CELL, y: (Math.floor(best / f.cols) + 0.5) * FLOW_CELL };
  }
  if (i === f.tc) return null;
  for (let step = 0; step < 3 && i !== f.tc; step++) {
    let best = i;
    for (const [dx, dy] of FLOW_DIRS) {
      const nc = c + dx, nr = r + dy; if (nc < 0 || nr < 0 || nc >= f.cols || nr >= f.rows) continue;
      const j = nr * f.cols + nc; if (f.blocked[j] || (dx && dy && (f.blocked[r * f.cols + nc] || f.blocked[nr * f.cols + c]))) continue;
      if (f.dist[j] < f.dist[best]) best = j;
    }
    if (best === i) break;
    i = best; c = i % f.cols; r = (i - c) / f.cols;
  }
  return { x: (c + 0.5) * FLOW_CELL, y: (r + 0.5) * FLOW_CELL };
}
/** 두 점 사이가 막힘 없이 트였는지(16px 간격 검사, pad만큼 여유). */
export function clearLine(t: Terrain, x1: number, y1: number, x2: number, y2: number, pad = 0) {
  const rects = blockers(t), len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.ceil(len / 16));
  for (let k = 1; k <= n; k++) { const px = x1 + (x2 - x1) * k / n, py = y1 + (y2 - y1) * k / n; if (rects.some(b => inside(b, px, py, pad))) return false; }
  return true;
}

