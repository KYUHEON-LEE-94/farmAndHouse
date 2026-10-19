/**
 * 탑 토벌 전투 엔진(순수 로직). 렌더링·입력은 RaidGame.tsx가 맡고, 여기서는 고정 시간 스텝으로 상태만 바꾼다.
 * 좌표는 논리 해상도 960×540(px), 시간은 초.
 */
import {
  ARENA_H, ARENA_W, AWAKENINGS, AWAKEN_GUARANTEE, AWAKEN_XP, BOSS_AT, BOSS_SUMMON_EVERY, COMMON_AWAKENINGS, ELITE_AT, ENDLESS_AWAKENINGS, INTERVENTION_AT, MAX_ALIVE_MUL, NORMAL_SPEED_MUL, ORB_AUTO, ORB_PULL, SPAWN_MUL, xpForLevel, MONSTERS, PLAYER,
  type AwakenId, type BossDef, type Evolution, type FloorDef, type FoodEffect, type MonsterDef, type WeaponStats,
} from "./data";
import { SPECIALS } from "./weapons";
import { hazard, hazardDone, stepHazard, type Hazard } from "./bossKit";
import { AUX_WEAPONS, rollChoices, type AuxId } from "./awakenings";
import { AUX_POWER, FODDER_HP, MOB_SHOT_DAMAGE, MOB_SHOT_INTERVAL, floorBand, type RaidRunLog } from "./data";
import { FLOW_CELL, START, WORLD_H, WORLD_W, blockedAt, blockers, buildFlow, clearLine, flowNext, inMud, makeTerrain, pushOut, routeTarget, segmentHits, slowAt, windAt, type Flow, type Terrain, fieldLike } from "./terrain";

export type Input = { up: boolean; down: boolean; left: boolean; right: boolean; aimX: number; aimY: number; attack: boolean; dash: boolean; food: [boolean, boolean, boolean];
  /** 우클릭 특수 공격(누른 순간 한 번) */
  special?: boolean;
  /** 모바일 가상 스틱(−1~1, 길이 1 이하). 있으면 방향키 대신 쓴다. */
  moveX?: number; moveY?: number };
/** 방어구 합계 능력(26절). */
export type Gear = { hp: number; defense: number; crit: number; absorb: number; xpGain?: number; speed: number; dashCd: number; startShield: number; freezeResist?: number; hazardCut?: number; bossDamage?: number; /** 특수공격 숙련: 피해·재사용 감소·잔향(★3) */ specialDmg?: number; specialCd?: number; specialEcho?: number };
export const NO_GEAR: Gear = { hp: 0, defense: 0, crit: 0, absorb: 0, speed: 0, dashCd: 0, startShield: 0 };
export type FoodSlot = { dishId: string; grade: number; key: string; effect: FoodEffect; icon: string; name: string } | null;

type Telegraph = { kind: "line"; x: number; y: number; dx: number; dy: number; len: number; width: number } | { kind: "circle"; x: number; y: number; r: number };
export type Monster = {
  uid: number; def: MonsterDef; name: string; icon: string; x: number; y: number; r: number; hp: number; maxHp: number; damage: number; defense: number; speed: number;
  elite: boolean; boss: "mini" | "pollen-boar" | "storm-catfish" | "maple-stag" | "iron-bear" | null; xp: number;
  /** 보스 패턴 사이 최소 공백(초), 철갑곰 철갑 방어 끝 시각 */
  gap?: number; armorUntil?: number;
  /** 스크립트 보스(21층~): 대본 id, 현재 단계, 직전 패턴, 단계 전환 무적 끝 */
  script?: string; phase?: number; lastPattern?: string; invulnUntil?: number; clone?: boolean;
  /** 정면 방패 방향(라디안, 정면 피해 −70%), 1회성 패턴 사용 여부 */
  shieldFacing?: number; overloadDone?: boolean;
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
  /** 53절: 첫 타격 여부(선제타격), 갑옷 균열 중첩·만료 */
  struck?: boolean; crack?: number; crackUntil?: number;
  /** 분사형: 마지막 분사 적중 시각, 연속 적중 시간 */
  sprayAt?: number; sprayT?: number;
};
export type Projectile = { x: number; y: number; vx: number; vy: number; r: number; damage: number; life: number; mine: boolean; pierce: Set<number> | null;
  /** 내 투사체: 남은 관통 수, 폭발, 쏜 자리(먼 거리 보너스), 보스 방어 무시 */
  left?: number; explode?: number; ox?: number; oy?: number; ignoreDef?: boolean; wave?: boolean; defIgnore?: number; siege?: boolean; debris?: boolean;
  /** 피해 원천(기본·특수·보조무기), 보조무기 벌의 추적 대상 */
  src?: HitSource; homing?: number; ricochet?: boolean; /** 보스 탄막(피격 집계) */ boss?: boolean };
export type Zone = { kind: "pollen" | "puddle" | "bolt" | "shock" | "line" | "tshock" | "blast" | "pbomb" | "poison" | "net" | "rain" | "frost" | "spray" | "leaf" | "ice";
  /** 맞았을 때 피해 원인 이름(없으면 종류별 기본값) */
  label?: string;
  /** 피해 원천(보조무기 씨앗탄·싹 장판은 "aux") */
  src?: HitSource;
  /** 내 공격 장판: 폭발 배율·독·그물 반지름 등 */
  mine?: { mul: number; poison?: boolean; seedChain?: boolean; big?: boolean }; x: number; y: number; r: number; t: number; tele: number; damage: number; every: number; tick: number; slow: number; dx?: number; dy?: number; len?: number };
export type Orb = { x: number; y: number; xp: number; age: number; /** 회복 고기(먹으면 체력) */ heal?: number;
  /** 처치 때 사방으로 튀는 속도, 직전 위치(흔적 그리기) */ vx?: number; vy?: number; px?: number; py?: number };
export type Spark = { x: number; y: number; vx: number; vy: number; t: number; life: number; color: string; size: number };
export type Pop = { x: number; y: number; text: string; t: number; kind: "hit" | "crit" | "hurt" | "heal" | "info" | "aux" };
/** 피해 원천(62절: 보조무기 피해는 따로 집계·주무기 강화 미적용) */
export type HitSource = "basic" | "special" | "aux" | "pet";
/** 판 안에서만 쓰는 보조무기 상태(62.7) */
export type AuxState = { id: AuxId; readyAt: number; spray: { x: number; y: number; until: number; next: number } | null };
export type Swing = { angle: number; range: number; arc: number; t: number;
  /** 낫 외 공격 연출: circle(내려찍기·폭발)·line(찌르기·물대포·낚싯줄)·cone(물줄기) */
  kind?: "circle" | "line" | "cone"; x?: number; y?: number; width?: number };

export type RaidState = {
  floor: FloorDef; t: number; over: null | "clear" | "dead" | "timeout"; paused: boolean;
  weapon: WeaponStats; evolution: Evolution | null; gear: Gear;
  pet: { id: string; mult: number; x: number; y: number; timer: number; shieldUsed: boolean; flash: number } | null;
  player: { x: number; y: number; hp: number; maxHp: number; shield: number; shieldUntil: number; iframes: number; dashCd: number; dashT: number;
    /** 회피 무적이 끝나는 시각(대시 + 여유 0.2초), 마지막 "회피!" 표시 시각 */
    dodgeUntil: number; dodgePop: number; dashDir: { x: number; y: number }; swingCd: number; windup: number; aim: number; attacks: number; slowUntil: number; emergencyUsed: boolean; stormUntil: number; stormTick: number; chainAt: number[];
    /** 채널형(물뿌리개) 틱, 계속 쏜 시간, 대시 보너스, 마지막 타격 대상, 주기 효과 타이머, 보스 피격 감소 쿨 */
    tick: number; tickN?: number; holdT: number; dashBonusUntil: number; lastTarget: number; bigCatch: number; periodic: number; ironAt: number; still: number; gale: number[];
    /** 조준 지점(월드 좌표, 비료 투척 목표) */
    tx: number; ty: number };
  buffs: { kind: FoodEffect["kind"]; value: number; until: number }[];
  foods: FoodSlot[]; foodUsed: boolean[];
  level: number; xp: number; picks: Partial<Record<AwakenId, number>>; choices: AwakenId[] | null;
  monsters: Monster[]; projectiles: Projectile[]; zones: Zone[]; orbs: Orb[]; pops: Pop[]; swings: Swing[];
  /** 보스 전투 요소(각도·회전 광선, 확장 고리, 추적 장판: bossKit) */
  hazards: Hazard[];
  /** 보스(패턴·접촉)에게 맞은 횟수(5.6절 측정) */
  bossHits?: number;
  spawnAcc: number; nextElite: number; elitesPlaced: number; packAt: number; bossSummons: number;
  /** 처치 연출: 최근 처치 시각들(1초 안 5마리 이상이면 연쇄 처치), 화면 흔들림 */
  killTimes: number[]; shake: number; chainShown: number;
  /** 타격감: 잠깐 느려지기(초), 마지막 히트스톱 시각, 맞은 자리 불꽃, 효과음 카운터(화면이 보고 소리를 낸다) */
  hitstop: number; lastStop: number; sparks: Spark[]; sfx: { hit: number; crit: number; kill: number; big: number; xp: number };
  /** 경험치 바 반짝임(초) */
  xpFlash: number;
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
  actions: { at: number; run: () => void; tag?: string; src?: HitSource }[];
  /** 62절 보조무기(한 판 1개)와 획득한 각성 레벨, 피해 원천별 합계 */
  auxes: AuxState[]; auxLevel: number; dmgBy: Record<HitSource, number>;
  /** 판 기록: 보스 등장 순간 체력 비율, 회피 횟수, 입력 방식 */
  waveEndHp: number | null; dodges: number; input: "pc" | "mobile";
  /** 53절 카드 진행 상태 */
  ext: { /** 같은 층 직전 최고 실패 기록(3.4.3 비교 표식) */ prevBest?: { waveTime: number; bossHpRatio: number }; prevBeat?: boolean; dischargeAt?: number; rootUntil?: number; pullUntil?: number; pullX?: number; pullY?: number; tempo: number; tempoUntil: number; focusUid: number; focusN: number; regenAt: number; secondWind: boolean; thornAt: number; petBondAt: number; petGuard: boolean;
    specialHitAt: number; castId: number; firstHitCast: number; perfectUntil: number; dashBoostUntil: number; cut: number[]; wasDashing: boolean };
  kills: number; damageTaken: Record<string, number>; uid: number; prevDash: boolean; prevFood: [boolean, boolean, boolean]; bossHpAtEnd: number;
};

const rnd = () => Math.random();
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);
const angDiff = (a: number, b: number) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d); };

export function createRaid(floor: FloorDef, weapon: WeaponStats, evolution: Evolution | null, foods: FoodSlot[], gear: Gear = NO_GEAR, pet: { id: string; mult: number } | null = null, seed = Math.floor(Math.random() * 1e9)): RaidState {
  const terrain = makeTerrain(floor.floor, seed);
  return {
    cam: { x: START.x - ARENA_W / 2, y: START.y - ARENA_H / 2, lx: 0, ly: 0 }, terrain, pressure: { x: START.x, y: START.y, since: 0, stage: 0, leftAt: -1 }, warns: [],
    floor, t: 0, over: null, paused: false, weapon, evolution, gear,
    pet: pet ? { ...pet, x: START.x - 30, y: START.y, timer: 2, shieldUsed: false, flash: 0 } : null,
    player: { x: START.x, y: START.y, hp: PLAYER.hp + gear.hp, maxHp: PLAYER.hp + gear.hp, shield: gear.startShield, shieldUntil: 0, iframes: 1, dashCd: 0, dashT: 0, dodgeUntil: 0, dodgePop: -1, dashDir: { x: 1, y: 0 }, swingCd: 0, windup: -1, aim: 0, attacks: 0, slowUntil: 0, emergencyUsed: false, stormUntil: 0, stormTick: 0, chainAt: [], tick: 0, holdT: 0, dashBonusUntil: 0, lastTarget: -1, bigCatch: 0, periodic: 6, ironAt: 0, still: 0, gale: [], tx: START.x + 100, ty: START.y },
    buffs: [], foods, foodUsed: foods.map(() => false),
    level: 1, xp: 0, picks: {}, choices: null,
    monsters: [], projectiles: [], zones: [], orbs: [], pops: [], swings: [], hazards: [],
    spawnAcc: 0.97, nextElite: ELITE_AT[0] * floorBand(floor.floor).eliteTime, elitesPlaced: 0, packAt: 0, bossSummons: 0, killTimes: [], shake: 0, chainShown: 0, waveEndHp: null, dodges: 0, input: "pc", auxes: [], auxLevel: 0, dmgBy: { basic: 0, special: 0, aux: 0, pet: 0 }, ext: { tempo: 0, tempoUntil: 0, focusUid: -1, focusN: 0, regenAt: 20, secondWind: false, thornAt: -9, petBondAt: -9, petGuard: false, specialHitAt: -9, castId: 0, firstHitCast: -1, perfectUntil: 0, dashBoostUntil: 0, cut: [], wasDashing: false }, hitstop: 0, lastStop: -1, sparks: [], sfx: { hit: 0, crit: 0, kill: 0, big: 0, xp: 0 }, xpFlash: 0, flow: null, flowAt: 0, flowCell: -1, bossSpawned: false, interventions: 0, boss: null,
    special: { readyAt: 0, prev: false, moveUntil: 0, moveMul: 1, lockAim: null, stanceUntil: 0, stanceHit: false, cancelable: false, hits: {}, bump: 0, castAt: -99, castX: 0, castY: 0, castAim: 0 }, actions: [],
    kills: 0, damageTaken: {}, uid: 1, prevDash: false, prevFood: [false, false, false], bossHpAtEnd: 1,
  };
}

// ---------- 피해 원천(특수 공격·보조무기 구분) ----------
/** 지금 처리 중인 공격의 원천. 특수 공격 실행·예약 타격·투사체·장판이 만들어질 때의 값을 기억해 두었다가 적용한다. */
let hitSource: HitSource = "basic";
function withSource<T>(src: HitSource | undefined, run: () => T): T { const prev = hitSource; hitSource = src ?? "basic"; try { return run(); } finally { hitSource = prev; } }

