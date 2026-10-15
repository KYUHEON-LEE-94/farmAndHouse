/**
 * 탑 토벌 전투 엔진(순수 로직). 렌더링·입력은 RaidGame.tsx가 맡고, 여기서는 고정 시간 스텝으로 상태만 바꾼다.
 * 좌표는 논리 해상도 960×540(px), 시간은 초.
 */
import {
  ARENA_H, ARENA_W, AWAKENINGS, AWAKEN_GUARANTEE, AWAKEN_XP, BOSS_AT, COMMON_AWAKENINGS, EVOLUTIONS, FLOOR_SECONDS, MONSTERS, PLAYER,
  type AwakenId, type BossDef, type Evolution, type FloorDef, type FoodEffect, type MonsterDef, type WeaponStats,
} from "./data";
import { START, WORLD_H, WORLD_W, blockedAt, blockers, inMud, makeTerrain, pushOut, routeTarget, segmentHits, slowAt, windAt, type Terrain } from "./terrain";

export type Input = { up: boolean; down: boolean; left: boolean; right: boolean; aimX: number; aimY: number; attack: boolean; dash: boolean; food: [boolean, boolean, boolean] };
/** 방어구 합계 능력(26절). */
export type Gear = { hp: number; defense: number; crit: number; absorb: number; speed: number; dashCd: number; startShield: number };
export const NO_GEAR: Gear = { hp: 0, defense: 0, crit: 0, absorb: 0, speed: 0, dashCd: 0, startShield: 0 };
export type FoodSlot = { dishId: string; grade: number; key: string; effect: FoodEffect; icon: string; name: string } | null;

type Telegraph = { kind: "line"; x: number; y: number; dx: number; dy: number; len: number; width: number } | { kind: "circle"; x: number; y: number; r: number };
export type Monster = {
  uid: number; def: MonsterDef; name: string; icon: string; x: number; y: number; r: number; hp: number; maxHp: number; damage: number; defense: number; speed: number;
  elite: boolean; boss: "mini" | "pollen-boar" | "storm-catfish" | null; xp: number;
  /** 행동 타이머·상태 */
  timer: number; state: "move" | "tele" | "dash" | "stun"; stateT: number; dir: { x: number; y: number }; tele: Telegraph | null;
  rate: number; split: boolean; summoned: boolean; flash: number; shots: number;
  t2: number; t3: number; t4: number;
  /** 여우불 표식: 이 시각까지 받는 피해 +10% */
  markUntil: number;
};
export type Projectile = { x: number; y: number; vx: number; vy: number; r: number; damage: number; life: number; mine: boolean; pierce: Set<number> | null };
export type Zone = { kind: "pollen" | "puddle" | "bolt" | "shock" | "line" | "tshock" | "blast"; x: number; y: number; r: number; t: number; tele: number; damage: number; every: number; tick: number; slow: number; dx?: number; dy?: number; len?: number };
export type Orb = { x: number; y: number; xp: number; age: number };
export type Pop = { x: number; y: number; text: string; t: number; kind: "hit" | "crit" | "hurt" | "heal" | "info" };
export type Swing = { angle: number; range: number; arc: number; t: number };

export type RaidState = {
  floor: FloorDef; t: number; over: null | "clear" | "dead" | "timeout"; paused: boolean;
  weapon: WeaponStats; evolution: Evolution | null; gear: Gear;
  pet: { id: string; mult: number; x: number; y: number; timer: number; shieldUsed: boolean; flash: number } | null;
  player: { x: number; y: number; hp: number; maxHp: number; shield: number; shieldUntil: number; iframes: number; dashCd: number; dashT: number; dashDir: { x: number; y: number }; swingCd: number; windup: number; aim: number; attacks: number; slowUntil: number; emergencyUsed: boolean; stormUntil: number; stormTick: number; chainAt: number[] };
  buffs: { kind: FoodEffect["kind"]; value: number; until: number }[];
  foods: FoodSlot[]; foodUsed: boolean[];
  level: number; xp: number; picks: Partial<Record<AwakenId, number>>; choices: AwakenId[] | null;
  monsters: Monster[]; projectiles: Projectile[]; zones: Zone[]; orbs: Orb[]; pops: Pop[]; swings: Swing[];
  spawnAcc: number; nextElite: number; elitesPlaced: number; bossSpawned: boolean; interventions: number; boss: Monster | null;
  /** 스크롤 전장(50절): 카메라 왼쪽 위(월드 좌표), 지형, 탑의 압박, 정예 예고. */
  cam: { x: number; y: number; lx: number; ly: number }; terrain: Terrain;
  pressure: { x: number; y: number; since: number; stage: number; leftAt: number };
  warns: { x: number; y: number; at: number; id: string }[];
  kills: number; damageTaken: Record<string, number>; uid: number; prevDash: boolean; prevFood: [boolean, boolean, boolean]; bossHpAtEnd: number;
};

const rnd = Math.random;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);
const angDiff = (a: number, b: number) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d); };

export function createRaid(floor: FloorDef, weapon: WeaponStats, evolution: Evolution | null, foods: FoodSlot[], gear: Gear = NO_GEAR, pet: { id: string; mult: number } | null = null, seed = Math.floor(Math.random() * 1e9)): RaidState {
  const terrain = makeTerrain(floor.floor, seed);
  return {
    cam: { x: START.x - ARENA_W / 2, y: START.y - ARENA_H / 2, lx: 0, ly: 0 }, terrain, pressure: { x: START.x, y: START.y, since: 0, stage: 0, leftAt: -1 }, warns: [],
    floor, t: 0, over: null, paused: false, weapon, evolution, gear,
    pet: pet ? { ...pet, x: START.x - 30, y: START.y, timer: 2, shieldUsed: false, flash: 0 } : null,
    player: { x: START.x, y: START.y, hp: PLAYER.hp + gear.hp, maxHp: PLAYER.hp + gear.hp, shield: gear.startShield, shieldUntil: 0, iframes: 1, dashCd: 0, dashT: 0, dashDir: { x: 1, y: 0 }, swingCd: 0, windup: -1, aim: 0, attacks: 0, slowUntil: 0, emergencyUsed: false, stormUntil: 0, stormTick: 0, chainAt: [] },
    buffs: [], foods, foodUsed: foods.map(() => false),
    level: 1, xp: 0, picks: {}, choices: null,
    monsters: [], projectiles: [], zones: [], orbs: [], pops: [], swings: [],
    spawnAcc: 0, nextElite: floor.elite?.every ?? 70, elitesPlaced: 0, bossSpawned: false, interventions: 0, boss: null,
    kills: 0, damageTaken: {}, uid: 1, prevDash: false, prevFood: [false, false, false], bossHpAtEnd: 1,
  };
}

