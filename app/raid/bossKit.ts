/**
 * 보스 전투 요소(RAID_FLOOR_30_EXPANSION_AUDIT 5.2절): 각도 광선·회전 광선·확장 고리·추적 장판.
 * 판정은 모두 순수 함수라서 예고 시간·안전 위치·최대 피해를 자동 테스트할 수 있다.
 * 엔진은 s.hazards 배열에 넣고 매 프레임 stepHazard로 진행한다.
 */

export type HazardKind = "beam" | "spin" | "ring" | "track";
export type Hazard = {
  kind: HazardKind;
  /** 기준점(광선 시작점·고리 중심·추적 장판 중심). spin은 owner(보스) 위치를 따라간다 */
  x: number; y: number;
  /** 광선 각도(라디안)·길이·폭 */
  angle: number; len: number; width: number;
  /** 고리: 시작·끝 반지름, 띠 두께, 틈(가운데 각도·폭) */
  r0: number; r1: number; band: number; gapAt?: number; gapArc?: number;
  /** 예고(초) → 발동. life: 발동 뒤 지속(초). 회전 광선은 지속 동안 계속 피해(every초 간격) */
  tele: number; life: number; age: number;
  /** 회전 각속도(라디안/초), 추적 장판의 추적 끝 시각(나이 기준)과 속도 */
  spin?: number; followFor?: number; followSpeed?: number;
  damage: number; every?: number; tick?: number; hit?: boolean;
  label: string; owner?: number;
  /** 일반 몬스터가 만든 위험(보스 피격 집계에서 뺀다) */
  mob?: boolean;
  /** 맞으면 이 시간(초)만큼 거의 못 움직임(뿌리 감옥). 대시는 가능 */
  root?: number;
};

export const HAZARD_DEFAULT: Omit<Hazard, "kind" | "x" | "y" | "damage" | "label"> = { angle: 0, len: 0, width: 0, r0: 0, r1: 0, band: 0, tele: 1, life: 0.2, age: 0 };
export function hazard(h: Partial<Hazard> & Pick<Hazard, "kind" | "x" | "y" | "damage" | "label">): Hazard { return { ...HAZARD_DEFAULT, ...h }; }

const TAU = Math.PI * 2;
const angNorm = (a: number) => ((a % TAU) + TAU) % TAU;
export const angDist = (a: number, b: number) => { const d = Math.abs(angNorm(a) - angNorm(b)); return Math.min(d, TAU - d); };

/** 점과 선분(시작 x,y, 각도, 길이) 사이 거리 */
export function segDist(x: number, y: number, angle: number, len: number, px: number, py: number) {
  const ux = Math.cos(angle), uy = Math.sin(angle), dx = px - x, dy = py - y;
  const t = Math.max(0, Math.min(len, dx * ux + dy * uy));
  return Math.hypot(dx - ux * t, dy - uy * t);
}
/** 발동 후 지난 시간(초), 예고 중이면 음수 */
export const activeAge = (h: Hazard) => h.age - h.tele;
/** 고리 현재 반지름(발동 후 life 동안 r0 → r1) */
export function ringRadius(h: Hazard) { const k = Math.max(0, Math.min(1, activeAge(h) / Math.max(0.01, h.life))); return h.r0 + (h.r1 - h.r0) * k; }

/** 지금 이 위치(반지름 pr인 원)가 맞는가(예고 중에는 항상 false) */
export function hazardHits(h: Hazard, px: number, py: number, pr = 14): boolean {
  if (activeAge(h) < 0) return false;
  if (h.kind === "beam" || h.kind === "spin") return segDist(h.x, h.y, h.angle, h.len, px, py) < h.width / 2 + pr;
  if (h.kind === "track") return Math.hypot(px - h.x, py - h.y) < h.r0 + pr;
  const d = Math.hypot(px - h.x, py - h.y), r = ringRadius(h);
  if (Math.abs(d - r) > h.band / 2 + pr) return false;
  if (h.gapArc && h.gapAt !== undefined && angDist(Math.atan2(py - h.y, px - h.x), h.gapAt) < h.gapArc / 2) return false;
  return true;
}

/**
 * 한 프레임 진행. 플레이어 위치를 받아 이번 프레임에 줄 피해(없으면 0)를 돌려준다.
 * - beam·track: 발동 순간 한 번 판정
 * - ring: 띠가 지나가는 동안 한 번만
 * - spin: 발동 중 every초마다
 * owner가 있으면 (ox, oy)로 기준점을 옮긴다(회전 광선이 보스를 따라감).
 */
export function stepHazard(h: Hazard, dt: number, px: number, py: number, pr = 14, owner?: { x: number; y: number }): number {
  const before = activeAge(h);
  h.age += dt;
  if (owner) { h.x = owner.x; h.y = owner.y; }
  if (h.kind === "track" && h.followFor !== undefined && h.age < h.followFor) {
    // 예고(추적) 중에는 플레이어를 따라간다. 따라가기가 끝나면 그 자리에 고정되고 남은 예고 뒤 터진다.
    const dx = px - h.x, dy = py - h.y, d = Math.hypot(dx, dy), step = (h.followSpeed ?? 160) * dt;
    if (d > 0.001) { h.x += (dx / d) * Math.min(step, d); h.y += (dy / d) * Math.min(step, d); }
  }
  const now = activeAge(h);
  if (now < 0) return 0;
  if (h.kind === "spin" && h.spin) h.angle += h.spin * dt;
  if (h.kind === "beam" || h.kind === "track") {
    if (before < 0 && !h.hit) { h.hit = true; return hazardHits(h, px, py, pr) ? h.damage : 0; }
    return 0;
  }
  if (h.kind === "ring") {
    if (!h.hit && hazardHits(h, px, py, pr)) { h.hit = true; return h.damage; }
    return 0;
  }
  // spin: 주기 피해
  h.tick = (h.tick ?? 0) - dt;
  if (h.tick <= 0 && hazardHits(h, px, py, pr)) { h.tick = h.every ?? 0.5; return h.damage; }
  return 0;
}
export const hazardDone = (h: Hazard) => activeAge(h) > h.life + (h.kind === "beam" || h.kind === "track" ? 0.25 : 0);

/**
 * 안전 위치 검사(테스트용): 반지름 maxR 안 격자에서, 주어진 위험들이 모두 끝날 때까지 한 번도 맞지 않는 칸이 있는가.
 * 플레이어가 움직이지 않는다고 가정하므로 "가만히 있어도 피할 자리" 기준이다(회피 대시가 필요한 패턴은 따로 본다).
 */
export function hasSafeSpot(hazards: Hazard[], cx: number, cy: number, maxR: number, owner?: { x: number; y: number }, step = 1 / 30): boolean {
  for (let gx = -maxR; gx <= maxR; gx += 30) for (let gy = -maxR; gy <= maxR; gy += 30) {
    if (gx * gx + gy * gy > maxR * maxR) continue;
    const px = cx + gx, py = cy + gy, copy = hazards.map(h => ({ ...h }));
    let hurt = false;
    for (let t = 0; t < 12 && !hurt && copy.some(h => !hazardDone(h)); t += step) for (const h of copy) if (!hazardDone(h) && stepHazard(h, step, px, py, 14, h.kind === "spin" ? owner : undefined) > 0) { hurt = true; break; }
    if (!hurt) return true;
  }
  return false;
}