// ---------- 파생 능력치 ----------
const isSpray = (s: RaidState) => s.weapon.mode === "channel" || s.weapon.mode === "beam";
const pick = (s: RaidState, id: AwakenId) => s.picks[id] ?? 0;
const buffSum = (s: RaidState, kinds: FoodEffect["kind"][]) => s.buffs.filter(b => b.until > s.t && kinds.includes(b.kind)).reduce((sum, b) => sum + b.value / 100, 0);
export const derived = (s: RaidState) => ({
  damageMul: 1 + 0.22 * pick(s, "keen-edge") + 0.06 * pick(s, "endless-edge") + buffSum(s, ["attack", "all"]),
  // 공격 간격 하한: 분사형(channel·beam) 0.10초, 그 밖 0.20초(WEAPON_CARD_UI_DESIGN_SPEC 2절)
  interval: Math.max(isSpray(s) ? 0.1 : 0.2, s.weapon.interval * ATTACK_SPEED_MUL * Math.max(0.65, 1 - 0.14 * pick(s, "quick-grip") - 0.03 * pick(s, "endless-haste") - buffSum(s, ["haste", "all"]) - (pick(s, "battle-tempo") && s.t < s.ext.tempoUntil ? 0.03 * s.ext.tempo : 0) - 0.12 * pick(s, "spray-tick") - 0.1 * pick(s, "gun-rate"))),
  range: s.weapon.range * (1 + 0.22 * pick(s, "long-handle") + 0.18 * pick(s, "sweeping-edge")),
  arc: Math.min(360, s.weapon.angle + 10 * pick(s, "long-handle") + 25 * pick(s, "wide-arc")),
  knockback: s.weapon.knockback * (1 + 0.5 * pick(s, "heavy-swing")),
  // 이동속도 증가 합계 +60% 상한(53.9)
  speed: PLAYER.speed * (1 + Math.min(0.6, 0.12 * pick(s, "wind-step") + s.gear.speed + buffSum(s, ["speed", "all"]) + (s.t < s.ext.dashBoostUntil ? 0.15 : 0)
    + (pick(s, "pressure-runner") ? Math.min(0.15, 0.05 * s.pressure.stage) : 0) + (pick(s, "shield-keeper") && s.player.shield > 0 ? 0.1 : 0))),
  dashCd: PLAYER.dashCooldown * Math.max(0.3, 1 - 0.18 * pick(s, "quick-dash") - s.gear.dashCd),
  absorb: PLAYER.absorb + s.gear.absorb,
  armor: 3 * pick(s, "hard-leather") + s.gear.defense + pick(s, "close-instinct"),
  crit: PLAYER.critChance + s.gear.crit + buffSum(s, ["crit"]) + 0.08 * pick(s, "critical-eye"),
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
  const band = floorBand(s.floor.floor), fodder = def.kind === "elite" || def.kind === "canal-elite" ? 1 : FODDER_HP * band.fodder, hp0 = Math.max(1, Math.round(def.hp * fodder));
  return { uid: s.uid++, def, name: def.name, icon: def.icon, x: at.x, y: at.y, r: def.radius, hp: hp0, maxHp: hp0, damage: def.damage, defense: def.defense, speed: def.speed * (def.kind === "hop" || def.kind === "eel" ? 1 : NORMAL_SPEED_MUL),
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
  const e0 = s.floor.elite!, e = { ...e0, hp: Math.round(e0.hp * floorBand(s.floor.floor).elite) };
  const def = MONSTERS[e.id];
  if (def.kind === "elite" || def.kind === "canal-elite") spawn(s, e.id, { hp: e.hp, maxHp: e.hp }, at);
  else spawn(s, e.id, { hp: e.hp, maxHp: e.hp, elite: true, r: def.radius * 1.6, damage: Math.round(def.damage * 1.3), xp: 12, name: `${def.name} 정예` }, at);
}
function spawnBoss(s: RaidState) {
  const b: BossDef = s.floor.boss;
  const base = MONSTERS[b.base ?? ({ "pollen-boar": "boarling", "storm-catfish": "shock-eel", "maple-stag": "leaf-wolf", "iron-bear": "frost-miner" } as Record<string, string>)[b.id] ?? "shock-eel"];
  const m = spawn(s, base.id, { name: b.name, icon: b.icon, hp: b.hp, maxHp: b.hp, damage: b.damage, defense: b.defense, r: b.id === "mini" ? 30 : 40, xp: 0, elite: true,
    boss: b.id === "mini" ? "mini" : (b.id as "pollen-boar" | "storm-catfish" | "maple-stag" | "iron-bear"), rate: b.id === "mini" ? 1.5 : 1, speed: b.id === "mini" ? base.speed * 0.9 : 60, timer: 2, t2: 3, t3: 5, t4: 7 }, spawnPoint(s));
  if (BOSS_SCRIPTS[b.id]) { m.script = b.id; m.boss = "mini"; m.rate = 1; m.speed = base.speed * 0.8; m.r = 38; m.phase = 0; m.gap = 2; }
  s.boss = m; s.bossSpawned = true; s.waveEndHp = Math.round((s.player.hp / s.player.maxHp) * 100) / 100;
  s.pops.push({ x: s.cam.x + ARENA_W / 2, y: s.cam.y + 80, text: `${b.icon} ${b.name} 등장!`, t: 2.5, kind: "info" });
}

/** 웨이브 구성: 역할별 비중(기본 5 · 빠른 3 · 원거리 2 · 돌진·방어 2), 원거리는 동시에 최대 RANGED_CAP마리. */
const SPAWN_WEIGHT: Record<string, number> = { chase: 5, slime: 5, hop: 3, eel: 3, ranged: 2, frog: 2, charge: 2, crab: 2 };
export const RANGED_CAP = 4;
function pickSpawn(s: RaidState) {
  // 원거리(투사체) 적 동시 상한: 원거리 정예·소환물도 수에 포함한다. 정예는 정해진 시각에 그대로 나오고, 넘친 만큼 일반 원거리 생성을 막는다.
  const ranged = s.monsters.filter(m => m.hp > 0 && !m.boss && (m.def.kind === "ranged" || m.def.kind === "frog" || m.def.kind === "canal-elite")).length;
  const pool = s.floor.monsters.filter(id => !(ranged >= RANGED_CAP && (MONSTERS[id].kind === "ranged" || MONSTERS[id].kind === "frog")));
  const total = pool.reduce((sum, id) => sum + (SPAWN_WEIGHT[MONSTERS[id].kind] ?? 1), 0);
  let r = rnd() * total;
  for (const id of pool) { r -= SPAWN_WEIGHT[MONSTERS[id].kind] ?? 1; if (r <= 0) return id; }
  return pool[0];
}

// ---------- 피해 ----------
/** 회피가 끝난 뒤에도 무적이 이어지는 여유 시간(초). */
const DODGE_GRACE = 0.2;
/** 쾌속: 공격은 항상 자동(마우스 방향으로 계속). */
const AUTO_ATTACK = true;
/** 쾌속: 기본 공격 간격 배율(−15%) */
const ATTACK_SPEED_MUL = 0.85;
/** 플레이어 피해 배율 상한(각성·음식·조건부 합산, 치명타·경직 배율은 따로). 카드 확장 뒤 최대치가 무한히 커지지 않게. */
const DAMAGE_MUL_CAP = 3;
/** 방어 1당 계수(방어 4 ≈ 24%, 8 ≈ 39%, 15 ≈ 55% 감소) */
const DEFENSE_K = 8;
const HAZARD_SOURCES = ["꽃가루 장판", "감전", "전도성 웅덩이", "낙엽 회오리", "빙판"];
/** 피해를 실제로 받았으면 true(회피·무적이면 false). */
function hurtPlayer(s: RaidState, raw: number, source = "기타", fromBoss = false): boolean {
  const p = s.player;
  if (s.over) return false;
  // 회피(대시) 중과 직후 0.2초는 무적: 맞을 뻔하면 "회피!"
  if (p.dashT > 0 || s.t < p.dodgeUntil) { if (s.t - p.dodgePop > 0.5) { p.dodgePop = s.t; s.pops.push({ x: p.x, y: p.y - 34, text: "회피!", t: 0.6, kind: "info" }); } return false; }
  if (p.iframes > 0) return false;
  if (s.gear.hazardCut && HAZARD_SOURCES.includes(source)) raw *= 1 - s.gear.hazardCut; // 설산 장화: 바닥 피해 감소
  // 피해 감소 합계 85% 상한(53.9)
  raw *= 1 - Math.min(0.85, (s.weapon.fx?.guard ?? 0) + (s.picks["frost-veil"] && p.holdT > 0 ? 0.25 : 0) + buffSum(s, ["armor"]) + (pick(s, "safe-route") && HAZARD_SOURCES.includes(source) ? 0.3 : 0));
  if (s.special.stanceUntil > s.t) { raw *= 0.2; if (!s.special.stanceHit) { s.special.stanceHit = true; s.special.stanceUntil = 0; counterBlast(s, true); } }
  if (fromBoss && s.picks["iron-wall"] && s.t - p.ironAt >= 1) { p.ironAt = s.t; raw *= 0.5; }
  // 방어 비율식(RAID_BALANCE_RESEARCH 6절): 원래 피해 × 100 ÷ (100 + 방어 × 8), 최소 1
  let dmg = Math.max(1, Math.round(raw * 100 / (100 + Math.max(0, derived(s).armor) * DEFENSE_K)));
  if (p.shield > 0) { const used = Math.min(p.shield, dmg); p.shield -= used; dmg -= used; }
  p.hp -= dmg; p.iframes = PLAYER.iframes; s.damageTaken[source] = (s.damageTaken[source] ?? 0) + dmg;
  if (fromBoss) s.bossHits = (s.bossHits ?? 0) + 1;
  if (dmg > 0) s.pops.push({ x: p.x, y: p.y - 24, text: `-${dmg}`, t: 0.8, kind: "hurt" });
  if (!p.emergencyUsed && pick(s, "emergency-shield") && p.hp > 0 && p.hp <= p.maxHp * 0.3) { p.emergencyUsed = true; p.shield += Math.round(p.maxHp * 0.2); p.shieldUntil = s.t + 60; s.pops.push({ x: p.x, y: p.y - 40, text: "비상 보호막!", t: 1.2, kind: "info" }); }
  if (s.pet && pick(s, "pet-guard") && !s.ext.petGuard && p.hp > 0 && p.hp <= p.maxHp * 0.35) { s.ext.petGuard = true; p.shield += 18; p.shieldUntil = Math.max(p.shieldUntil, s.t + 30); s.pops.push({ x: p.x, y: p.y - 52, text: "🐾 동료의 수호!", t: 1.2, kind: "info" }); }
  if (p.hp <= 0 && pick(s, "second-wind") && !s.ext.secondWind && !s.floor.training) { s.ext.secondWind = true; p.hp = 1; p.iframes = 2; s.pops.push({ x: p.x, y: p.y - 52, text: "💨 두 번째 숨!", t: 1.4, kind: "info" }); return true; }
  if (p.hp <= 0) { if (s.floor.training) p.hp = 1; else { p.hp = 0; s.over = "dead"; } }
  return true;
}
/** 고정 피해(가시 갑옷·전투펫 등): 방어만 빼고 배율·치명타 없음. */
function flatHit(s: RaidState, m: Monster, raw: number, src: HitSource, kind: Pop["kind"] = "hit") {
  if (m.hp <= 0) return;
  const dmg = mitigate(raw, effDefense(s, m));
  m.hp -= dmg; m.flash = 0.1; s.dmgBy[src] += dmg; s.pops.push({ x: m.x, y: m.y - m.r, text: String(dmg), t: 0.5, kind });
  if (m.hp <= 0) killMonster(s, m);
}
/** 갑옷 균열을 반영한 방어(0 아래로는 안 내려감). */
/**
 * 몬스터 방어 계산(RAID_FLOOR_30_EXPANSION_AUDIT 11.4). 운영은 "flat"(피해 − 방어), "ratio"는 시뮬레이터 전용 숨김 검증용(RAID_DEFENSE_V2):
 * 피해 × 100 ÷ (100 + 유효 방어 × 6). 방어형(게)의 추가 3도 유효 방어에 더한다. 모든 플레이어 피해 경로가 이 함수를 쓴다.
 */
/** raid-30: (b)안 확정에 따라 기본을 비율식으로(1~20층 보스 체력 보정과 함께). 운영 반영은 승인 후 */
export let DEFENSE_MODE: "flat" | "ratio" = "ratio";
export function setDefenseMode(mode: "flat" | "ratio") { DEFENSE_MODE = mode; }
export const MONSTER_DEFENSE_K = 6;
export function mitigate(raw: number, defense: number, extra = 0) {
  const d = Math.max(0, defense) + extra;
  return DEFENSE_MODE === "ratio" ? Math.max(1, Math.round(raw * 100 / (100 + d * MONSTER_DEFENSE_K))) : Math.max(1, Math.round(raw - d));
}
const effDefense = (s: RaidState, m: Monster) => Math.max(0, m.defense - ((m.crackUntil ?? 0) > s.t ? m.crack ?? 0 : 0));
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
  // 정면 방패(29층 암흑 갑주 거신): 플레이어가 방패 쪽(±60°)에 있으면 피해 −70%
  if (m.shieldFacing !== undefined && angDiff(Math.atan2(s.player.y - m.y, s.player.x - m.x), m.shieldFacing) < 1.05) base *= 0.3;
  if ((m.invulnUntil ?? 0) > s.t) { if (s.t - (m.flash > 0 ? 0 : -1) > 0) s.pops.push({ x: m.x, y: m.y - m.r - 10, text: "무적", t: 0.3, kind: "info" }); return; }
  const src = hitSource;
  // 보조무기: 주무기 강화·치명타 없이 고정 피해(62.1)
  if (src === "aux") { flatHit(s, m, base, "aux", "aux"); if (!m.boss && knock && m.hp > 0) { m.kvx += Math.cos(ang) * knock * 12; m.kvy += Math.sin(ang) * knock * 12; } return; }
  const d = derived(s), fx = s.weapon.fx ?? {}, p = s.player;
  // 날 세우기는 기본 공격만, 필살 연마·완벽한 타이밍은 특수 공격만(53.2·53.4)
  let mul = d.damageMul - (src === "special" ? 0.22 * pick(s, "keen-edge") : 0);
  if (src === "special") mul += 0.25 * pick(s, "special-force") + (s.t < s.ext.perfectUntil ? 0.2 : 0);
  if (m.elite || m.boss) mul += 0.15 * pick(s, "boss-hunter");
  const md = dist(p.x, p.y, m.x, m.y);
  if (pick(s, "close-instinct") && md < 110) mul += 0.18;
  if (pick(s, "keep-distance") && md >= 260) mul += 0.18;
  if (pick(s, "first-strike") && !m.struck && m.hp >= m.maxHp * 0.9) mul += 0.4;
  m.struck = true;
  if (src === "basic") {
    if (pick(s, "focused-swing") && !o.noCombo) { if (s.ext.focusUid === m.uid) s.ext.focusN++; else { s.ext.focusUid = m.uid; s.ext.focusN = 1; } if (s.ext.focusN >= 4) mul += 0.16; }
    if (pick(s, "shield-keeper") && p.shield > 0) mul += 0.1;
  }
  if (m.elite || m.boss) mul += 0.12 * pick(s, "heavy-swing") + (fx.elite ?? 0);
  if (m.boss) mul += (fx.boss ?? 0) + (s.picks.executioner ? 0.25 : 0) + (s.picks["big-catch"] ? p.bigCatch : 0) + (s.gear.bossDamage ?? 0);
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
  mul = Math.min(DAMAGE_MUL_CAP, mul);
  let dmg = base * mul * (crit ? Math.max(s.picks["vital-stab"] ? 2 : 0, PLAYER.critMul + 0.25 * pick(s, "critical-force")) : 1) * (m.state === "stun" ? 1.3 : 1);
  const ignore = m.boss && (o.ignoreDef || (crit && s.picks["vital-pierce"]));
  dmg = mitigate(dmg, ignore ? 0 : effDefense(s, m) * (1 - (o.defIgnore ?? 0)), m.def.kind === "crab" && m.state !== "dash" ? 3 : 0);
  if (s.picks.executioner && !m.boss && !m.elite && m.hp - dmg <= m.maxHp * 0.2) dmg = m.hp;
  m.hp -= dmg; m.flash = 0.12; s.dmgBy[src] += dmg;
  if (src === "basic" && pick(s, "armor-crack") && rnd() < 0.1) { m.crack = Math.min(3, ((m.crackUntil ?? 0) > s.t ? m.crack ?? 0 : 0) + 1); m.crackUntil = s.t + 5; }
  if (src === "special") {
    s.ext.specialHitAt = s.t;
    // 다단 특수 공격은 첫 유효 적중에서만 잔향·전투 호흡 판정(53.4)
    if (s.ext.firstHitCast !== s.ext.castId) {
      s.ext.firstHitCast = s.ext.castId;
      if (pick(s, "special-heal")) { p.hp = Math.min(p.maxHp, p.hp + 3); s.pops.push({ x: p.x, y: p.y - 30, text: "+3", t: 0.7, kind: "heal" }); }
      if (pick(s, "special-echo") && rnd() < 0.2) { const ex = m.x, ey = m.y, echoBase = base * 0.5; later(s, 0.4, () => { s.swings.push({ angle: 0, range: 40, arc: 360, t: 0.25, kind: "circle", x: ex, y: ey }); for (const t of s.monsters) if (t.hp > 0 && dist(t.x, t.y, ex, ey) < 40 + t.r) hitMonster(s, t, echoBase, 0, 0, { noCrit: true, noCombo: true }); }); }
    }
  }
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
  if (m.boss) s.hazards = [];
  s.shake = Math.max(s.shake, m.boss ? 5 : m.elite ? 3 : 1.5);
  s.killTimes = [...s.killTimes.filter(t => t > s.t - 1), s.t];
  if (s.killTimes.length >= 5 && s.t - s.chainShown > 1) { s.chainShown = s.t; s.pops.push({ x: s.player.x, y: s.player.y - 60, text: `⚡ 연쇄 처치 ×${s.killTimes.length}`, t: 0.9, kind: "info" }); }
  burst(s, m.x, m.y, m.boss ? 30 : m.elite ? 18 : 8, m.boss || m.elite ? "#ffcf6a" : "#f4ead2", m.boss ? 320 : 220);
  if (m.boss || m.elite) { hitStop(s, m.boss ? 0.18 : 0.1); s.sfx.big++; } else s.sfx.kill++;
  // 경험치 보석: 사방으로 톡 튀었다가 빨려 들어온다(큰 몹은 여러 개로 쪼개서)
  if (m.xp > 0) { const n = Math.min(6, Math.max(1, Math.ceil(m.xp / 3))), each = m.xp / n; for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, v = 90 + rnd() * 120; s.orbs.push({ x: m.x, y: m.y, xp: each, age: 0, vx: Math.cos(a) * v, vy: Math.sin(a) * v }); } }
  // 쾌속: 일반 몹 1%로 회복 고기(체력 12)
  if (!m.boss && !m.elite && rnd() < 0.01) s.orbs.push({ x: m.x + 8, y: m.y, xp: 1, age: 0, heal: 12 });
  if (s.weapon.fx?.spinKill && !m.elite && !m.boss) s.player.swingCd = Math.max(0, s.player.swingCd - s.weapon.interval * 0.1);
  if (m.inNet && s.picks["full-haul"] && m.xp > 0) s.orbs.push({ x: m.x + 6, y: m.y, xp: Math.max(1, Math.round(m.xp * 0.5)), age: 0 });
  if (s.picks["manure-blast"] && s.zones.some(z => z.kind === "poison" && dist(z.x, z.y, m.x, m.y) < z.r)) blastAt(s, m.x, m.y, 40, s.weapon.damage * 0.4);
  if (s.picks["chain-harvest"] && rnd() < 0.35) { const p = s.player; p.chainAt = p.chainAt.filter(at => at > s.t - 1); if (p.chainAt.length < 2) { p.chainAt.push(s.t); swingHit(s, 0, 1, true); } }
  if (m.elite && !m.boss && s.t < BOSS_AT) s.packAt = s.t + 0.5;
  // 53절 처치 효과
  if (pick(s, "battle-tempo")) { s.ext.tempo = Math.min(5, (s.t < s.ext.tempoUntil ? s.ext.tempo : 0) + 1); s.ext.tempoUntil = s.t + 5; }
  if (m.elite && !m.boss) {
    if (pick(s, "elite-remedy")) { const pl = s.player, v = Math.round(pl.maxHp * 0.08); pl.hp = Math.min(pl.maxHp, pl.hp + v); s.pops.push({ x: pl.x, y: pl.y - 30, text: `+${v}`, t: 0.8, kind: "heal" }); }
    if (pick(s, "hunter-reset") && s.special.readyAt > s.t) s.special.readyAt = s.t + (s.special.readyAt - s.t) * 0.65;
  }
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
  if (ch && s.terrain.zone === "field" && !ch.used && dist(p.x, p.y, ch.x, ch.y) < d.range + ch.r) { ch.used = true; zoneAt(s, { kind: "blast", x: ch.x, y: ch.y, r: 120, t: 0.35, tele: 0, damage: 0, every: 0, slow: 0 }); for (const m of s.monsters) if (m.hp > 0 && dist(m.x, m.y, ch.x, ch.y) < 120 + m.r) hitMonster(s, m, 60 * (1 + 0.3 * pick(s, "opportunity-master")), Math.atan2(m.y - ch.y, m.x - ch.x), 50); s.pops.push({ x: ch.x, y: ch.y - 30, text: "🌟 황금 꽃 폭발!", t: 1.2, kind: "info" }); }
  const targets = s.monsters.filter(m => {
    if (m.hp <= 0) return false;
    const r = dist(p.x, p.y, m.x, m.y);
    if (r > d.range + m.r) return false;
    const a = Math.atan2(m.y - p.y, m.x - p.x);
    return !(arc < 360 && angDiff(a, angle) > (arc / 2) * Math.PI / 180 + Math.atan2(m.r, Math.max(1, r)));
  });
  const sweep = pick(s, "sweeping-edge") && targets.length >= 3 ? 0.12 : 0;
  for (const m of targets) hitMonster(s, m, s.weapon.damage * mul, Math.atan2(m.y - p.y, m.x - p.x), d.knockback, { extra: sweep });
}