// ---------- 파생 능력치 ----------
const pick = (s: RaidState, id: AwakenId) => s.picks[id] ?? 0;
const buffSum = (s: RaidState, kinds: FoodEffect["kind"][]) => s.buffs.filter(b => b.until > s.t && kinds.includes(b.kind)).reduce((sum, b) => sum + b.value / 100, 0);
export const derived = (s: RaidState) => ({
  damageMul: 1 + 0.22 * pick(s, "keen-edge") + buffSum(s, ["attack", "all"]),
  interval: Math.max(0.25, s.weapon.interval * (1 - 0.14 * pick(s, "quick-grip") - buffSum(s, ["haste", "all"]))),
  range: s.weapon.range * (1 + 0.22 * pick(s, "long-handle")),
  arc: Math.min(360, s.weapon.angle + 10 * pick(s, "long-handle")),
  knockback: s.weapon.knockback * (1 + 0.5 * pick(s, "heavy-swing")),
  speed: PLAYER.speed * (1 + 0.12 * pick(s, "wind-step") + s.gear.speed + buffSum(s, ["speed", "all"])),
  dashCd: PLAYER.dashCooldown * Math.max(0.3, 1 - 0.18 * pick(s, "quick-dash") - s.gear.dashCd),
  absorb: PLAYER.absorb + 45 * pick(s, "wide-gather") + s.gear.absorb,
  armor: 2 * pick(s, "hard-leather") + s.gear.defense,
  crit: PLAYER.critChance + s.gear.crit,
});

// ---------- 생성 ----------
function spawnPoint(s: RaidState) {
  const p = s.player, c = s.cam;
  const outside = (x: number, y: number) => x < c.x - 40 || x > c.x + ARENA_W + 40 || y < c.y - 40 || y > c.y + ARENA_H + 40;
  const nearView = (x: number, y: number) => x > c.x - 160 && x < c.x + ARENA_W + 160 && y > c.y - 160 && y < c.y + ARENA_H + 160;
  for (let i = 0; i < 30; i++) {
    const a = rnd() * Math.PI * 2, d = 320 + rnd() * 200, x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
    if (x < 20 || y < 20 || x > WORLD_W - 20 || y > WORLD_H - 20 || blockedAt(s.terrain, x, y, 16)) continue;
    if (outside(x, y) && nearView(x, y)) return { x, y };
  }
  for (let i = 0; i < 30; i++) { const x = 20 + rnd() * (WORLD_W - 40), y = 20 + rnd() * (WORLD_H - 40); if (outside(x, y) && !blockedAt(s.terrain, x, y, 16)) return { x, y }; }
  return { x: p.x < WORLD_W / 2 ? WORLD_W - 30 : 30, y: p.y };
}
function makeMonster(s: RaidState, def: MonsterDef, at = spawnPoint(s), opts: Partial<Monster> = {}): Monster {
  return { uid: s.uid++, def, name: def.name, icon: def.icon, x: at.x, y: at.y, r: def.radius, hp: def.hp, maxHp: def.hp, damage: def.damage, defense: def.defense, speed: def.speed,
    elite: def.kind === "elite" || def.kind === "canal-elite", boss: null, xp: def.xp, timer: 1 + rnd() * 1.5, state: "move", stateT: 0, dir: { x: 1, y: 0 }, tele: null,
    rate: 1, split: false, summoned: false, flash: 0, shots: 0, t2: 4, t3: 6, t4: 8, markUntil: 0, ...opts };
}
function spawn(s: RaidState, id: string, opts: Partial<Monster> = {}, at?: { x: number; y: number }) {
  const m = makeMonster(s, MONSTERS[id], at, opts);
  s.monsters.push(m);
  return m;
}
/** 정예는 3초 전에 위치를 예고한다(미니맵·방향 표시, 50.2절). */
function warnElite(s: RaidState) { const at = spawnPoint(s); s.warns.push({ ...at, at: s.t + 3, id: s.floor.elite!.id }); }
function spawnElite(s: RaidState, at: { x: number; y: number }) {
  const e = s.floor.elite!;
  const def = MONSTERS[e.id];
  if (def.kind === "elite" || def.kind === "canal-elite") spawn(s, e.id, { hp: e.hp, maxHp: e.hp }, at);
  else spawn(s, e.id, { hp: e.hp, maxHp: e.hp, elite: true, r: def.radius * 1.6, damage: Math.round(def.damage * 1.3), xp: 12, name: `${def.name} 정예` }, at);
}
function spawnBoss(s: RaidState) {
  const b: BossDef = s.floor.boss;
  const base = MONSTERS[b.base ?? (b.id === "pollen-boar" ? "boarling" : "shock-eel")];
  const m = spawn(s, base.id, { name: b.name, icon: b.icon, hp: b.hp, maxHp: b.hp, damage: b.damage, defense: b.defense, r: b.id === "mini" ? 30 : 40, xp: 0, elite: true,
    boss: b.id === "mini" ? "mini" : (b.id as "pollen-boar" | "storm-catfish"), rate: b.id === "mini" ? 1.5 : 1, speed: b.id === "mini" ? base.speed * 0.9 : 60, timer: 2, t2: 3, t3: 5, t4: 7 }, spawnPoint(s));
  s.boss = m; s.bossSpawned = true;
  s.pops.push({ x: s.cam.x + ARENA_W / 2, y: s.cam.y + 80, text: `${b.icon} ${b.name} 등장!`, t: 2.5, kind: "info" });
}

/** 웨이브 구성: 역할별 비중(기본 5 · 빠른 3 · 원거리 2 · 돌진·방어 2), 원거리는 동시에 최대 RANGED_CAP마리. */
const SPAWN_WEIGHT: Record<string, number> = { chase: 5, slime: 5, hop: 3, eel: 3, ranged: 2, frog: 2, charge: 2, crab: 2 };
export const RANGED_CAP = 4;
function pickSpawn(s: RaidState) {
  const ranged = s.monsters.filter(m => m.hp > 0 && (m.def.kind === "ranged" || m.def.kind === "frog") && !m.elite).length;
  const pool = s.floor.monsters.filter(id => !(ranged >= RANGED_CAP && (MONSTERS[id].kind === "ranged" || MONSTERS[id].kind === "frog")));
  const total = pool.reduce((sum, id) => sum + (SPAWN_WEIGHT[MONSTERS[id].kind] ?? 1), 0);
  let r = rnd() * total;
  for (const id of pool) { r -= SPAWN_WEIGHT[MONSTERS[id].kind] ?? 1; if (r <= 0) return id; }
  return pool[0];
}

