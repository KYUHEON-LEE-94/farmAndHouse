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
  seed: number; zone: "field" | "canal";
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
  const r = rng(seed * 7919 + floor * 104729), canal = floor > 5;
  const t: Terrain = { seed, zone: canal ? "canal" : "field", walls: [], grass: [], mud: [], wind: [], flowers: [], deep: [], bridges: [], shallow: [], puddles: [], gates: [], chance: null };
  const template = Math.floor(r() * 3);
  const place = (list: Rect[], make: () => Rect, n: number, avoid: Rect[][] = []) => {
    for (let k = 0, tries = 0; k < n && tries < 80; tries++) {
      const rect = make();
      if (nearStart(rect) || rect.x < 30 || rect.y < 30 || rect.x + rect.w > WORLD_W - 30 || rect.y + rect.h > WORLD_H - 30) continue;
      if (avoid.flat().some(o => !(rect.x + rect.w + 90 < o.x || o.x + o.w + 90 < rect.x || rect.y + rect.h + 90 < o.y || o.y + o.h + 90 < rect.y))) continue;
      list.push(rect); k++;
    }
  };
  if (!canal) {
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