function explodeFlower(s: RaidState, f: Terrain["flowers"][number]) {
  if (f.exploded) return;
  f.exploded = true;
  zoneAt(s, { kind: "blast", x: f.x, y: f.y, r: 75, t: 0.3, tele: 0, damage: 0, every: 0, slow: 0 });
  for (const m of s.monsters) if (m.hp > 0 && dist(m.x, m.y, f.x, f.y) < 75 + m.r) { const dmg = mitigate(35 * (1 + 0.3 * pick(s, "opportunity-master")), m.defense); m.hp -= dmg; m.flash = 0.1; s.pops.push({ x: m.x, y: m.y - m.r, text: String(dmg), t: 0.6, kind: "hit" }); if (m.hp <= 0) killMonster(s, m); }
  for (const g of s.terrain.flowers) if (!g.exploded && dist(g.x, g.y, f.x, f.y) < 75) explodeFlower(s, g);
}

// ---------- 무기별 공격(49절) ----------
/** 긴 자루·휩쓸기: 사거리 배율, 범위(반지름) 배율, 묵직한 휘두르기: 밀어내기 배율(감사 문서 4·6절) */
const reachMul = (s: RaidState) => 1 + 0.22 * pick(s, "long-handle") + 0.18 * pick(s, "sweeping-edge") + 0.22 * pick(s, "slam-reach") + 0.2 * pick(s, "spray-length") + 0.25 * pick(s, "throw-range") + 0.22 * pick(s, "line-reach") + 0.25 * pick(s, "shot-range");
const areaMul = (s: RaidState) => 1 + 0.11 * pick(s, "long-handle") + 0.18 * pick(s, "sweeping-edge") + 0.15 * pick(s, "impact-radius") + 0.15 * pick(s, "blast-radius");
const knockMul = (s: RaidState) => 1 + 0.5 * pick(s, "heavy-swing");
/** 휩쓸기: 기본 공격 한 번에 3마리 이상 맞히면 +12% */
const sweepBonus = (s: RaidState, n: number) => (hitSource === "basic" && pick(s, "sweeping-edge") && n >= 3 ? 0.12 : 0);
const inAim = (p: { x: number; y: number }, aim: number, m: Monster, len: number, width: number) => {
  const dx = m.x - p.x, dy = m.y - p.y, along = dx * Math.cos(aim) + dy * Math.sin(aim), side = Math.abs(-dx * Math.sin(aim) + dy * Math.cos(aim));
  return along > -m.r && along < len + m.r && side < width / 2 + m.r ? along : -1;
};
function blastAt(s: RaidState, x: number, y: number, r: number, dmg: number, knock = 20) {
  s.swings.push({ angle: 0, range: r, arc: 360, t: 0.25, kind: "circle", x, y });
  const hits = s.monsters.filter(m => m.hp > 0 && dist(m.x, m.y, x, y) < r + m.r), extra = sweepBonus(s, hits.length);
  for (const m of hits) hitMonster(s, m, dmg, Math.atan2(m.y - y, m.x - x), knock, { noCombo: true, extra });
}
function slamHit(s: RaidState, mul: number, radiusMul = 1) {
  const p = s.player, w = s.weapon, reach = w.range * reachMul(s), cx = p.x + Math.cos(p.aim) * reach, cy = p.y + Math.sin(p.aim) * reach, r = (w.radius ?? 50) * radiusMul * areaMul(s);
  blastAt(s, cx, cy, r, w.damage * mul, w.knockback * knockMul(s));
  if (pick(s, "stun-slam")) for (const m of s.monsters) if (m.hp > 0 && !m.boss && dist(m.x, m.y, cx, cy) < r + m.r && (m.state === "move" || m.state === "stun")) { const add = m.elite ? 0.3 : 0.5; if (m.state === "stun") m.stateT += 0.3; else { m.state = "stun"; m.stateT = add; } }
  if (w.fx?.quake && p.attacks % 3 === 0) blastAt(s, cx, cy, s.picks["earth-split"] ? 160 : 110, w.damage * 0.6, 30);
  const frags = w.fx?.fragments ? (s.picks["rock-rain"] ? 6 : w.fx.fragments) : 0;
  for (let i = 0; i < frags; i++) { const a = rnd() * Math.PI * 2, d = 30 + rnd() * 60; blastAt(s, cx + Math.cos(a) * d, cy + Math.sin(a) * d, 18, w.damage * 0.35, 10); }
}
function channelTick(s: RaidState) {
  const p = s.player, w = s.weapon, fx = w.fx ?? {}, range = w.range * reachMul(s), angle = w.angle + 15 * pick(s, "spray-width"), tick = derived(s).interval, focus = pick(s, "focus-spray") > 0;
  /** 같은 적 연속 적중 시간(틱이 끊기면 처음부터): 빙결 2초·집중 피해 1초에 쓴다 */
  const keep = (m: Monster) => { if (s.t - (m.sprayAt ?? -9) > tick * 2.5) { m.sprayT = 0; m.expose = 0; } m.sprayAt = s.t; m.sprayT = (m.sprayT ?? 0) + tick; };
  // 이중 베기(채널): 세 번째 틱마다 피해 +55%
  p.tickN = (p.tickN ?? 0) + 1; const tickMul = pick(s, "double-cut") && p.tickN % 3 === 0 ? 1.55 : 1;
  if (w.mode === "beam") {
    s.swings.push({ angle: p.aim, range, arc: 0, t: 0.16, kind: "line", width: w.width });
    const beamW = (w.width ?? 22) * (1 + 0.3 * pick(s, "spray-width"));
    s.swings[s.swings.length - 1].width = beamW;
    const hits = s.monsters.filter(m => m.hp > 0 && inAim(p, p.aim, m, range, beamW) >= 0), extra = sweepBonus(s, hits.length);
    for (const m of hits) { keep(m); hitMonster(s, m, w.damage * tickMul, p.aim, (fx.knockTick ?? 0) * knockMul(s), { noCombo: true, extra: extra + (focus && (m.sprayT ?? 0) >= 1 ? 0.25 : 0) }); }
    return;
  }
  s.swings.push({ angle: p.aim, range, arc: angle, t: 0.16, kind: "cone" });
  const cone = s.monsters.filter(m => { if (m.hp <= 0) return false; const r = dist(p.x, p.y, m.x, m.y), a = Math.atan2(m.y - p.y, m.x - p.x); return !(r > range + m.r || angDiff(a, p.aim) > (angle / 2) * Math.PI / 180 + Math.atan2(m.r, Math.max(1, r))); }), extra = sweepBonus(s, cone.length);
  for (const m of cone) {
    const a = Math.atan2(m.y - p.y, m.x - p.x);
    keep(m);
    hitMonster(s, m, w.damage * tickMul, a, 0, { noCombo: true, extra: extra + (focus && (m.sprayT ?? 0) >= 1 ? 0.25 : 0) });
    m.slowUntil = s.t + 0.4; m.slowMul = Math.min(m.slowMul, 1 - (fx.slow ?? 0.15));
    if (fx.freeze) {
      // 빙결: 무기 원본 간격이 아니라 실제 틱 시간을 더해, 빠른 손잡이·틱 속도와 상관없이 2초 연속 적중에 언다
      m.expose += tick;
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
  const p = s.player, w = s.weapon, fx = w.fx ?? {}, d = Math.min(w.range * reachMul(s), dist(p.x, p.y, tx, ty)), a = Math.atan2(ty - p.y, tx - p.x), area = areaMul(s);
  const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d, big = s.picks["giant-seed"] && p.attacks % 5 === 0;
  const seeds = fx.seeds ?? 1;
  // 추가 투사체: 옆에 작은 폭탄 1개(50%·반경 70%)
  if (pick(s, "extra-bomb")) { const a2 = a + (rnd() < 0.5 ? 1 : -1) * 0.5; zoneAt(s, { kind: "pbomb", x: p.x + Math.cos(a2) * d * 0.85, y: p.y + Math.sin(a2) * d * 0.85, r: (w.radius ?? 45) * 0.7 * area, t: 0.1, tele: 0.4, damage: w.damage * 0.5, every: 0, slow: 0, mine: { mul: 1, poison: fx.poison } }); }
  for (let i = 0; i < seeds; i++) {
    const off = seeds > 1 ? { x: (rnd() - 0.5) * 80, y: (rnd() - 0.5) * 80 } : { x: 0, y: 0 };
    zoneAt(s, { kind: "pbomb", x: x + off.x, y: y + off.y, r: (w.radius ?? 45) * (big ? 2 : 1) * area, t: 0.1, tele: 0.35, damage: w.damage * (big ? 2 : 1), every: 0, slow: 0, mine: { mul: 1, poison: fx.poison, seedChain: Boolean(fx.seeds), big: Boolean(big) } });
  }
}
function thrustHit(s: RaidState, mul: number, lenMul = 1) {
  const p = s.player, w = s.weapon, fx = w.fx ?? {}, len = w.range * lenMul * reachMul(s), width = (w.width ?? 24) * (1 + 0.2 * pick(s, "line-reach"));
  s.swings.push({ angle: p.aim, range: len, arc: 0, t: 0.18, kind: "line", width });
  const hits = s.monsters.filter(m => m.hp > 0).map(m => ({ m, along: inAim(p, p.aim, m, len, width) })).filter(h => h.along >= 0).sort((x, y) => x.along - y.along);
  let pulled = 0;
  for (const { m, along } of hits) {
    const tip = fx.tip && along > len - 30;
    hitMonster(s, m, w.damage * mul, p.aim, w.knockback * knockMul(s), { critAdd: tip ? 0.15 : 0 });
    if (fx.pullSplash && m.hp > 0 && !m.elite && !m.boss && pulled < (s.picks.gather ? 3 : 1)) {
      pulled++; m.x = p.x + Math.cos(p.aim) * 40; m.y = p.y + Math.sin(p.aim) * 40;
      for (const o of s.monsters) if (o !== m && o.hp > 0 && dist(o.x, o.y, m.x, m.y) < 40 + o.r) hitMonster(s, o, w.damage * 0.5, p.aim, 10, { noCombo: true });
    } else if (fx.pullSplash && (m.elite || m.boss)) { m.slowUntil = s.t + 0.6; m.slowMul = 0.6; }
  }
  if (mul >= 1 && hits[0]) chainFrom(s, hits[0].m);
}
/** 연쇄 대상: 맞힌 적 주변 140px 안 1명에게 50%. */
function chainFrom(s: RaidState, from: Monster) {
  if (!pick(s, "chain-target")) return;
  const o = s.monsters.filter(m => m.hp > 0 && m !== from && dist(m.x, m.y, from.x, from.y) < 140).sort((x, y) => dist(x.x, x.y, from.x, from.y) - dist(y.x, y.y, from.x, from.y))[0];
  if (!o) return;
  s.swings.push({ angle: Math.atan2(o.y - from.y, o.x - from.x), range: dist(o.x, o.y, from.x, from.y), arc: 0, t: 0.2, kind: "line", width: 3, x: from.x, y: from.y });
  hitMonster(s, o, s.weapon.damage * 0.5, 0, 0, { noCombo: true });
}
function hookHit(s: RaidState, mul = 1) {
  const p = s.player, w = s.weapon, fx = w.fx ?? {}, range = w.range * reachMul(s);
  s.swings.push({ angle: p.aim, range, arc: 0, t: 0.2, kind: "line", width: 4 });
  const lineW = (w.width ?? 16) * (1 + 0.2 * pick(s, "line-reach"));
  const inLine = s.monsters.filter(m => m.hp > 0).map(m => ({ m, along: inAim(p, p.aim, m, range, lineW) })).filter(h => h.along >= 0).sort((x, y) => x.along - y.along);
  const target = inLine[0]?.m;
  if (!target) return;
  hitMonster(s, target, w.damage * mul, p.aim, 0);
  // 관통: 낚싯줄이 뒤의 적도 꿰뚫는다
  for (const h of inLine.slice(1, 1 + pick(s, "pierce-line"))) hitMonster(s, h.m, w.damage * mul * 0.8, p.aim, 0, { noCombo: true });
  if (mul < 1) return; // 2차 타격은 끌어오기·그물 없이 피해만
  chainFrom(s, target);
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
  const p = s.player, w = s.weapon, sp = (w.speed ?? 600) * (w.mode === "arrow" || w.mode === "bolt" ? 1 + 0.25 * pick(s, "shot-speed") : 1);
  s.projectiles.push({ src: hitSource, x: p.x, y: p.y, vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp, r: w.mode === "bolt" ? 8 : w.mode === "spread" ? 4 : 5, damage: dmg, life: (w.range * reachMul(s)) / sp, mine: true, pierce: new Set(), left: (w.fx?.pierce ?? 0) + (w.mode === "arrow" || w.mode === "bolt" ? pick(s, "pierce-shot") : 0), explode: w.fx?.explode, ox: p.x, oy: p.y, ...extra });
}
/** 무기 한 번 공격(채널형 제외). */
function attackOnce(s: RaidState) {
  const p = s.player, w = s.weapon, fx = w.fx ?? {};
  // 주기적 강화탄(총기형): 네 번째 발사마다 +60%
  const power = pick(s, "power-round") && p.attacks % 4 === 0 ? 1.6 : 1;
  switch (w.mode) {
    case "arc":
      swingHit(s, p.aim, 1);
      if (fx.double) swingHit(s, p.aim, 1);
      if (s.picks["double-cut"] && p.attacks % 3 === 0) swingHit(s, p.aim, 0.55);
      if (s.picks["whirl-slash"] && p.attacks % 4 === 0) swingHit(s, p.aim, 1, true);
      break;
    case "slam": { slamHit(s, 1); if (pick(s, "aftershock")) { const aim = p.aim; later(s, 0.35, () => { const keepAim = p.aim; p.aim = aim; slamHit(s, 0.55); p.aim = keepAim; }); } break; }
    case "lob": throwBomb(s, p.tx, p.ty); break;
    case "thrust": { const sea = s.picks["sea-god"] && p.attacks % 4 === 0; thrustHit(s, sea ? 2 : 1, sea ? 2 : 1); if (pick(s, "line-double") && p.attacks % 3 === 0) later(s, 0.12, () => thrustHit(s, 0.55)); if (s.picks["chain-spin"] && p.attacks % 5 === 0) blastAt(s, p.x, p.y, 120, w.damage, 30); break; }
    case "hook": hookHit(s); if (pick(s, "line-double") && p.attacks % 3 === 0) later(s, 0.12, () => hookHit(s, 0.55)); break;
    case "arrow": {
      const snipe = s.picks["pierce-snipe"] && p.attacks % 5 === 0;
      fire(s, p.aim, w.damage * (snipe ? 2.5 : 1), snipe ? { left: 999 } : {});
      if (fx.triple && p.attacks % 3 === 0) { fire(s, p.aim - 0.18, w.damage * 0.55); fire(s, p.aim + 0.18, w.damage * 0.55); }
      break;
    }
    case "spread": { const pellets = (w.pellets ?? 5) + pick(s, "extra-pellet"), ang = w.angle * (1 - 0.25 * pick(s, "tight-spread")), dmg = w.damage * (1 + 0.08 * pick(s, "tight-spread")) * power;
      for (let i = 0; i < pellets; i++) fire(s, p.aim + ((i / (pellets - 1)) - 0.5) * (ang * Math.PI / 180), dmg); break; }
    case "bullet": fire(s, p.aim, w.damage * power, s.picks["ap-round"] && p.attacks % 3 === 0 ? { ignoreDef: true } : {}); for (let i = 1; i <= pick(s, "extra-pellet"); i++) fire(s, p.aim + (i % 2 ? 1 : -1) * 0.07 * Math.ceil(i / 2), w.damage * 0.5 * power); break;
    case "bolt": fire(s, p.aim, w.damage); break;
    default: break;
  }
  // 다중 발사(투사체형): 세 번째 공격마다 양옆으로 50% 2발
  if (pick(s, "multi-shot") && p.attacks % 3 === 0 && (w.mode === "arrow" || w.mode === "bolt")) { fire(s, p.aim - 0.14, w.damage * 0.5); fire(s, p.aim + 0.14, w.damage * 0.5); }
  if (s.picks.eclipse && p.attacks % 4 === 0) s.projectiles.push({ x: p.x, y: p.y, vx: Math.cos(p.aim) * 700, vy: Math.sin(p.aim) * 700, r: 26, damage: w.damage * 1.8, life: 2, mine: true, pierce: new Set(), left: 999, wave: true });
  if (s.picks["harvest-storm"] && p.attacks % 5 === 0) { p.stormUntil = s.t + 2; p.stormTick = 0; }
}

// ---------- 우클릭 특수 공격(52절) ----------
const later = (s: RaidState, after: number, run: () => void, tag?: string) => s.actions.push({ at: s.t + after, run, tag, src: hitSource });
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
  else { s.swings.push({ angle: p.aim, range: 150, arc: 180, t: 0.25 }); for (const m of s.monsters) if (m.hp > 0 && dist(m.x, m.y, p.x, p.y) < 150 + m.r && angDiff(Math.atan2(m.y - p.y, m.x - p.x), p.aim) < Math.PI / 2) hitMonster(s, m, w.damage * 2.2, p.aim, 40, { noCrit: true, noCombo: true }); }
}
function blastSpecial(s: RaidState, x: number, y: number, r: number, dmg: number, knock: number, extra = 0, cap = 99) {
  s.swings.push({ angle: 0, range: r, arc: 360, t: 0.3, kind: "circle", x, y });
  for (const m of s.monsters) if (m.hp > 0 && dist(m.x, m.y, x, y) < r + m.r && capHit(s, m, cap)) hitMonster(s, m, dmg, Math.atan2(m.y - y, m.x - x), knock, { noCrit: true, noCombo: true, extra });
}
function castSpecial(s: RaidState) {
  const sp = s.special, before = sp.readyAt, ready = Boolean(s.evolution && SPECIALS[s.evolution]) && s.t >= before;
  if (ready) { s.ext.castId++; if (pick(s, "perfect-timing") && s.t - before <= 2) { s.ext.perfectUntil = s.t + 2.5; s.pops.push({ x: s.player.x, y: s.player.y - 62, text: "✨ 완벽한 타이밍!", t: 0.9, kind: "info" }); } }
  withSource("special", () => castSpecialInner(s));
  if (ready && pick(s, "special-shield")) { const p = s.player; p.shield += 15; p.shieldUntil = Math.max(p.shieldUntil, s.t + 4); }
}
function castSpecialInner(s: RaidState) {
  const p = s.player, sp = s.special, evo = s.evolution, w = s.weapon, D = w.damage * (1 + (s.gear.specialDmg ?? 0));
  if (!evo || !SPECIALS[evo]) return;
  if (s.t < sp.readyAt) { sp.bump = s.t; return; }
  sp.readyAt = s.t + SPECIALS[evo].cooldown * Math.max(0.65, 1 - 0.02 * pick(s, "endless-haste") - 0.15 * pick(s, "special-haste") - (s.gear.specialCd ?? 0));
  // 숙련 ★3 잔향: 0.6초 뒤 조준 지점에 작은 폭발
  if (s.gear.specialEcho) { const ex = clamp(p.tx, 20, WORLD_W - 20), ey = clamp(p.ty, 20, WORLD_H - 20), ed = D * 1.2; later(s, 0.6, () => { s.pops.push({ x: ex, y: ey - 30, text: "✨ 잔향", t: 0.5, kind: "info" }); blastSpecial(s, ex, ey, 90, ed, 20); }); } sp.hits = {}; p.swingCd = Math.max(p.swingCd, 0.18);
  const aim = p.aim, tx = clamp(p.tx, 20, WORLD_W - 20), ty = clamp(p.ty, 20, WORLD_H - 20), boss = (m: Monster) => (m.boss ? 0.15 : 0);
  sp.castAt = s.t; sp.castX = tx; sp.castY = ty; sp.castAim = aim;
  s.pops.push({ x: p.x, y: p.y - 46, text: `${SPECIALS[evo].icon} ${SPECIALS[evo].name}`, t: 0.9, kind: "info" });
  switch (evo) {
    case "great-scythe": later(s, 0.15, () => lineHit(s, p.x, p.y, aim, 420, 70, D * 3.2, { noCrit: true }, 0, m => hitMonster(s, m, D * 3.2, aim, m.elite || m.boss ? 0 : 100, { noCrit: true, noCombo: true, extra: m.elite || m.boss ? 0.2 : 0 }))); break;
    case "harvest-blade": sp.moveUntil = s.t + 1.5; sp.moveMul = 1.15; for (let i = 0; i < 6; i++) later(s, 0.25 * i, () => blastSpecial(s, p.x, p.y, 165, D * 0.7, 20, 0, 6)); break;
    case "quake-hammer": s.swings.push({ angle: aim, range: 360, arc: 0, t: 0.3, kind: "line", width: 120, x: p.x, y: p.y }); { const ox = p.x, oy = p.y; later(s, 0.3, () => lineHit(s, ox, oy, aim, 360, 120, D * 2.6, { noCrit: true }, 0, m => { hitMonster(s, m, D * 2.6, aim, 20, { noCrit: true, noCombo: true }); if (!m.boss && !m.elite && m.hp > 0) { m.state = "stun"; m.stateT = 0.8; } })); } break;
    case "rock-crusher": { const d0 = Math.min(240, dist(p.x, p.y, tx, ty)), cx = p.x + Math.cos(aim) * d0, cy = p.y + Math.sin(aim) * d0; for (let i = 0; i < 6; i++) { const a = rnd() * Math.PI * 2, r = rnd() * 60; later(s, 0.12 * i, () => blastSpecial(s, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 50, D, 15, 0, 3)); } break; }
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
      if (others.length) for (const m of others) { s.swings.push({ angle: Math.atan2(m.y - target.y, m.x - target.x), range: dist(m.x, m.y, target.x, target.y), arc: 0, t: 0.25, kind: "line", width: 3, x: target.x, y: target.y }); hitMonster(s, m, D * 1.1, 0, 0, { noCrit: true, noCombo: true }); }
      else if (target.boss) for (let i = 1; i <= 2; i++) later(s, 0.15 * i, () => hitMonster(s, target, D * 0.45, 0, 0, { noCrit: true, noCombo: true }));
      break; }
    case "net-launcher": blastSpecial(s, tx, ty, 60, D * 0.8, 0); zoneAt(s, { kind: "net", x: tx, y: ty, r: 170, t: 4, tele: 0, damage: 0, every: 0, slow: 0.7 }); break;
    case "longbow": sp.moveUntil = s.t + 0.55; sp.moveMul = 0.5; sp.cancelable = true; later(s, 0.55, () => { sp.cancelable = false; fire(s, p.aim, D * 3.8, { left: 999, r: 9, defIgnore: 0.5 } as Partial<Projectile>); }, "cancel"); break;
    case "rapid-bow": for (let i = 0; i < 10; i++) later(s, 0.2 * i, () => { for (const m of s.monsters) if (m.hp > 0 && dist(m.x, m.y, tx, ty) < 135 + m.r && capHit(s, m, 6)) { hitMonster(s, m, D * 0.35, 0, 0, { noCrit: true, noCombo: true }); if (!m.boss) { m.slowUntil = s.t + 0.4; m.slowMul = 0.8; } } s.swings.push({ angle: 0, range: 135, arc: 360, t: 0.15, kind: "circle", x: tx, y: ty }); }); break;
    case "rifle": later(s, 0.1, () => { let k = 0; lineHit(s, p.x, p.y, aim, 700, 30, D * 3.4, { noCrit: true }, 0, m => { if (k >= 6) return; hitMonster(s, m, D * 3.4 * (1 - 0.08 * k), aim, 20, { noCrit: true, noCombo: true, defIgnore: 0.7, extra: boss(m) }); k++; }); }); break;
    case "siege-crossbow": fire(s, aim, D * 2.2, { r: 10, explode: 115, vx: Math.cos(aim) * 420, vy: Math.sin(aim) * 420, siege: true } as Partial<Projectile>); break;
    case "twin-blades": { p.iframes = Math.max(p.iframes, 0.95); const targets = s.monsters.filter(m => m.hp > 0 && dist(m.x, m.y, p.x, p.y) < 260 && angDiff(Math.atan2(m.y - p.y, m.x - p.x), aim) < 1.2).slice(0, 6);
      if (!targets.length) { const o = pushOut(p.x + Math.cos(aim) * 120, p.y + Math.sin(aim) * 120, PLAYER.radius, blockers(s.terrain)); p.x = o.x; p.y = o.y; swingHit(s, aim, 1.2); break; }
      for (let i = 0; i < 6; i++) later(s, 0.15 * i, () => { const m = targets[i % targets.length]; if (!m || m.hp <= 0 || !capHit(s, m, 4)) return; const o = pushOut(m.x - Math.cos(aim) * 24, m.y - Math.sin(aim) * 24, PLAYER.radius, blockers(s.terrain)); if (dist(o.x, o.y, p.x, p.y) < 220) { p.x = o.x; p.y = o.y; } s.swings.push({ angle: aim, range: 60, arc: 120, t: 0.12 }); hitMonster(s, m, D * 1.6, aim, 10, { noCrit: true, noCombo: true }); }); break; }
    case "greatsword": sp.stanceUntil = s.t + 1.2; sp.stanceHit = false; later(s, 1.2, () => { if (!sp.stanceHit) counterBlast(s, false); sp.stanceUntil = 0; }); break;
  }
}