// ---------- 피해 ----------
function hurtPlayer(s: RaidState, raw: number, source = "기타") {
  const p = s.player;
  if (p.iframes > 0 || p.dashT > 0 || s.over) return;
  let dmg = Math.max(1, Math.round(raw - derived(s).armor));
  if (p.shield > 0) { const used = Math.min(p.shield, dmg); p.shield -= used; dmg -= used; }
  p.hp -= dmg; p.iframes = PLAYER.iframes; s.damageTaken[source] = (s.damageTaken[source] ?? 0) + dmg;
  if (dmg > 0) s.pops.push({ x: p.x, y: p.y - 24, text: `-${dmg}`, t: 0.8, kind: "hurt" });
  if (!p.emergencyUsed && pick(s, "emergency-shield") && p.hp > 0 && p.hp <= p.maxHp * 0.3) { p.emergencyUsed = true; p.shield += 25; p.shieldUntil = s.t + 60; s.pops.push({ x: p.x, y: p.y - 40, text: "비상 보호막!", t: 1.2, kind: "info" }); }
  if (p.hp <= 0) { if (s.floor.training) p.hp = 1; else { p.hp = 0; s.over = "dead"; } }
}
function hitMonster(s: RaidState, m: Monster, base: number, ang: number, knock: number) {
  if (m.hp <= 0) return;
  const d = derived(s);
  let mul = d.damageMul;
  if (m.elite || m.boss) mul += 0.12 * pick(s, "heavy-swing") + (s.evolution ? EVOLUTIONS[s.evolution].eliteBonus : 0);
  if (m.boss && s.picks.executioner) mul += 0.25;
  if (m.markUntil > s.t) mul += 0.1;
  const crit = rnd() < d.crit;
  let dmg = base * mul * (crit ? PLAYER.critMul : 1) * (m.state === "stun" ? 1.3 : 1);
  dmg = Math.max(1, Math.round(dmg - m.defense - (m.def.kind === "crab" && m.state !== "dash" ? 3 : 0)));
  if (s.picks.executioner && !m.boss && !m.elite && m.hp - dmg <= m.maxHp * 0.2) dmg = m.hp;
  m.hp -= dmg; m.flash = 0.1;
  s.pops.push({ x: m.x, y: m.y - m.r, text: String(dmg), t: 0.6, kind: crit ? "crit" : "hit" });
  if (!m.boss && knock) { m.x += Math.cos(ang) * knock; m.y += Math.sin(ang) * knock; }
  if (m.def.kind === "slime" && !m.split && !m.boss && rnd() < 0.2 && m.hp > 0) { m.split = true; spawn(s, "moss-slime", { hp: 14, maxHp: 14, r: 9, xp: 0, split: true }, { x: m.x + 12, y: m.y + 12 }); }
  if (m.hp <= 0) killMonster(s, m);
}
function killMonster(s: RaidState, m: Monster) {
  m.hp = 0; s.kills++;
  if (m.xp > 0) s.orbs.push({ x: m.x, y: m.y, xp: m.xp, age: 0 });
  if (s.evolution === "harvest-blade" && !m.elite && !m.boss) s.player.swingCd = Math.max(0, s.player.swingCd - s.weapon.interval * 0.1);
  if (s.picks["chain-harvest"] && rnd() < 0.35) { const p = s.player; p.chainAt = p.chainAt.filter(at => at > s.t - 1); if (p.chainAt.length < 2) { p.chainAt.push(s.t); swingHit(s, 0, 1, true); } }
  if (m === s.boss) { s.bossHpAtEnd = 0; s.over = "clear"; }
}

/** 낫 휘두르기 판정. */
function swingHit(s: RaidState, angle: number, mul: number, full = false) {
  const d = derived(s), p = s.player, arc = full ? 360 : d.arc;
  s.swings.push({ angle, range: d.range, arc, t: 0.18 });
  // 지형: 꽃가루 꽃(공격 3번 또는 피해 30이면 폭발)
  for (const f of s.terrain.flowers) {
    if (f.exploded) continue;
    const r = dist(p.x, p.y, f.x, f.y), a = Math.atan2(f.y - p.y, f.x - p.x);
    if (r > d.range + 14 || (arc < 360 && angDiff(a, angle) > (arc / 2) * Math.PI / 180 + 0.2)) continue;
    f.hits++; f.dmg += s.weapon.damage * mul;
    if (f.hits >= 3 || f.dmg >= 30) explodeFlower(s, f);
  }
  const ch = s.terrain.chance;
  if (ch && s.terrain.zone === "field" && !ch.used && dist(p.x, p.y, ch.x, ch.y) < d.range + ch.r) { ch.used = true; zoneAt(s, { kind: "blast", x: ch.x, y: ch.y, r: 120, t: 0.35, tele: 0, damage: 0, every: 0, slow: 0 }); for (const m of s.monsters) if (m.hp > 0 && dist(m.x, m.y, ch.x, ch.y) < 120 + m.r) hitMonster(s, m, 60, Math.atan2(m.y - ch.y, m.x - ch.x), 50); s.pops.push({ x: ch.x, y: ch.y - 30, text: "🌟 황금 꽃 폭발!", t: 1.2, kind: "info" }); }
  for (const m of s.monsters) {
    if (m.hp <= 0) continue;
    const r = dist(p.x, p.y, m.x, m.y);
    if (r > d.range + m.r) continue;
    const a = Math.atan2(m.y - p.y, m.x - p.x);
    if (arc < 360 && angDiff(a, angle) > (arc / 2) * Math.PI / 180 + Math.atan2(m.r, Math.max(1, r))) continue;
    hitMonster(s, m, s.weapon.damage * mul, a, d.knockback);
  }
}

function explodeFlower(s: RaidState, f: Terrain["flowers"][number]) {
  if (f.exploded) return;
  f.exploded = true;
  zoneAt(s, { kind: "blast", x: f.x, y: f.y, r: 75, t: 0.3, tele: 0, damage: 0, every: 0, slow: 0 });
  for (const m of s.monsters) if (m.hp > 0 && dist(m.x, m.y, f.x, f.y) < 75 + m.r) { const dmg = Math.max(1, 35 - m.defense); m.hp -= dmg; m.flash = 0.1; s.pops.push({ x: m.x, y: m.y - m.r, text: String(dmg), t: 0.6, kind: "hit" }); if (m.hp <= 0) killMonster(s, m); }
  for (const g of s.terrain.flowers) if (!g.exploded && dist(g.x, g.y, f.x, f.y) < 75) explodeFlower(s, g);
}

