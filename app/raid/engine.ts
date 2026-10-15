/**
 * 탑 토벌 전투 엔진(순수 로직). 렌더링·입력은 RaidGame.tsx가 맡고, 여기서는 고정 시간 스텝으로 상태만 바꾼다.
 * 좌표는 논리 해상도 960×540(px), 시간은 초.
 */
import {
  ARENA_H, ARENA_W, AWAKENINGS, AWAKEN_GUARANTEE, AWAKEN_XP, BOSS_AT, BOSS_SUMMON_EVERY, COMMON_AWAKENINGS, ELITE_AT, ENDLESS_AWAKENINGS, INTERVENTION_AT, MAX_ALIVE_MUL, NORMAL_SPEED_MUL, ORB_AUTO, ORB_PULL, SPAWN_MUL, xpForLevel, MONSTERS, PLAYER,
  type AwakenId, type BossDef, type Evolution, type FloorDef, type FoodEffect, type MonsterDef, type WeaponStats,
} from "./data";
import { SPECIALS } from "./weapons";
import { FLOW_CELL, START, WORLD_H, WORLD_W, blockedAt, blockers, buildFlow, clearLine, flowNext, inMud, makeTerrain, pushOut, routeTarget, segmentHits, slowAt, windAt, type Flow, type Terrain } from "./terrain";

export type Input = { up: boolean; down: boolean; left: boolean; right: boolean; aimX: number; aimY: number; attack: boolean; dash: boolean; food: [boolean, boolean, boolean];
  /** 우클릭 특수 공격(누른 순간 한 번) */
  special?: boolean;
  /** 모바일 가상 스틱(−1~1, 길이 1 이하). 있으면 방향키 대신 쓴다. */
  moveX?: number; moveY?: number };
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
  /** 맞고 밀려나는 속도(px/s, 서서히 줄어든다) */
  kvx: number; kvy: number;
  /** 무기 효과: 둔화·빙결 노출·받는 피해 증가·연속 타격 */
  slowUntil: number; slowMul: number; expose: number; frozenUntil: number; takenUntil: number; takenBonus: number; combo: number; inNet: boolean;
  t2: number; t3: number; t4: number;
  /** 여우불 표식: 이 시각까지 받는 피해 +10% */
  markUntil: number;
};
export type Projectile = { x: number; y: number; vx: number; vy: number; r: number; damage: number; life: number; mine: boolean; pierce: Set<number> | null;
  /** 내 투사체: 남은 관통 수, 폭발, 쏜 자리(먼 거리 보너스), 보스 방어 무시 */
  left?: number; explode?: number; ox?: number; oy?: number; ignoreDef?: boolean; wave?: boolean; defIgnore?: number; siege?: boolean; debris?: boolean };
export type Zone = { kind: "pollen" | "puddle" | "bolt" | "shock" | "line" | "tshock" | "blast" | "pbomb" | "poison" | "net" | "rain" | "frost";
  /** 내 공격 장판: 폭발 배율·독·그물 반지름 등 */
  mine?: { mul: number; poison?: boolean; seedChain?: boolean; big?: boolean }; x: number; y: number; r: number; t: number; tele: number; damage: number; every: number; tick: number; slow: number; dx?: number; dy?: number; len?: number };
export type Orb = { x: number; y: number; xp: number; age: number };
export type Spark = { x: number; y: number; vx: number; vy: number; t: number; life: number; color: string; size: number };
export type Pop = { x: number; y: number; text: string; t: number; kind: "hit" | "crit" | "hurt" | "heal" | "info" };
export type Swing = { angle: number; range: number; arc: number; t: number;
  /** 낫 외 공격 연출: circle(내려찍기·폭발)·line(찌르기·물대포·낚싯줄)·cone(물줄기) */
  kind?: "circle" | "line" | "cone"; x?: number; y?: number; width?: number };

export type RaidState = {
  floor: FloorDef; t: number; over: null | "clear" | "dead" | "timeout"; paused: boolean;
  weapon: WeaponStats; evolution: Evolution | null; gear: Gear;
  pet: { id: string; mult: number; x: number; y: number; timer: number; shieldUsed: boolean; flash: number } | null;
  player: { x: number; y: number; hp: number; maxHp: number; shield: number; shieldUntil: number; iframes: number; dashCd: number; dashT: number; dashDir: { x: number; y: number }; swingCd: number; windup: number; aim: number; attacks: number; slowUntil: number; emergencyUsed: boolean; stormUntil: number; stormTick: number; chainAt: number[];
    /** 채널형(물뿌리개) 틱, 계속 쏜 시간, 대시 보너스, 마지막 타격 대상, 주기 효과 타이머, 보스 피격 감소 쿨 */
    tick: number; holdT: number; dashBonusUntil: number; lastTarget: number; bigCatch: number; periodic: number; ironAt: number; still: number; gale: number[];
    /** 조준 지점(월드 좌표, 비료 투척 목표) */
    tx: number; ty: number };
  buffs: { kind: FoodEffect["kind"]; value: number; until: number }[];
  foods: FoodSlot[]; foodUsed: boolean[];
  level: number; xp: number; picks: Partial<Record<AwakenId, number>>; choices: AwakenId[] | null;
  monsters: Monster[]; projectiles: Projectile[]; zones: Zone[]; orbs: Orb[]; pops: Pop[]; swings: Swing[];
  spawnAcc: number; nextElite: number; elitesPlaced: number; packAt: number; bossSummons: number;
  /** 처치 연출: 최근 처치 시각들(1초 안 5마리 이상이면 연쇄 처치), 화면 흔들림 */
  killTimes: number[]; shake: number; chainShown: number;
  /** 타격감: 잠깐 느려지기(초), 마지막 히트스톱 시각, 맞은 자리 불꽃, 효과음 카운터(화면이 보고 소리를 낸다) */
  hitstop: number; lastStop: number; sparks: Spark[]; sfx: { hit: number; crit: number; kill: number; big: number };
  /** 몬스터 길찾기 흐름장(플레이어 칸 기준, 0.25초마다 갱신) */
  flow: Flow | null; flowAt: number; flowCell: number; bossSpawned: boolean; interventions: number; boss: Monster | null;
  /** 스크롤 전장(50절): 카메라 왼쪽 위(월드 좌표), 지형, 탑의 압박, 정예 예고. */
  cam: { x: number; y: number; lx: number; ly: number }; terrain: Terrain;
  pressure: { x: number; y: number; since: number; stage: number; leftAt: number };
  warns: { x: number; y: number; at: number; id: string }[];
  /** 특수 공격(52절): 준비 시각, 진행 중 효과, 예약된 타격 */
  special: { readyAt: number; prev: boolean; moveUntil: number; moveMul: number; lockAim: number | null; stanceUntil: number; stanceHit: boolean; cancelable: boolean; hits: Record<number, number>; bump: number;
    /** Last cast snapshot used by the renderer for evolution-specific effects. */
    castAt: number; castX: number; castY: number; castAim: number };
  actions: { at: number; run: () => void; tag?: string }[];
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
    player: { x: START.x, y: START.y, hp: PLAYER.hp + gear.hp, maxHp: PLAYER.hp + gear.hp, shield: gear.startShield, shieldUntil: 0, iframes: 1, dashCd: 0, dashT: 0, dashDir: { x: 1, y: 0 }, swingCd: 0, windup: -1, aim: 0, attacks: 0, slowUntil: 0, emergencyUsed: false, stormUntil: 0, stormTick: 0, chainAt: [], tick: 0, holdT: 0, dashBonusUntil: 0, lastTarget: -1, bigCatch: 0, periodic: 6, ironAt: 0, still: 0, gale: [], tx: START.x + 100, ty: START.y },
    buffs: [], foods, foodUsed: foods.map(() => false),
    level: 1, xp: 0, picks: {}, choices: null,
    monsters: [], projectiles: [], zones: [], orbs: [], pops: [], swings: [],
    spawnAcc: 0.97, nextElite: ELITE_AT[0], elitesPlaced: 0, packAt: 0, bossSummons: 0, killTimes: [], shake: 0, chainShown: 0, hitstop: 0, lastStop: -1, sparks: [], sfx: { hit: 0, crit: 0, kill: 0, big: 0 }, flow: null, flowAt: 0, flowCell: -1, bossSpawned: false, interventions: 0, boss: null,
    special: { readyAt: 0, prev: false, moveUntil: 0, moveMul: 1, lockAim: null, stanceUntil: 0, stanceHit: false, cancelable: false, hits: {}, bump: 0, castAt: -99, castX: 0, castY: 0, castAim: 0 }, actions: [],
    kills: 0, damageTaken: {}, uid: 1, prevDash: false, prevFood: [false, false, false], bossHpAtEnd: 1,
  };
}