// ---------- 음식 ----------
function useFood(s: RaidState, i: number) {
  const f = s.foods[i];
  if (!f || s.foodUsed[i]) return;
  s.foodUsed[i] = true;
  const expert = pick(s, "food-expert") > 0, base = f.effect.values[f.grade] ?? f.effect.values[0], p = s.player;
  const v = expert && (f.effect.kind === "heal" || f.effect.kind === "regen") ? Math.round(base * 1.25 * 10) / 10 : base, secs = f.effect.seconds * (expert ? 1.2 : 1);
  if (f.effect.kind === "heal") { p.hp = Math.min(p.maxHp, p.hp + v); s.pops.push({ x: p.x, y: p.y - 30, text: `+${v}`, t: 1, kind: "heal" }); return; }
  if (f.effect.kind === "shield") { p.shield += v; p.shieldUntil = s.t + secs; return; }
  s.buffs.push({ kind: f.effect.kind, value: v, until: s.t + secs });
}

// ---------- 각성 ----------
export function choiceContext(s: RaidState) {
  const T = s.terrain;
  return {
    level: s.level, picks: s.picks, maxOf: (id: string) => AWAKENINGS[id]?.max ?? 0, mode: s.weapon.mode, evo: Boolean(s.evolution), pet: Boolean(s.pet),
    food: s.foods.some(Boolean),
    shieldSrc: s.gear.startShield > 0 || s.pet?.id === "battle-turtle" || s.pet?.id === "battle-tiger" || pick(s, "special-shield") + pick(s, "emergency-shield") + pick(s, "pet-guard") > 0 || s.foods.some(f => f?.effect.kind === "shield"),
    slowTerrain: T.mud.length + T.grass.length + T.shallow.length > 0, flowers: T.flowers.length > 0 || Boolean(T.chance),
    auxCount: s.auxes.length, auxLevel: s.auxLevel, random: rnd,
    fx: Object.entries(s.weapon.fx ?? {}).filter(([, v]) => Boolean(v)).map(([k]) => k), reach: s.weapon.range + (s.weapon.radius ?? 0),
  };
}
function offerChoices(s: RaidState) {
  // 53절: 계열·등급·조건·가중치로 3장(Lv.5는 진화 최종 각성 2장 + 고급 이상 공통 1장)
  if (s.level === 5 && s.evolution) {
    const finals = (Object.keys(AWAKENINGS) as AwakenId[]).filter(id => AWAKENINGS[id].final === s.evolution);
    s.choices = [...finals, ...rollChoices(choiceContext(s), 1)].filter(Boolean);
  } else s.choices = rollChoices(choiceContext(s), 3).filter(id => COMMON_AWAKENINGS.includes(id));
  // 유효 카드가 3장보다 적으면 무제한 성장 카드로 채운다(59.2절)
  const fill = ENDLESS_AWAKENINGS.filter(id => pick(s, id) < AWAKENINGS[id].max && !s.choices!.includes(id)).sort(() => rnd() - 0.5);
  while (s.choices.length < 3 && fill.length) s.choices.push(fill.pop()!);
}
export function chooseAwakening(s: RaidState, id: AwakenId) {
  if (!s.choices?.includes(id)) return;
  s.picks[id] = (s.picks[id] ?? 0) + 1;
  if (id === "vitality") { s.player.maxHp += 25; s.player.hp = Math.min(s.player.maxHp, s.player.hp + 25); }
  if (id === "endless-life") { s.player.maxHp += 10; s.player.hp = Math.min(s.player.maxHp, s.player.hp + 10); }
  // 보조무기 획득: 0.8초 미리보기 뒤 자동 전투(62.6)
  if (id in AUX_WEAPONS) { s.auxes.push({ id: id as AuxId, readyAt: s.t + 0.8, spray: null }); if (s.auxes.length === 1) s.auxLevel = s.level; s.pops.push({ x: s.player.x, y: s.player.y - 56, text: `${AUX_WEAPONS[id as AuxId].icon} ${AUX_WEAPONS[id as AuxId].name}!`, t: 1.2, kind: "info" }); s.swings.push({ angle: 0, range: 46, arc: 360, t: 0.8, kind: "circle", x: s.player.x, y: s.player.y }); }
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
function shoot(s: RaidState, m: Monster, spread: number[], speed = 150, damage0 = m.damage) {
  const damage = m.boss ? damage0 : Math.max(1, Math.round(damage0 * MOB_SHOT_DAMAGE)), base = Math.atan2(s.player.y - m.y, s.player.x - m.x);
  for (const off of spread) s.projectiles.push({ x: m.x, y: m.y, vx: Math.cos(base + off) * speed, vy: Math.sin(base + off) * speed, r: 6, damage, life: 6, mine: false, pierce: null });
}
function startCharge(m: Monster, x: number, y: number, tele: number, len = 260) {
  aimAt(m, x, y); m.state = "tele"; m.stateT = tele;
  m.tele = { kind: "line", x: m.x, y: m.y, dx: m.dir.x, dy: m.dir.y, len, width: m.r * 2 };
}
function zoneAt(s: RaidState, z: Omit<Zone, "tick">) { s.zones.push({ src: hitSource, ...z, tick: 0 }); }

function updateMonster(s: RaidState, m: Monster, dt: number) {
  const p = s.player, rate = m.rate;
  m.flash = Math.max(0, m.flash - dt);
  if (m.kvx || m.kvy) { m.x += m.kvx * dt; m.y += m.kvy * dt; const f = Math.exp(-12 * dt); m.kvx *= f; m.kvy *= f; if (Math.abs(m.kvx) + Math.abs(m.kvy) < 4) { m.kvx = 0; m.kvy = 0; } }
  // 상태 진행(예고 → 돌진 → 이동)
  if (m.state === "tele") { m.stateT -= dt; if (m.stateT <= 0) { m.state = "dash"; m.stateT = m.boss === "pollen-boar" ? 1.4 : m.boss === "storm-catfish" ? 1.1 : m.boss === "maple-stag" ? 1.2 : m.boss === "iron-bear" ? 0.9 : 0.6; m.tele = null; } return; }
  if (m.state === "stun") { m.stateT -= dt; if (m.stateT <= 0) m.state = "move"; return; }
  if (m.state === "dash") {
    const sp = m.boss === "pollen-boar" ? 420 : m.boss === "storm-catfish" ? 380 : m.boss === "maple-stag" ? 470 : m.boss === "iron-bear" ? 360 : m.def.kind === "hop" ? 260 : m.def.kind === "eel" ? 360 : m.def.kind === "crab" ? 250 : 320;
    m.x += m.dir.x * sp * dt; m.y += m.dir.y * sp * dt; m.stateT -= dt;
    if (m.boss === "storm-catfish" && Math.random() < dt * 3) zoneAt(s, { kind: "puddle", x: m.x, y: m.y, r: 50, t: 6, tele: 0, damage: 0, every: 0, slow: 0.3 });
    const wall = m.x < m.r || m.x > WORLD_W - m.r || m.y < m.r || m.y > WORLD_H - m.r || blockedAt(s.terrain, m.x, m.y, m.r * 0.6);
    if (wall && m.boss === "pollen-boar") { m.state = "stun"; m.stateT = 1; s.pops.push({ x: m.x, y: m.y - 50, text: "기절!", t: 1, kind: "info" }); }
    else if (wall && m.boss === "iron-bear") { m.state = "move"; exposeBear(s, m); }
    else if (wall && m.script === "dark-colossus") { m.state = "move"; exposeBear(s, m); }
    else if (m.stateT <= 0 || wall) { m.state = "move"; if (m.def.kind === "elite" && !m.boss) zoneAt(s, { kind: "pollen", x: m.x, y: m.y, r: 50, t: 3, tele: 0, damage: 6, every: 0.5, slow: 0.25 }); }
    { const o = pushOut(m.x, m.y, m.r, blockers(s.terrain)); m.x = o.x; m.y = o.y; }
    return;
  }
  if (m.slowUntil <= s.t) { m.slowMul = 1; m.inNet = false; }
  if (m.takenUntil <= s.t) m.takenBonus = 0;
  const slow = (s.zones.some(z => z.kind === "puddle" && z.tele <= 0 && dist(z.x, z.y, m.x, m.y) < z.r) && !m.boss ? 0.85 : 1) * (m.boss ? 1 : slowAt(s.terrain, m.x, m.y, false)) * (m.slowUntil > s.t ? m.slowMul : 1);
  if (m.boss === "pollen-boar") return updatePollenBoar(s, m, dt);
  if (m.boss === "storm-catfish") return updateCatfish(s, m, dt);
  if (m.boss === "maple-stag") return updateMapleStag(s, m, dt);
  if (m.boss === "iron-bear") return updateIronBear(s, m, dt);
  if (m.script) return updateScriptedBoss(s, m, dt);
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
        m.timer = (m.def.kind === "frog" ? 1.8 : 2.2) * MOB_SHOT_INTERVAL;
        if (far < 340 && !segmentHits(s.terrain.walls, m.x, m.y, p.x, p.y)) { if (m.def.kind === "frog") { shoot(s, m, [0], 135); m.shots = 1; m.t2 = 0.15; } else shoot(s, m, [0], 140); }
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

// ---------- 스크립트 보스(21층~, RAID_FLOOR_30_EXPANSION_AUDIT 5장) ----------
/** 패턴: 실행하고 끝날 때까지 걸리는 시간(초)을 돌려준다(예고 포함). */
export type BossPattern = (s: RaidState, m: Monster) => number;
/** 단계: 체력 비율 at 이하에서 사용. gap은 패턴 사이 공백, combo는 한 번에 묶는 최대 패턴 수 */
export type BossPhase = { at: number; patterns: string[]; gap: number; combo: number };
export type BossScript = { phases: BossPhase[]; patterns: Record<string, BossPattern>; speed?: number; /** 매 프레임(방패 회전·과부하 등) */ tick?: (s: RaidState, m: Monster, dt: number) => void };
export const BOSS_SCRIPTS: Record<string, BossScript> = {};
/** 연계 사이 공백(초) */
export const COMBO_GAP = 0.3;

/** 구간 표준 장비 기준 "최대 체력의 몇 %" 피해를 보스 원피해로 바꾼다(방어 비율식 적용 전 값). */
export function bossPct(s: RaidState, pct: number) {
  const f = s.floor.floor, std = f <= 25 ? { hp: 160, def: 9 } : { hp: 175, def: 11 };
  return Math.round(pct * std.hp * (100 + std.def * DEFENSE_K) / 100);
}
/** 방사 탄막: n발을 offset부터 고르게(보스 탄은 원피해 그대로) */
export function radial(s: RaidState, m: Monster, n: number, offset = 0, speed = 170, damage = m.damage) {
  for (let i = 0; i < n; i++) { const a = offset + (i / n) * Math.PI * 2; s.projectiles.push({ x: m.x, y: m.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 7, damage, life: 6, mine: false, pierce: null, boss: Boolean(m.boss || m.clone || m.summoned) }); }
}
export function addHazard(s: RaidState, h: Hazard) { s.hazards.push(h); }

function updateScriptedBoss(s: RaidState, m: Monster, dt: number) {
  const sc = BOSS_SCRIPTS[m.script!], p = s.player;
  if (!sc) return;
  sc.tick?.(s, m, dt);
  const ratio = m.hp / m.maxHp;
  let ph = 0; sc.phases.forEach((phase, i) => { if (ratio <= phase.at) ph = i; });
  if (ph !== (m.phase ?? 0)) {
    // 단계 전환: 1초 무적 연출, 진행 중 위험은 그대로 두고 다음 패턴까지 1.2초
    m.phase = ph; m.invulnUntil = s.t + 1; m.gap = 1.2; s.shake = Math.max(s.shake, 6);
    s.pops.push({ x: m.x, y: m.y - m.r - 30, text: `⚠ ${ph + 1}단계!`, t: 1.4, kind: "info" });
  }
  moveToward(m, p.x, p.y, m.speed * (sc.speed ?? 1), dt, 1);
  m.gap = (m.gap ?? 1.5) - dt;
  if (m.gap > 0) return;
  const phase = sc.phases[ph], pool = phase.patterns.filter(id => id !== m.lastPattern);
  const n = Math.max(1, Math.min(phase.combo, 1 + Math.floor(rnd() * phase.combo)));
  let at = 0;
  for (let i = 0; i < n; i++) {
    const id = (pool.length ? pool : phase.patterns)[Math.floor(rnd() * (pool.length || phase.patterns.length))];
    m.lastPattern = id;
    if (i === 0) at = sc.patterns[id](s, m);
    else { const start = at + COMBO_GAP; later(s, start, () => { if (m.hp > 0) sc.patterns[id](s, m); }); at = start + 1.2; }
  }
  if (n > 1) s.pops.push({ x: m.x, y: m.y - m.r - 18, text: `${n}연계!`, t: 0.8, kind: "info" });
  m.gap = at + phase.gap;
}

/** 50% 아래에서 패턴 간격 −10%(5.4절) */
const enrage = (m: Monster) => (m.hp < m.maxHp * 0.5 ? 0.9 : 1);
/** 15층 단풍 뿔사슴: 분신 돌진(본체 돌진 + 위아래 분신 가로 돌진) · 낙엽 회오리 · 표식 폭발 · 잎새 늑대 소환. 패턴 뒤 0.8초 공백. */
function updateMapleStag(s: RaidState, m: Monster, dt: number) {
  const p = s.player, k = enrage(m);
  moveToward(m, p.x, p.y, m.speed, dt, 1);
  m.timer -= dt; m.t2 -= dt; m.t3 -= dt; m.t4 -= dt; m.gap = (m.gap ?? 0) - dt;
  if (m.gap > 0) return;
  if (m.timer <= 0) {
    m.timer = 7 * k; m.gap = 1.2 + 1.2 + 0.8; startCharge(m, p.x, p.y, 1.0, 560);
    for (const off of [-140, 140]) zoneAt(s, { kind: "line", x: s.cam.x, y: clamp(p.y + off, 40, WORLD_H - 40), r: 24, t: 0.4, tele: 1.3, damage: Math.round(m.damage * 0.8), every: 0, slow: 0, dx: 1, dy: 0, len: ARENA_W, label: "분신 돌진" });
  } else if (m.t2 <= 0) {
    m.t2 = 9 * k; m.gap = 0.7 + 0.8;
    for (let i = 0; i < 3; i++) zoneAt(s, { kind: "leaf", ...nearPlayer(s, 300), r: 65, t: 3.5, tele: 0.7, damage: 7, every: 0.5, slow: 0.3 });
  } else if (m.t3 <= 0) {
    m.t3 = 12 * k; m.gap = 1.1 + 1.2 + 0.8;
    s.pops.push({ x: p.x, y: p.y - 40, text: "🍁 표식!", t: 1, kind: "info" });
    for (let i = 0; i < 3; i++) later(s, 0.6 * i, () => zoneAt(s, { kind: "bolt", x: s.player.x, y: s.player.y, r: 62, t: 0.15, tele: 1.1, damage: 28, every: 0, slow: 0, label: "표식 폭발" }));
  } else if (m.t4 <= 0) {
    m.t4 = 14 * k; m.gap = 0.8; const n = Math.min(2, 6 - summoned(s, "leaf-wolf"));
    for (let i = 0; i < n; i++) spawn(s, "leaf-wolf", { summoned: true }, { x: m.x + (i ? 30 : -30), y: m.y + 20 });
  }
}
/** 20층 설산 철갑곰 약점 노출: 3초간 받는 피해 +20% */
function exposeBear(s: RaidState, m: Monster) {
  m.takenUntil = s.t + 3; m.takenBonus = Math.max(m.takenBonus, 0.2);
  s.pops.push({ x: m.x, y: m.y - 56, text: "약점 노출! 받는 피해 +20%", t: 1.6, kind: "info" });
}
/** 20층 설산 철갑곰: 내려찍기(뒤에 약점 노출) · 빙결 숨결(직선 폭발 + 빙판) · 철갑 방어(4초간 방어 5 → 10) · 서리 광부 소환. */
function updateIronBear(s: RaidState, m: Monster, dt: number) {
  const p = s.player, k = enrage(m), armored = (m.armorUntil ?? 0) > s.t;
  m.defense = armored ? 10 : s.floor.boss.defense;
  moveToward(m, p.x, p.y, m.speed * (armored ? 0.6 : 1), dt, 1);
  m.timer -= dt; m.t2 -= dt; m.t3 -= dt; m.t4 -= dt; m.gap = (m.gap ?? 0) - dt;
  if (m.gap > 0) return;
  if (m.timer <= 0) {
    m.timer = 8 * k; m.gap = 1.3 + 0.8;
    const x = p.x, y = p.y;
    zoneAt(s, { kind: "bolt", x, y, r: 110, t: 0.2, tele: 1.3, damage: m.damage, every: 0, slow: 0, label: "내려찍기" });
    later(s, 1.3, () => { if (m.hp > 0) exposeBear(s, m); });
  } else if (m.t2 <= 0) {
    m.t2 = 10 * k; m.gap = 1.4 + 0.8;
    const a = Math.atan2(p.y - m.y, p.x - m.x);
    for (let i = 1; i <= 4; i++) {
      const x = clamp(m.x + Math.cos(a) * 75 * i, 30, WORLD_W - 30), y = clamp(m.y + Math.sin(a) * 75 * i, 30, WORLD_H - 30);
      zoneAt(s, { kind: "bolt", x, y, r: 52, t: 0.15, tele: 0.9 + 0.1 * i, damage: Math.round(m.damage * 0.55), every: 0, slow: 0, label: "빙결 숨결" });
      zoneAt(s, { kind: "ice", x, y, r: 60, t: 4, tele: 1 + 0.1 * i, damage: 0, every: 0, slow: 0.4 });
    }
  } else if (m.t3 <= 0) {
    m.t3 = 16; m.gap = 0.8; m.armorUntil = s.t + 4;
    s.pops.push({ x: m.x, y: m.y - 56, text: "🛡️ 철갑 방어! (방어 10)", t: 1.6, kind: "info" });
  } else if (m.t4 <= 0) {
    m.t4 = 15 * k; m.gap = 0.8; const n = Math.min(2, 6 - summoned(s, "frost-miner"));
    for (let i = 0; i < n; i++) spawn(s, "frost-miner", { summoned: true }, { x: m.x + (i ? 30 : -30), y: m.y + 20 });
  }
}

// ---------- 21~30층 보스 대본(RAID_FLOOR_30_EXPANSION_AUDIT 5.3·5.4) ----------
// 피해는 bossPct(최대 체력 대비 %)로 정한다. 큰 공격 12~18%, 연계 마지막 15~20%, 한 번에 35%를 넘지 않는다.
// 예고: 큰 공격 1.0초, 작은 공격 0.6초 이상. 동시에 여러 광선에 걸려도 피격 무적(0.6초) 때문에 한 번만 맞는다.
const beamFrom = (s: RaidState, x: number, y: number, angle: number, len: number, width: number, tele: number, pct: number, label: string) =>
  addHazard(s, hazard({ kind: "beam", x, y, angle, len, width, tele, damage: bossPct(s, pct), label }));
const beamCross = (s: RaidState, cx: number, cy: number, angle: number, len: number, width: number, tele: number, pct: number, label: string) =>
  beamFrom(s, cx - Math.cos(angle) * len / 2, cy - Math.sin(angle) * len / 2, angle, len, width, tele, pct, label);
const trackAt = (s: RaidState, x: number, y: number, r: number, tele: number, follow: number, speed: number, pct: number, label: string, root?: number) =>
  addHazard(s, hazard({ kind: "track", x, y, r0: r, tele, followFor: follow || undefined, followSpeed: speed, damage: bossPct(s, pct), label, root }));
const ringAt = (s: RaidState, x: number, y: number, r0: number, r1: number, band: number, tele: number, life: number, pct: number, label: string, gapArc = 0) =>
  addHazard(s, hazard({ kind: "ring", x, y, r0, r1, band, tele, life, damage: bossPct(s, pct), label, gapAt: gapArc ? rnd() * Math.PI * 2 : undefined, gapArc: gapArc || undefined }));
const aimP = (s: RaidState, m: Monster) => Math.atan2(s.player.y - m.y, s.player.x - m.x);
function summonN(s: RaidState, m: Monster, id: string, n: number, opts: Partial<Monster> = {}) {
  const k = Math.min(n, 6 - summoned(s, id));
  for (let i = 0; i < k; i++) { const a = (i / Math.max(1, k)) * Math.PI * 2; spawn(s, id, { summoned: true, ...opts }, { x: clamp(m.x + Math.cos(a) * 60, 40, WORLD_W - 40), y: clamp(m.y + Math.sin(a) * 60, 40, WORLD_H - 40) }); }
}
/** 순간이동: 0.5초 표시 후 이동 */
function blink(s: RaidState, m: Monster, x: number, y: number, after?: () => void) {
  const tx = clamp(x, 60, WORLD_W - 60), ty = clamp(y, 60, WORLD_H - 60);
  s.pops.push({ x: tx, y: ty, text: "💨", t: 0.5, kind: "info" }); s.pops.push({ x: m.x, y: m.y - m.r, text: "💨", t: 0.5, kind: "info" });
  later(s, 0.5, () => { if (m.hp <= 0) return; m.x = tx; m.y = ty; after?.(); });
}
const leafZone = (s: RaidState, at: { x: number; y: number }, label = "포자 구름") => zoneAt(s, { kind: "leaf", ...at, r: 70, t: 4, tele: 0.8, damage: bossPct(s, 0.03), every: 0.5, slow: 0.35, label });

BOSS_SCRIPTS["ancient-lord"] = {
  patterns: {
    roots: (s, m) => { const a = aimP(s, m); for (let k = 0; k < 3; k++) later(s, 0.4 * k, () => beamFrom(s, m.x, m.y, a + (k - 1) * 0.35, 560, 46, 1.0, 0.14, "뿌리 돌출")); return 2.1; },
    seeds: (s, m) => { s.pops.push({ x: m.x, y: m.y - m.r - 10, text: "🌰", t: 0.6, kind: "info" }); later(s, 0.6, () => radial(s, m, 8, rnd() * 6, 170, bossPct(s, 0.08))); return 1.0; },
    sprouts: (s, m) => { summonN(s, m, "ancient-sapling", 2); return 0.6; },
    rootTrack: s => { trackAt(s, s.player.x, s.player.y, 70, 1.7, 1.2, 260, 0.16, "뿌리 추적"); return 1.9; },
  },
  phases: [{ at: 1, patterns: ["roots", "seeds", "sprouts"], gap: 0.6, combo: 1 }, { at: 0.5, patterns: ["roots", "seeds", "sprouts", "rootTrack"], gap: 0.6, combo: 2 }],
};
BOSS_SCRIPTS["hound-alpha"] = {
  speed: 1.2,
  patterns: {
    dash3: (s, m) => { for (let k = 0; k < 3; k++) later(s, 1.0 * k, () => { if (m.hp > 0 && m.state === "move") startCharge(m, s.player.x, s.player.y, 0.6, 430); }); return 3.2; },
    pounce: (s, m) => { const x = s.player.x, y = s.player.y; trackAt(s, x, y, 85, 0.9, 0, 0, 0.15, "도약"); later(s, 0.9, () => { if (m.hp > 0) { m.x = x; m.y = y; } }); return 1.3; },
    howl: (s, m) => { s.pops.push({ x: m.x, y: m.y - m.r - 10, text: "🐺 우우—", t: 0.8, kind: "info" }); summonN(s, m, "root-hound", 2); return 0.7; },
    shockRing: (s, m) => { ringAt(s, m.x, m.y, 30, 380, 34, 0.6, 1.2, 0.12, "충격파", 0.9); return 1.0; },
  },
  phases: [{ at: 1, patterns: ["dash3", "pounce", "howl"], gap: 0.6, combo: 1 }, { at: 0.5, patterns: ["dash3", "pounce", "howl", "shockRing"], gap: 0.6, combo: 2 }],
};
BOSS_SCRIPTS["spore-archmage"] = {
  speed: 0.8,
  patterns: {
    spiral: (s, m) => { const base = rnd() * 6; for (let i = 0; i < 20; i++) later(s, 0.15 * i, () => { if (m.hp > 0) radial(s, m, 2, base + i * 0.35, 160, bossPct(s, 0.07)); }); return 3.2; },
    clouds: s => { for (let i = 0; i < 3; i++) leafZone(s, nearPlayer(s, 300)); return 1.0; },
    blink12: (s, m) => { const a = rnd() * Math.PI * 2; blink(s, m, s.player.x + Math.cos(a) * 240, s.player.y + Math.sin(a) * 240, () => radial(s, m, 12, rnd() * 6, 180, bossPct(s, 0.08))); return 1.3; },
    cloudSpiral: (s, m) => { for (let i = 0; i < 3; i++) leafZone(s, nearPlayer(s, 300)); const base = rnd() * 6; for (let i = 0; i < 20; i++) later(s, 0.8 + 0.15 * i, () => { if (m.hp > 0) radial(s, m, 2, base + i * 0.35, 150, bossPct(s, 0.07)); }); return 3.8; },
  },
  phases: [{ at: 1, patterns: ["spiral", "clouds", "blink12"], gap: 0.6, combo: 1 }, { at: 0.5, patterns: ["spiral", "clouds", "blink12", "cloudSpiral"], gap: 0.6, combo: 2 }],
};
BOSS_SCRIPTS["elder-guardian"] = {
  speed: 0.7,
  tick: (s, m) => { m.defense = s.floor.boss.defense + ((m.armorUntil ?? 0) > s.t ? 6 : 0); },
  patterns: {
    sweep: (s, m) => { const a = aimP(s, m); for (let k = -2; k <= 2; k++) beamFrom(s, m.x, m.y, a + k * 0.3, 270, 70, 1.0, 0.15, "가지 휩쓸기"); return 1.4; },
    leafRain: s => { for (let i = 0; i < 8; i++) { const at = nearPlayer(s, 320); later(s, 0.15 * i, () => trackAt(s, at.x, at.y, 55, 1.0, 0, 0, 0.1, "낙엽 비")); } return 2.3; },
    harden: (s, m) => { m.armorUntil = s.t + 4; s.pops.push({ x: m.x, y: m.y - m.r - 20, text: "🪵 껍질 경화(방어 +6)", t: 1.2, kind: "info" }); return 0.8; },
    prison: s => { trackAt(s, s.player.x, s.player.y, 70, 1.5, 1.0, 280, 0.16, "뿌리 감옥", 1.0); return 1.7; },
  },
  phases: [{ at: 1, patterns: ["sweep", "leafRain", "harden"], gap: 0.6, combo: 1 }, { at: 0.5, patterns: ["sweep", "leafRain", "harden", "prison"], gap: 0.6, combo: 2 }],
};
BOSS_SCRIPTS["forest-guardian"] = {
  speed: 0.75,
  patterns: {
    prison: s => { trackAt(s, s.player.x, s.player.y, 80, 1.0, 0.6, 300, 0.14, "뿌리 감옥", 1.0); return 1.2; },
    barrage: s => { for (let i = 0; i < 5; i++) { const at = nearPlayer(s, 220); later(s, 0.12 * i, () => trackAt(s, at.x, at.y, 42, 0.9, 0, 0, 0.09, "씨앗 포격")); } return 1.5; },
    healers: (s, m) => {
      if ((m.phase ?? 0) >= 2) return 0.1;
      summonN(s, m, "ancient-sapling", 2, { name: "회복 묘목", icon: "🌿", speed: 0, damage: 0, hp: 160, maxHp: 160, xp: 0 });
      later(s, 8, () => { if (m.hp <= 0) return; const n = s.monsters.filter(x => x.hp > 0 && x.name === "회복 묘목").length; if (n) { m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.03 * n); s.pops.push({ x: m.x, y: m.y - m.r - 20, text: `🌿 회복 +${n * 3}%`, t: 1, kind: "heal" }); } });
      return 0.8;
    },
    thornRing: (s, m) => { ringAt(s, m.x, m.y, 430, 40, 36, 1.0, 1.6, 0.13, "가시 고리", 0.9); return 2.0; },
    seasons: (s, m) => {
      s.pops.push({ x: m.x, y: m.y - m.r - 20, text: "🌸 → ☀️ → 🍂 → ❄️", t: 1.5, kind: "info" });
      for (let i = 0; i < 3; i++) leafZone(s, nearPlayer(s, 320), "봄 덩굴");
      later(s, 1.5, () => { if (m.hp > 0) radial(s, m, 12, rnd() * 6, 180, bossPct(s, 0.08)); });
      later(s, 3, () => { for (let i = 0; i < 6; i++) { const at = nearPlayer(s, 300); trackAt(s, at.x, at.y, 55, 1.0, 0, 0, 0.1, "가을 낙엽"); } });
      later(s, 4.5, () => { for (let i = 0; i < 3; i++) zoneAt(s, { kind: "ice", ...nearPlayer(s, 300), r: 70, t: 5, tele: 0.6, damage: 0, every: 0, slow: 0.4 }); });
      return 5.6;
    },
    fury: (s, m) => { ringAt(s, m.x, m.y, 40, 430, 36, 1.0, 1.6, 0.13, "숲의 분노", 0.9); later(s, 0.5, () => ringAt(s, m.x, m.y, 430, 40, 36, 1.0, 1.6, 0.13, "숲의 분노", 0.9)); trackAt(s, s.player.x, s.player.y, 70, 1.7, 1.2, 260, 0.14, "뿌리 추적"); return 2.6; },
  },
  phases: [
    { at: 1, patterns: ["prison", "barrage", "healers", "thornRing"], gap: 0.6, combo: 1 },
    { at: 0.7, patterns: ["prison", "barrage", "healers", "thornRing", "seasons"], gap: 0.6, combo: 2 },
    { at: 0.35, patterns: ["prison", "barrage", "thornRing", "seasons", "fury"], gap: 0.42, combo: 2 },
  ],
};
BOSS_SCRIPTS["shadow-lord"] = {
  patterns: {
    clones: (s, m) => { summonN(s, m, "tower-shadow", 3, { clone: true, name: "그림자 분신", icon: "👤", hp: 1, maxHp: 1, damage: Math.round(m.damage * 0.6), speed: 150, xp: 0 }); return 0.8; },
    crossDash: (s, m) => { const a = rnd() * Math.PI; beamCross(s, s.player.x, s.player.y, a + Math.PI / 4, 760, 50, 1.0, 0.15, "교차 돌진"); beamCross(s, s.player.x, s.player.y, a - Math.PI / 4, 760, 50, 1.0, 0.15, "교차 돌진"); return 1.4; },
    swamp: s => { for (let i = 0; i < 3; i++) zoneAt(s, { kind: "puddle", ...nearPlayer(s, 340), r: 80, t: 6, tele: 0.6, damage: 0, every: 0, slow: 0.35 }); return 0.8; },
    cloneShot: s => { const clones = s.monsters.filter(x => x.hp > 0 && x.clone); for (const c of clones) radial(s, c, 6, rnd() * 6, 170, bossPct(s, 0.07)); return clones.length ? 0.8 : 0.1; },
  },
  phases: [{ at: 1, patterns: ["clones", "crossDash", "swamp"], gap: 0.6, combo: 1 }, { at: 0.5, patterns: ["clones", "crossDash", "swamp", "cloneShot"], gap: 0.6, combo: 2 }],
};
BOSS_SCRIPTS["rift-alpha"] = {
  speed: 1.1,
  patterns: {
    blinkDash: (s, m) => {
      for (let k = 0; k < 4; k++) later(s, 0.9 * k, () => {
        if (m.hp <= 0) return; const a = rnd() * Math.PI * 2;
        m.x = clamp(s.player.x + Math.cos(a) * 260, 60, WORLD_W - 60); m.y = clamp(s.player.y + Math.sin(a) * 260, 60, WORLD_H - 60);
        m.state = "move"; startCharge(m, s.player.x, s.player.y, 0.5, 440);
        zoneAt(s, { kind: "shock", x: m.x, y: m.y, r: 45, t: 3, tele: 0.5, damage: bossPct(s, 0.03), every: 0.5, slow: 0, label: "균열 흔적" });
      });
      return 3.8;
    },
    cut: s => { const x = s.player.x, y = s.player.y; beamCross(s, x, y, Math.PI / 4, 700, 46, 1.0, 0.15, "공간 절단"); beamCross(s, x, y, -Math.PI / 4, 700, 46, 1.0, 0.15, "공간 절단"); later(s, 0.8, () => { beamCross(s, s.player.x, s.player.y, 0, 700, 46, 1.0, 0.15, "공간 절단"); beamCross(s, s.player.x, s.player.y, Math.PI / 2, 700, 46, 1.0, 0.15, "공간 절단"); }); return 2.2; },
    burst: (s, m) => { later(s, 0.5, () => { if (m.hp > 0) radial(s, m, 10, rnd() * 6, 190, bossPct(s, 0.08)); }); return 0.9; },
    cutDash: (s, m) => { const x = s.player.x, y = s.player.y; beamCross(s, x, y, Math.PI / 4, 700, 46, 1.0, 0.15, "공간 절단"); beamCross(s, x, y, -Math.PI / 4, 700, 46, 1.0, 0.15, "공간 절단"); for (let k = 0; k < 2; k++) later(s, 1.2 + 0.9 * k, () => { if (m.hp <= 0) return; const a = rnd() * Math.PI * 2; m.x = clamp(s.player.x + Math.cos(a) * 240, 60, WORLD_W - 60); m.y = clamp(s.player.y + Math.sin(a) * 240, 60, WORLD_H - 60); m.state = "move"; startCharge(m, s.player.x, s.player.y, 0.5, 420); }); return 3.2; },
  },
  phases: [{ at: 1, patterns: ["blinkDash", "cut", "burst"], gap: 0.6, combo: 1 }, { at: 0.5, patterns: ["blinkDash", "cut", "burst", "cutDash"], gap: 0.6, combo: 2 }],
};
BOSS_SCRIPTS["core-commander"] = {
  speed: 0.6,
  patterns: {
    spin: (s, m) => { addHazard(s, hazard({ kind: "spin", x: m.x, y: m.y, angle: aimP(s, m), len: 420, width: 34, tele: 0.8, life: 6, spin: (rnd() < 0.5 ? 1 : -1) * Math.PI / 3.5, every: 0.4, damage: bossPct(s, 0.1), label: "회전 레이저", owner: m.uid })); return 1.5; },
    turrets: (s, m) => { summonN(s, m, "core-sentry", 3, { name: "포탑", icon: "🔺", speed: 0, hp: 150, maxHp: 150, xp: 0 }); return 0.8; },
    snipe: (s, m) => { const fast = s.monsters.some(x => x.hp > 0 && x.name === "포탑"); trackAt(s, s.player.x, s.player.y, 34, fast ? 1.3 : 1.6, fast ? 0.9 : 1.2, 600, 0.2, "조준 저격"); return fast ? 1.5 : 1.8; },
    spin2: (s, m) => { const a = aimP(s, m); for (const dir of [1, -1]) addHazard(s, hazard({ kind: "spin", x: m.x, y: m.y, angle: a + (dir > 0 ? 0 : Math.PI), len: 420, width: 34, tele: 0.8, life: 6, spin: dir * Math.PI / 3.5, every: 0.4, damage: bossPct(s, 0.1), label: "회전 레이저", owner: m.uid })); return 1.5; },
  },
  phases: [{ at: 1, patterns: ["spin", "turrets", "snipe"], gap: 0.6, combo: 1 }, { at: 0.5, patterns: ["spin2", "turrets", "snipe"], gap: 0.6, combo: 2 }],
};
BOSS_SCRIPTS["dark-colossus"] = {
  speed: 0.65,
  /** 정면 방패: 플레이어 쪽으로 천천히 돈다(2단계는 더 빠르게). 정면 피해 −70% */
  tick: (s, m, dt) => { const want = aimP(s, m), cur = m.shieldFacing ?? want, rate = (m.phase ?? 0) >= 1 ? 1.0 : 0.6; let d = Math.atan2(Math.sin(want - cur), Math.cos(want - cur)); d = Math.max(-rate * dt, Math.min(rate * dt, d)); m.shieldFacing = cur + d; },
  patterns: {
    slam3: (s, m) => { const narrow = (m.phase ?? 0) >= 1; for (let k = 0; k < 3; k++) later(s, 0.9 * k, () => { if (m.hp > 0) ringAt(s, m.x, m.y, 40, 420, 34, 0.7, 1.3, 0.12, "지면 강타", narrow ? 0.6 : 0.9); }); return 3.4; },
    charge: (s, m) => { if (m.state === "move") startCharge(m, s.player.x, s.player.y, 0.9, 520); return 1.7; },
    stomp: s => { trackAt(s, s.player.x, s.player.y, 100, 1.0, 0, 0, 0.16, "내려찍기"); return 1.2; },
  },
  phases: [{ at: 1, patterns: ["slam3", "charge", "stomp"], gap: 0.6, combo: 1 }, { at: 0.5, patterns: ["slam3", "charge", "stomp"], gap: 0.5, combo: 2 }],
};
BOSS_SCRIPTS["core-guardian"] = {
  speed: 0.6,
  /** 핵 과부하(체력 20%에서 1회): 안전 통로 2개를 차례로(틈 있는 거대 고리 2개), 피해 최대 체력 40% */
  tick: (s, m) => {
    if (m.overloadDone || m.hp > m.maxHp * 0.2) return;
    m.overloadDone = true; m.gap = Math.max(m.gap ?? 0, 4.5); s.pops.push({ x: m.x, y: m.y - m.r - 30, text: "⚠ 핵 과부하! 초록 틈으로!", t: 2, kind: "info" });
    ringAt(s, m.x, m.y, 0, 1300, 220, 1.5, 1.2, 0.32, "핵 과부하", 0.7); later(s, 2.2, () => { if (m.hp > 0) ringAt(s, m.x, m.y, 0, 1300, 220, 1.5, 1.2, 0.32, "핵 과부하", 0.7); });
  },
  patterns: {
    riftBeams: s => { const a = rnd() * Math.PI; beamCross(s, s.player.x, s.player.y, a, 820, 44, 1.0, 0.15, "균열 광선"); beamCross(s, s.player.x, s.player.y, a + Math.PI / 2.4, 820, 44, 1.0, 0.15, "균열 광선"); return 1.3; },
    spinWall: (s, m) => { addHazard(s, hazard({ kind: "spin", x: m.x, y: m.y, angle: aimP(s, m), len: 300, width: 30, tele: 1.2, life: 8, spin: Math.PI / 4, every: 1, damage: bossPct(s, 0.08), label: "회전 벽", owner: m.uid })); return 1.5; },
    shards: (s, m) => { later(s, 0.4, () => { if (m.hp > 0) radial(s, m, 6, rnd() * 6, 200, bossPct(s, 0.1)); }); later(s, 0.9, () => { if (m.hp > 0) radial(s, m, 6, rnd() * 6, 200, bossPct(s, 0.1)); }); return 1.3; },
    gravity: (s, m) => { s.ext.pullUntil = s.t + 1.5; s.ext.pullX = m.x; s.ext.pullY = m.y; for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + rnd(); trackAt(s, m.x + Math.cos(a) * 110, m.y + Math.sin(a) * 110, 70, 1.2, 0, 0, 0.12, "중력 당김"); } return 1.8; },
    spiral: (s, m) => { const base = rnd() * 6; for (let w = 0; w < 3; w++) later(s, 0.5 * w, () => { if (m.hp > 0) radial(s, m, 16, base + w * 0.2, 170, bossPct(s, 0.07)); }); return 1.6; },
  },
  phases: [
    { at: 1, patterns: ["riftBeams", "spinWall", "shards", "gravity"], gap: 0.6, combo: 1 },
    { at: 0.7, patterns: ["riftBeams", "spinWall", "shards", "gravity", "spiral"], gap: 0.6, combo: 2 },
    { at: 0.35, patterns: ["riftBeams", "spinWall", "shards", "gravity", "spiral"], gap: 0.42, combo: 3 },
  ],
};

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
  } else if (f === 15) {
    if (n === 1) for (let i = 0; i < 4; i++) zoneAt(s, { kind: "leaf", ...nearPlayer(s, 420), r: 65, t: 3.5, tele: 0.7, damage: 7, every: 0.5, slow: 0.3 });
    if (n === 2) zoneAt(s, { kind: "line", x: s.cam.x, y: p.y, r: 28, t: 0.4, tele: 1.2, damage: 30, every: 0, slow: 0, dx: 1, dy: 0, len: ARENA_W, label: "분신 돌진" });
    if (n === 3) for (let i = 0; i < 4; i++) spawn(s, "leaf-wolf");
  } else if (f === 20) {
    if (n === 1) for (let i = 0; i < 5; i++) zoneAt(s, { kind: "ice", ...nearPlayer(s, 640), r: 70, t: 6, tele: 0.5, damage: 0, every: 0, slow: 0.4 });
    if (n === 2) for (let i = 0; i < 3; i++) { const at = nearPlayer(s, 220); zoneAt(s, { kind: "bolt", ...at, r: 70, t: 0.15, tele: 1.1 + i * 0.5, damage: 30, every: 0, slow: 0, label: "내려찍기" }); }
    if (n === 3) for (let i = 0; i < 4; i++) spawn(s, "frost-miner");
  } else {
    const id = s.floor.boss.base ?? s.floor.monsters[0];
    for (let i = 0; i < 4; i++) spawn(s, MONSTERS[id].kind === "elite" || MONSTERS[id].kind === "canal-elite" ? s.floor.monsters[s.floor.monsters.length - 1] : id);
  }
  s.pops.push({ x: s.cam.x + ARENA_W / 2, y: s.cam.y + 60, text: `⚠ ${s.floor.boss.name}의 기척!`, t: 1.8, kind: "info" });
}