// ---------- 음식 ----------
function useFood(s: RaidState, i: number) {
  const f = s.foods[i];
  if (!f || s.foodUsed[i]) return;
  s.foodUsed[i] = true;
  const v = f.effect.values[f.grade] ?? f.effect.values[0], p = s.player;
  if (f.effect.kind === "heal") { p.hp = Math.min(p.maxHp, p.hp + v); s.pops.push({ x: p.x, y: p.y - 30, text: `+${v}`, t: 1, kind: "heal" }); return; }
  if (f.effect.kind === "shield") { p.shield += v; p.shieldUntil = s.t + f.effect.seconds; return; }
  s.buffs.push({ kind: f.effect.kind, value: v, until: s.t + f.effect.seconds });
}

// ---------- 각성 ----------
function offerChoices(s: RaidState) {
  const pool = COMMON_AWAKENINGS.filter(id => (id !== "pet-training" || s.pet) && pick(s, id) < AWAKENINGS[id].max);
  const shuffled = [...pool].sort(() => rnd() - 0.5);
  if (s.level === 5 && s.evolution) {
    const finals = (Object.keys(AWAKENINGS) as AwakenId[]).filter(id => AWAKENINGS[id].final === s.evolution);
    s.choices = [...finals, shuffled[0]].filter(Boolean);
  } else s.choices = shuffled.slice(0, 3);
}
export function chooseAwakening(s: RaidState, id: AwakenId) {
  if (!s.choices?.includes(id)) return;
  s.picks[id] = (s.picks[id] ?? 0) + 1;
  if (id === "vitality") { s.player.maxHp += 25; s.player.hp = Math.min(s.player.maxHp, s.player.hp + 25); }
  s.choices = null;
  checkLevel(s);
}
function checkLevel(s: RaidState) {
  if (s.choices || s.level >= 5) return;
  if (s.xp >= AWAKEN_XP[s.level]) { s.level++; offerChoices(s); }
}

// ---------- 몬스터 행동 ----------
function aimAt(m: Monster, x: number, y: number) { const d = Math.hypot(x - m.x, y - m.y) || 1; m.dir = { x: (x - m.x) / d, y: (y - m.y) / d }; }
let routeTerrain: Terrain | null = null;
function moveToward(m: Monster, x: number, y: number, speed: number, dt: number, slow: number) { if (routeTerrain && speed > 0) { const t = routeTarget(routeTerrain, m.x, m.y, x, y); x = t.x; y = t.y; } aimAt(m, x, y); m.x += m.dir.x * speed * dt * slow; m.y += m.dir.y * speed * dt * slow; }
function shoot(s: RaidState, m: Monster, spread: number[], speed = 150, damage = m.damage) {
  const base = Math.atan2(s.player.y - m.y, s.player.x - m.x);
  for (const off of spread) s.projectiles.push({ x: m.x, y: m.y, vx: Math.cos(base + off) * speed, vy: Math.sin(base + off) * speed, r: 6, damage, life: 6, mine: false, pierce: null });
}
function startCharge(m: Monster, x: number, y: number, tele: number, len = 260) {
  aimAt(m, x, y); m.state = "tele"; m.stateT = tele;
  m.tele = { kind: "line", x: m.x, y: m.y, dx: m.dir.x, dy: m.dir.y, len, width: m.r * 2 };
}
function zoneAt(s: RaidState, z: Omit<Zone, "tick">) { s.zones.push({ ...z, tick: 0 }); }