// ---------- 파생 능력치 ----------
const pick = (s: RaidState, id: AwakenId) => s.picks[id] ?? 0;
const buffSum = (s: RaidState, kinds: FoodEffect["kind"][]) => s.buffs.filter(b => b.until > s.t && kinds.includes(b.kind)).reduce((sum, b) => sum + b.value / 100, 0);
export const derived = (s: RaidState) => ({
  damageMul: 1 + 0.22 * pick(s, "keen-edge") + 0.06 * pick(s, "endless-edge") + buffSum(s, ["attack", "all"]),
  interval: Math.max(0.25, s.weapon.interval * Math.max(0.65, 1 - 0.14 * pick(s, "quick-grip") - 0.03 * pick(s, "endless-haste") - buffSum(s, ["haste", "all"]))),
  range: s.weapon.range * (1 + 0.22 * pick(s, "long-handle")),
  arc: Math.min(360, s.weapon.angle + 10 * pick(s, "long-handle")),
  knockback: s.weapon.knockback * (1 + 0.5 * pick(s, "heavy-swing")),
  speed: PLAYER.speed * (1 + 0.12 * pick(s, "wind-step") + s.gear.speed + buffSum(s, ["speed", "all"])),
  dashCd: PLAYER.dashCooldown * Math.max(0.3, 1 - 0.18 * pick(s, "quick-dash") - s.gear.dashCd),
  absorb: PLAYER.absorb + 45 * pick(s, "wide-gather") + s.gear.absorb,
  armor: 2 * pick(s, "hard-leather") + s.gear.defense,
  crit: PLAYER.critChance + s.gear.crit + buffSum(s, ["crit"]),
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
  return { uid: s.uid++, def, name: def.name, icon: def.icon, x: at.x, y: at.y, r: def.radius, hp: def.hp, maxHp: def.hp, damage: def.damage, defense: def.defense, speed: def.speed * (def.kind === "hop" || def.kind === "eel" ? 1 : NORMAL_SPEED_MUL),
    elite: def.kind === "elite" || def.kind === "canal-elite", boss: null, xp: def.xp, timer: 1 + rnd() * 1.5, state: "move", stateT: 0, dir: { x: 1, y: 0 }, tele: null,
    rate: 1, split: false, summoned: false, flash: 0, shots: 0, kvx: 0, kvy: 0, t2: 4, t3: 6, t4: 8, markUntil: 0, slowUntil: 0, slowMul: 1, expose: 0, frozenUntil: 0, takenUntil: 0, takenBonus: 0, combo: 0, inNet: false, ...opts };
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
function hurtPlayer(s: RaidState, raw: number, source = "기타", fromBoss = false) {
  const p = s.player;
  if (p.iframes > 0 || p.dashT > 0 || s.over) return;
  raw *= 1 - (s.weapon.fx?.guard ?? 0) - (s.picks["frost-veil"] && p.holdT > 0 ? 0.25 : 0) - buffSum(s, ["armor"]);
  if (s.special.stanceUntil > s.t) { raw *= 0.2; if (!s.special.stanceHit) { s.special.stanceHit = true; s.special.stanceUntil = 0; counterBlast(s, true); } }
  if (fromBoss && s.picks["iron-wall"] && s.t - p.ironAt >= 1) { p.ironAt = s.t; raw *= 0.5; }
  let dmg = Math.max(1, Math.round(raw - derived(s).armor));
  if (p.shield > 0) { const used = Math.min(p.shield, dmg); p.shield -= used; dmg -= used; }
  p.hp -= dmg; p.iframes = PLAYER.iframes; s.damageTaken[source] = (s.damageTaken[source] ?? 0) + dmg;
  if (dmg > 0) s.pops.push({ x: p.x, y: p.y - 24, text: `-${dmg}`, t: 0.8, kind: "hurt" });
  if (!p.emergencyUsed && pick(s, "emergency-shield") && p.hp > 0 && p.hp <= p.maxHp * 0.3) { p.emergencyUsed = true; p.shield += 25; p.shieldUntil = s.t + 60; s.pops.push({ x: p.x, y: p.y - 40, text: "비상 보호막!", t: 1.2, kind: "info" }); }
  if (p.hp <= 0) { if (s.floor.training) p.hp = 1; else { p.hp = 0; s.over = "dead"; } }
}
type HitOpts = { critAdd?: number; ignoreDef?: boolean; noCombo?: boolean; noCrit?: boolean; forceCrit?: boolean; defIgnore?: number; extra?: number };
function burst(s: RaidState, x: number, y: number, n: number, color: string, speed: number, ang?: number) {
  for (let i = 0; i < n; i++) {
    const a = ang === undefined ? rnd() * Math.PI * 2 : ang + (rnd() - 0.5) * 1.6, v = speed * (0.5 + rnd() * 0.7);
    s.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0.22 + rnd() * 0.12, life: 0.34, color, size: 1.6 + rnd() * 1.8 });
  }
  if (s.sparks.length > 160) s.sparks.splice(0, s.sparks.length - 160);
}
/** 히트스톱: 아주 잠깐 느려져 묵직한 손맛을 준다(너무 자주 걸리지 않게 간격 제한). */
function hitStop(s: RaidState, sec: number) { if (s.t - s.lastStop < 0.18) return; s.lastStop = s.t; s.hitstop = Math.max(s.hitstop, sec); }
function hitMonster(s: RaidState, m: Monster, base: number, ang: number, knock: number, o: HitOpts = {}) {
  if (m.hp <= 0) return;
  const d = derived(s), fx = s.weapon.fx ?? {}, p = s.player;
  let mul = d.damageMul;
  if (m.elite || m.boss) mul += 0.12 * pick(s, "heavy-swing") + (fx.elite ?? 0);
  if (m.boss) mul += (fx.boss ?? 0) + (s.picks.executioner ? 0.25 : 0) + (s.picks["big-catch"] ? p.bigCatch : 0);
  if (m.markUntil > s.t) mul += 0.1;
  if (m.frozenUntil > s.t) mul += 0.2;
  if (m.takenUntil > s.t) mul += m.takenBonus;
  if (m.state === "stun" && s.picks.topple) mul += 0.3;
  if (fx.dashBonus && p.dashBonusUntil > s.t) mul += 0.3;
  if (s.picks["hydro-focus"] && p.holdT > 1) mul += 0.4;
  if (s.picks.marksman && p.still > 0.3) mul += 0.25;
  if (s.picks["crush-combo"] && !o.noCombo) { m.combo = p.lastTarget === m.uid ? Math.min(5, m.combo + 1) : 0; p.lastTarget = m.uid; mul += 0.08 * m.combo; }
  if (m.boss && s.picks["big-catch"]) p.bigCatch = Math.min(0.3, p.bigCatch + 0.03);
  const critChance = d.crit + (fx.crit ?? 0) + (o.critAdd ?? 0) + ((m.elite || m.boss) ? (fx.eliteCrit ?? 0) + (s.picks["weak-aim"] ? 0.2 : 0) : 0);
  const crit = o.forceCrit || (!o.noCrit && rnd() < critChance);
  mul += o.extra ?? 0;
  let dmg = base * mul * (crit ? (s.picks["vital-stab"] ? 2 : PLAYER.critMul) : 1) * (m.state === "stun" ? 1.3 : 1);
  const ignore = m.boss && (o.ignoreDef || (crit && s.picks["vital-pierce"]));
  dmg = Math.max(1, Math.round(dmg - (ignore ? 0 : m.defense * (1 - (o.defIgnore ?? 0))) - (m.def.kind === "crab" && m.state !== "dash" ? 3 : 0)));
  if (s.picks.executioner && !m.boss && !m.elite && m.hp - dmg <= m.maxHp * 0.2) dmg = m.hp;
  m.hp -= dmg; m.flash = 0.12;
  s.pops.push({ x: m.x + (rnd() - 0.5) * 10, y: m.y - m.r, text: crit ? `${dmg}!` : String(dmg), t: crit ? 0.75 : 0.6, kind: crit ? "crit" : "hit" });
  // 타격감: 맞은 쪽 불꽃, 치명타는 금빛 불꽃·작은 흔들림·히트스톱, 밀려나기는 순간이동 대신 미끄러지듯
  const hx = m.x - Math.cos(ang) * m.r * 0.6, hy = m.y - Math.sin(ang) * m.r * 0.6;
  burst(s, hx, hy, crit ? 7 : 3, crit ? "#ffd84a" : "#fff4d6", crit ? 260 : 170, ang);
  if (crit) { s.shake = Math.max(s.shake, 2.2); hitStop(s, 0.05); s.sfx.crit++; } else s.sfx.hit++;
  if (!m.boss && knock) { const k = (m.elite ? 0.5 : 1) * knock * 12; m.kvx += Math.cos(ang) * k; m.kvy += Math.sin(ang) * k; }
  if (fx.stagger && !m.boss && !m.elite && m.state === "move") { m.state = "stun"; m.stateT = fx.stagger; }
  if (m.def.kind === "slime" && !m.split && !m.boss && rnd() < 0.2 && m.hp > 0) { m.split = true; spawn(s, "moss-slime", { hp: 14, maxHp: 14, r: 9, xp: 0, split: true }, { x: m.x + 12, y: m.y + 12 }); }
  if (m.hp <= 0) killMonster(s, m);
}
function killMonster(s: RaidState, m: Monster) {
  m.hp = 0; s.kills++;
  s.shake = Math.max(s.shake, m.boss ? 5 : m.elite ? 3 : 1.5);
  s.killTimes = [...s.killTimes.filter(t => t > s.t - 1), s.t];
  if (s.killTimes.length >= 5 && s.t - s.chainShown > 1) { s.chainShown = s.t; s.pops.push({ x: s.player.x, y: s.player.y - 60, text: `⚡ 연쇄 처치 ×${s.killTimes.length}`, t: 0.9, kind: "info" }); }
  burst(s, m.x, m.y, m.boss ? 30 : m.elite ? 18 : 8, m.boss || m.elite ? "#ffcf6a" : "#f4ead2", m.boss ? 320 : 220);
  if (m.boss || m.elite) { hitStop(s, m.boss ? 0.18 : 0.1); s.sfx.big++; } else s.sfx.kill++;
  if (m.xp > 0) s.orbs.push({ x: m.x, y: m.y, xp: m.xp, age: 0 });
  if (s.weapon.fx?.spinKill && !m.elite && !m.boss) s.player.swingCd = Math.max(0, s.player.swingCd - s.weapon.interval * 0.1);
  if (m.inNet && s.picks["full-haul"] && m.xp > 0) s.orbs.push({ x: m.x + 6, y: m.y, xp: Math.max(1, Math.round(m.xp * 0.5)), age: 0 });
  if (s.picks["manure-blast"] && s.zones.some(z => z.kind === "poison" && dist(z.x, z.y, m.x, m.y) < z.r)) blastAt(s, m.x, m.y, 40, s.weapon.damage * 0.4);
  if (s.picks["chain-harvest"] && rnd() < 0.35) { const p = s.player; p.chainAt = p.chainAt.filter(at => at > s.t - 1); if (p.chainAt.length < 2) { p.chainAt.push(s.t); swingHit(s, 0, 1, true); } }
  if (m.elite && !m.boss && s.t < BOSS_AT) s.packAt = s.t + 0.5;
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

// ---------- 무기별 공격(49절) ----------
const inAim = (p: { x: number; y: number }, aim: number, m: Monster, len: number, width: number) => {
  const dx = m.x - p.x, dy = m.y - p.y, along = dx * Math.cos(aim) + dy * Math.sin(aim), side = Math.abs(-dx * Math.sin(aim) + dy * Math.cos(aim));
  return along > -m.r && along < len + m.r && side < width / 2 + m.r ? along : -1;
};
function blastAt(s: RaidState, x: number, y: number, r: number, dmg: number, knock = 20) {
  s.swings.push({ angle: 0, range: r, arc: 360, t: 0.25, kind: "circle", x, y });
  for (const m of s.monsters) if (m.hp > 0 && dist(m.x, m.y, x, y) < r + m.r) hitMonster(s, m, dmg, Math.atan2(m.y - y, m.x - x), knock, { noCombo: true });
}
function slamHit(s: RaidState, mul: number, radiusMul = 1) {
  const p = s.player, w = s.weapon, cx = p.x + Math.cos(p.aim) * w.range, cy = p.y + Math.sin(p.aim) * w.range, r = (w.radius ?? 50) * radiusMul;
  blastAt(s, cx, cy, r, w.damage * mul, w.knockback);
  if (w.fx?.quake && p.attacks % 3 === 0) blastAt(s, cx, cy, s.picks["earth-split"] ? 160 : 110, w.damage * 0.6, 30);
  const frags = w.fx?.fragments ? (s.picks["rock-rain"] ? 6 : w.fx.fragments) : 0;
  for (let i = 0; i < frags; i++) { const a = rnd() * Math.PI * 2, d = 30 + rnd() * 60; blastAt(s, cx + Math.cos(a) * d, cy + Math.sin(a) * d, 18, w.damage * 0.35, 10); }
}
function channelTick(s: RaidState) {
  const p = s.player, w = s.weapon, fx = w.fx ?? {};
  if (w.mode === "beam") {
    s.swings.push({ angle: p.aim, range: w.range, arc: 0, t: 0.16, kind: "line", width: w.width });
    for (const m of s.monsters) if (m.hp > 0 && inAim(p, p.aim, m, w.range, w.width ?? 22) >= 0) hitMonster(s, m, w.damage, p.aim, fx.knockTick ?? 0, { noCombo: true });
    return;
  }
  s.swings.push({ angle: p.aim, range: w.range, arc: w.angle, t: 0.16, kind: "cone" });
  for (const m of s.monsters) {
    if (m.hp <= 0) continue;
    const r = dist(p.x, p.y, m.x, m.y), a = Math.atan2(m.y - p.y, m.x - p.x);
    if (r > w.range + m.r || angDiff(a, p.aim) > (w.angle / 2) * Math.PI / 180 + Math.atan2(m.r, Math.max(1, r))) continue;
    hitMonster(s, m, w.damage, a, 0, { noCombo: true });
    m.slowUntil = s.t + 0.4; m.slowMul = Math.min(m.slowMul, 1 - (fx.slow ?? 0.15));
    if (fx.freeze) {
      m.expose += w.interval;
      if (m.expose >= 2) {
        m.expose = 0;
        const freeze = (t: Monster) => { if (t.boss) { t.slowUntil = s.t + 1; t.slowMul = 0.5; t.takenUntil = s.t + 1; t.takenBonus = Math.max(t.takenBonus, 0.1); } else if (!t.elite) { t.frozenUntil = s.t + 1; t.state = "stun"; t.stateT = 1; } };
        freeze(m);
        if (s.picks.permafrost) for (const o of s.monsters) if (o !== m && o.hp > 0 && dist(o.x, o.y, m.x, m.y) < 60 + o.r) freeze(o);
      }
    }
  }
}
function throwBomb(s: RaidState, tx: number, ty: number) {
  const p = s.player, w = s.weapon, fx = w.fx ?? {}, d = Math.min(w.range, dist(p.x, p.y, tx, ty)), a = Math.atan2(ty - p.y, tx - p.x);
  const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d, big = s.picks["giant-seed"] && p.attacks % 5 === 0;
  const seeds = fx.seeds ?? 1;
  for (let i = 0; i < seeds; i++) {
    const off = seeds > 1 ? { x: (rnd() - 0.5) * 80, y: (rnd() - 0.5) * 80 } : { x: 0, y: 0 };
    zoneAt(s, { kind: "pbomb", x: x + off.x, y: y + off.y, r: (w.radius ?? 45) * (big ? 2 : 1), t: 0.1, tele: 0.35, damage: w.damage * (big ? 2 : 1), every: 0, slow: 0, mine: { mul: 1, poison: fx.poison, seedChain: Boolean(fx.seeds), big: Boolean(big) } });
  }
}
function thrustHit(s: RaidState, mul: number, lenMul = 1) {
  const p = s.player, w = s.weapon, fx = w.fx ?? {}, len = w.range * lenMul, width = w.width ?? 24;
  s.swings.push({ angle: p.aim, range: len, arc: 0, t: 0.18, kind: "line", width });
  const hits = s.monsters.filter(m => m.hp > 0).map(m => ({ m, along: inAim(p, p.aim, m, len, width) })).filter(h => h.along >= 0).sort((x, y) => x.along - y.along);
  let pulled = 0;
  for (const { m, along } of hits) {
    const tip = fx.tip && along > len - 30;
    hitMonster(s, m, w.damage * mul, p.aim, w.knockback, { critAdd: tip ? 0.15 : 0 });
    if (fx.pullSplash && m.hp > 0 && !m.elite && !m.boss && pulled < (s.picks.gather ? 3 : 1)) {
      pulled++; m.x = p.x + Math.cos(p.aim) * 40; m.y = p.y + Math.sin(p.aim) * 40;
      for (const o of s.monsters) if (o !== m && o.hp > 0 && dist(o.x, o.y, m.x, m.y) < 40 + o.r) hitMonster(s, o, w.damage * 0.5, p.aim, 10, { noCombo: true });
    } else if (fx.pullSplash && (m.elite || m.boss)) { m.slowUntil = s.t + 0.6; m.slowMul = 0.6; }
  }
}
function hookHit(s: RaidState) {
  const p = s.player, w = s.weapon, fx = w.fx ?? {};
  s.swings.push({ angle: p.aim, range: w.range, arc: 0, t: 0.2, kind: "line", width: 4 });
  const first = s.monsters.filter(m => m.hp > 0).map(m => ({ m, along: inAim(p, p.aim, m, w.range, w.width ?? 16) })).filter(h => h.along >= 0).sort((x, y) => x.along - y.along)[0];
  const target = first?.m;
  if (!target) return;
  hitMonster(s, target, w.damage, p.aim, 0);
  if (target.hp > 0) { if (!target.elite && !target.boss) { const a = Math.atan2(p.y - target.y, p.x - target.x); target.x += Math.cos(a) * (fx.pull ?? 30); target.y += Math.sin(a) * (fx.pull ?? 30); } else { target.slowUntil = s.t + 0.5; target.slowMul = 0.7; } }
  if (fx.chain) {
    const near = s.monsters.filter(m => m.hp > 0 && m !== target && dist(m.x, m.y, target.x, target.y) < 140).sort((x, y) => dist(x.x, x.y, target.x, target.y) - dist(y.x, y.y, target.x, target.y)).slice(0, 2);
    for (const m of near) { s.swings.push({ angle: Math.atan2(m.y - target.y, m.x - target.x), range: dist(m.x, m.y, target.x, target.y), arc: 0, t: 0.2, kind: "line", width: 3, x: target.x, y: target.y }); hitMonster(s, m, w.damage * 0.5, 0, 0, { noCombo: true }); }
    if (target.boss) { target.takenUntil = s.t + 3; target.takenBonus = Math.max(target.takenBonus, 0.1); }
  }
  if (fx.net) zoneAt(s, { kind: "net", x: target.x, y: target.y, r: 70 * (s.picks.trawl ? 2 : 1), t: 2, tele: 0, damage: 0, every: 0, slow: 0.5 });
  if (s.picks.thundercloud && p.attacks % 5 === 0) {
    const c = s.cam; const inView = s.monsters.filter(m => m.hp > 0 && m.x > c.x && m.x < c.x + ARENA_W && m.y > c.y && m.y < c.y + ARENA_H).slice(0, 5);
    for (const m of inView) { s.swings.push({ angle: Math.PI / 2, range: 60, arc: 0, t: 0.25, kind: "line", width: 4, x: m.x, y: m.y - 60 }); hitMonster(s, m, w.damage, 0, 0, { noCombo: true }); }
  }
}
function fire(s: RaidState, angle: number, dmg: number, extra: Partial<Projectile> = {}) {
  const p = s.player, w = s.weapon, sp = w.speed ?? 600;
  s.projectiles.push({ x: p.x, y: p.y, vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp, r: w.mode === "bolt" ? 8 : w.mode === "spread" ? 4 : 5, damage: dmg, life: w.range / sp, mine: true, pierce: new Set(), left: w.fx?.pierce ?? 0, explode: w.fx?.explode, ox: p.x, oy: p.y, ...extra });
}
/** 무기 한 번 공격(채널형 제외). */
function attackOnce(s: RaidState) {
  const p = s.player, w = s.weapon, fx = w.fx ?? {};
  switch (w.mode) {
    case "arc":
      swingHit(s, p.aim, 1);
      if (fx.double) swingHit(s, p.aim, 1);
      if (s.picks["double-cut"] && p.attacks % 3 === 0) swingHit(s, p.aim, 0.55);
      if (s.picks["whirl-slash"] && p.attacks % 4 === 0) swingHit(s, p.aim, 1, true);
      break;
    case "slam": slamHit(s, 1); break;
    case "lob": throwBomb(s, p.tx, p.ty); break;
    case "thrust": { const sea = s.picks["sea-god"] && p.attacks % 4 === 0; thrustHit(s, sea ? 2 : 1, sea ? 2 : 1); if (s.picks["chain-spin"] && p.attacks % 5 === 0) blastAt(s, p.x, p.y, 120, w.damage, 30); break; }
    case "hook": hookHit(s); break;
    case "arrow": {
      const snipe = s.picks["pierce-snipe"] && p.attacks % 5 === 0;
      fire(s, p.aim, w.damage * (snipe ? 2.5 : 1), snipe ? { left: 999 } : {});
      if (fx.triple && p.attacks % 3 === 0) { fire(s, p.aim - 0.18, w.damage * 0.55); fire(s, p.aim + 0.18, w.damage * 0.55); }
      break;
    }
    case "spread": for (let i = 0; i < (w.pellets ?? 5); i++) fire(s, p.aim + ((i / ((w.pellets ?? 5) - 1)) - 0.5) * (w.angle * Math.PI / 180), w.damage); break;
    case "bullet": fire(s, p.aim, w.damage, s.picks["ap-round"] && p.attacks % 3 === 0 ? { ignoreDef: true } : {}); break;
    case "bolt": fire(s, p.aim, w.damage); break;
    default: break;
  }
  if (s.picks.eclipse && p.attacks % 4 === 0) s.projectiles.push({ x: p.x, y: p.y, vx: Math.cos(p.aim) * 700, vy: Math.sin(p.aim) * 700, r: 26, damage: w.damage * 1.8, life: 2, mine: true, pierce: new Set(), left: 999, wave: true });
  if (s.picks["harvest-storm"] && p.attacks % 5 === 0) { p.stormUntil = s.t + 2; p.stormTick = 0; }
}

// ---------- 우클릭 특수 공격(52절) ----------
const later = (s: RaidState, after: number, run: () => void, tag?: string) => s.actions.push({ at: s.t + after, run, tag });
/** 같은 적 최대 n회(특수 공격 한 번 안에서). */
function capHit(s: RaidState, m: Monster, n: number) { const k = s.special.hits[m.uid] ?? 0; if (k >= n) return false; s.special.hits[m.uid] = k + 1; return true; }
function lineHit(s: RaidState, x: number, y: number, aim: number, len: number, width: number, dmg: number, o: HitOpts, knock = 0, each?: (m: Monster, along: number) => void) {
  s.swings.push({ angle: aim, range: len, arc: 0, t: 0.3, kind: "line", width, x, y });
  const hits = s.monsters.filter(m => m.hp > 0).map(m => ({ m, along: inAim({ x, y }, aim, m, len, width) })).filter(h => h.along >= 0).sort((a, b) => a.along - b.along);
  hits.forEach(({ m, along }, i) => { if (each) each(m, along); else hitMonster(s, m, dmg, aim, knock, { ...o, noCombo: true, extra: (o.extra ?? 0) }); void i; });
  return hits.map(h => h.m);
}
function counterBlast(s: RaidState, countered: boolean) {
  const p = s.player, w = s.weapon;
  if (countered) { blastSpecial(s, p.x, p.y, 150, w.damage * 3, 110); s.pops.push({ x: p.x, y: p.y - 40, text: "🛡️ 반격!", t: 1, kind: "info" }); }
  else { s.swings.push({ angle: p.aim, range: 150, arc: 180, t: 0.25 }); for (const m of s.monsters) if (m.hp > 0 && dist(m.x, m.y, p.x, p.y) < 150 + m.r && angDiff(Math.atan2(m.y - p.y, m.x - p.x), p.aim) < Math.PI / 2) hitMonster(s, m, w.damage * 1.6, p.aim, 40, { noCrit: true, noCombo: true }); }
}
function blastSpecial(s: RaidState, x: number, y: number, r: number, dmg: number, knock: number, extra = 0, cap = 99) {
  s.swings.push({ angle: 0, range: r, arc: 360, t: 0.3, kind: "circle", x, y });
  for (const m of s.monsters) if (m.hp > 0 && dist(m.x, m.y, x, y) < r + m.r && capHit(s, m, cap)) hitMonster(s, m, dmg, Math.atan2(m.y - y, m.x - x), knock, { noCrit: true, noCombo: true, extra });
}
function castSpecial(s: RaidState) {
  const p = s.player, sp = s.special, evo = s.evolution, w = s.weapon, D = w.damage;
  if (!evo || !SPECIALS[evo]) return;
  if (s.t < sp.readyAt) { sp.bump = s.t; return; }
  sp.readyAt = s.t + SPECIALS[evo].cooldown * Math.max(0.65, 1 - 0.02 * pick(s, "endless-haste")); sp.hits = {}; p.swingCd = Math.max(p.swingCd, 0.18);
  const aim = p.aim, tx = clamp(p.tx, 20, WORLD_W - 20), ty = clamp(p.ty, 20, WORLD_H - 20), boss = (m: Monster) => (m.boss ? 0.15 : 0);
  sp.castAt = s.t; sp.castX = tx; sp.castY = ty; sp.castAim = aim;
  s.pops.push({ x: p.x, y: p.y - 46, text: `${SPECIALS[evo].icon} ${SPECIALS[evo].name}`, t: 0.9, kind: "info" });
  switch (evo) {
    case "great-scythe": later(s, 0.15, () => lineHit(s, p.x, p.y, aim, 420, 70, D * 3.2, { noCrit: true }, 0, m => hitMonster(s, m, D * 3.2, aim, m.elite || m.boss ? 0 : 100, { noCrit: true, noCombo: true, extra: m.elite || m.boss ? 0.2 : 0 }))); break;
    case "harvest-blade": sp.moveUntil = s.t + 1.5; sp.moveMul = 1.15; for (let i = 0; i < 6; i++) later(s, 0.25 * i, () => blastSpecial(s, p.x, p.y, 145, D * 0.55, 20, 0, 6)); break;
    case "quake-hammer": s.swings.push({ angle: aim, range: 360, arc: 0, t: 0.45, kind: "line", width: 85, x: p.x, y: p.y }); { const ox = p.x, oy = p.y; later(s, 0.45, () => lineHit(s, ox, oy, aim, 360, 85, D * 2.6, { noCrit: true }, 0, m => { hitMonster(s, m, D * 2.6, aim, 20, { noCrit: true, noCombo: true }); if (!m.boss && !m.elite && m.hp > 0) { m.state = "stun"; m.stateT = 0.8; } })); } break;
    case "rock-crusher": { const d0 = Math.min(240, dist(p.x, p.y, tx, ty)), cx = p.x + Math.cos(aim) * d0, cy = p.y + Math.sin(aim) * d0; for (let i = 0; i < 5; i++) { const a = rnd() * Math.PI * 2, r = rnd() * 70; later(s, 0.12 * i, () => blastSpecial(s, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 32, D * 0.65, 15, 0, 3)); } break; }
    case "water-cannon": sp.moveUntil = s.t + 1.2; sp.moveMul = 0.65; sp.lockAim = aim; sp.cancelable = true; for (let i = 0; i < 8; i++) later(s, 0.15 * i, () => lineHit(s, p.x, p.y, sp.lockAim ?? aim, 500, 55, D * 2.2, { noCrit: true }, 0, m => hitMonster(s, m, D * 2.2, sp.lockAim ?? aim, m.boss || m.elite ? 0 : 18, { noCrit: true, noCombo: true, extra: boss(m) })), "cancel"); later(s, 1.2, () => { sp.lockAim = null; sp.cancelable = false; }, "cancel"); break;
    case "frost-sprayer": zoneAt(s, { kind: "frost", x: tx, y: ty, r: 150, t: 3, tele: 0, damage: 0, every: 0, slow: 0 }); for (let i = 0; i < 5; i++) later(s, 0.6 * i, () => { for (const m of s.monsters) if (m.hp > 0 && dist(m.x, m.y, tx, ty) < 150 + m.r) { hitMonster(s, m, D, 0, 0, { noCrit: true, noCombo: true }); m.expose += 1; if (m.boss) { m.slowUntil = s.t + 0.7; m.slowMul = 0.6; } else if (!m.elite && m.expose >= 3) { m.expose = 0; m.frozenUntil = s.t + 1.2; m.state = "stun"; m.stateT = 1.2; } } s.swings.push({ angle: 0, range: 150, arc: 360, t: 0.2, kind: "circle", x: tx, y: ty }); }); break;
    case "toxic-sprayer": blastSpecial(s, tx, ty, 120, D * 1.4, 10); for (let i = 1; i <= 5; i++) later(s, i, () => { for (const m of s.monsters) if (m.hp > 0 && dist(m.x, m.y, tx, ty) < 120 + m.r) { hitMonster(s, m, D * 0.45, 0, 0, { noCrit: true, noCombo: true }); if (m.boss) { m.takenUntil = s.t + 1.1; m.takenBonus = Math.max(m.takenBonus, 0.1); } } }); zoneAt(s, { kind: "poison", x: tx, y: ty, r: 120, t: 5, tele: 0, damage: 0, every: 99, slow: 0, mine: { mul: 0 } }); break;
    case "seed-launcher": for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4, x = tx + Math.cos(a) * 55, y = ty + Math.sin(a) * 55; zoneAt(s, { kind: "pbomb", x, y, r: 58, t: 0.1, tele: 0.8, damage: D * 0.85, every: 0, slow: 0, mine: { mul: 1 } }); } break;
    case "trident": later(s, 0.15, () => lineHit(s, p.x, p.y, aim, 520, 42, D * 3, { noCrit: true }, 0, (m, along) => hitMonster(s, m, D * 3, aim, 20, { noCombo: true, noCrit: along <= 420, forceCrit: along > 420, extra: boss(m) }))); break;
    case "chain-harpoon": later(s, 0.15, () => { const hit = lineHit(s, p.x, p.y, aim, 420, 40, D * 1.8, { noCrit: true }, 0, m => hitMonster(s, m, D * 1.8, aim, 0, { noCrit: true, noCombo: true })); for (const m of hit) { if (m.hp <= 0) continue; if (m.elite || m.boss) { m.slowUntil = s.t + 1.5; m.slowMul = 0.7; } else { m.x = p.x + Math.cos(aim) * 90 + (rnd() - 0.5) * 30; m.y = p.y + Math.sin(aim) * 90 + (rnd() - 0.5) * 30; } } later(s, 0.35, () => { for (const m of hit) if (m.hp > 0 && dist(m.x, m.y, p.x, p.y) < 160) hitMonster(s, m, D, aim + Math.PI, 0, { noCrit: true, noCombo: true }); }); }); break;
    case "thunder-rod": { const alive = s.monsters.filter(m => m.hp > 0); const target = alive.filter(m => dist(m.x, m.y, tx, ty) < 70).sort((a, b) => dist(a.x, a.y, tx, ty) - dist(b.x, b.y, tx, ty))[0] ?? alive.filter(m => dist(m.x, m.y, p.x, p.y) < 260).sort((a, b) => dist(a.x, a.y, p.x, p.y) - dist(b.x, b.y, p.x, p.y))[0];
      if (!target) { s.swings.push({ angle: Math.PI / 2, range: 80, arc: 0, t: 0.3, kind: "line", width: 6, x: tx, y: ty - 80 }); break; }
      s.swings.push({ angle: Math.PI / 2, range: 80, arc: 0, t: 0.3, kind: "line", width: 6, x: target.x, y: target.y - 80 }); hitMonster(s, target, D * 1.7, 0, 0, { noCrit: true, noCombo: true });
      const others = alive.filter(m => m !== target && m.hp > 0 && dist(m.x, m.y, target.x, target.y) < 200).slice(0, 5);
      if (others.length) for (const m of others) { s.swings.push({ angle: Math.atan2(m.y - target.y, m.x - target.x), range: dist(m.x, m.y, target.x, target.y), arc: 0, t: 0.25, kind: "line", width: 3, x: target.x, y: target.y }); hitMonster(s, m, D * 0.85, 0, 0, { noCrit: true, noCombo: true }); }
      else if (target.boss) for (let i = 1; i <= 2; i++) later(s, 0.15 * i, () => hitMonster(s, target, D * 0.45, 0, 0, { noCrit: true, noCombo: true }));
      break; }
    case "net-launcher": blastSpecial(s, tx, ty, 60, D * 0.8, 0); zoneAt(s, { kind: "net", x: tx, y: ty, r: 170, t: 4, tele: 0, damage: 0, every: 0, slow: 0.7 }); break;
    case "longbow": sp.moveUntil = s.t + 0.55; sp.moveMul = 0.5; sp.cancelable = true; later(s, 0.55, () => { sp.cancelable = false; fire(s, p.aim, D * 3.8, { left: 999, r: 9, defIgnore: 0.5 } as Partial<Projectile>); }, "cancel"); break;
    case "rapid-bow": for (let i = 0; i < 10; i++) later(s, 0.2 * i, () => { for (const m of s.monsters) if (m.hp > 0 && dist(m.x, m.y, tx, ty) < 135 + m.r && capHit(s, m, 6)) { hitMonster(s, m, D * 0.35, 0, 0, { noCrit: true, noCombo: true }); if (!m.boss) { m.slowUntil = s.t + 0.4; m.slowMul = 0.8; } } s.swings.push({ angle: 0, range: 135, arc: 360, t: 0.15, kind: "circle", x: tx, y: ty }); }); break;
    case "rifle": later(s, 0.1, () => { let k = 0; lineHit(s, p.x, p.y, aim, 700, 30, D * 3.4, { noCrit: true }, 0, m => { if (k >= 6) return; hitMonster(s, m, D * 3.4 * (1 - 0.08 * k), aim, 20, { noCrit: true, noCombo: true, defIgnore: 0.7, extra: boss(m) }); k++; }); }); break;
    case "siege-crossbow": fire(s, aim, D * 2.2, { r: 10, explode: 115, vx: Math.cos(aim) * 420, vy: Math.sin(aim) * 420, siege: true } as Partial<Projectile>); break;
    case "twin-blades": { p.iframes = Math.max(p.iframes, 0.95); const targets = s.monsters.filter(m => m.hp > 0 && dist(m.x, m.y, p.x, p.y) < 260 && angDiff(Math.atan2(m.y - p.y, m.x - p.x), aim) < 1.2).slice(0, 6);
      if (!targets.length) { const o = pushOut(p.x + Math.cos(aim) * 120, p.y + Math.sin(aim) * 120, PLAYER.radius, blockers(s.terrain)); p.x = o.x; p.y = o.y; swingHit(s, aim, 1.2); break; }
      for (let i = 0; i < 6; i++) later(s, 0.15 * i, () => { const m = targets[i % targets.length]; if (!m || m.hp <= 0 || !capHit(s, m, 4)) return; const o = pushOut(m.x - Math.cos(aim) * 24, m.y - Math.sin(aim) * 24, PLAYER.radius, blockers(s.terrain)); if (dist(o.x, o.y, p.x, p.y) < 220) { p.x = o.x; p.y = o.y; } s.swings.push({ angle: aim, range: 60, arc: 120, t: 0.12 }); hitMonster(s, m, D * 0.6, aim, 10, { noCrit: true, noCombo: true }); }); break; }
    case "greatsword": sp.stanceUntil = s.t + 1.2; sp.stanceHit = false; later(s, 1.2, () => { if (!sp.stanceHit) counterBlast(s, false); sp.stanceUntil = 0; }); break;
  }
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
  // 유효 카드가 3장보다 적으면 무제한 성장 카드로 채운다(59.2절)
  const fill = [...ENDLESS_AWAKENINGS].sort(() => rnd() - 0.5);
  while (s.choices.length < 3 && fill.length) s.choices.push(fill.pop()!);
}
export function chooseAwakening(s: RaidState, id: AwakenId) {
  if (!s.choices?.includes(id)) return;
  s.picks[id] = (s.picks[id] ?? 0) + 1;
  if (id === "vitality") { s.player.maxHp += 25; s.player.hp = Math.min(s.player.maxHp, s.player.hp + 25); }
  if (id === "endless-life") { s.player.maxHp += 10; s.player.hp = Math.min(s.player.maxHp, s.player.hp + 10); }
  s.choices = null;
  checkLevel(s);
}
/** 각성 레벨이 오를 때마다 회복하는 체력 */
const LEVEL_UP_HEAL = 5;
function checkLevel(s: RaidState) {
  if (s.choices) return;
  if (s.xp >= xpForLevel(s.level + 1)) {
    // 각성 레벨업: 체력 5 회복
    const heal = Math.min(LEVEL_UP_HEAL, s.player.maxHp - s.player.hp);
    s.level++; s.player.hp += heal;
    if (heal > 0) s.pops.push({ x: s.player.x, y: s.player.y - 34, text: `+${Math.round(heal)} HP`, t: 0.9, kind: "info" });
    offerChoices(s);
  }
}