// ---------- 전투펫(31절) ----------
function petHit(s: RaidState, m: Monster, raw: number) {
  if (m.hp <= 0) return;
  const dmg = mitigate(raw * (m.markUntil > s.t ? 1.1 : 1), effDefense(s, m));
  m.hp -= dmg; s.dmgBy.pet += dmg; m.flash = 0.1; s.pops.push({ x: m.x, y: m.y - m.r, text: String(dmg), t: 0.5, kind: "hit" });
  if (m.hp <= 0) killMonster(s, m);
}
function updatePet(s: RaidState, dt: number) {
  const pet = s.pet; if (!pet) return;
  const p = s.player, mult = pet.mult * (1 + 0.25 * pick(s, "pet-training")) * (pick(s, "pet-finisher") && s.t - s.ext.specialHitAt <= 2 ? 1.4 : 1);
  // 플레이어 뒤쪽을 따라다닌다.
  const tx = p.x - Math.cos(p.aim) * 34, ty = p.y - Math.sin(p.aim) * 34 - 10;
  pet.x += (tx - pet.x) * Math.min(1, dt * 6); pet.y += (ty - pet.y) * Math.min(1, dt * 6);
  pet.flash = Math.max(0, pet.flash - dt);
  const alive = s.monsters.filter(m => m.hp > 0);
  if (pet.id === "battle-tiger" && !pet.shieldUsed && p.hp > 0 && p.hp <= p.maxHp * 0.3) { pet.shieldUsed = true; p.shield += Math.round(30 * mult); p.shieldUntil = s.t + 60; s.pops.push({ x: p.x, y: p.y - 44, text: "🐯 백호의 가호!", t: 1.2, kind: "info" }); }
  pet.timer -= dt; if (pet.timer > 0) return;
  pet.flash = 0.25;
  if (pick(s, "pet-bond") && s.t - s.ext.petBondAt >= 2 && s.special.readyAt > s.t) { s.ext.petBondAt = s.t; s.special.readyAt -= 0.4; }
  switch (pet.id) {
    case "battle-hedgehog": { pet.timer = 1.4; const near = alive.filter(m => dist(m.x, m.y, pet.x, pet.y) < 220).sort((a, b) => dist(a.x, a.y, pet.x, pet.y) - dist(b.x, b.y, pet.x, pet.y))[0]; if (near) petHit(s, near, 7 * mult); break; }
    case "battle-turtle": pet.timer = 22; if (p.shield < 10 * mult) { p.shield = Math.round(10 * mult); p.shieldUntil = s.t + 22; } break;
    case "battle-sprite": pet.timer = 16; { const v = Math.round(4 * mult); p.hp = Math.min(p.maxHp, p.hp + v); s.pops.push({ x: p.x, y: p.y - 30, text: `+${v}`, t: 0.8, kind: "heal" }); } break;
    case "battle-foxfire": { pet.timer = 8; const target = alive.filter(m => m.markUntil <= s.t).sort((a, b) => b.maxHp - a.maxHp)[0]; if (target) target.markUntil = s.t + 5; break; }
    case "battle-hawk": { pet.timer = 2.2; const strong = [...alive].sort((a, b) => b.hp - a.hp)[0]; if (strong) petHit(s, strong, 16 * mult); break; }
    case "battle-tiger": { pet.timer = 5; for (const m of alive) { const a = Math.atan2(m.y - p.y, m.x - p.x); if (dist(m.x, m.y, p.x, p.y) < 120 + m.r && angDiff(a, p.aim) < Math.PI / 3) petHit(s, m, 28 * mult); } s.swings.push({ angle: p.aim, range: 120, arc: 120, t: 0.18 }); break; }
  }
  // 재빠른 동료: 행동 주기 −18%/중첩, 원래의 65% 아래로는 안 내려감
  if (pick(s, "pet-haste")) pet.timer *= Math.max(0.65, 1 - 0.18 * pick(s, "pet-haste"));
}