function updateMonster(s: RaidState, m: Monster, dt: number) {
  const p = s.player, rate = m.rate;
  m.flash = Math.max(0, m.flash - dt);
  // 상태 진행(예고 → 돌진 → 이동)
  if (m.state === "tele") { m.stateT -= dt; if (m.stateT <= 0) { m.state = "dash"; m.stateT = m.boss === "pollen-boar" ? 1.4 : m.boss === "storm-catfish" ? 1.1 : 0.6; m.tele = null; } return; }
  if (m.state === "stun") { m.stateT -= dt; if (m.stateT <= 0) m.state = "move"; return; }
  if (m.state === "dash") {
    const sp = m.boss === "pollen-boar" ? 420 : m.boss === "storm-catfish" ? 380 : m.def.kind === "hop" ? 260 : m.def.kind === "eel" ? 360 : m.def.kind === "crab" ? 250 : 320;
    m.x += m.dir.x * sp * dt; m.y += m.dir.y * sp * dt; m.stateT -= dt;
    if (m.boss === "storm-catfish" && Math.random() < dt * 3) zoneAt(s, { kind: "puddle", x: m.x, y: m.y, r: 50, t: 6, tele: 0, damage: 0, every: 0, slow: 0.3 });
    const wall = m.x < m.r || m.x > WORLD_W - m.r || m.y < m.r || m.y > WORLD_H - m.r || blockedAt(s.terrain, m.x, m.y, m.r * 0.6);
    if (wall && m.boss === "pollen-boar") { m.state = "stun"; m.stateT = 1; s.pops.push({ x: m.x, y: m.y - 50, text: "기절!", t: 1, kind: "info" }); }
    else if (m.stateT <= 0 || wall) { m.state = "move"; if (m.def.kind === "elite" && !m.boss) zoneAt(s, { kind: "pollen", x: m.x, y: m.y, r: 50, t: 3, tele: 0, damage: 6, every: 0.5, slow: 0.25 }); }
    { const o = pushOut(m.x, m.y, m.r, blockers(s.terrain)); m.x = o.x; m.y = o.y; }
    return;
  }
  const slow = (s.zones.some(z => z.kind === "puddle" && z.tele <= 0 && dist(z.x, z.y, m.x, m.y) < z.r) && !m.boss ? 0.85 : 1) * (m.boss ? 1 : slowAt(s.terrain, m.x, m.y, false));
  if (m.boss === "pollen-boar") return updatePollenBoar(s, m, dt);
  if (m.boss === "storm-catfish") return updateCatfish(s, m, dt);
  m.timer -= dt * rate;
  const far = dist(m.x, m.y, p.x, p.y);
  switch (m.def.kind) {
    case "chase": case "slime": moveToward(m, p.x, p.y, m.speed, dt, slow); break;
    case "hop": moveToward(m, p.x, p.y, m.speed * 0.6, dt, slow); if (m.timer <= 0) { m.timer = 1.8; aimAt(m, p.x, p.y); m.state = "dash"; m.stateT = 0.3; } break;
    case "ranged": case "frog": {
      // 200px까지 다가온 뒤 멈춰서 옆으로 천천히 움직인다(뒤로 도망가지 않아 근접 무기로도 잡을 수 있다).
      if (far > 200) moveToward(m, p.x, p.y, m.speed, dt, slow); else { aimAt(m, p.x, p.y); const side = m.uid % 2 ? 1 : -1; m.x += -m.dir.y * side * m.speed * 0.3 * dt; m.y += m.dir.x * side * m.speed * 0.3 * dt; }
      // 원거리: 0.4초 반짝 예고 후 발사, 340px 안에서만 쏜다. 개구리는 같은 방향 3연사(0.15초 간격).
      if (m.timer <= 0.4 && m.timer > 0) m.flash = Math.max(m.flash, 0.05);
      if (m.timer <= 0) {
        m.timer = m.def.kind === "frog" ? 1.8 : 2.2;
        if (far < 340 && !segmentHits(s.terrain.walls, m.x, m.y, p.x, p.y)) { if (m.def.kind === "frog") { shoot(s, m, [0], 135); m.shots = 2; m.t2 = 0.15; } else shoot(s, m, [0], 140); }
      }
      if (m.def.kind === "frog" && m.shots > 0) { m.t2 -= dt; if (m.t2 <= 0) { m.shots--; m.t2 = 0.15; shoot(s, m, [0], 135); } }
      break;
    }
    case "charge": case "eel": case "crab": moveToward(m, p.x, p.y, m.speed, dt, slow);
      if (m.timer <= 0 && far < 320) { m.timer = m.def.kind === "eel" ? 2.5 : 3; startCharge(m, p.x, p.y, m.def.kind === "eel" ? 0.5 : m.def.kind === "crab" ? 0.5 : 0.7, m.def.kind === "crab" ? 90 : 200); m.stateT = m.def.kind === "crab" ? 0.5 : m.stateT; }
      break;
    case "elite": moveToward(m, p.x, p.y, m.speed, dt, slow); if (m.timer <= 0) { m.timer = 4; startCharge(m, p.x, p.y, 0.8, 220); } break;
    case "canal-elite": moveToward(m, p.x, p.y, m.speed, dt, slow);
      if (m.timer <= 0) { m.timer = 3; m.t4 = (m.t4 || 0) + 1; if (m.t4 % 2) shoot(s, m, [-0.3, 0, 0.3], 140); else startCharge(m, p.x, p.y, 0.7, 240); }
      break;
  }
  { const o = pushOut(m.x, m.y, m.r, blockers(s.terrain)); m.x = o.x; m.y = o.y; }
}

function nearPlayer(s: RaidState, spread: number) { return { x: clamp(s.player.x + (rnd() - 0.5) * spread, 40, WORLD_W - 40), y: clamp(s.player.y + (rnd() - 0.5) * spread, 40, WORLD_H - 40) }; }
function summoned(s: RaidState, id: string) { return s.monsters.filter(m => m.summoned && m.def.id === id && m.hp > 0).length; }

function updatePollenBoar(s: RaidState, m: Monster, dt: number) {
  const p = s.player;
  moveToward(m, p.x, p.y, m.speed, dt, 1);
  m.timer -= dt; m.t2 -= dt; m.t3 -= dt;
  if (m.timer <= 0) { m.timer = 6; startCharge(m, p.x, p.y, 0.8, 600); }
  else if (m.t2 <= 0) { m.t2 = 9; for (let i = 0; i < 3; i++) { const at = nearPlayer(s, 260); zoneAt(s, { kind: "pollen", ...at, r: 60, t: 3, tele: 0.6, damage: 6, every: 0.5, slow: 0.25 }); } }
  else if (m.t3 <= 0) { m.t3 = 15; const n = Math.min(2, 6 - summoned(s, "boarling")); for (let i = 0; i < n; i++) spawn(s, "boarling", { summoned: true }, { x: m.x + (i ? 30 : -30), y: m.y + 20 }); }
}
function updateCatfish(s: RaidState, m: Monster, dt: number) {
  const p = s.player;
  moveToward(m, p.x, p.y, m.speed, dt, 1);
  m.timer -= dt; m.t2 -= dt; m.t3 -= dt; m.t4 -= dt;
  if (m.t2 <= 0) { m.t2 = 4; for (let i = 0; i < 2; i++) { const at = nearPlayer(s, 220); zoneAt(s, { kind: "bolt", ...at, r: 55, t: 0.15, tele: 1.0, damage: 26, every: 0, slow: 0 }); } }
  if (m.timer <= 0) { m.timer = 10; for (let i = 0; i < 4; i++) zoneAt(s, { kind: "puddle", ...nearPlayer(s, 640), r: 70, t: 6, tele: 0.5, damage: 0, every: 0, slow: 0.3 }); }
  else if (m.t3 <= 0) { m.t3 = 8; startCharge(m, p.x, p.y, 0.9, 520); }
  else if (m.t4 <= 0) { m.t4 = 14; const n = Math.min(2, 6 - summoned(s, "shock-eel")); for (let i = 0; i < n; i++) spawn(s, "shock-eel", { summoned: true }, { x: m.x + (i ? 30 : -30), y: m.y + 20 }); }
}