// ---------- 몬스터 행동 ----------
function aimAt(m: Monster, x: number, y: number) { const d = Math.hypot(x - m.x, y - m.y) || 1; m.dir = { x: (x - m.x) / d, y: (y - m.y) / d }; }
let routeTerrain: Terrain | null = null;
let routeFlow: { flow: Flow; terrain: Terrain; px: number; py: number } | null = null;
function moveToward(m: Monster, x: number, y: number, speed: number, dt: number, slow: number) {
  // 플레이어 쪽으로 갈 때 벽·강에 막혀 있으면 흐름장을 따라 돌아간다(트여 있으면 곧장).
  if (routeFlow && speed > 0 && Math.hypot(x - routeFlow.px, y - routeFlow.py) < 90 && !clearLine(routeFlow.terrain, m.x, m.y, x, y, Math.min(14, m.r * 0.7))) { const n = flowNext(routeFlow.flow, m.x, m.y); if (n) { x = n.x; y = n.y; } }
  else if (routeTerrain && speed > 0) { const t = routeTarget(routeTerrain, m.x, m.y, x, y); x = t.x; y = t.y; } aimAt(m, x, y); m.x += m.dir.x * speed * dt * slow; m.y += m.dir.y * speed * dt * slow; }
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
  if (m.kvx || m.kvy) { m.x += m.kvx * dt; m.y += m.kvy * dt; const f = Math.exp(-12 * dt); m.kvx *= f; m.kvy *= f; if (Math.abs(m.kvx) + Math.abs(m.kvy) < 4) { m.kvx = 0; m.kvy = 0; } }
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
  if (m.slowUntil <= s.t) { m.slowMul = 1; m.inNet = false; }
  if (m.takenUntil <= s.t) m.takenBonus = 0;
  const slow = (s.zones.some(z => z.kind === "puddle" && z.tele <= 0 && dist(z.x, z.y, m.x, m.y) < z.r) && !m.boss ? 0.85 : 1) * (m.boss ? 1 : slowAt(s.terrain, m.x, m.y, false)) * (m.slowUntil > s.t ? m.slowMul : 1);
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
  if (s.over || s.paused || s.choices) { s.prevDash = input.dash; s.prevFood = input.food; s.special.prev = Boolean(input.special); return; }
  if (s.hitstop > 0) { s.hitstop -= dt; dt *= 0.15; }
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
  if (input.moveX || input.moveY) { mx = input.moveX ?? 0; my = input.moveY ?? 0; }
  const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
  // 입력 조준은 화면 좌표 → 월드 좌표
  p.aim = Math.atan2(input.aimY + s.cam.y - p.y, input.aimX + s.cam.x - p.x);
  p.tx = input.aimX + s.cam.x; p.ty = input.aimY + s.cam.y;
  if (s.special.lockAim !== null) p.aim = s.special.lockAim;
  // 특수 공격: 우클릭 누른 순간
  if (input.special && !s.special.prev) castSpecial(s);
  s.special.prev = Boolean(input.special);
  if (input.dash && !s.prevDash && p.dashCd <= 0 && s.special.cancelable) { s.actions = s.actions.filter(x => x.tag !== "cancel"); if (s.evolution === "longbow") s.special.readyAt = s.t + 3; s.special.cancelable = false; s.special.lockAim = null; s.special.moveUntil = 0; }
  if (input.dash && !s.prevDash && p.dashCd <= 0) { p.gale = []; p.dashT = PLAYER.dashTime * (inMud(s.terrain, p.x, p.y) ? 0.8 : 1); p.dashDir = ml ? { x: mx, y: my } : { x: Math.cos(p.aim), y: Math.sin(p.aim) }; p.dashCd = d.dashCd; }
  s.prevDash = input.dash;

  // 이동(장판 둔화, 공격 중 둔화)
  const inPollen = s.zones.find(z => (z.kind === "pollen" || z.kind === "puddle") && z.tele <= 0 && dist(z.x, z.y, p.x, p.y) < z.r);
  if (p.dashT > 0) {
    p.dashT -= dt; p.x += p.dashDir.x * PLAYER.dashSpeed * dt; p.y += p.dashDir.y * PLAYER.dashSpeed * dt; p.dashBonusUntil = s.t + 1;
    if (s.picks["gale-dance"]) for (const m of s.monsters) if (m.hp > 0 && !p.gale.includes(m.uid) && dist(m.x, m.y, p.x, p.y) < m.r + 24) { p.gale.push(m.uid); hitMonster(s, m, s.weapon.damage * 2, Math.atan2(p.dashDir.y, p.dashDir.x), 20, { noCombo: true }); }
  }
  else { const sp = d.speed * (inPollen ? 1 - inPollen.slow : 1) * (p.slowUntil > s.t && !s.picks["quick-shot"] ? 1 - (s.weapon.fx?.selfSlow ?? PLAYER.attackSlow) : 1) * (s.special.moveUntil > s.t ? s.special.moveMul : 1) * slowAt(s.terrain, p.x, p.y, true); p.x += mx * sp * dt; p.y += my * sp * dt; }
  { const o = pushOut(p.x, p.y, PLAYER.radius, blockers(s.terrain)); p.x = o.x; p.y = o.y; }
  updateWorld(s, dt);
  s.shake = Math.max(0, s.shake - dt * 30);
  // 지속 회복 음식(약초 고기찜): 초당 체력 회복
  for (const b of s.buffs) if (b.kind === "regen" && b.until > s.t && s.player.hp > 0) s.player.hp = Math.min(s.player.maxHp, s.player.hp + b.value * dt);
  // 예약된 특수 공격 타격
  if (s.actions.length) { const due = s.actions.filter(x => x.at <= s.t); s.actions = s.actions.filter(x => x.at > s.t); for (const x of due) x.run(); }

  // 공격: 누르고 있으면 간격마다 휘두른다. 시작 0.12초 뒤 판정.
  p.swingCd = Math.max(0, p.swingCd - dt);
  p.still = ml ? 0 : p.still + dt;
  const channel = s.weapon.mode === "channel" || s.weapon.mode === "beam";
  if (channel) {
    // 물뿌리개: 누르는 동안 틱마다 맞힌다.
    if (input.attack) { p.holdT += dt; p.slowUntil = s.t + 0.05; p.tick -= dt; if (p.tick <= 0) { p.tick = d.interval; channelTick(s); } } else { p.holdT = 0; p.tick = 0; }
    if (s.picks.tsunami) { p.periodic -= dt; if (p.periodic <= 0) { p.periodic = 6; s.projectiles.push({ x: p.x, y: p.y, vx: Math.cos(p.aim) * 600, vy: Math.sin(p.aim) * 600, r: 40, damage: s.weapon.damage * 10, life: 1.6, mine: true, pierce: new Set(), left: 999, wave: true }); } }
  } else {
    // 공격: 누르고 있으면 간격마다. 시작 0.12초 뒤 판정.
    if (input.attack && p.swingCd <= 0 && p.windup < 0) { p.windup = 0.12; p.swingCd = d.interval * (s.picks["quick-shot"] ? 0.85 : 1); p.slowUntil = s.t + 0.3; }
    if (p.windup >= 0) { p.windup -= dt; if (p.windup < 0) { p.attacks++; attackOnce(s); } }
  }
  if (s.picks["arrow-rain"]) { p.periodic -= dt; if (p.periodic <= 0) { p.periodic = 6; zoneAt(s, { kind: "rain", x: input.aimX + s.cam.x, y: input.aimY + s.cam.y, r: 90, t: 0.3, tele: 0.4, damage: s.weapon.damage * 2, every: 0, slow: 0, mine: { mul: 1 } }); } }
  if (p.stormUntil > s.t) { p.stormTick -= dt; if (p.stormTick <= 0) { p.stormTick = 0.25; swingHit(s, p.aim, 1, true); } }

  // 웨이브 생성(4분까지)
  if (s.t < BOSS_AT) {
    // 4분 템포: 생성량 ×1.2, 화면에 적이 2마리 이하면 대기시간 절반(전투 공백 보정)
    const maxAlive = Math.ceil(s.floor.maxAlive * MAX_ALIVE_MUL), aliveNow = s.monsters.filter(m => m.hp > 0 && !m.elite && !m.boss).length;
    s.spawnAcc += s.floor.spawnRate * SPAWN_MUL * dt / Math.pow(0.92, s.pressure.stage) * (aliveNow <= maxAlive * 0.4 ? 2 : 1);
    if (s.packAt && s.t >= s.packAt) { s.packAt = 0; for (let i = 0; i < 3; i++) { const id = pickSpawn(s); if (id) spawn(s, id); } }
    const alive = s.monsters.filter(m => m.hp > 0 && !m.elite && !m.boss).length;
    while (s.spawnAcc >= 1) { s.spawnAcc -= 1; if (alive < maxAlive) { const id = pickSpawn(s); if (id) spawn(s, id); } }
    const e = s.floor.elite;
    if (e && s.t >= s.nextElite) {
      // 정예: 50초·120초 고정(주기형 층은 그 뒤로도 주기마다). 예고 3초가 있어 그만큼 먼저 예고한다.
      if (e.every) { warnElite(s); s.elitesPlaced++; s.nextElite = s.elitesPlaced < ELITE_AT.length ? ELITE_AT[s.elitesPlaced] : s.nextElite + e.every; }
      else if (s.elitesPlaced < (e.count ?? 0)) { warnElite(s); s.elitesPlaced++; s.nextElite = ELITE_AT[Math.min(ELITE_AT.length - 1, s.elitesPlaced)] + (s.elitesPlaced >= ELITE_AT.length ? 9999 : 0); }
    }
    if (!s.floor.training && s.interventions < 3 && s.t >= INTERVENTION_AT[s.interventions]) { s.interventions++; intervention(s, s.interventions); }
  } else if (!s.bossSpawned && !s.floor.training) spawnBoss(s);
  else if (s.bossSpawned && s.boss && s.boss.hp > 0 && s.t - BOSS_AT >= BOSS_SUMMON_EVERY * (s.bossSummons + 1)) {
    s.bossSummons++; const n = 3 + Math.floor(rnd() * 3); for (let i = 0; i < n; i++) { const id = pickSpawn(s); if (id) spawn(s, id); }
    s.pops.push({ x: s.boss.x, y: s.boss.y - s.boss.r - 20, text: "📣 부하 소환!", t: 1, kind: "info" });
  }

  // 몬스터(강 반대편이면 다리로 돌아간다)
  routeTerrain = s.terrain.deep.length ? s.terrain : null;
  const cell = Math.floor(p.x / FLOW_CELL) + Math.floor(p.y / FLOW_CELL) * 1000;
  if (!s.flow || (s.t >= s.flowAt && cell !== s.flowCell) || s.t >= s.flowAt + 1) { s.flow = buildFlow(s.terrain, p.x, p.y); s.flowAt = s.t + 0.25; s.flowCell = cell; }
  routeFlow = { flow: s.flow, terrain: s.terrain, px: p.x, py: p.y };
  for (const m of s.monsters) if (m.hp > 0) updateMonster(s, m, dt);
  routeTerrain = null; routeFlow = null;
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
  for (const m of s.monsters) if (m.hp > 0 && dist(m.x, m.y, p.x, p.y) < m.r + PLAYER.radius) hurtPlayer(s, m.state === "dash" && m.boss ? m.damage + 8 : m.damage, m.name, Boolean(m.boss));

  // 투사체
  for (const pr of s.projectiles) {
    const w = windAt(s.terrain, pr.x, pr.y), sp = Math.hypot(pr.vx, pr.vy) || 1, along = w ? (pr.vx * w.dx + pr.vy * w.dy) / sp : 0, k = along > 0.5 ? 1.2 : along < -0.5 ? 0.85 : 1;
    const nx = pr.x + pr.vx * dt * k, ny = pr.y + pr.vy * dt * k;
    if (segmentHits(s.terrain.walls, pr.x, pr.y, nx, ny)) { if (pr.mine && pr.siege) blastSpecial(s, pr.x, pr.y, pr.explode ?? 115, pr.damage / 2.2 * 1.4, 90); pr.life = 0; continue; }
    pr.x = nx; pr.y = ny; pr.life -= dt;
    if (pr.mine) {
      for (const m of s.monsters) {
        if (pr.debris || m.hp <= 0 || pr.pierce!.has(m.uid) || dist(pr.x, pr.y, m.x, m.y) >= pr.r + m.r || pr.life <= 0) continue;
        pr.pierce!.add(m.uid);
        const far = s.weapon.fx?.far && pr.ox !== undefined && dist(pr.ox, pr.oy!, m.x, m.y) >= 250 ? 1.25 : 1;
        const farSp = pr.defIgnore && pr.ox !== undefined && dist(pr.ox, pr.oy!, m.x, m.y) >= 300 ? 1.25 : 1;
        hitMonster(s, m, pr.damage * far * farSp, Math.atan2(pr.vy, pr.vx), pr.wave ? 0 : s.weapon.knockback, { ignoreDef: pr.ignoreDef, noCombo: pr.wave, defIgnore: pr.defIgnore, noCrit: Boolean(pr.defIgnore || pr.siege) });
        if (pr.siege) { blastSpecial(s, m.x, m.y, pr.explode ?? 115, pr.damage / 2.2 * 1.4, 90); pr.life = 0; continue; }
        if (pr.explode) { blastAt(s, m.x, m.y, pr.explode, pr.damage * 0.6); if (s.picks["chain-blast"]) blastAt(s, m.x, m.y, pr.explode, pr.damage * 0.6); if (s.picks.shrapnel) for (let i = 0; i < 4; i++) { const a = rnd() * Math.PI * 2; blastAt(s, m.x + Math.cos(a) * 50, m.y + Math.sin(a) * 50, 16, pr.damage * 0.35, 8); } }
        if (!pr.wave) { if ((pr.left ?? 0) > 0) pr.left = (pr.left ?? 0) - 1; else pr.life = 0; }
      }
    }
    else if (dist(pr.x, pr.y, p.x, p.y) < pr.r + PLAYER.radius) { hurtPlayer(s, pr.damage, "투사체"); pr.life = 0; }
    if (pr.x < -50 || pr.x > WORLD_W + 50 || pr.y < -50 || pr.y > WORLD_H + 50) pr.life = 0;
  }
  s.projectiles = s.projectiles.filter(pr => pr.life > 0);

  // 장판·예고
  for (const z of s.zones) {
    if (z.tele > 0) { z.tele -= dt; if (z.tele <= 0 && (z.kind === "bolt" || z.kind === "line" || z.kind === "tshock" || z.kind === "pbomb" || z.kind === "rain")) {
      const inside = z.kind === "line" ? Math.abs(p.y - z.y) < z.r && p.x > z.x && p.x < z.x + (z.len ?? ARENA_W) : dist(z.x, z.y, p.x, p.y) < z.r;
      if (inside && !z.mine && z.kind !== "tshock") hurtPlayer(s, z.damage, z.kind === "line" ? "돌진 예고" : "번개");
      if (z.kind === "bolt") for (const w of s.terrain.puddles) if (dist(w.x, w.y, z.x, z.y) < w.r + z.r) zoneAt(s, { kind: "tshock", x: w.x, y: w.y, r: w.r, t: 0.3, tele: 0.5, damage: z.damage, every: 0, slow: 0 });
      if (z.kind === "pbomb" && z.mine) {
        blastAt(s, z.x, z.y, z.r, z.damage);
        if (z.mine.poison) { const old = s.zones.find(o => o.kind === "poison" && dist(o.x, o.y, z.x, z.y) < 20); if (old) old.t = 3; else zoneAt(s, { kind: "poison", x: z.x, y: z.y, r: z.r, t: 3, tele: 0, damage: z.damage * 0.3 * (s.picks["plague-field"] ? 1.5 : 1), every: 1, slow: 0, mine: { mul: 1 } }); }
        if (z.mine.seedChain && s.picks["chain-sprout"] && rnd() < 0.3) zoneAt(s, { kind: "pbomb", x: z.x + (rnd() - 0.5) * 70, y: z.y + (rnd() - 0.5) * 70, r: z.r, t: 0.1, tele: 0.35, damage: z.damage, every: 0, slow: 0, mine: { mul: 1 } });
      }
      if (z.kind === "rain" && z.mine) blastAt(s, z.x, z.y, z.r, z.damage, 10);
      if (z.kind === "tshock") { if (dist(z.x, z.y, p.x, p.y) < z.r) hurtPlayer(s, Math.round(z.damage * 0.5), "전도성 웅덩이"); for (const m of s.monsters) if (m.hp > 0 && dist(m.x, m.y, z.x, z.y) < z.r + m.r) { m.hp -= Math.max(1, z.damage - m.defense); m.flash = 0.1; if (m.hp <= 0) killMonster(s, m); } }
      if (z.kind === "bolt") for (const w of s.zones) if (w.kind === "puddle" && w.tele <= 0 && dist(w.x, w.y, z.x, z.y) < w.r + z.r) zoneAt(s, { kind: "shock", x: w.x, y: w.y, r: w.r, t: 0.5, tele: 0, damage: 12, every: 0.5, slow: 0 });
    } continue; }
    z.t -= dt;
    if (z.kind === "frost") continue;
    if (z.kind === "poison") { z.tick -= dt; if (z.tick <= 0) { z.tick = 1; if (z.damage > 0) for (const m of s.monsters) if (m.hp > 0 && dist(m.x, m.y, z.x, z.y) < z.r + m.r) hitMonster(s, m, z.damage, 0, 0, { noCombo: true }); } continue; }
    if (z.kind === "net") { for (const m of s.monsters) if (m.hp > 0) { const inside = dist(m.x, m.y, z.x, z.y) < z.r + m.r; if (inside) { m.inNet = true; m.slowUntil = s.t + 0.1; m.slowMul = 0.5; m.takenUntil = s.t + 0.1; m.takenBonus = Math.max(m.takenBonus, m.boss ? 0.08 : 0.15); } } continue; }
    if (z.mine) continue;
    if (z.damage && z.every && dist(z.x, z.y, p.x, p.y) < z.r) { z.tick -= dt; if (z.tick <= 0) { z.tick = z.every; hurtPlayer(s, z.damage, z.kind === "pollen" ? "꽃가루 장판" : "감전"); } }
  }
  s.zones = s.zones.filter(z => z.tele > 0 || z.t > 0);

  // 경험치 구슬
  for (const o of s.orbs) {
    o.age += dt;
    const r = dist(o.x, o.y, p.x, p.y);
    if (r < d.absorb || o.age > ORB_AUTO) { const k = Math.min(1, (ORB_PULL * dt) / Math.max(1, r)); o.x += (p.x - o.x) * k; o.y += (p.y - o.y) * k; }
    if (r < PLAYER.radius + 6) { s.xp += o.xp; o.xp = 0; }
  }
  s.orbs = s.orbs.filter(o => o.xp > 0);
  checkLevel(s);

  // 정리
  s.monsters = s.monsters.filter(m => m.hp > 0);
  for (const pop of s.pops) { pop.t -= dt; pop.y -= 30 * dt; }
  for (const sp of s.sparks) { sp.t -= dt; sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.vx *= 0.9; sp.vy *= 0.9; }
  s.sparks = s.sparks.filter(sp => sp.t > 0);
  s.pops = s.pops.filter(pop => pop.t > 0).slice(-40);
  for (const sw of s.swings) sw.t -= dt;
  s.swings = s.swings.filter(sw => sw.t > 0);

  if (s.boss) s.bossHpAtEnd = Math.max(0, s.boss.hp / s.boss.maxHp);
  if (!s.over && s.floor.duration && s.t >= s.floor.duration) s.over = "timeout";
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