// ---------- 자동 보조무기(62절) ----------
const auxVisible = (s: RaidState, m: Monster) => m.x > s.cam.x - 10 && m.x < s.cam.x + ARENA_W + 10 && m.y > s.cam.y - 10 && m.y < s.cam.y + ARENA_H + 10;
function updateAux(s: RaidState) { for (const a of s.auxes) updateOneAux(s, a); }
function updateOneAux(s: RaidState, a: AuxState) {
  const def = AUX_WEAPONS[a.id], p = s.player, power = AUX_POWER * (1 + 0.15 * pick(s, "auxiliary-power")), wide = pick(s, "auxiliary-range") > 0, mastered = pick(s, "auxiliary-mastery") > 0;
  const range = def.range * (wide ? 1.15 : 1), speedMul = wide ? 1.1 : 1, cd = def.cd * Math.max(0.8, 1 - 0.1 * pick(s, "auxiliary-haste"));
  // 스프링클러가 돌고 있으면 1초마다 물(최대 4명, 둔화 10%·보스 절반)
  if (a.spray) {
    if (s.t >= a.spray.until) a.spray = null;
    else if (s.t >= a.spray.next) {
      a.spray.next += 1; const sx = a.spray.x, sy = a.spray.y, slow = mastered ? 0.13 : 0.1;
      s.monsters.filter(m => m.hp > 0 && dist(m.x, m.y, sx, sy) < range + m.r).sort((x, y) => dist(x.x, x.y, sx, sy) - dist(y.x, y.y, sx, sy)).slice(0, 4).forEach(m => {
        flatHit(s, m, def.damage * power, "aux", "aux");
        if (m.hp > 0) { m.slowUntil = s.t + 1.1; m.slowMul = Math.min(m.slowUntil > s.t ? m.slowMul : 1, 1 - slow * (m.boss ? 0.5 : 1)); }
      });
    }
  }
  if (s.t < a.readyAt) return;
  // 화면 밖 적은 조준하지 않는다. 대상이 없으면 발동도 쿨타임 소비도 없다(62.1·62.5).
  const alive = s.monsters.filter(m => m.hp > 0 && auxVisible(s, m));
  const near = alive.filter(m => dist(m.x, m.y, p.x, p.y) < range + m.r).sort((x, y) => dist(x.x, x.y, p.x, p.y) - dist(y.x, y.y, p.x, p.y) || x.hp - y.hp);
  let fired = false;
  withSource("aux", () => {
    switch (a.id) {
      case "aux-slingshot": { const t = near[0]; if (!t) break; const ang = Math.atan2(t.y - p.y, t.x - p.x), v = 520 * speedMul;
        s.projectiles.push({ src: "aux", x: p.x, y: p.y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, r: 5, damage: def.damage * power, life: range / v + 0.4, mine: true, pierce: new Set(), left: 0, homing: t.uid, ricochet: mastered }); fired = true; break; }
      case "aux-hand-sickle": { const t = near[0]; if (!t) break; const ang = Math.atan2(t.y - p.y, t.x - p.x), len = Math.min(range, dist(t.x, t.y, p.x, p.y)) + 40, ox = p.x, oy = p.y, cap = mastered ? 4 : 3;
        const sweep = (dmg: number) => { s.swings.push({ angle: ang, range: len, arc: 0, t: 0.3, kind: "line", width: 12, x: ox, y: oy }); s.monsters.filter(m => m.hp > 0).map(m => ({ m, along: inAim({ x: ox, y: oy }, ang, m, len, 34) })).filter(h => h.along >= 0).sort((x, y) => x.along - y.along).slice(0, cap).forEach(h => flatHit(s, h.m, dmg, "aux", "aux")); };
        sweep(def.damage * power); later(s, 0.35, () => sweep((mastered ? 12 : 8) * power)); fired = true; break; }
      case "aux-seed-bomb": { const cand = alive.filter(m => dist(m.x, m.y, p.x, p.y) < range + m.r); if (!cand.length) break;
        const best = cand.map(m => ({ m, n: cand.filter(o => dist(o.x, o.y, m.x, m.y) < 65 + o.r).length })).sort((x, y) => y.n - x.n || dist(x.m.x, x.m.y, p.x, p.y) - dist(y.m.x, y.m.y, p.x, p.y))[0].m;
        zoneAt(s, { kind: "pbomb", x: best.x, y: best.y, r: 65, t: 0.1, tele: 0.45, damage: def.damage * power, every: 0, slow: 0, mine: { mul: 1, seedChain: mastered }, src: "aux" }); fired = true; break; }
      case "aux-sprinkler": { if (!near.length) break; const dur = mastered ? 5 : 4; a.spray = { x: p.x, y: p.y, until: s.t + dur, next: s.t };
        zoneAt(s, { kind: "spray", x: p.x, y: p.y, r: range, t: dur, tele: 0, damage: 0, every: 0, slow: 0, src: "aux" }); fired = true; break; }
      case "aux-beehive": { const cand = alive.filter(m => dist(m.x, m.y, p.x, p.y) < range + m.r).sort((x, y) => Number(Boolean(y.boss)) - Number(Boolean(x.boss)) || y.hp - x.hp); if (!cand.length) break;
        const bees = mastered ? 4 : 3, v = 300 * speedMul;
        for (let i = 0; i < bees; i++) { const t = cand[i % cand.length], ang = Math.atan2(t.y - p.y, t.x - p.x) + (i - 1) * 0.35;
          s.projectiles.push({ src: "aux", x: p.x, y: p.y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, r: 4, damage: def.damage * power * (t.boss ? 0.7 : 1), life: 2, mine: true, pierce: new Set(), left: 0, homing: t.uid }); }
        fired = true; break; }
      case "aux-scarecrow": { const r0 = range, around = alive.filter(m => dist(m.x, m.y, p.x, p.y) < r0 + m.r); if (around.length < (mastered ? 4 : 5)) break;
        s.swings.push({ angle: 0, range: r0, arc: 360, t: 0.35, kind: "circle", x: p.x, y: p.y });
        around.sort((x, y) => dist(x.x, x.y, p.x, p.y) - dist(y.x, y.y, p.x, p.y)).slice(0, 8).forEach(m => { const ang = Math.atan2(m.y - p.y, m.x - p.x); flatHit(s, m, def.damage * power, "aux", "aux"); if (m.hp > 0 && !m.boss) { m.kvx += Math.cos(ang) * 45 * 12; m.kvy += Math.sin(ang) * 45 * 12; if (!m.elite && m.state === "move") { m.state = "stun"; m.stateT = 0.4; } } });
        if (mastered) { p.shield += 6; p.shieldUntil = Math.max(p.shieldUntil, s.t + 3); }
        fired = true; break; }
    }
  });
  if (fired) a.readyAt = s.t + cd;
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
  const gp = T.gatePeriod ?? 45;
  for (const g of T.gates) if (g.moving && s.t >= g.next) { g.next += gp; }
  if (T.gates.some(g => g.moving)) {
    const cycle = Math.floor(s.t / gp), closedIdx = cycle % T.gates.length;
    T.gates.forEach((g, i) => { g.closed = i === closedIdx; });
  }
  // 심장부 핵 방전 지대(6.2절): 6초마다 1초 예고 뒤 2초간 초당 8 피해, 동시에 최대 2곳(보스전 중 포함)
  if (T.zone === "core" && s.t >= (s.ext.dischargeAt ?? 8)) {
    s.ext.dischargeAt = s.t + 6;
    if (s.zones.filter(z => z.label === "핵 방전").length < 2) { const at = nearPlayer(s, 380); zoneAt(s, { kind: "shock", ...at, r: 70, t: 2, tele: 1, damage: 8, every: 1, slow: 0, label: "핵 방전" }); }
  }
  // 기회 지형: 25~35초마다 자리를 옮긴다.
  if (!T.chance || s.t >= T.chance.next) {
    for (let i = 0; i < 20; i++) {
      const x = 120 + rnd() * (WORLD_W - 240), y = 120 + rnd() * (WORLD_H - 240);
      if (blockedAt(T, x, y, 60) || dist(x, y, p.x, p.y) < 200) continue;
      T.chance = { x, y, r: fieldLike(T) ? 22 : 80, next: s.t + 25 + rnd() * 10, used: false }; break;
    }
  }
  // 수로 기회 지형 "정령 샘": 안에 있으면 초당 체력 2 회복, 전투펫 재사용 진행 +20%
  if (T.chance && !fieldLike(T) && dist(p.x, p.y, T.chance.x, T.chance.y) < T.chance.r) { p.hp = Math.min(p.maxHp, p.hp + 2 * dt); if (s.pet) s.pet.timer -= dt * 0.2; }
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
  if (input.dash && !s.prevDash && p.dashCd <= 0) { p.gale = []; p.dodgeUntil = s.t + PLAYER.dashTime + DODGE_GRACE; s.ext.cut = []; s.dodges++; p.dashT = PLAYER.dashTime * (inMud(s.terrain, p.x, p.y) ? 0.8 : 1); p.dashDir = ml ? { x: mx, y: my } : { x: Math.cos(p.aim), y: Math.sin(p.aim) }; p.dashCd = d.dashCd; }
  s.prevDash = input.dash;

  // 이동(장판 둔화, 공격 중 둔화)
  const inPollen = s.zones.find(z => (z.kind === "pollen" || z.kind === "puddle" || z.kind === "leaf" || z.kind === "ice") && z.tele <= 0 && dist(z.x, z.y, p.x, p.y) < z.r);
  const zoneSlow = inPollen ? inPollen.slow * (inPollen.kind === "ice" ? 1 - (s.gear.freezeResist ?? 0) : 1) : 0; // 설산 투구: 빙판 둔화 감소
  if (p.dashT > 0) {
    const dashSp = PLAYER.dashSpeed * (1 + 0.25 * pick(s, "long-dash"));
    p.dashT -= dt; p.x += p.dashDir.x * dashSp * dt; p.y += p.dashDir.y * dashSp * dt; p.dashBonusUntil = s.t + 1;
    if (pick(s, "cutting-trail")) for (const m of s.monsters) if (m.hp > 0 && !s.ext.cut.includes(m.uid) && dist(m.x, m.y, p.x, p.y) < m.r + 26) { s.ext.cut.push(m.uid); hitMonster(s, m, s.weapon.damage * 0.8, Math.atan2(p.dashDir.y, p.dashDir.x), 10, { noCrit: true, noCombo: true }); }
    if (s.picks["gale-dance"]) for (const m of s.monsters) if (m.hp > 0 && !p.gale.includes(m.uid) && dist(m.x, m.y, p.x, p.y) < m.r + 24) { p.gale.push(m.uid); hitMonster(s, m, s.weapon.damage * 2, Math.atan2(p.dashDir.y, p.dashDir.x), 20, { noCombo: true }); }
  }
  else { const sp = d.speed * (1 - zoneSlow) * ((s.ext.rootUntil ?? 0) > s.t ? 0.1 : 1) * (p.slowUntil > s.t && !s.picks["quick-shot"] ? 1 - (s.weapon.fx?.selfSlow ?? PLAYER.attackSlow) : 1) * (s.special.moveUntil > s.t ? s.special.moveMul : 1) * (pick(s, "terrain-boots") ? 1 - (1 - slowAt(s.terrain, p.x, p.y, true)) * 0.5 : slowAt(s.terrain, p.x, p.y, true)); p.x += mx * sp * dt; p.y += my * sp * dt; }
  if ((s.ext.pullUntil ?? 0) > s.t && p.dashT <= 0) { const dx = (s.ext.pullX ?? p.x) - p.x, dy = (s.ext.pullY ?? p.y) - p.y, dd = Math.hypot(dx, dy) || 1; if (dd > 40) { p.x += (dx / dd) * 110 * dt; p.y += (dy / dd) * 110 * dt; } }
  if (s.ext.wasDashing && p.dashT <= 0 && pick(s, "long-dash")) s.ext.dashBoostUntil = s.t + 1;
  s.ext.wasDashing = p.dashT > 0;
  { const o = pushOut(p.x, p.y, PLAYER.radius, blockers(s.terrain)); p.x = o.x; p.y = o.y; }
  updateWorld(s, dt);
  // 꾸준한 회복: 20초마다 체력 5(중첩마다)
  if (pick(s, "steady-recovery") && s.t >= s.ext.regenAt) { s.ext.regenAt = s.t + 15; const v = Math.round(p.maxHp * 0.03) * pick(s, "steady-recovery"); p.hp = Math.min(p.maxHp, p.hp + v); s.pops.push({ x: p.x, y: p.y - 30, text: `+${v}`, t: 0.8, kind: "heal" }); }
  s.shake = Math.max(0, s.shake - dt * 30); s.xpFlash = Math.max(0, s.xpFlash - dt);
  // 지속 회복 음식(약초 고기찜): 초당 체력 회복
  for (const b of s.buffs) if (b.kind === "regen" && b.until > s.t && s.player.hp > 0) s.player.hp = Math.min(s.player.maxHp, s.player.hp + b.value * dt);
  // 예약된 특수 공격 타격
  if (s.actions.length) { const due = s.actions.filter(x => x.at <= s.t); s.actions = s.actions.filter(x => x.at > s.t); for (const x of due) withSource(x.src, x.run); }

  // 공격: 누르고 있으면 간격마다 휘두른다. 시작 0.12초 뒤 판정.
  p.swingCd = Math.max(0, p.swingCd - dt);
  p.still = ml ? 0 : p.still + dt;
  const channel = s.weapon.mode === "channel" || s.weapon.mode === "beam";
  if (channel) {
    // 물뿌리개: 누르는 동안 틱마다 맞힌다.
    if (input.attack || AUTO_ATTACK) { p.holdT += dt; p.tick -= dt; if (p.tick <= 0) { p.tick = d.interval; channelTick(s); } } else { p.holdT = 0; p.tick = 0; }
    if (s.picks.tsunami) { p.periodic -= dt; if (p.periodic <= 0) { p.periodic = 6; s.projectiles.push({ x: p.x, y: p.y, vx: Math.cos(p.aim) * 600, vy: Math.sin(p.aim) * 600, r: 40, damage: s.weapon.damage * 10, life: 1.6, mine: true, pierce: new Set(), left: 999, wave: true }); } }
  } else {
    // 공격: 누르고 있으면 간격마다. 시작 0.12초 뒤 판정.
    if ((input.attack || AUTO_ATTACK) && p.swingCd <= 0 && p.windup < 0) { p.windup = 0.12; p.swingCd = d.interval * (s.picks["quick-shot"] ? 0.85 : 1); }
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
      const et = floorBand(s.floor.floor).eliteTime;
      if (e.every) { warnElite(s); s.elitesPlaced++; s.nextElite = s.elitesPlaced < ELITE_AT.length ? ELITE_AT[s.elitesPlaced] * et : s.nextElite + e.every * et; }
      else if (s.elitesPlaced < (e.count ?? 0)) { warnElite(s); s.elitesPlaced++; s.nextElite = ELITE_AT[Math.min(ELITE_AT.length - 1, s.elitesPlaced)] * et + (s.elitesPlaced >= ELITE_AT.length ? 9999 : 0); }
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
  for (const m of s.monsters) if (m.hp > 0 && dist(m.x, m.y, p.x, p.y) < m.r + PLAYER.radius) {
    const took = hurtPlayer(s, m.state === "dash" && m.boss ? m.damage + 8 : m.damage, m.name, Boolean(m.boss));
    // 가시 갑옷: 부딪힌 적에게 20(보스 절반), 0.5초마다
    if (took && pick(s, "thorn-armor") && s.t - s.ext.thornAt >= 0.5) { s.ext.thornAt = s.t; flatHit(s, m, Math.max(20, s.weapon.damage * 0.6) * pick(s, "thorn-armor") * (m.boss ? 0.5 : 1), "basic"); }
  }
  updateAux(s);

  // 투사체
  for (const pr of s.projectiles) {
    hitSource = pr.src ?? "basic";
    if (pr.homing !== undefined) { const tg = s.monsters.find(m => m.uid === pr.homing && m.hp > 0); if (tg) { const sp0 = Math.hypot(pr.vx, pr.vy) || 1, a = Math.atan2(tg.y - pr.y, tg.x - pr.x); pr.vx = Math.cos(a) * sp0; pr.vy = Math.sin(a) * sp0; } }
    const w = windAt(s.terrain, pr.x, pr.y), sp = Math.hypot(pr.vx, pr.vy) || 1, along = w ? (pr.vx * w.dx + pr.vy * w.dy) / sp : 0, k = along > 0.5 ? 1.2 : along < -0.5 ? 0.85 : 1;
    const nx = pr.x + pr.vx * dt * k, ny = pr.y + pr.vy * dt * k;
    if (segmentHits(s.terrain.walls, pr.x, pr.y, nx, ny)) { if (pr.mine && pr.siege) blastSpecial(s, pr.x, pr.y, pr.explode ?? 115, pr.damage / 2.2 * 1.4, 90); pr.life = 0; continue; }
    pr.x = nx; pr.y = ny; pr.life -= dt;
    if (pr.mine) {
      for (const m of s.monsters) {
        if (pr.debris || m.hp <= 0 || pr.pierce!.has(m.uid) || dist(pr.x, pr.y, m.x, m.y) >= pr.r + m.r || pr.life <= 0) continue;
        pr.pierce!.add(m.uid);
        if (pr.src === "aux") {
          flatHit(s, m, pr.damage * (m.boss && pr.homing !== undefined && !pr.ricochet ? 1 : 1), "aux", "aux"); pr.life = 0;
          // 농가의 잔재주(새총): 120px 안 다른 적 1명에게 40% 도탄
          if (pr.ricochet) { const o = s.monsters.find(t => t.hp > 0 && t !== m && dist(t.x, t.y, m.x, m.y) < 120); if (o) { s.swings.push({ angle: Math.atan2(o.y - m.y, o.x - m.x), range: dist(o.x, o.y, m.x, m.y), arc: 0, t: 0.2, kind: "line", width: 3, x: m.x, y: m.y }); flatHit(s, o, pr.damage * 0.4, "aux", "aux"); } }
          continue;
        }
        const far = s.weapon.fx?.far && pr.ox !== undefined && dist(pr.ox, pr.oy!, m.x, m.y) >= 250 ? 1.25 : 1;
        const farSp = pr.defIgnore && pr.ox !== undefined && dist(pr.ox, pr.oy!, m.x, m.y) >= 300 ? 1.25 : 1;
        hitMonster(s, m, pr.damage * far * farSp, Math.atan2(pr.vy, pr.vx), pr.wave ? 0 : s.weapon.knockback * knockMul(s), { ignoreDef: pr.ignoreDef, noCombo: pr.wave, defIgnore: pr.defIgnore, noCrit: Boolean(pr.defIgnore || pr.siege) });
        if (pr.siege) { blastSpecial(s, m.x, m.y, pr.explode ?? 115, pr.damage / 2.2 * 1.4, 90); pr.life = 0; continue; }
        if (pr.explode) { blastAt(s, m.x, m.y, pr.explode, pr.damage * 0.6); if (s.picks["chain-blast"]) blastAt(s, m.x, m.y, pr.explode, pr.damage * 0.6); if (s.picks.shrapnel) for (let i = 0; i < 4; i++) { const a = rnd() * Math.PI * 2; blastAt(s, m.x + Math.cos(a) * 50, m.y + Math.sin(a) * 50, 16, pr.damage * 0.35, 8); } }
        if (!pr.wave) { if ((pr.left ?? 0) > 0) pr.left = (pr.left ?? 0) - 1; else pr.life = 0; }
      }
    }
    else if (dist(pr.x, pr.y, p.x, p.y) < pr.r + PLAYER.radius) { const dodging = p.dashT > 0 || s.t < p.dodgeUntil; hurtPlayer(s, pr.damage, pr.boss ? "보스 탄막" : "투사체", Boolean(pr.boss)); if (!dodging) pr.life = 0; } // 회피 중에는 탄이 몸을 통과한다
    if (pr.x < -50 || pr.x > WORLD_W + 50 || pr.y < -50 || pr.y > WORLD_H + 50) pr.life = 0;
  }
  hitSource = "basic";
  s.projectiles = s.projectiles.filter(pr => pr.life > 0);

  // 보스 전투 요소: 회전 광선은 주인(보스)을 따라가고, 주인이 죽으면 사라진다
  if (s.hazards.length) {
    for (const h of s.hazards) {
      const owner = h.owner !== undefined ? s.monsters.find(m => m.uid === h.owner && m.hp > 0) : undefined;
      if (h.owner !== undefined && !owner) { h.age = h.tele + h.life + 1; continue; }
      const dmg = stepHazard(h, dt, p.x, p.y, PLAYER.radius, h.kind === "spin" ? owner : undefined);
      if (dmg > 0 && hurtPlayer(s, dmg, h.label, true) && h.root) { s.ext.rootUntil = s.t + h.root; s.pops.push({ x: p.x, y: p.y - 40, text: "🌿 속박!", t: 0.8, kind: "info" }); }
    }
    s.hazards = s.hazards.filter(h => !hazardDone(h));
  }

  // 장판·예고
  for (const z of s.zones) {
    hitSource = z.src ?? "basic";
    if (z.tele > 0) { z.tele -= dt; if (z.tele <= 0 && (z.kind === "bolt" || z.kind === "line" || z.kind === "tshock" || z.kind === "pbomb" || z.kind === "rain")) {
      const inside = z.kind === "line" ? Math.abs(p.y - z.y) < z.r && p.x > z.x && p.x < z.x + (z.len ?? ARENA_W) : dist(z.x, z.y, p.x, p.y) < z.r;
      if (inside && !z.mine && z.kind !== "tshock") hurtPlayer(s, z.damage, z.label ?? (z.kind === "line" ? "돌진 예고" : "번개"), Boolean(z.label));
      if (z.kind === "bolt") for (const w of s.terrain.puddles) if (dist(w.x, w.y, z.x, z.y) < w.r + z.r) zoneAt(s, { kind: "tshock", x: w.x, y: w.y, r: w.r, t: 0.3, tele: 0.5, damage: z.damage, every: 0, slow: 0 });
      if (z.kind === "pbomb" && z.mine && z.src === "aux") {
        // 톡톡 씨앗탄: 최대 5명, 잔재주면 2초 싹 장판(초당 2)
        s.swings.push({ angle: 0, range: z.r, arc: 360, t: 0.25, kind: "circle", x: z.x, y: z.y });
        s.monsters.filter(m => m.hp > 0 && dist(m.x, m.y, z.x, z.y) < z.r + m.r).sort((a, b) => dist(a.x, a.y, z.x, z.y) - dist(b.x, b.y, z.x, z.y)).slice(0, 5).forEach(m => flatHit(s, m, z.damage, "aux", "aux"));
        if (z.mine.seedChain) zoneAt(s, { kind: "poison", x: z.x, y: z.y, r: z.r * 0.8, t: 2, tele: 0, damage: 2, every: 1, slow: 0, src: "aux" });
      } else if (z.kind === "pbomb" && z.mine) {
        blastAt(s, z.x, z.y, z.r, z.damage);
        if (z.mine.poison) { const old = s.zones.find(o => o.kind === "poison" && dist(o.x, o.y, z.x, z.y) < 20); const linger = 3 + 1.5 * pick(s, "lingering"); if (old) old.t = linger; else zoneAt(s, { kind: "poison", x: z.x, y: z.y, r: z.r, t: linger, tele: 0, damage: z.damage * 0.3 * (s.picks["plague-field"] ? 1.5 : 1), every: 1, slow: 0, mine: { mul: 1 } }); }
        if (z.mine.seedChain && s.picks["chain-sprout"] && rnd() < 0.3) zoneAt(s, { kind: "pbomb", x: z.x + (rnd() - 0.5) * 70, y: z.y + (rnd() - 0.5) * 70, r: z.r, t: 0.1, tele: 0.35, damage: z.damage, every: 0, slow: 0, mine: { mul: 1 } });
      }
      if (z.kind === "rain" && z.mine) blastAt(s, z.x, z.y, z.r, z.damage, 10);
      if (z.kind === "tshock") { if (dist(z.x, z.y, p.x, p.y) < z.r) hurtPlayer(s, Math.round(z.damage * 0.5), "전도성 웅덩이"); for (const m of s.monsters) if (m.hp > 0 && dist(m.x, m.y, z.x, z.y) < z.r + m.r) { m.hp -= mitigate(z.damage, m.defense); m.flash = 0.1; if (m.hp <= 0) killMonster(s, m); } }
      if (z.kind === "bolt") for (const w of s.zones) if (w.kind === "puddle" && w.tele <= 0 && dist(w.x, w.y, z.x, z.y) < w.r + z.r) zoneAt(s, { kind: "shock", x: w.x, y: w.y, r: w.r, t: 0.5, tele: 0, damage: 12, every: 0.5, slow: 0 });
    } continue; }
    z.t -= dt;
    if (z.kind === "frost") continue;
    if (z.kind === "poison") { z.tick -= dt; if (z.tick <= 0) { z.tick = 1; if (z.damage > 0) for (const m of s.monsters) if (m.hp > 0 && dist(m.x, m.y, z.x, z.y) < z.r + m.r) hitMonster(s, m, z.damage, 0, 0, { noCombo: true }); } continue; }
    if (z.kind === "net") { for (const m of s.monsters) if (m.hp > 0) { const inside = dist(m.x, m.y, z.x, z.y) < z.r + m.r; if (inside) { m.inNet = true; m.slowUntil = s.t + 0.1; m.slowMul = 0.5; m.takenUntil = s.t + 0.1; m.takenBonus = Math.max(m.takenBonus, m.boss ? 0.08 : 0.15); } } continue; }
    if (z.mine) continue;
    if (z.damage && z.every && dist(z.x, z.y, p.x, p.y) < z.r) { z.tick -= dt; if (z.tick <= 0) { z.tick = z.every; hurtPlayer(s, z.damage, z.label ?? (z.kind === "pollen" ? "꽃가루 장판" : z.kind === "leaf" ? "낙엽 회오리" : "감전")); } }
  }
  hitSource = "basic";
  s.zones = s.zones.filter(z => z.tele > 0 || z.t > 0);

  // 경험치 구슬
  for (const o of s.orbs) {
    o.age += dt; o.px = o.x; o.py = o.y;
    // 0.22초 동안 튀어나가며 감속, 그 뒤 점점 빨라지며 빨려 든다(보이는 속도 300 → 1,600px/s)
    if (o.vx !== undefined && o.age < 0.22) { o.x += o.vx * dt; o.y += (o.vy ?? 0) * dt; o.vx *= 0.9; o.vy = (o.vy ?? 0) * 0.9; }
    const r = dist(o.x, o.y, p.x, p.y);
    if ((r < d.absorb || o.age > ORB_AUTO) && o.age >= 0.22) { const v = Math.min(ORB_PULL * 1.35, 300 + (o.age - 0.22) * 2600), k = Math.min(1, (v * dt) / Math.max(1, r)); o.x += (p.x - o.x) * k; o.y += (p.y - o.y) * k; }
    if (dist(o.x, o.y, p.x, p.y) < PLAYER.radius + 8) {
      if (o.heal) { p.hp = Math.min(p.maxHp, p.hp + o.heal); s.pops.push({ x: p.x, y: p.y - 30, text: `🍖 +${o.heal}`, t: 0.8, kind: "heal" }); }
      else { s.xp += o.xp * (1 + (s.gear.xpGain ?? 0)); s.xpFlash = 0.18; s.sfx.xp++; burst(s, p.x + (rnd() - 0.5) * 10, p.y + (rnd() - 0.5) * 10, 2, "#9dffc0", 120); }
      o.xp = 0;
    }
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

export type RaidResult = { floor: number; cleared: boolean; kills: number; usedFoods: number[]; bossHpLeft: number; hpLeft: number; level: number; reason: string[]; abandoned?: boolean;
  /** 판 기록(훈련장 제외). 무기·장비 정보는 화면 쪽에서 더한다. */
  log?: Pick<RaidRunLog, "floor" | "cleared" | "level" | "picks" | "auxes" | "dmg" | "taken" | "waveEndHp" | "bossTime" | "kills" | "dodges" | "time" | "input" | "bossHits"> };
export function raidResult(s: RaidState): RaidResult {
  const usedFoods = s.foodUsed.map((u, i) => (u ? i : -1)).filter(i => i >= 0);
  const reason: string[] = [];
  if (s.over === "dead") reason.push("생존 부족");
  if (s.over === "timeout") reason.push("화력 부족");
  if (s.over !== "clear" && s.foods.some((f, i) => f && !s.foodUsed[i])) reason.push("음식 미사용");
  if (s.over !== "clear" && s.level < 5) reason.push("각성 지연");
  const round = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => [k, Math.round(v)]));
  const log = s.floor.training ? undefined : {
    floor: s.floor.floor, cleared: s.over === "clear", level: s.level, picks: Object.entries(s.picks).filter(([, n]) => (n ?? 0) > 0).map(([id, n]) => ((n ?? 0) > 1 ? `${id}×${n}` : id)),
    auxes: s.auxes.map(a => a.id), dmg: round(s.dmgBy), taken: round(s.damageTaken), waveEndHp: s.waveEndHp, bossTime: s.bossSpawned ? Math.round(s.t - BOSS_AT) : null,
    kills: s.kills, dodges: s.dodges, time: Math.round(s.t), input: s.input, bossHits: s.bossHits ?? 0,
  };
  return { floor: s.floor.floor, cleared: s.over === "clear", kills: s.kills, usedFoods, bossHpLeft: s.bossSpawned ? s.bossHpAtEnd : 1, hpLeft: s.player.hp / s.player.maxHp, level: s.level, reason, log };
}

// ---------- 각성 카드 수치 미리보기 ----------
const fmtN = (v: number, d = 0) => (Math.round(v * 10 ** d) / 10 ** d).toString();
/** 카드를 하나 더 고르면 바뀌는 대표 수치("사거리 110 → 134"). 행동형 카드는 null. */
export function previewCard(s: RaidState, id: string): string | null {
  const next: RaidState = { ...s, picks: { ...s.picks, [id]: (s.picks[id] ?? 0) + 1 } };
  const a = derived(s), b = derived(next), w = s.weapon;
  const ch = (label: string, x: number, y: number, unit = "", d = 0) => (fmtN(x, d) === fmtN(y, d) ? null : `${label} ${fmtN(x, d)}${unit} → ${fmtN(y, d)}${unit}`);
  switch (id) {
    case "long-handle": case "sweeping-edge": case "slam-reach": case "spray-length": case "throw-range": case "line-reach": case "shot-range":
      return ch(w.mode === "slam" ? "충격 거리" : w.mode === "lob" ? "투척 거리" : "사거리", w.range * reachMul(s), w.range * reachMul(next));
    case "impact-radius": case "blast-radius": return ch("반경", (w.radius ?? 50) * areaMul(s), (w.radius ?? 50) * areaMul(next));
    case "wide-arc": return ch("공격각", a.arc, b.arc, "°");
    case "spray-width": return w.mode === "beam" ? ch("물줄기 폭", (w.width ?? 22) * (1 + 0.3 * pick(s, id)), (w.width ?? 22) * (1 + 0.3 * pick(next, id))) : ch("분사각", w.angle + 15 * pick(s, id), w.angle + 15 * pick(next, id), "°");
    case "quick-grip": case "spray-tick": case "gun-rate": case "endless-haste": return ch("공격 간격", a.interval, b.interval, "초", 2);
    case "keen-edge": case "endless-edge": return ch("기본 공격 피해", w.damage * a.damageMul, w.damage * b.damageMul, "", 1);
    case "critical-eye": return ch("치명타", a.crit * 100, b.crit * 100, "%");
    case "critical-force": return ch("치명타 피해", (PLAYER.critMul + 0.25 * pick(s, id)) * 100, (PLAYER.critMul + 0.25 * pick(next, id)) * 100, "%");
    case "wind-step": case "pressure-runner": return ch("이동속도", a.speed, b.speed);
    case "quick-dash": return ch("회피 재사용", a.dashCd, b.dashCd, "초", 1);
    case "hard-leather": case "close-instinct": return ch("받는 피해 감소", (1 - 100 / (100 + a.armor * DEFENSE_K)) * 100, (1 - 100 / (100 + b.armor * DEFENSE_K)) * 100, "%");
    case "vitality": return ch("최대 체력", s.player.maxHp, s.player.maxHp + 25);
    case "endless-life": return ch("최대 체력", s.player.maxHp, s.player.maxHp + 10);
    case "shot-speed": return ch("탄속", (w.speed ?? 600) * (1 + 0.25 * pick(s, id)), (w.speed ?? 600) * (1 + 0.25 * pick(next, id)));
    case "pierce-shot": return ch("관통", (w.fx?.pierce ?? 0) + pick(s, id), (w.fx?.pierce ?? 0) + pick(next, id), "명");
    case "pierce-line": return ch("낚싯줄 관통", pick(s, id), pick(next, id), "명");
    case "extra-pellet": return w.mode === "spread" ? ch("산탄 수", (w.pellets ?? 5) + pick(s, id), (w.pellets ?? 5) + pick(next, id), "발") : ch("추가 탄", pick(s, id), pick(next, id), "발");
    case "tight-spread": return ch("산탄 퍼짐", w.angle * (1 - 0.25 * pick(s, id)), w.angle * (1 - 0.25 * pick(next, id)), "°");
    case "special-haste": return s.evolution && SPECIALS[s.evolution] ? ch("특수 재사용", SPECIALS[s.evolution].cooldown * Math.max(0.65, 1 - 0.02 * pick(s, "endless-haste") - 0.15 * pick(s, id)), SPECIALS[s.evolution].cooldown * Math.max(0.65, 1 - 0.02 * pick(s, "endless-haste") - 0.15 * pick(next, id)), "초", 1) : null;
    default: return null;
  }
}