/** 1·2·3분 보스 간접 개입. */
function intervention(s: RaidState, n: number) {
  const f = s.floor.floor, p = s.player;
  if (f === 5) {
    if (n === 1) zoneAt(s, { kind: "line", x: s.cam.x, y: p.y, r: 30, t: 0.4, tele: 1.2, damage: 30, every: 0, slow: 0, dx: 1, dy: 0, len: ARENA_W });
    if (n === 2) for (let i = 0; i < 5; i++) { const at = nearPlayer(s, 420); zoneAt(s, { kind: "pollen", ...at, r: 60, t: 3, tele: 0.6, damage: 6, every: 0.5, slow: 0.25 }); }
    if (n === 3) for (let i = 0; i < 4; i++) spawn(s, "boarling");
  } else if (f === 10) {
    if (n === 1) for (let i = 0; i < 6; i++) zoneAt(s, { kind: "puddle", ...nearPlayer(s, 700), r: 70, t: 6, tele: 0.5, damage: 0, every: 0, slow: 0.3 });
    if (n === 2) for (let i = 0; i < 3; i++) { const at = nearPlayer(s, 200); zoneAt(s, { kind: "bolt", ...at, r: 55, t: 0.15, tele: 1.0 + i * 0.5, damage: 26, every: 0, slow: 0 }); }
    if (n === 3) for (let i = 0; i < 4; i++) spawn(s, "shock-eel");
  } else {
    const id = s.floor.boss.base ?? s.floor.monsters[0];
    for (let i = 0; i < 4; i++) spawn(s, MONSTERS[id].kind === "elite" || MONSTERS[id].kind === "canal-elite" ? s.floor.monsters[s.floor.monsters.length - 1] : id);
  }
  s.pops.push({ x: s.cam.x + ARENA_W / 2, y: s.cam.y + 60, text: `⚠ ${s.floor.boss.name}의 기척!`, t: 1.8, kind: "info" });
}

// ---------- 전투펫(31절) ----------
function petHit(s: RaidState, m: Monster, raw: number) {
  if (m.hp <= 0) return;
  const dmg = Math.max(1, Math.round(raw * (m.markUntil > s.t ? 1.1 : 1) - m.defense));
  m.hp -= dmg; m.flash = 0.1; s.pops.push({ x: m.x, y: m.y - m.r, text: String(dmg), t: 0.5, kind: "hit" });
  if (m.hp <= 0) killMonster(s, m);
}
function updatePet(s: RaidState, dt: number) {
  const pet = s.pet; if (!pet) return;
  const p = s.player, mult = pet.mult * (1 + 0.25 * pick(s, "pet-training"));
  // 플레이어 뒤쪽을 따라다닌다.
  const tx = p.x - Math.cos(p.aim) * 34, ty = p.y - Math.sin(p.aim) * 34 - 10;
  pet.x += (tx - pet.x) * Math.min(1, dt * 6); pet.y += (ty - pet.y) * Math.min(1, dt * 6);
  pet.flash = Math.max(0, pet.flash - dt);
  const alive = s.monsters.filter(m => m.hp > 0);
  if (pet.id === "battle-tiger" && !pet.shieldUsed && p.hp > 0 && p.hp <= p.maxHp * 0.3) { pet.shieldUsed = true; p.shield += Math.round(30 * mult); p.shieldUntil = s.t + 60; s.pops.push({ x: p.x, y: p.y - 44, text: "🐯 백호의 가호!", t: 1.2, kind: "info" }); }
  pet.timer -= dt; if (pet.timer > 0) return;
  pet.flash = 0.25;
  switch (pet.id) {
    case "battle-hedgehog": { pet.timer = 1.4; const near = alive.filter(m => dist(m.x, m.y, pet.x, pet.y) < 220).sort((a, b) => dist(a.x, a.y, pet.x, pet.y) - dist(b.x, b.y, pet.x, pet.y))[0]; if (near) petHit(s, near, 7 * mult); break; }
    case "battle-turtle": pet.timer = 22; if (p.shield < 10 * mult) { p.shield = Math.round(10 * mult); p.shieldUntil = s.t + 22; } break;
    case "battle-sprite": pet.timer = 16; { const v = Math.round(4 * mult); p.hp = Math.min(p.maxHp, p.hp + v); s.pops.push({ x: p.x, y: p.y - 30, text: `+${v}`, t: 0.8, kind: "heal" }); } break;
    case "battle-foxfire": { pet.timer = 8; const target = alive.filter(m => m.markUntil <= s.t).sort((a, b) => b.maxHp - a.maxHp)[0]; if (target) target.markUntil = s.t + 5; break; }
    case "battle-hawk": { pet.timer = 2.2; const strong = [...alive].sort((a, b) => b.hp - a.hp)[0]; if (strong) petHit(s, strong, 16 * mult); break; }
    case "battle-tiger": { pet.timer = 5; for (const m of alive) { const a = Math.atan2(m.y - p.y, m.x - p.x); if (dist(m.x, m.y, p.x, p.y) < 120 + m.r && angDiff(a, p.aim) < Math.PI / 3) petHit(s, m, 28 * mult); } s.swings.push({ angle: p.aim, range: 120, arc: 120, t: 0.18 }); break; }
  }
}

// ---------- 스크롤 전장: 카메라·탑의 압박·정예 예고·수문·기회 지형 ----------
function updateWorld(s: RaidState, dt: number) {
  const p = s.player, c = s.cam, T = s.terrain;
  // 카메라: 플레이어를 따라가고 조준 방향으로 최대 60px 앞서 본다(0.15초에 걸쳐).
  const k = Math.min(1, dt / 0.15);
  c.lx += (Math.cos(p.aim) * 60 - c.lx) * k; c.ly += (Math.sin(p.aim) * 60 - c.ly) * k;
  const tx = clamp(p.x + c.lx - ARENA_W / 2, 0, WORLD_W - ARENA_W), ty = clamp(p.y + c.ly - ARENA_H / 2, 0, WORLD_H - ARENA_H);
  c.x += (tx - c.x) * Math.min(1, dt * 8); c.y += (ty - c.y) * Math.min(1, dt * 8);
  // 탑의 압박: 반경 180px 안에 20초 이상 머물면 단계 +1(최대 3), 220px 이상 벗어나 4초 지나면 초기화.
  const pr = s.pressure, away = dist(p.x, p.y, pr.x, pr.y);
  if (away > 220) { if (pr.leftAt < 0) pr.leftAt = s.t; if (s.t - pr.leftAt >= 4) { pr.x = p.x; pr.y = p.y; pr.since = s.t; pr.stage = 0; pr.leftAt = -1; } }
  else if (away <= 180) { pr.leftAt = -1; const stage = Math.min(3, Math.floor((s.t - pr.since) / 20)); if (stage > pr.stage) { pr.stage = stage; s.pops.push({ x: p.x, y: p.y - 50, text: `⚠ 탑의 압박 ${stage}단계`, t: 1.4, kind: "info" }); } }
  // 정예 예고 → 등장
  for (const w of s.warns) if (s.t >= w.at) spawnElite(s, w);
  s.warns = s.warns.filter(w => s.t < w.at);
  // 수문: 45초마다 바뀐다(2초 전 예고). 항상 다리 두 개 이상 열림.
  for (const g of T.gates) if (g.moving && s.t >= g.next) { g.next += 45; }
  if (T.gates.some(g => g.moving)) {
    const cycle = Math.floor(s.t / 45), closedIdx = cycle % T.gates.length;
    T.gates.forEach((g, i) => { g.closed = i === closedIdx; });
  }
  // 기회 지형: 25~35초마다 자리를 옮긴다.
  if (!T.chance || s.t >= T.chance.next) {
    for (let i = 0; i < 20; i++) {
      const x = 120 + rnd() * (WORLD_W - 240), y = 120 + rnd() * (WORLD_H - 240);
      if (blockedAt(T, x, y, 60) || dist(x, y, p.x, p.y) < 200) continue;
      T.chance = { x, y, r: T.zone === "field" ? 22 : 80, next: s.t + 25 + rnd() * 10, used: false }; break;
    }
  }
  // 수로 기회 지형 "정령 샘": 안에 있으면 초당 체력 2 회복, 전투펫 재사용 진행 +20%
  if (T.chance && T.zone === "canal" && dist(p.x, p.y, T.chance.x, T.chance.y) < T.chance.r) { p.hp = Math.min(p.maxHp, p.hp + 2 * dt); if (s.pet) s.pet.timer -= dt * 0.2; }
}

// ---------- 한 스텝 ----------
export function stepRaid(s: RaidState, dt: number, input: Input) {
  if (s.over || s.paused || s.choices) { s.prevDash = input.dash; s.prevFood = input.food; return; }
  s.t += dt;
  const p = s.player, d = derived(s);

  // 각성 최소 보장
  for (const g of AWAKEN_GUARANTEE) if (s.t >= g.at && s.level < g.level && !s.choices) { s.xp = Math.max(s.xp, AWAKEN_XP[g.level - 1]); checkLevel(s); if (s.choices) break; }

  // 음식·회피(누른 순간만)
  input.food.forEach((on, i) => { if (on && !s.prevFood[i]) useFood(s, i); });
  s.prevFood = input.food;
  p.iframes = Math.max(0, p.iframes - dt); p.dashCd = Math.max(0, p.dashCd - dt);
  if (p.shield > 0 && p.shieldUntil && s.t > p.shieldUntil) p.shield = 0;
  let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0), my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const ml = Math.hypot(mx, my); if (ml) { mx /= ml; my /= ml; }
  // 입력 조준은 화면 좌표 → 월드 좌표
  p.aim = Math.atan2(input.aimY + s.cam.y - p.y, input.aimX + s.cam.x - p.x);
  if (input.dash && !s.prevDash && p.dashCd <= 0) { p.dashT = PLAYER.dashTime * (inMud(s.terrain, p.x, p.y) ? 0.8 : 1); p.dashDir = ml ? { x: mx, y: my } : { x: Math.cos(p.aim), y: Math.sin(p.aim) }; p.dashCd = d.dashCd; }
  s.prevDash = input.dash;

  // 이동(장판 둔화, 공격 중 둔화)
  const inPollen = s.zones.find(z => (z.kind === "pollen" || z.kind === "puddle") && z.tele <= 0 && dist(z.x, z.y, p.x, p.y) < z.r);
  if (p.dashT > 0) { p.dashT -= dt; p.x += p.dashDir.x * PLAYER.dashSpeed * dt; p.y += p.dashDir.y * PLAYER.dashSpeed * dt; }
  else { const sp = d.speed * (inPollen ? 1 - inPollen.slow : 1) * (p.slowUntil > s.t ? 1 - PLAYER.attackSlow : 1) * slowAt(s.terrain, p.x, p.y, true); p.x += mx * sp * dt; p.y += my * sp * dt; }
  { const o = pushOut(p.x, p.y, PLAYER.radius, blockers(s.terrain)); p.x = o.x; p.y = o.y; }
  updateWorld(s, dt);

  // 공격: 누르고 있으면 간격마다 휘두른다. 시작 0.12초 뒤 판정.
  p.swingCd = Math.max(0, p.swingCd - dt);
  if (input.attack && p.swingCd <= 0 && p.windup < 0) { p.windup = 0.12; p.swingCd = d.interval; p.slowUntil = s.t + 0.3; }
  if (p.windup >= 0) {
    p.windup -= dt;
    if (p.windup < 0) {
      p.attacks++;
      swingHit(s, p.aim, 1);
      if (s.picks["double-cut"] && p.attacks % 3 === 0) swingHit(s, p.aim, 0.55);
      if (s.picks.eclipse && p.attacks % 4 === 0) s.projectiles.push({ x: p.x, y: p.y, vx: Math.cos(p.aim) * 700, vy: Math.sin(p.aim) * 700, r: 26, damage: s.weapon.damage * 1.8, life: 2, mine: true, pierce: new Set() });
      if (s.picks["harvest-storm"] && p.attacks % 5 === 0) { p.stormUntil = s.t + 2; p.stormTick = 0; }
    }
  }
  if (p.stormUntil > s.t) { p.stormTick -= dt; if (p.stormTick <= 0) { p.stormTick = 0.25; swingHit(s, p.aim, 1, true); } }

  // 웨이브 생성(4분까지)
  if (s.t < BOSS_AT) {
    s.spawnAcc += s.floor.spawnRate * dt / Math.pow(0.92, s.pressure.stage);
    const alive = s.monsters.filter(m => m.hp > 0 && !m.elite && !m.boss).length;
    while (s.spawnAcc >= 1) { s.spawnAcc -= 1; if (alive < s.floor.maxAlive) { const id = pickSpawn(s); if (id) spawn(s, id); } }
    const e = s.floor.elite;
    if (e && s.t >= s.nextElite) {
      if (e.every) { warnElite(s); s.nextElite += e.every; }
      else if (s.elitesPlaced < (e.count ?? 0)) { warnElite(s); s.elitesPlaced++; s.nextElite += 90; }
    }
    if (!s.floor.training && s.t >= 60 * (s.interventions + 1) && s.interventions < 3) { s.interventions++; intervention(s, s.interventions); }
  } else if (!s.bossSpawned && !s.floor.training) spawnBoss(s);

  // 몬스터(강 반대편이면 다리로 돌아간다)
  routeTerrain = s.terrain.deep.length ? s.terrain : null;
  for (const m of s.monsters) if (m.hp > 0) updateMonster(s, m, dt);
  routeTerrain = null;
  updatePet(s, dt);
  // 몸끼리 살짝 밀어내기(겹침 완화, 인접만)
  for (let i = 0; i < s.monsters.length; i++) {
    const a = s.monsters[i]; if (a.hp <= 0 || a.boss) continue;
    for (let j = i + 1; j < s.monsters.length; j++) {
      const b = s.monsters[j]; if (b.hp <= 0 || b.boss) continue;
      const dx = b.x - a.x, dy = b.y - a.y, dd = Math.hypot(dx, dy), min = a.r + b.r;
      if (dd > 0 && dd < min) { const push = (min - dd) / 2 / dd; a.x -= dx * push; a.y -= dy * push; b.x += dx * push; b.y += dy * push; }
    }
  }
  // 접촉 피해
  for (const m of s.monsters) if (m.hp > 0 && dist(m.x, m.y, p.x, p.y) < m.r + PLAYER.radius) hurtPlayer(s, m.state === "dash" && m.boss ? m.damage + 8 : m.damage, m.name);

  // 투사체
  for (const pr of s.projectiles) {
    const w = windAt(s.terrain, pr.x, pr.y), sp = Math.hypot(pr.vx, pr.vy) || 1, along = w ? (pr.vx * w.dx + pr.vy * w.dy) / sp : 0, k = along > 0.5 ? 1.2 : along < -0.5 ? 0.85 : 1;
    const nx = pr.x + pr.vx * dt * k, ny = pr.y + pr.vy * dt * k;
    if (segmentHits(s.terrain.walls, pr.x, pr.y, nx, ny)) { pr.life = 0; continue; }
    pr.x = nx; pr.y = ny; pr.life -= dt;
    if (pr.mine) { for (const m of s.monsters) if (m.hp > 0 && !pr.pierce!.has(m.uid) && dist(pr.x, pr.y, m.x, m.y) < pr.r + m.r) { pr.pierce!.add(m.uid); hitMonster(s, m, pr.damage, Math.atan2(pr.vy, pr.vx), 0); } }
    else if (dist(pr.x, pr.y, p.x, p.y) < pr.r + PLAYER.radius) { hurtPlayer(s, pr.damage, "투사체"); pr.life = 0; }
    if (pr.x < -50 || pr.x > WORLD_W + 50 || pr.y < -50 || pr.y > WORLD_H + 50) pr.life = 0;
  }
  s.projectiles = s.projectiles.filter(pr => pr.life > 0);

  // 장판·예고
  for (const z of s.zones) {
    if (z.tele > 0) { z.tele -= dt; if (z.tele <= 0 && (z.kind === "bolt" || z.kind === "line" || z.kind === "tshock")) {
      const inside = z.kind === "line" ? Math.abs(p.y - z.y) < z.r && p.x > z.x && p.x < z.x + (z.len ?? ARENA_W) : dist(z.x, z.y, p.x, p.y) < z.r;
      if (inside && z.kind !== "tshock") hurtPlayer(s, z.damage, z.kind === "line" ? "돌진 예고" : "번개");
      if (z.kind === "bolt") for (const w of s.terrain.puddles) if (dist(w.x, w.y, z.x, z.y) < w.r + z.r) zoneAt(s, { kind: "tshock", x: w.x, y: w.y, r: w.r, t: 0.3, tele: 0.5, damage: z.damage, every: 0, slow: 0 });
      if (z.kind === "tshock") { if (dist(z.x, z.y, p.x, p.y) < z.r) hurtPlayer(s, Math.round(z.damage * 0.5), "전도성 웅덩이"); for (const m of s.monsters) if (m.hp > 0 && dist(m.x, m.y, z.x, z.y) < z.r + m.r) { m.hp -= Math.max(1, z.damage - m.defense); m.flash = 0.1; if (m.hp <= 0) killMonster(s, m); } }
      if (z.kind === "bolt") for (const w of s.zones) if (w.kind === "puddle" && w.tele <= 0 && dist(w.x, w.y, z.x, z.y) < w.r + z.r) zoneAt(s, { kind: "shock", x: w.x, y: w.y, r: w.r, t: 0.5, tele: 0, damage: 12, every: 0.5, slow: 0 });
    } continue; }
    z.t -= dt;
    if (z.damage && z.every && dist(z.x, z.y, p.x, p.y) < z.r) { z.tick -= dt; if (z.tick <= 0) { z.tick = z.every; hurtPlayer(s, z.damage, z.kind === "pollen" ? "꽃가루 장판" : "감전"); } }
  }
  s.zones = s.zones.filter(z => z.tele > 0 || z.t > 0);

  // 경험치 구슬
  for (const o of s.orbs) {
    o.age += dt;
    const r = dist(o.x, o.y, p.x, p.y);
    if (r < d.absorb || o.age > 8) { const k = Math.min(1, (500 * dt) / Math.max(1, r)); o.x += (p.x - o.x) * k; o.y += (p.y - o.y) * k; }
    if (r < PLAYER.radius + 6) { s.xp += o.xp; o.xp = 0; }
  }
  s.orbs = s.orbs.filter(o => o.xp > 0);
  checkLevel(s);

  // 정리
  s.monsters = s.monsters.filter(m => m.hp > 0);
  for (const pop of s.pops) { pop.t -= dt; pop.y -= 30 * dt; }
  s.pops = s.pops.filter(pop => pop.t > 0).slice(-40);
  for (const sw of s.swings) sw.t -= dt;
  s.swings = s.swings.filter(sw => sw.t > 0);

  if (s.boss) s.bossHpAtEnd = Math.max(0, s.boss.hp / s.boss.maxHp);
  if (!s.over && s.t >= (s.floor.duration ?? FLOOR_SECONDS)) s.over = "timeout";
}

export type RaidResult = { floor: number; cleared: boolean; kills: number; usedFoods: number[]; bossHpLeft: number; hpLeft: number; level: number; reason: string[]; abandoned?: boolean };
export function raidResult(s: RaidState): RaidResult {
  const usedFoods = s.foodUsed.map((u, i) => (u ? i : -1)).filter(i => i >= 0);
  const reason: string[] = [];
  if (s.over === "dead") reason.push("생존 부족");
  if (s.over === "timeout") reason.push("화력 부족");
  if (s.over !== "clear" && s.foods.some((f, i) => f && !s.foodUsed[i])) reason.push("음식 미사용");
  if (s.over !== "clear" && s.level < 5) reason.push("각성 지연");
  return { floor: s.floor.floor, cleared: s.over === "clear", kills: s.kills, usedFoods, bossHpLeft: s.bossSpawned ? s.bossHpAtEnd : 1, hpLeft: s.player.hp / s.player.maxHp, level: s.level, reason };
}
