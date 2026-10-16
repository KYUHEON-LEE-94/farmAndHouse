import { TEST_MODE } from "../testMode";
import { GACHA_LEGEND_CHANCE, GACHA_PRICE, GACHA_RARE_CHANCE } from "../house";
/**
 * 탑 토벌 데이터(HUNTING_RAID.md 23~31절, raidBalanceVersion 1). 첫 구현은 1~10층.
 * 모든 거리는 논리 해상도 960×540 기준 px, 시간은 초.
 */
export const RAID_RELEASED = true;
export const RAID_ENABLED = RAID_RELEASED || TEST_MODE;
export const RAID_BALANCE_VERSION = 4; // raid-30: 방어 비율식 + 1~20층 보스 체력 보정(6~10층 ×0.87, 11~20층 ×0.82) + 약한 진화 상향
// 이전: 2: 2026-10-16 1~10층 곡선 복구·구간 상향(RAID_FLOOR_20_EXPANSION_AUDIT 5절) · 3: 같은 날 11~20층 개방
/** 층 구간 배율: 일반 몹 체력, 정예 체력, 정예 등장 간격(작을수록 자주). 1~3층은 유지. */
export function floorBand(floor: number) {
  if (floor >= 11) return { fodder: 1, elite: 1, eliteTime: 1 }; // 11층부터는 층 표 자체가 상위 수치
  if (floor >= 8) return { fodder: 1.1, elite: 1.12, eliteTime: 0.9 };
  if (floor >= 6) return { fodder: 1.07, elite: 1.1, eliteTime: 0.95 };
  if (floor >= 4) return { fodder: 1.05, elite: 1.08, eliteTime: 0.95 };
  return { fodder: 1, elite: 1, eliteTime: 1 };
}
export const RAID_MAX_FLOOR = 30; // raid-30 브랜치: 21~30층(보통 구간 1차). 운영 공개 전(승인 필요)

export const ARENA_W = 960, ARENA_H = 540;
/** 2분 고밀도 웨이브 + 제한 없는 보스전(59절). FLOOR_SECONDS는 훈련장 외에는 쓰지 않는다(보스전 시간 초과 없음). */
export const FLOOR_SECONDS = 0, BOSS_AT = 120;
/** 쾌속(2026-10-15): 일반 몹 체력 배율, 일반 몹 투사체 피해 배율·발사 간격 배율, 보조무기 칸·피해 배율 */
export const FODDER_HP = 0.5, MOB_SHOT_DAMAGE = 0.6, MOB_SHOT_INTERVAL = 1.5, AUX_SLOTS = 3, AUX_POWER = 5;
/** 생성량 ×1.6, 최대 동시 수 ×1.25(올림), 일반 몬스터 이동속도 +15%(빠른 적 제외), 간접 개입 0:30·1:00·1:30, 정예 40초·80초, 보스전 20초마다 소환. */
export const SPAWN_MUL = 2.5, MAX_ALIVE_MUL = 1.9, NORMAL_SPEED_MUL = 1.15, INTERVENTION_AT = [30, 60, 90], ELITE_AT = [40, 80], BOSS_SUMMON_EVERY = 20;

// ---------- 플레이어 ----------
export const PLAYER = { radius: 14, hp: 100, speed: 250, iframes: 0.6, dashCooldown: 2.4, dashTime: 0.16, dashSpeed: 720, critChance: 0.05, critMul: 1.5, absorb: 520, attackSlow: 0 };

// ---------- 무기: 토벌 낫(23절) ----------
import { RAID_WEAPONS, raidWeaponStats, type WeaponStats } from "./weapons";
export type { WeaponStats };
/** 진화 id(무기마다 두 갈래). */
export type Evolution = string;
/** 모든 무기의 진화 이름·설명·+10/+15 수치. */
export const EVOLUTIONS: Record<string, { name: string; note: string; weapon: string; stats: WeaponStats[] }> = Object.fromEntries(RAID_WEAPONS.flatMap(w => w.evos.map(e => [e.id, { name: e.name, note: e.note, weapon: w.id, stats: [e.s10, e.s15] }])));
export function weaponStats(enhancement: number, evolution: Evolution | null, weaponId = "raid-scythe"): WeaponStats {
  return raidWeaponStats(weaponId, enhancement, evolution);
}

// ---------- 몬스터(24절) ----------
export type MonsterKind = "chase" | "hop" | "ranged" | "charge" | "elite" | "slime" | "eel" | "frog" | "crab" | "canal-elite";
export type MonsterDef = { id: string; name: string; icon: string; kind: MonsterKind; hp: number; damage: number; defense: number; speed: number; radius: number; xp: number };
export const MONSTERS: Record<string, MonsterDef> = {
  "pollen-mite": { id: "pollen-mite", name: "꽃가루 진드기", icon: "🐞", kind: "chase", hp: 20, damage: 8, defense: 0, speed: 52, radius: 12, xp: 1 },
  "thorn-rabbit": { id: "thorn-rabbit", name: "가시 토끼", icon: "🐇", kind: "hop", hp: 28, damage: 10, defense: 0, speed: 88, radius: 13, xp: 1 },
  "spore-bee": { id: "spore-bee", name: "포자 벌", icon: "🐝", kind: "ranged", hp: 24, damage: 9, defense: 0, speed: 58, radius: 12, xp: 1 },
  boarling: { id: "boarling", name: "새끼 멧돼지", icon: "🐗", kind: "charge", hp: 58, damage: 15, defense: 2, speed: 48, radius: 16, xp: 2 },
  "field-brute": { id: "field-brute", name: "들판 난폭종", icon: "🦬", kind: "elite", hp: 180, damage: 20, defense: 3, speed: 44, radius: 24, xp: 12 },
  "moss-slime": { id: "moss-slime", name: "수로 이끼괴물", icon: "🟢", kind: "slime", hp: 42, damage: 12, defense: 1, speed: 48, radius: 14, xp: 1 },
  "shock-eel": { id: "shock-eel", name: "전기 뱀장어", icon: "⚡", kind: "eel", hp: 38, damage: 14, defense: 0, speed: 82, radius: 13, xp: 1 },
  "dart-frog": { id: "dart-frog", name: "물총 개구리", icon: "🐸", kind: "frog", hp: 46, damage: 14, defense: 1, speed: 52, radius: 13, xp: 1 },
  "shell-crab": { id: "shell-crab", name: "껍질 게", icon: "🦀", kind: "crab", hp: 95, damage: 17, defense: 5, speed: 34, radius: 17, xp: 2 },
  "canal-elite": { id: "canal-elite", name: "수로 포식자", icon: "🐊", kind: "canal-elite", hp: 300, damage: 25, defense: 4, speed: 55, radius: 24, xp: 12 },
  // 11~15층 단풍 미궁(9.1절 원본값: 일반 몹 체력은 엔진이 ×0.5)
  "maple-goblin": { id: "maple-goblin", name: "단풍 도깨비", icon: "👹", kind: "chase", hp: 72, damage: 16, defense: 1, speed: 56, radius: 13, xp: 1 },
  "leaf-wolf": { id: "leaf-wolf", name: "잎새 늑대", icon: "🐺", kind: "hop", hp: 58, damage: 18, defense: 0, speed: 94, radius: 13, xp: 1 },
  "lantern-crow": { id: "lantern-crow", name: "등불 까마귀", icon: "🐦‍⬛", kind: "ranged", hp: 65, damage: 17, defense: 0, speed: 62, radius: 12, xp: 1 },
  "bark-golem": { id: "bark-golem", name: "나무껍질 골렘", icon: "🪵", kind: "crab", hp: 135, damage: 21, defense: 4, speed: 36, radius: 18, xp: 2 },
  "maze-keeper": { id: "maze-keeper", name: "미궁지기", icon: "👺", kind: "elite", hp: 440, damage: 30, defense: 5, speed: 46, radius: 25, xp: 12 },
  // 16~20층 서리 광산
  "frost-miner": { id: "frost-miner", name: "서리 광부", icon: "🥶", kind: "chase", hp: 105, damage: 20, defense: 2, speed: 56, radius: 14, xp: 1 },
  "ice-bat": { id: "ice-bat", name: "얼음 박쥐", icon: "🦇", kind: "eel", hp: 82, damage: 22, defense: 0, speed: 88, radius: 12, xp: 1 },
  "icicle-sprite": { id: "icicle-sprite", name: "고드름 정령", icon: "❄️", kind: "frog", hp: 92, damage: 21, defense: 1, speed: 54, radius: 13, xp: 1 },
  "ice-golem": { id: "ice-golem", name: "빙갑 골렘", icon: "🧊", kind: "crab", hp: 190, damage: 26, defense: 5, speed: 32, radius: 19, xp: 2 },
  // 21~25층 고대 숲(보통 구간, RAID_FLOOR_30_EXPANSION_AUDIT 4.1)
  "ancient-sapling": { id: "ancient-sapling", name: "고대 묘목", icon: "🌱", kind: "chase", hp: 125, damage: 24, defense: 2, speed: 55, radius: 14, xp: 1 },
  "root-hound": { id: "root-hound", name: "뿌리 사냥개", icon: "🐕", kind: "hop", hp: 100, damage: 27, defense: 1, speed: 96, radius: 13, xp: 1 },
  "spore-shaman": { id: "spore-shaman", name: "포자 주술사", icon: "🍄", kind: "ranged", hp: 110, damage: 25, defense: 1, speed: 58, radius: 13, xp: 1 },
  "guardian-tree": { id: "guardian-tree", name: "수호목", icon: "🌳", kind: "crab", hp: 230, damage: 31, defense: 7, speed: 34, radius: 20, xp: 2 },
  "forest-executor": { id: "forest-executor", name: "숲의 집행자", icon: "🪓", kind: "elite", hp: 720, damage: 40, defense: 9, speed: 48, radius: 26, xp: 12 },
  // 26~30층 탑의 심장부(4.2)
  "tower-shadow": { id: "tower-shadow", name: "탑의 그림자", icon: "👤", kind: "chase", hp: 170, damage: 29, defense: 3, speed: 60, radius: 14, xp: 1 },
  "rift-stalker": { id: "rift-stalker", name: "균열 추적자", icon: "🌀", kind: "eel", hp: 135, damage: 32, defense: 2, speed: 100, radius: 13, xp: 1 },
  "core-sentry": { id: "core-sentry", name: "핵 파수꾼", icon: "🔆", kind: "frog", hp: 145, damage: 30, defense: 2, speed: 60, radius: 13, xp: 1 },
  "dark-armor": { id: "dark-armor", name: "암흑 갑주", icon: "🛡️", kind: "crab", hp: 320, damage: 37, defense: 9, speed: 36, radius: 20, xp: 2 },
  "heart-warden": { id: "heart-warden", name: "심장부 감시자", icon: "👁️", kind: "canal-elite", hp: 1000, damage: 48, defense: 11, speed: 50, radius: 27, xp: 12 },
  "mine-warden": { id: "mine-warden", name: "광산 감시자", icon: "🗿", kind: "canal-elite", hp: 620, damage: 36, defense: 7, speed: 50, radius: 26, xp: 12 },
};

// ---------- 층(24절 웨이브) ----------
export type BossDef = { id: string; name: string; icon: string; hp: number; damage: number; defense: number; base?: string };
export type FloorDef = {
  floor: number; zone: string; monsters: string[]; spawnRate: number; maxAlive: number;
  /** 정예: 시작 시 고정 수(엘리트 버전 몬스터) 또는 주기(초)마다 1마리. */
  elite: { id: string; hp: number; count?: number; every?: number } | null;
  boss: BossDef;
  /** 판 길이(초, 기본 300). 훈련장은 60. */
  duration?: number;
  /** 진화 훈련장: 보스·간접 개입 없음, 체력이 1 아래로 내려가지 않는다. */
  training?: boolean;
};
const z1 = "꽃가루 들판", z2 = "침수된 수로", z3 = "단풍 미궁", z4 = "서리 광산", z5 = "고대 숲", z6 = "탑의 심장부";
export const FLOORS: FloorDef[] = [
  { floor: 1, zone: z1, monsters: ["pollen-mite"], spawnRate: 0.8, maxAlive: 16, elite: null, boss: { id: "mini", name: "강화 진드기", icon: "🐞", hp: 300, damage: 10, defense: 0, base: "pollen-mite" } },
  { floor: 2, zone: z1, monsters: ["pollen-mite", "thorn-rabbit"], spawnRate: 1.0, maxAlive: 20, elite: { id: "thorn-rabbit", hp: 220, count: 2 }, boss: { id: "mini", name: "토끼 정예", icon: "🐇", hp: 520, damage: 12, defense: 0, base: "thorn-rabbit" } },
  { floor: 3, zone: z1, monsters: ["pollen-mite", "thorn-rabbit", "spore-bee"], spawnRate: 1.15, maxAlive: 23, elite: { id: "spore-bee", hp: 260, count: 2 }, boss: { id: "mini", name: "포자 여왕", icon: "🐝", hp: 750, damage: 14, defense: 0, base: "spore-bee" } },
  { floor: 4, zone: z1, monsters: ["pollen-mite", "thorn-rabbit", "spore-bee", "boarling"], spawnRate: 1.3, maxAlive: 26, elite: { id: "field-brute", hp: 180, every: 30 }, boss: { id: "mini", name: "난폭종 우두머리", icon: "🦬", hp: 1100, damage: 17, defense: 3, base: "field-brute" } },
  { floor: 5, zone: z1, monsters: ["pollen-mite", "thorn-rabbit", "spore-bee", "boarling"], spawnRate: 1.4, maxAlive: 28, elite: { id: "field-brute", hp: 180, every: 25 }, boss: { id: "pollen-boar", name: "꽃가루 멧돼지", icon: "🐗", hp: 1850, damage: 20, defense: 3 } },
  { floor: 6, zone: z2, monsters: ["moss-slime"], spawnRate: 1.05, maxAlive: 22, elite: null, boss: { id: "mini", name: "거대 이끼괴물", icon: "🟢", hp: 1700, damage: 21, defense: 1, base: "moss-slime" } },
  { floor: 7, zone: z2, monsters: ["moss-slime", "shock-eel"], spawnRate: 1.1, maxAlive: 21, elite: { id: "shock-eel", hp: 350, count: 2 }, boss: { id: "mini", name: "전기 뱀장어 우두머리", icon: "⚡", hp: 1830, damage: 23, defense: 0, base: "shock-eel" } },
  { floor: 8, zone: z2, monsters: ["moss-slime", "shock-eel", "dart-frog"], spawnRate: 1.25, maxAlive: 24, elite: { id: "dart-frog", hp: 400, count: 2 }, boss: { id: "mini", name: "물총 개구리왕", icon: "🐸", hp: 2000, damage: 25, defense: 1, base: "dart-frog" } },
  { floor: 9, zone: z2, monsters: ["moss-slime", "shock-eel", "dart-frog", "shell-crab"], spawnRate: 1.35, maxAlive: 27, elite: { id: "canal-elite", hp: 300, every: 30 }, boss: { id: "mini", name: "수로 포식자 우두머리", icon: "🐊", hp: 2220, damage: 27, defense: 4, base: "canal-elite" } },
  { floor: 10, zone: z2, monsters: ["moss-slime", "shock-eel", "dart-frog", "shell-crab"], spawnRate: 1.5, maxAlive: 30, elite: { id: "canal-elite", hp: 300, every: 25 }, boss: { id: "storm-catfish", name: "폭풍 메기왕", icon: "🐟", hp: 2780, damage: 32, defense: 4 } },
  // 11~20층(9.2절: 구간 첫 층 생성 -15%, 다섯째 층 +10%, 정예 28초·26초 주기)
  { floor: 11, zone: z3, monsters: ["maple-goblin", "leaf-wolf"], spawnRate: 1.15, maxAlive: 30, elite: { id: "maze-keeper", hp: 440, count: 2 }, boss: { id: "mini", name: "도깨비 두목", icon: "👹", hp: 2380, damage: 30, defense: 2, base: "maple-goblin" } },
  { floor: 12, zone: z3, monsters: ["maple-goblin", "leaf-wolf", "lantern-crow"], spawnRate: 1.35, maxAlive: 30, elite: { id: "maze-keeper", hp: 440, every: 28 }, boss: { id: "mini", name: "늑대 우두머리", icon: "🐺", hp: 2540, damage: 31, defense: 1, base: "leaf-wolf" } },
  { floor: 13, zone: z3, monsters: ["maple-goblin", "leaf-wolf", "lantern-crow", "bark-golem"], spawnRate: 1.45, maxAlive: 30, elite: { id: "maze-keeper", hp: 440, every: 28 }, boss: { id: "mini", name: "등불 까마귀 여왕", icon: "🐦‍⬛", hp: 2710, damage: 32, defense: 1, base: "lantern-crow" } },
  { floor: 14, zone: z3, monsters: ["maple-goblin", "leaf-wolf", "lantern-crow", "bark-golem"], spawnRate: 1.55, maxAlive: 30, elite: { id: "maze-keeper", hp: 440, every: 28 }, boss: { id: "mini", name: "고목 골렘", icon: "🪵", hp: 2870, damage: 33, defense: 6, base: "bark-golem" } },
  { floor: 15, zone: z3, monsters: ["maple-goblin", "leaf-wolf", "lantern-crow", "bark-golem"], spawnRate: 1.7, maxAlive: 30, elite: { id: "maze-keeper", hp: 440, every: 28 }, boss: { id: "maple-stag", name: "단풍 뿔사슴", icon: "🦌", hp: 3440, damage: 34, defense: 6 } },
  { floor: 16, zone: z4, monsters: ["frost-miner", "ice-bat"], spawnRate: 1.25, maxAlive: 32, elite: { id: "mine-warden", hp: 620, count: 2 }, boss: { id: "mini", name: "서리 광부 반장", icon: "🥶", hp: 3200, damage: 36, defense: 3, base: "frost-miner" } },
  { floor: 17, zone: z4, monsters: ["frost-miner", "ice-bat", "icicle-sprite"], spawnRate: 1.45, maxAlive: 32, elite: { id: "mine-warden", hp: 620, every: 26 }, boss: { id: "mini", name: "얼음 박쥐 군주", icon: "🦇", hp: 3440, damage: 37, defense: 1, base: "ice-bat" } },
  { floor: 18, zone: z4, monsters: ["frost-miner", "ice-bat", "icicle-sprite", "ice-golem"], spawnRate: 1.55, maxAlive: 32, elite: { id: "mine-warden", hp: 620, every: 26 }, boss: { id: "mini", name: "고드름 대정령", icon: "❄️", hp: 3690, damage: 38, defense: 2, base: "icicle-sprite" } },
  { floor: 19, zone: z4, monsters: ["frost-miner", "ice-bat", "icicle-sprite", "ice-golem"], spawnRate: 1.65, maxAlive: 32, elite: { id: "mine-warden", hp: 620, every: 26 }, boss: { id: "mini", name: "빙갑 거신", icon: "🧊", hp: 3940, damage: 40, defense: 8, base: "ice-golem" } },
  { floor: 20, zone: z4, monsters: ["frost-miner", "ice-bat", "icicle-sprite", "ice-golem"], spawnRate: 1.85, maxAlive: 32, elite: { id: "mine-warden", hp: 620, every: 26 }, boss: { id: "iron-bear", name: "설산 철갑곰", icon: "🐻‍❄️", hp: 4920, damage: 42, defense: 5 } },
  // 21~30층(보통 구간 1차, 4.3절). 보스는 모두 스크립트 보스(5장): id = BOSS_SCRIPTS 키
  { floor: 21, zone: z5, monsters: ["ancient-sapling", "root-hound"], spawnRate: 1.45, maxAlive: 34, elite: { id: "forest-executor", hp: 720, count: 2 }, boss: { id: "ancient-lord", name: "고대 묘목 군주", icon: "🌲", hp: 6500, damage: 45, defense: 4, base: "ancient-sapling" } },
  { floor: 22, zone: z5, monsters: ["ancient-sapling", "root-hound", "spore-shaman"], spawnRate: 1.6, maxAlive: 34, elite: { id: "forest-executor", hp: 720, every: 24 }, boss: { id: "hound-alpha", name: "뿌리 사냥개 우두머리", icon: "🐺", hp: 7000, damage: 46, defense: 2, base: "root-hound" } },
  { floor: 23, zone: z5, monsters: ["ancient-sapling", "root-hound", "spore-shaman", "guardian-tree"], spawnRate: 1.75, maxAlive: 35, elite: { id: "forest-executor", hp: 720, every: 24 }, boss: { id: "spore-archmage", name: "포자 대주술사", icon: "🧙", hp: 7600, damage: 47, defense: 3, base: "spore-shaman" } },
  { floor: 24, zone: z5, monsters: ["ancient-sapling", "root-hound", "spore-shaman", "guardian-tree"], spawnRate: 1.9, maxAlive: 35, elite: { id: "forest-executor", hp: 720, every: 24 }, boss: { id: "elder-guardian", name: "천년 수호목", icon: "🌳", hp: 8300, damage: 49, defense: 11, base: "guardian-tree" } },
  { floor: 25, zone: z5, monsters: ["ancient-sapling", "root-hound", "spore-shaman", "guardian-tree"], spawnRate: 1.85, maxAlive: 36, elite: { id: "forest-executor", hp: 720, every: 24 }, boss: { id: "forest-guardian", name: "고대 숲 수호자", icon: "🦌", hp: 9300, damage: 52, defense: 12, base: "guardian-tree" } },
  { floor: 26, zone: z6, monsters: ["tower-shadow", "rift-stalker"], spawnRate: 1.75, maxAlive: 36, elite: { id: "heart-warden", hp: 1000, count: 2 }, boss: { id: "shadow-lord", name: "그림자 군주", icon: "👤", hp: 10500, damage: 52, defense: 5, base: "tower-shadow" } },
  { floor: 27, zone: z6, monsters: ["tower-shadow", "rift-stalker", "core-sentry"], spawnRate: 1.9, maxAlive: 36, elite: { id: "heart-warden", hp: 1000, every: 22 }, boss: { id: "rift-alpha", name: "균열 추적자 우두머리", icon: "🌀", hp: 11500, damage: 54, defense: 3, base: "rift-stalker" } },
  { floor: 28, zone: z6, monsters: ["tower-shadow", "rift-stalker", "core-sentry", "dark-armor"], spawnRate: 2.05, maxAlive: 37, elite: { id: "heart-warden", hp: 1000, every: 22 }, boss: { id: "core-commander", name: "핵 파수꾼 지휘체", icon: "🔆", hp: 12750, damage: 56, defense: 4, base: "core-sentry" } },
  { floor: 29, zone: z6, monsters: ["tower-shadow", "rift-stalker", "core-sentry", "dark-armor"], spawnRate: 2.2, maxAlive: 37, elite: { id: "heart-warden", hp: 1000, every: 22 }, boss: { id: "dark-colossus", name: "암흑 갑주 거신", icon: "🗿", hp: 14250, damage: 58, defense: 13, base: "dark-armor" } },
  { floor: 30, zone: z6, monsters: ["tower-shadow", "rift-stalker", "core-sentry", "dark-armor"], spawnRate: 2.1, maxAlive: 38, elite: { id: "heart-warden", hp: 1000, every: 22 }, boss: { id: "core-guardian", name: "탑의 핵 수호자", icon: "💠", hp: 16500, damage: 62, defense: 14, base: "heart-warden" } },
];
/** 층 구역(지형·색): 1~5 들판, 6~10 수로, 11~15 단풍, 16~20 서리, 21~25 고대 숲, 26~30 탑의 심장부 */
export type Zone = "field" | "canal" | "maple" | "frost" | "ancient" | "core";
export const zoneOf = (floor: number): Zone => floor <= 5 ? "field" : floor <= 10 ? "canal" : floor <= 15 ? "maple" : floor <= 20 ? "frost" : floor <= 25 ? "ancient" : "core";
/** 난이도 구간(3.0절): 1~20 쉬움, 21~50 보통, 51~ 어려움 */
export const tierOf = (floor: number): "easy" | "normal" | "hard" => floor <= 20 ? "easy" : floor <= 50 ? "normal" : "hard";
export const TIER_NAME = { easy: "쉬움", normal: "보통", hard: "어려움" } as const;

// ---------- 전투 각성(25절) ----------
export const AWAKEN_XP = [0, 8, 20, 36, 56]; // Lv.1~5 누적(59절). Lv.6부터는 xpForLevel.
export const AWAKEN_GUARANTEE = [{ at: 55, level: 3 }, { at: 95, level: 4 }];
/** 줍지 않은 경험치 구슬 전역 자동 흡수(초), 흡수 반경 안 끌림 속도(59.3절). */
export const ORB_AUTO = 0.3, ORB_PULL = 1200;
/** 그 레벨이 되는 데 필요한 누적 경험치. Lv.6부터 다음 레벨까지 45 + 12 × (레벨 − 5). */
export function xpForLevel(level: number) {
  if (level <= 5) return AWAKEN_XP[Math.max(0, level - 1)];
  let xp = AWAKEN_XP[4];
  for (let l = 5; l < level; l++) xp += 24 + 6 * (l - 5);
  return xp;
}
/** 유효 카드가 모자랄 때 채우는 무제한 성장 카드(59.2절). */
export const ENDLESS_AWAKENINGS = ["endless-edge", "endless-life", "endless-haste"];
export type AwakenId = string;
export const AWAKENINGS: Record<string, { name: string; text: string; max: number; final?: Evolution }> = {
  "keen-edge": { name: "날 세우기", text: "주무기 피해 +22%", max: 2 },
  "quick-grip": { name: "빠른 손잡이", text: "공격 간격 −14%", max: 2 },
  "long-handle": { name: "자루 연장", text: "베기 사거리 +22%, 공격각 +10°", max: 2 },
  "heavy-swing": { name: "묵직한 휘두르기", text: "밀어내기 +50%, 정예 피해 +12%", max: 1 },
  "double-cut": { name: "이중 베기", text: "세 번째 공격마다 55% 피해로 한 번 더", max: 1 },
  vitality: { name: "활력", text: "최대 체력 +25, 즉시 25 회복", max: 2 },
  "hard-leather": { name: "단단한 가죽", text: "방어 +2(방어 1마다 받는 피해 약 −7%)", max: 2 },
  "wind-step": { name: "바람걸음", text: "이동속도 +12%", max: 2 },
  "quick-dash": { name: "빠른 회피", text: "회피 대시 재사용시간 −18%", max: 2 },
  "emergency-shield": { name: "비상 보호막", text: "체력 30% 이하가 되면 보호막 25(판당 1회)", max: 1 },
  "pet-training": { name: "전투펫 훈련", text: "전투펫 피해·회복·보호막 +25%", max: 2 },
  eclipse: { name: "월식 참격", text: "네 번째 공격마다 화면 끝까지 가는 180% 참격", max: 1, final: "great-scythe" },
  executioner: { name: "처형자", text: "체력 20% 이하 일반 적 즉사, 보스 피해 +25%", max: 1, final: "great-scythe" },
  "harvest-storm": { name: "수확 폭풍", text: "다섯 번째 공격이 2초 동안 0.25초마다 주변 공격", max: 1, final: "harvest-blade" },
  "chain-harvest": { name: "연쇄 수확", text: "적 처치 시 35% 확률로 추가 회전(초당 최대 2회)", max: 1, final: "harvest-blade" },
  // 48.2절 무기별 Lv.5 최종 각성(일부는 근사, HUNTING_RAID.md 53절)
  "earth-split": { name: "대지 가르기", text: "세 번째 지진의 반지름이 160px로", max: 1, final: "quake-hammer" },
  topple: { name: "무너뜨리기", text: "경직된 적이 받는 피해 +30%", max: 1, final: "quake-hammer" },
  "rock-rain": { name: "돌 소나기", text: "파편 6개", max: 1, final: "rock-crusher" },
  "crush-combo": { name: "분쇄 연타", text: "같은 적을 연속으로 치면 피해 +8%씩(최대 5중첩)", max: 1, final: "rock-crusher" },
  tsunami: { name: "해일", text: "6초마다 앞으로 거대한 물결(물줄기 1.5초분 피해)", max: 1, final: "water-cannon" },
  "hydro-focus": { name: "수압 집중", text: "1초 이상 계속 쏘면 피해 +40%", max: 1, final: "water-cannon" },
  permafrost: { name: "영구 동토", text: "빙결이 주변 60px로 번짐", max: 1, final: "frost-sprayer" },
  "frost-veil": { name: "서리 장막", text: "뿌리는 동안 받는 피해 −25%", max: 1, final: "frost-sprayer" },
  "plague-field": { name: "역병 들판", text: "독 장판 피해 ×1.5", max: 1, final: "toxic-sprayer" },
  "manure-blast": { name: "거름 폭발", text: "독 장판에서 적이 죽으면 작은 폭발(40%)", max: 1, final: "toxic-sprayer" },
  "chain-sprout": { name: "연쇄 발아", text: "폭발한 자리에서 30% 확률로 씨앗 1개 추가", max: 1, final: "seed-launcher" },
  "giant-seed": { name: "대왕 씨앗", text: "다섯 번째 투척은 반지름·피해 2배", max: 1, final: "seed-launcher" },
  "sea-god": { name: "해신의 일격", text: "네 번째 찌르기는 길이 2배·피해 200%", max: 1, final: "trident" },
  "vital-pierce": { name: "급소 꿰기", text: "치명타가 보스 방어를 무시", max: 1, final: "trident" },
  gather: { name: "끌어모으기", text: "최대 3마리를 끌어옴", max: 1, final: "chain-harpoon" },
  "chain-spin": { name: "사슬 회전", text: "다섯 번째마다 몸 주변 120px 회전 공격", max: 1, final: "chain-harpoon" },
  thundercloud: { name: "뇌운", text: "다섯 번째 던지기마다 화면의 적 5마리에 번개", max: 1, final: "thunder-rod" },
  "big-catch": { name: "대어 낚기", text: "보스를 맞힐 때마다 피해 +3%씩(최대 30%)", max: 1, final: "thunder-rod" },
  trawl: { name: "저인망", text: "그물 반지름 2배", max: 1, final: "net-launcher" },
  "full-haul": { name: "만선", text: "그물 속 적이 죽으면 경험치 +50%", max: 1, final: "net-launcher" },
  "pierce-snipe": { name: "관통 저격", text: "다섯 번째 화살은 무한 관통·250% 피해", max: 1, final: "longbow" },
  "weak-aim": { name: "약점 조준", text: "정예·보스 치명타 확률 +20%", max: 1, final: "longbow" },
  "arrow-rain": { name: "화살비", text: "6초마다 커서 주변 반지름 90에 화살비(200%)", max: 1, final: "rapid-bow" },
  "quick-shot": { name: "속사", text: "공격속도 +15%, 쏘는 동안 이동 감속 없음", max: 1, final: "rapid-bow" },
  "ap-round": { name: "철갑탄", text: "세 번째 탄마다 보스 방어 무시", max: 1, final: "rifle" },
  marksman: { name: "명사수", text: "움직이지 않을 때 피해 +25%", max: 1, final: "rifle" },
  "chain-blast": { name: "연쇄 폭발", text: "폭발이 한 번 더", max: 1, final: "siege-crossbow" },
  shrapnel: { name: "파편탄", text: "폭발 시 파편 4개(35%)", max: 1, final: "siege-crossbow" },
  "gale-dance": { name: "질풍 난무", text: "회피 대시 경로의 적에게 200% 피해", max: 1, final: "twin-blades" },
  "vital-stab": { name: "급소 찌르기", text: "치명타 피해 200%", max: 1, final: "twin-blades" },
  "whirl-slash": { name: "회오리 베기", text: "네 번째마다 360° 베기", max: 1, final: "greatsword" },
  "iron-wall": { name: "철벽", text: "보스에게 맞는 피해 50% 감소(1초마다 1회)", max: 1, final: "greatsword" },
  // WEAPON_CARD_UI_DESIGN_SPEC: 공격 방식 전용 카드
  "wide-arc": { name: "베기 각도", text: "베기 공격각 +25°", max: 2 },
  "impact-radius": { name: "충격 반경", text: "내려찍기 충격 반경 +15%", max: 2 },
  "slam-reach": { name: "내려찍기 거리", text: "충격 지점까지 거리 +22%", max: 2 },
  aftershock: { name: "여진", text: "내려찍은 자리에 0.35초 뒤 55% 2차 충격", max: 1 },
  "stun-slam": { name: "경직", text: "충격에 맞은 적 경직(일반 0.5초·정예 0.3초, 이미 경직이면 +0.3초)", max: 1 },
  "spray-length": { name: "분사 길이", text: "분사 길이 +20%", max: 2 },
  "spray-width": { name: "분사 폭", text: "분사 각도 +15° · 물대포 폭 +30%", max: 2 },
  "spray-tick": { name: "틱 속도", text: "분사 틱 간격 −12%", max: 2 },
  "focus-spray": { name: "집중 피해", text: "같은 적을 1초 이상 계속 맞히면 피해 +25%", max: 1 },
  "throw-range": { name: "투척 거리", text: "최대 투척 거리 +25%", max: 2 },
  "blast-radius": { name: "폭발 반경", text: "폭발 반경 +15%", max: 2 },
  "extra-bomb": { name: "추가 투사체", text: "던질 때마다 작은 폭탄 1개 더(50%)", max: 1 },
  lingering: { name: "장판 지속시간", text: "독 장판 지속시간 +1.5초", max: 2 },
  "line-reach": { name: "찌르기 길이", text: "찌르기·낚싯줄 길이 +22%, 폭 +20%", max: 2 },
  "pierce-line": { name: "관통", text: "낚싯줄이 1명 더 꿰뚫어 맞힘", max: 2 },
  "line-double": { name: "2차 타격", text: "세 번째 공격마다 같은 줄에 55% 2차 타격", max: 1 },
  "chain-target": { name: "연쇄 대상", text: "맞힌 적 주변 1명에게 50% 연쇄", max: 1 },
  "shot-range": { name: "사거리", text: "투사체 사거리 +25%", max: 2 },
  "shot-speed": { name: "탄속", text: "투사체 속도 +25%", max: 2 },
  "multi-shot": { name: "다중 발사", text: "세 번째 공격마다 양옆으로 50% 2발 더", max: 1 },
  "pierce-shot": { name: "관통", text: "투사체가 1명 더 관통", max: 2 },
  "gun-rate": { name: "발사 간격", text: "발사 간격 −10%", max: 2 },
  "extra-pellet": { name: "추가 탄환", text: "산탄 +1발 · 소총은 옆으로 50% 1발", max: 2 },
  "power-round": { name: "주기적 강화탄", text: "네 번째 발사마다 피해 +60%", max: 1 },
  "tight-spread": { name: "집탄", text: "산탄 퍼짐 −25%, 산탄 피해 +8%", max: 2 },
  // 53절 확장 카드
  "critical-eye": { name: "매의 눈", text: "치명타 확률 +8%p", max: 2 },
  "critical-force": { name: "치명상", text: "치명타 피해 150% → 175%(2중첩 200%)", max: 2 },
  "boss-hunter": { name: "거인 사냥꾼", text: "정예·보스 피해 +15%", max: 2 },
  "close-instinct": { name: "근접 본능", text: "110px 안의 적 피해 +18%, 방어 +1", max: 1 },
  "keep-distance": { name: "거리 유지", text: "260px 이상 떨어진 적 피해 +18%", max: 1 },
  "battle-tempo": { name: "전투 박자", text: "처치 시 5초간 공격 간격 −3%(최대 5중첩)", max: 1 },
  "armor-crack": { name: "갑옷 균열", text: "기본 공격 10%로 5초간 적 방어 −1(최대 3)", max: 1 },
  "first-strike": { name: "선제타격", text: "체력 90% 이상인 적에게 첫 타격 피해 +40%", max: 1 },
  "focused-swing": { name: "집중 공격", text: "같은 적 4회 연속 적중부터 피해 +16%", max: 1 },
  "sweeping-edge": { name: "휩쓸기", text: "공격 범위 +18%, 3마리 이상 맞히면 피해 +12%", max: 1 },
  "special-force": { name: "필살 연마", text: "특수 공격 피해 +25%", max: 2 },
  "special-haste": { name: "빠른 재정비", text: "특수 공격 쿨타임 −15%", max: 2 },
  "special-shield": { name: "빈틈 방어", text: "특수 공격 사용 시 보호막 15(4초)", max: 1 },
  "special-echo": { name: "잔향", text: "특수 공격 적중 시 20%로 0.4초 뒤 50% 피해 재발동", max: 1 },
  "special-heal": { name: "전투 호흡", text: "특수 공격이 적중하면 체력 3 회복(사용당 1회)", max: 1 },
  "perfect-timing": { name: "완벽한 타이밍", text: "준비 완료 2초 안에 쓰면 특수 공격 피해 +20%", max: 1 },
  "hunter-reset": { name: "사냥의 흐름", text: "정예 처치 시 특수 공격 남은 쿨타임 −35%", max: 1 },
  "steady-recovery": { name: "꾸준한 회복", text: "20초마다 체력 5 회복", max: 2 },
  "elite-remedy": { name: "강적의 약", text: "정예 처치 시 체력 12 회복", max: 1 },
  "second-wind": { name: "두 번째 숨", text: "쓰러질 피해를 받으면 체력 1로 버티고 2초 무적(판당 1회)", max: 1 },
  "thorn-armor": { name: "가시 갑옷", text: "부딪혀 맞으면 그 적에게 피해 20(0.5초마다)", max: 2 },
  "food-expert": { name: "든든한 한 끼", text: "회복 음식 +25%, 지속 음식 시간 +20%", max: 1 },
  "shield-keeper": { name: "보호막 유지", text: "보호막이 있는 동안 이속 +10%, 기본 공격 피해 +10%", max: 1 },
  "long-dash": { name: "긴 도약", text: "회피 거리 +25%, 회피 뒤 1초 이속 +15%", max: 1 },
  "cutting-trail": { name: "칼바람 자국", text: "회피 경로의 적에게 주무기 피해 80%", max: 1 },
  "terrain-boots": { name: "지형 적응", text: "물·진흙·풀 감속 50% 감소", max: 1 },
  "opportunity-master": { name: "지형 활용", text: "폭발 꽃·기회 지형의 피해 +30%", max: 1 },
  "safe-route": { name: "안전한 길", text: "장판·웅덩이 피해 −30%", max: 1 },
  "pressure-runner": { name: "돌파", text: "탑의 압박 단계마다 이속 +5%(최대 +15%)", max: 1 },
  "pet-haste": { name: "재빠른 동료", text: "전투펫 행동 주기 −18%", max: 2 },
  "pet-bond": { name: "함께 싸우기", text: "전투펫이 행동하면 특수 공격 쿨타임 −0.4초(2초마다)", max: 1 },
  "pet-guard": { name: "동료의 수호", text: "체력 35% 이하에서 전투펫이 보호막 18(판당 1회)", max: 1 },
  "pet-finisher": { name: "합동 마무리", text: "특수 공격 적중 뒤 2초간 전투펫 피해 +40%", max: 1 },
  // 62절 자동 보조무기(한 판 1개)
  "aux-slingshot": { name: "보조무기 · 참새 새총", text: "3.2초마다 가장 가까운 적에게 돌멩이(피해 12)", max: 1 },
  "aux-hand-sickle": { name: "보조무기 · 날아가는 손낫", text: "5초마다 손낫이 갔다 돌아옴(16 + 8, 최대 3명)", max: 1 },
  "aux-seed-bomb": { name: "보조무기 · 톡톡 씨앗탄", text: "7초마다 적이 많은 곳에 씨앗탄(반경 65, 피해 20)", max: 1 },
  "aux-sprinkler": { name: "보조무기 · 꼬마 스프링클러", text: "10초마다 4초간 주변에 물(1초마다 3, 둔화 10%)", max: 1 },
  "aux-beehive": { name: "보조무기 · 휴대 벌통", text: "8초마다 체력 높은 적에게 벌 3마리(각 7)", max: 1 },
  "aux-scarecrow": { name: "보조무기 · 깜짝 허수아비", text: "주변 적 5명↑일 때 12초마다 쾅(8·밀어내기·경직)", max: 1 },
  "auxiliary-power": { name: "정교한 손질", text: "보조무기 피해 +15%", max: 2 },
  "auxiliary-haste": { name: "태엽 감기", text: "보조무기 발동 주기 −10%", max: 2 },
  "auxiliary-range": { name: "넓은 탐색", text: "보조무기 반경 +15%, 투사체 속도 +10%", max: 1 },
  "auxiliary-mastery": { name: "농가의 잔재주", text: "보조무기 고유 효과 해금", max: 1 },
  // 59.2절 무제한 성장 카드(중복 제한 없음)
  "endless-edge": { name: "끝없는 날", text: "주무기 기본·특수 공격 피해 +6%(최대 10중첩)", max: 10 },
  "endless-life": { name: "끈질긴 생명", text: "최대 체력 +10, 즉시 체력 10 회복", max: 999 },
  "endless-haste": { name: "멈추지 않는 손", text: "기본 공격 간격 −3% · 특수 공격 재사용 −2%(최대 10중첩)", max: 10 },
};
/** 일반 카드 전체(최종·무제한 제외). 실제 제시는 app/raid/awakenings.ts의 rollChoices가 계열·등급·조건으로 고른다. */
export const COMMON_AWAKENINGS: AwakenId[] = Object.keys(AWAKENINGS).filter(id => !AWAKENINGS[id].final && !ENDLESS_AWAKENINGS.includes(id));

// ---------- 음식(29절): 주방 요리 id → 탑 효과(등급별 수치) ----------
export type FoodEffect = { kind: "attack" | "heal" | "speed" | "shield" | "all" | "regen" | "haste" | "crit" | "armor"; heal: boolean; seconds: number; values: [number, number, number]; text: (v: number) => string };
export const FOOD_EFFECTS: Record<string, FoodEffect> = {
  maeuntang: { kind: "attack", heal: false, seconds: 60, values: [10, 15, 22], text: v => `60초 공격력 +${v}%` },
  jorim: { kind: "heal", heal: true, seconds: 0, values: [25, 35, 50], text: v => `체력 ${v} 즉시 회복` },
  bibimbap: { kind: "speed", heal: false, seconds: 60, values: [12, 18, 25], text: v => `60초 이동속도 +${v}%` },
  gui: { kind: "shield", heal: true, seconds: 60, values: [20, 30, 45], text: v => `60초 보호막 ${v}` },
  dosirak: { kind: "all", heal: false, seconds: 45, values: [6, 9, 13], text: v => `45초 공격력·공격속도·이동속도 +${v}%` },
  "herb-stew": { kind: "regen", heal: true, seconds: 20, values: [2, 3, 4], text: v => `20초간 초당 체력 ${v} 회복` },
  skewer: { kind: "haste", heal: false, seconds: 60, values: [12, 18, 25], text: v => `60초 공격속도 +${v}%` },
  "rabbit-stew": { kind: "regen", heal: true, seconds: 40, values: [1, 2, 3], text: v => `40초간 초당 체력 ${v} 회복` },
  "venison-steak": { kind: "crit", heal: false, seconds: 60, values: [8, 12, 18], text: v => `60초 치명타 확률 +${v}%p` },
  "bear-hotpot": { kind: "armor", heal: false, seconds: 60, values: [12, 18, 25], text: v => `60초 받는 피해 −${v}%` },
  "bbq-platter": { kind: "all", heal: false, seconds: 60, values: [8, 12, 17], text: v => `60초 공격력·공격속도·이동속도 +${v}%` },
};
export const MAX_HEAL_FOODS = 2;

// ---------- 재료와 보상(28절) ----------
export const RAID_ITEMS: Record<string, { name: string; icon: string }> = {
  "pollen-clump": { name: "꽃가루 뭉치", icon: "🌼" }, "field-essence": { name: "들판 정수", icon: "🌿" }, "pollen-tusk": { name: "꽃가루 멧돼지 엄니", icon: "🦷" },
  "canal-moss": { name: "수로 이끼", icon: "💧" }, "mist-crystal": { name: "물안개 결정", icon: "🔷" }, "storm-whisker": { name: "폭풍 메기 수염", icon: "⚡" },
  "maple-fragment": { name: "단풍 파편", icon: "🍁" }, "maze-amber": { name: "미궁 호박", icon: "🟠" }, "crimson-antler": { name: "붉은 뿔", icon: "🦌" },
  "frost-ore": { name: "서리 광석", icon: "🧊" }, "glacier-crystal": { name: "빙하 결정", icon: "💎" }, "ironbear-core": { name: "철갑곰의 핵", icon: "🐻" },
  "ancient-bark": { name: "고대 수피", icon: "🪵" }, "spirit-crystal": { name: "정령 결정", icon: "🔮" }, "guardian-seed": { name: "수호자의 씨앗", icon: "🌰" },
  "dark-alloy": { name: "암흑 합금", icon: "⬛" }, "core-shard": { name: "탑의 핵 파편", icon: "🔷" }, "heart-ember": { name: "심장 불씨", icon: "🔥" }, "tower-heart": { name: "탑의 심장", icon: "💠" },
};
/** [id, 최소, 최대, 확률(없으면 1)] */
export type Drop = [string, number, number, number?];
export const FLOOR_REWARDS: Record<number, { firstGold: number; first: Drop[]; repeat: Drop[]; stabilizer: number }> = {
  1: { firstGold: 300, first: [["pollen-clump", 3, 3]], repeat: [["pollen-clump", 1, 2]], stabilizer: 0.01 },
  2: { firstGold: 400, first: [["pollen-clump", 3, 3]], repeat: [["pollen-clump", 1, 3]], stabilizer: 0.01 },
  3: { firstGold: 500, first: [["pollen-clump", 3, 3], ["field-essence", 1, 1]], repeat: [["pollen-clump", 2, 3], ["field-essence", 1, 1, 0.2]], stabilizer: 0.01 },
  4: { firstGold: 700, first: [["field-essence", 2, 2]], repeat: [["pollen-clump", 2, 4], ["field-essence", 1, 1]], stabilizer: 0.02 },
  5: { firstGold: 1500, first: [["field-essence", 3, 3], ["pollen-tusk", 1, 1]], repeat: [["field-essence", 1, 2], ["pollen-tusk", 1, 1, 0.3]], stabilizer: 0.05 },
  6: { firstGold: 600, first: [["canal-moss", 3, 3]], repeat: [["canal-moss", 1, 2]], stabilizer: 0.01 },
  7: { firstGold: 700, first: [["canal-moss", 3, 3]], repeat: [["canal-moss", 1, 3]], stabilizer: 0.01 },
  8: { firstGold: 800, first: [["canal-moss", 3, 3], ["mist-crystal", 1, 1]], repeat: [["canal-moss", 2, 3], ["mist-crystal", 1, 1, 0.2]], stabilizer: 0.01 },
  9: { firstGold: 1000, first: [["mist-crystal", 2, 2]], repeat: [["canal-moss", 2, 4], ["mist-crystal", 1, 1]], stabilizer: 0.03 },
  10: { firstGold: 2500, first: [["mist-crystal", 3, 3], ["storm-whisker", 1, 1]], repeat: [["mist-crystal", 1, 2], ["storm-whisker", 1, 1, 0.3]], stabilizer: 0.05 },
  // 11~20층(RAID_FLOOR_20_EXPANSION_AUDIT 12절)
  11: { firstGold: 900, first: [["maple-fragment", 3, 3]], repeat: [["maple-fragment", 1, 2]], stabilizer: 0.01 },
  12: { firstGold: 1000, first: [["maple-fragment", 3, 3]], repeat: [["maple-fragment", 1, 3]], stabilizer: 0.01 },
  13: { firstGold: 1200, first: [["maple-fragment", 3, 3], ["maze-amber", 1, 1]], repeat: [["maple-fragment", 2, 3], ["maze-amber", 1, 1, 0.2]], stabilizer: 0.02 },
  14: { firstGold: 1500, first: [["maze-amber", 2, 2]], repeat: [["maple-fragment", 2, 4], ["maze-amber", 1, 1]], stabilizer: 0.03 },
  15: { firstGold: 3500, first: [["maze-amber", 3, 3], ["crimson-antler", 1, 1]], repeat: [["maze-amber", 1, 2], ["crimson-antler", 1, 1, 0.4]], stabilizer: 0.05 },
  16: { firstGold: 1200, first: [["frost-ore", 3, 3]], repeat: [["frost-ore", 1, 2]], stabilizer: 0.01 },
  17: { firstGold: 1400, first: [["frost-ore", 3, 3]], repeat: [["frost-ore", 1, 3]], stabilizer: 0.02 },
  18: { firstGold: 1600, first: [["frost-ore", 3, 3], ["glacier-crystal", 1, 1]], repeat: [["frost-ore", 2, 3], ["glacier-crystal", 1, 1, 0.2]], stabilizer: 0.02 },
  19: { firstGold: 2000, first: [["glacier-crystal", 2, 2]], repeat: [["frost-ore", 2, 4], ["glacier-crystal", 1, 1]], stabilizer: 0.04 },
  21: { firstGold: 1600, first: [["ancient-bark", 3, 3]], repeat: [["ancient-bark", 1, 2]], stabilizer: 0.02 },
  22: { firstGold: 1800, first: [["ancient-bark", 3, 3]], repeat: [["ancient-bark", 1, 3]], stabilizer: 0.02 },
  23: { firstGold: 2100, first: [["ancient-bark", 3, 3], ["spirit-crystal", 1, 1]], repeat: [["ancient-bark", 2, 3], ["spirit-crystal", 1, 1, 0.2]], stabilizer: 0.03 },
  24: { firstGold: 2500, first: [["spirit-crystal", 2, 2]], repeat: [["ancient-bark", 2, 4], ["spirit-crystal", 1, 1]], stabilizer: 0.05 },
  25: { firstGold: 6000, first: [["spirit-crystal", 3, 3], ["guardian-seed", 1, 1]], repeat: [["spirit-crystal", 1, 2], ["guardian-seed", 1, 1, 0.4]], stabilizer: 0.08 },
  26: { firstGold: 2000, first: [["dark-alloy", 3, 3]], repeat: [["dark-alloy", 1, 2]], stabilizer: 0.02 },
  27: { firstGold: 2300, first: [["dark-alloy", 3, 3], ["core-shard", 1, 1]], repeat: [["dark-alloy", 1, 3], ["core-shard", 1, 1, 0.35]], stabilizer: 0.03 },
  28: { firstGold: 2700, first: [["dark-alloy", 3, 3], ["core-shard", 1, 1]], repeat: [["dark-alloy", 2, 3], ["core-shard", 1, 1, 0.5]], stabilizer: 0.04 },
  29: { firstGold: 3200, first: [["core-shard", 2, 2], ["heart-ember", 1, 1]], repeat: [["dark-alloy", 2, 4], ["core-shard", 1, 1], ["heart-ember", 1, 1, 0.35]], stabilizer: 0.06 },
  30: { firstGold: 10000, first: [["core-shard", 3, 3], ["tower-heart", 1, 1]], repeat: [["core-shard", 1, 2], ["tower-heart", 1, 1, 0.2]], stabilizer: 0.1 },
  20: { firstGold: 4500, first: [["glacier-crystal", 3, 3], ["ironbear-core", 1, 1]], repeat: [["glacier-crystal", 1, 2], ["ironbear-core", 1, 1, 0.3]], stabilizer: 0.06 },
};
/**
 * 보스 재료 불운 방지(RAID_FLOOR_30_EXPANSION_AUDIT 7.3): 반복 클리어에서 이 재료를 misses번 연속 못 받으면 다음 반복 클리어에 확정.
 * 받으면(확률·확정) 0으로. 재료별로 따로 센다. 25층(수호자의 씨앗)은 층 구현 때 추가한다.
 */
export const BOSS_DROP_PITY: Record<number, { id: string; misses: number }> = { 15: { id: "crimson-antler", misses: 3 }, 20: { id: "ironbear-core", misses: 3 }, 25: { id: "guardian-seed", misses: 3 } };
export const zoneCommon = (floor: number) => ({ field: "pollen-clump", canal: "canal-moss", maple: "maple-fragment", frost: "frost-ore", ancient: "ancient-bark", core: "dark-alloy" })[zoneOf(floor)];

// ---------- 생활 재료(27절) ----------
export const LIFE_MATS: Record<string, { name: string; icon: string; recipe: string }> = {
  "farm-fiber": { name: "튼튼한 농업 섬유", icon: "🧵", recipe: "농산물 5개(황금 제외)" },
  "fish-oil": { name: "정제 물고기 기름", icon: "🫗", recipe: "물고기 3마리(전설·신화 제외)" },
  "tanned-leather": { name: "무두질 가죽", icon: "🟫", recipe: "일반 사냥 소재 3개(희귀 소재 제외)" },
  "artisan-core": { name: "생활 장인의 핵", icon: "💠", recipe: "농업 섬유 1 · 물고기 기름 1 · 무두질 가죽 1" },
};
export const HUNT_COMMON_LOOT = ["rabbitfur", "foxfur", "antler", "boarhair", "bearfur", "tigerpelt"];
export const HUNT_RARE_LOOT = ["luckyfoot", "foxbead", "goldantler", "tusk", "honey", "tigerfang"];

// ---------- 강화(11·27·33절) ----------
/** need: 탑 재료·생활 재료 id → 개수. 특수 키: "rare-hunt"(희귀 사냥 소재 아무거나), "goods"(가공품 아무거나), "good-crop"(좋은 품질 이상 농산물). */
export type EnhanceStep = { to: number; chance: number; drop: number; gold: number; need: Record<string, number>; open?: { gold: number; need: Record<string, number> } };
export const ENHANCE: EnhanceStep[] = [
  // 2026-10-16 골드 대폭 인상(구 수치 약 ×6.7, ENHANCEMENT_GOLD_REBALANCE.md): 강화를 장기 골드 회수처로. 재료·확률·하락률은 그대로
  { to: 1, chance: 1, drop: 0, gold: 2000, need: { "farm-fiber": 1 } },
  { to: 2, chance: 1, drop: 0, gold: 3000, need: { "fish-oil": 1 } },
  { to: 3, chance: 1, drop: 0, gold: 4500, need: { "tanned-leather": 1 } },
  { to: 4, chance: 0.95, drop: 0.01, gold: 6000, need: { "farm-fiber": 1, "fish-oil": 1 } },
  { to: 5, chance: 0.95, drop: 0.01, gold: 9000, need: { "tanned-leather": 2 } },
  { to: 6, chance: 0.85, drop: 0.01, gold: 13000, need: { "farm-fiber": 2, goods: 1 } },
  { to: 7, chance: 0.85, drop: 0.01, gold: 18000, need: { "fish-oil": 2, "tanned-leather": 1 } },
  { to: 8, chance: 0.75, drop: 0.02, gold: 26000, need: { "artisan-core": 1 } },
  { to: 9, chance: 0.75, drop: 0.02, gold: 36000, need: { "artisan-core": 1, "rare-hunt": 1 } },
  { to: 10, chance: 0.65, drop: 0.02, gold: 50000, need: { "artisan-core": 2, "rare-hunt": 1, "good-crop": 2 } },
  { to: 11, chance: 0.5, drop: 0.03, gold: 60000, need: { "pollen-clump": 2, "field-essence": 1 }, open: { gold: 20000, need: { "pollen-tusk": 1 } } },
  { to: 12, chance: 0.4, drop: 0.03, gold: 75000, need: { "canal-moss": 2, "mist-crystal": 1 }, open: { gold: 30000, need: { "storm-whisker": 1 } } },
  { to: 13, chance: 0.3, drop: 0.04, gold: 100000, need: { "maple-fragment": 2, "maze-amber": 1 }, open: { gold: 40000, need: { "crimson-antler": 2 } } },
  { to: 14, chance: 0.22, drop: 0.04, gold: 130000, need: { "frost-ore": 2, "glacier-crystal": 1 }, open: { gold: 55000, need: { "ironbear-core": 2 } } },
  // 21~30층(7.1절): +15 시도 골드 170,000 → 130,000, 개방은 고대 숲 재료로(씨앗은 +16 개방으로)
  { to: 15, chance: 0.15, drop: 0.05, gold: 130000, need: { "ancient-bark": 2, "spirit-crystal": 1 }, open: { gold: 80000, need: { "ancient-bark": 4, "spirit-crystal": 2 } } },
  { to: 16, chance: 0.15, drop: 0.05, gold: 145000, need: { "ancient-bark": 3, "spirit-crystal": 2 }, open: { gold: 100000, need: { "guardian-seed": 2 } } },
  { to: 17, chance: 0.13, drop: 0.06, gold: 160000, need: { "dark-alloy": 3 }, open: { gold: 130000, need: { "dark-alloy": 5, "core-shard": 2 } } },
  { to: 18, chance: 0.12, drop: 0.06, gold: 180000, need: { "dark-alloy": 4, "core-shard": 1 }, open: { gold: 160000, need: { "heart-ember": 1 } } },
];
/**
 * 강화 실패 누적 보정·천장(IMPLEMENTATION_GAP_AUDIT 10.2): +11~+15만. 무기별·목표 단계별 실패 횟수로
 * start회 실패 뒤부터 실패 1회당 step씩(최대 max) 성공률을 더하고, ceiling번째 시도는 반드시 성공한다.
 * 단계가 하락해도 그 목표 단계의 실패 횟수는 유지, 그 단계 성공 시 0. 안정화석과 무관하게 센다.
 * 20만 회 시뮬레이션(첫 +15, 개방비 포함): 평균 307만 → 283만, 하위 10% 502만 → 431만, 하위 1% 822만 → 594만.
 */
export const ENHANCE_PITY: Record<number, { start: number; step: number; max: number; ceiling: number }> = {
  11: { start: 3, step: 0.05, max: 0.1, ceiling: 6 },
  12: { start: 4, step: 0.04, max: 0.12, ceiling: 8 },
  13: { start: 5, step: 0.03, max: 0.12, ceiling: 10 },
  14: { start: 6, step: 0.02, max: 0.12, ceiling: 13 },
  15: { start: 7, step: 0.02, max: 0.12, ceiling: 15 },
  16: { start: 8, step: 0.018, max: 0.12, ceiling: 15 },
  17: { start: 9, step: 0.016, max: 0.12, ceiling: 17 },
  18: { start: 10, step: 0.015, max: 0.12, ceiling: 19 },
};
/** 11층 이상 재료(11~20층은 탑 상자에서, 21층 이상은 아직 이름만). */
export const UPPER_ITEMS: Record<string, { name: string; icon: string }> = {
  "maple-fragment": { name: "단풍 파편", icon: "🍁" }, "maze-amber": { name: "미궁 호박", icon: "🟠" }, "crimson-antler": { name: "붉은 뿔", icon: "🦌" },
  "frost-ore": { name: "서리 광석", icon: "🧊" }, "glacier-crystal": { name: "빙하 결정", icon: "💎" }, "ironbear-core": { name: "철갑곰의 핵", icon: "🐻" },
  "ancient-bark": { name: "고대 수피", icon: "🪵" }, "spirit-crystal": { name: "정령 결정", icon: "🔮" }, "guardian-seed": { name: "수호자의 씨앗", icon: "🌰" },
};
/** 진화 변경 비용(39절): 30,000골드 + 생활 장인의 핵 3, +13 이상이면 미궁 호박 2 추가. 첫 선택은 무료. */
export const EVOLUTION_CHANGE = { gold: 30000, need: { "artisan-core": 3 } as Record<string, number>, upper: { "maze-amber": 2 } as Record<string, number> };

// ---------- 방어구(26절) ----------
export type ArmorSlot = "head" | "body" | "legs";
export type ArmorDef = { id: string; slot: ArmorSlot; name: string; icon: string; tier: 1 | 2 | 3 | 4 | 5 | 6; prerequisite?: string; gold: number; need: Record<string, number>;
  /** freezeResist: 빙판·빙결 둔화 감소, hazardCut: 바닥(장판·감전) 피해 감소 */
  stats: { hp?: number; defense?: number; crit?: number; absorb?: number; xpGain?: number; speed?: number; dashCd?: number; startShield?: number; freezeResist?: number; hazardCut?: number; bossDamage?: number }; text: string };
export const ARMORS: ArmorDef[] = [
  { id: "leather-hood", slot: "head", name: "가죽 두건", icon: "🧢", tier: 1, gold: 2000, need: { rabbitfur: 8, foxfur: 3 }, stats: { crit: 0.05, xpGain: 0.03 }, text: "치명타 +5% · 경험치 +3%" },
  { id: "reinforced-hood", prerequisite: "leather-hood", slot: "head", name: "강화 가죽 두건", icon: "⛑️", tier: 2, gold: 5000, need: { rabbitfur: 12, foxfur: 8, antler: 2, "field-essence": 2 }, stats: { crit: 0.1, xpGain: 0.05 }, text: "치명타 +10% · 경험치 +5%" },
  { id: "leather-vest", slot: "body", name: "가죽 조끼", icon: "🦺", tier: 1, gold: 2500, need: { boarhair: 8, bearfur: 2 }, stats: { hp: 20, defense: 2 }, text: "최대 체력 +20 · 방어력 +2" },
  { id: "reinforced-vest", prerequisite: "leather-vest", slot: "body", name: "강화 가죽 조끼", icon: "🥋", tier: 2, gold: 6000, need: { boarhair: 12, bearfur: 6, tusk: 1, "field-essence": 2 }, stats: { hp: 35, defense: 4, startShield: 15 }, text: "최대 체력 +35 · 방어력 +4 · 시작 보호막 15" },
  { id: "leather-boots", slot: "legs", name: "가죽 장화", icon: "👢", tier: 1, gold: 2000, need: { rabbitfur: 6, foxfur: 3, antler: 2 }, stats: { speed: 0.08, dashCd: 0.1 }, text: "이동속도 +8% · 회피 재사용 −10%" },
  // 단풍 추적자(10.1절)·설산 방벽(10.2절): 하위 부위를 가지고 있어야 만들 수 있다(소모 안 함). 보스 핵은 요구하지 않는다.
  { id: "maple-hood", prerequisite: "reinforced-hood", slot: "head", name: "단풍 추적자 두건", icon: "🍁", tier: 3, gold: 7000, need: { "maple-fragment": 4, "maze-amber": 2 }, stats: { crit: 0.12, xpGain: 0.06 }, text: "치명타 +12% · 경험치 +6%" },
  { id: "maple-vest", prerequisite: "reinforced-vest", slot: "body", name: "단풍 추적자 조끼", icon: "🍂", tier: 3, gold: 9000, need: { "maple-fragment": 5, "maze-amber": 2 }, stats: { hp: 45, defense: 6, startShield: 20 }, text: "최대 체력 +45 · 방어력 +6 · 시작 보호막 20" },
  { id: "maple-boots", prerequisite: "reinforced-boots", slot: "legs", name: "단풍 추적자 장화", icon: "🥾", tier: 3, gold: 7000, need: { "maple-fragment": 3, "maze-amber": 2 }, stats: { speed: 0.15, dashCd: 0.22 }, text: "이동속도 +15% · 회피 재사용 −22%" },
  { id: "frost-hood", prerequisite: "maple-hood", slot: "head", name: "설산 방벽 투구", icon: "❄️", tier: 4, gold: 10000, need: { "frost-ore": 5, "glacier-crystal": 2 }, stats: { crit: 0.13, xpGain: 0.07, freezeResist: 0.3 }, text: "치명타 +13% · 경험치 +7% · 빙판·빙결 둔화 −30%" },
  { id: "frost-vest", prerequisite: "maple-vest", slot: "body", name: "설산 방벽 갑옷", icon: "🛡️", tier: 4, gold: 13000, need: { "frost-ore": 6, "glacier-crystal": 3 }, stats: { hp: 60, defense: 9, startShield: 25 }, text: "최대 체력 +60 · 방어력 +9 · 시작 보호막 25" },
  { id: "frost-boots", prerequisite: "maple-boots", slot: "legs", name: "설산 방벽 장화", icon: "🧊", tier: 4, gold: 10000, need: { "frost-ore": 4, "glacier-crystal": 2 }, stats: { speed: 0.14, dashCd: 0.24, hazardCut: 0.2 }, text: "이동속도 +14% · 회피 재사용 −24% · 바닥 피해 −20%" },
  // 고대 수호자(9.1)·심장부 정복자(9.2): 보스 재료 없이 계승 자격
  { id: "ancient-hood", prerequisite: "frost-hood", slot: "head", name: "고대 수호자 투구", icon: "🌿", tier: 5, gold: 14000, need: { "ancient-bark": 5, "spirit-crystal": 2 }, stats: { crit: 0.15, xpGain: 0.08 }, text: "치명타 +15% · 경험치 +8%" },
  { id: "ancient-vest", prerequisite: "frost-vest", slot: "body", name: "고대 수호자 갑옷", icon: "🌳", tier: 5, gold: 18000, need: { "ancient-bark": 7, "spirit-crystal": 3 }, stats: { hp: 75, defense: 11, startShield: 30 }, text: "최대 체력 +75 · 방어력 +11 · 시작 보호막 30" },
  { id: "ancient-boots", prerequisite: "frost-boots", slot: "legs", name: "고대 수호자 장화", icon: "🍃", tier: 5, gold: 14000, need: { "ancient-bark": 5, "spirit-crystal": 2 }, stats: { speed: 0.18, dashCd: 0.26, hazardCut: 0.25 }, text: "이동속도 +18% · 회피 재사용 −26% · 바닥 피해 −25%" },
  { id: "core-hood", prerequisite: "ancient-hood", slot: "head", name: "심장부 정복자 투구", icon: "🔆", tier: 6, gold: 22000, need: { "dark-alloy": 6, "core-shard": 3 }, stats: { crit: 0.17, xpGain: 0.09, bossDamage: 0.06 }, text: "치명타 +17% · 경험치 +9% · 보스 피해 +6%" },
  { id: "core-vest", prerequisite: "ancient-vest", slot: "body", name: "심장부 정복자 갑옷", icon: "💠", tier: 6, gold: 28000, need: { "dark-alloy": 8, "core-shard": 4 }, stats: { hp: 90, defense: 14, startShield: 35 }, text: "최대 체력 +90 · 방어력 +14 · 시작 보호막 35" },
  { id: "core-boots", prerequisite: "ancient-boots", slot: "legs", name: "심장부 정복자 장화", icon: "⚡", tier: 6, gold: 22000, need: { "dark-alloy": 6, "core-shard": 3 }, stats: { speed: 0.2, dashCd: 0.28, hazardCut: 0.3 }, text: "이동속도 +20% · 회피 재사용 −28% · 바닥 피해 −30%" },
  { id: "reinforced-boots", prerequisite: "leather-boots", slot: "legs", name: "강화 가죽 장화", icon: "🥾", tier: 2, gold: 5000, need: { rabbitfur: 10, foxfur: 6, antler: 4, "field-essence": 2 }, stats: { speed: 0.14, dashCd: 0.2 }, text: "이동속도 +14% · 회피 재사용 −20% · 밀려남 −25%" },
];
export const SLOT_NAME: Record<ArmorSlot, string> = { head: "머리", body: "몸통", legs: "다리" };

/** 저장(42절 중 1~10층 범위). */
export type RaidSave = {
  balanceVersion: number; highestFloor: number; unlockedFloor: number; firstClears: number[];
  /** fails: 목표 단계 → 누적 실패 횟수(강화 천장, +11~+15) */
  weapons: Record<string, { enhancement: number; evolution: Evolution | null; unlockedEnhancements: number[]; fails?: Record<number, number> }>;
  equipped: { weapon: string; head: string | null; body: string | null; legs: string | null; battlePet?: string | null };
  battlePets?: Record<string, { level: number }>; petPity?: number;
  armorOwned: string[];
  stabilizers: number; towerSeals: number; contractShards: number;
  /** 특수공격 숙련 별(진화 id → 0~5, 11.6절) */
  mastery?: Record<string, number>;
  /** 층별 기록(최고 실패·마지막 실패·첫 클리어, 3.4절 성장 돌파) */
  progress?: Record<number, import("./progress").FloorProgress>;
  /** 보스 재료 연속 미획득 횟수(재료 id → 횟수, BOSS_DROP_PITY) */
  bossMiss?: Record<string, number>;
  /** 최근 30판 기록(밸런스 확인용, RAID_FLOOR_20_EXPANSION_AUDIT 13절) */
  log?: RaidRunLog[];
};
export type RaidRunLog = {
  v: number; at: number; floor: number; cleared: boolean; weapon: string; evo: string | null; enh: number; armor: (string | null)[]; pet: string | null; foods: string[];
  level: number; picks: string[]; auxes: string[]; dmg: Record<string, number>; taken: Record<string, number>; waveEndHp: number | null; bossTime: number | null; kills: number; dodges: number; time: number; input: "pc" | "mobile"; bossHits?: number;
};
export const EMPTY_RAID: RaidSave = { balanceVersion: RAID_BALANCE_VERSION, highestFloor: 0, unlockedFloor: 1, firstClears: [], weapons: { "raid-scythe": { enhancement: 0, evolution: null, unlockedEnhancements: [] } }, equipped: { weapon: "raid-scythe", head: null, body: null, legs: null, battlePet: null }, battlePets: {}, petPity: 0, armorOwned: [], stabilizers: 0, towerSeals: 0, contractShards: 0 };

/** 착용한 방어구 능력 합계. */
/**
 * 특수공격 숙련(RAID_FLOOR_30_EXPANSION_AUDIT 11.6): 진화 무기마다 ★1~★5, 확정 성공. 골드 + 탑의 인장.
 * 효과는 누적값(★n의 피해·재사용). ★3부터 잔향 폭발(특수 공격 0.6초 뒤 조준 지점 반지름 90에 기본 피해 120%).
 * 개방: ★1~2 언제나, ★3~4 30층 클리어, ★5 51층(어려움 구간) 공개 때.
 */
export const SPECIAL_MASTERY = [
  { star: 1, gold: 300000, seals: 6, dmg: 0.04, cd: 0, unlock: 0 },
  { star: 2, gold: 600000, seals: 10, dmg: 0.08, cd: 0.01, unlock: 0 },
  { star: 3, gold: 900000, seals: 15, dmg: 0.12, cd: 0.02, unlock: 30 },
  { star: 4, gold: 1200000, seals: 22, dmg: 0.16, cd: 0.03, unlock: 30 },
  { star: 5, gold: 1800000, seals: 30, dmg: 0.2, cd: 0.04, unlock: 51 },
];
export function gearOf(raid: RaidSave) {
  const evo = raid.weapons[raid.equipped.weapon]?.evolution, star = evo ? raid.mastery?.[evo] ?? 0 : 0, mst = SPECIAL_MASTERY[star - 1];
  const g = { hp: 0, defense: 0, crit: 0, absorb: 0, xpGain: 0, speed: 0, dashCd: 0, startShield: 0, freezeResist: 0, hazardCut: 0, bossDamage: 0, specialDmg: mst?.dmg ?? 0, specialCd: mst?.cd ?? 0, specialEcho: star >= 3 ? 1 : 0 };
  for (const slot of ["head", "body", "legs"] as ArmorSlot[]) {
    const a = ARMORS.find(item => item.id === raid.equipped[slot]);
    if (a) for (const [k, v] of Object.entries(a.stats)) g[k as keyof typeof g] += v ?? 0;
  }
  return g;
}
/** 모든 재료 이름(탑·생활·상위). */
export const ALL_RAID_ITEMS: Record<string, { name: string; icon: string }> = { ...RAID_ITEMS, ...UPPER_ITEMS, ...Object.fromEntries(Object.entries(LIFE_MATS).map(([id, m]) => [id, { name: m.name, icon: m.icon }])) };

// 생활 숙련(+10 진화 조건)은 51.7절에 따라 제거했다. 예전 저장의 lifeMastery는 무시한다.

// ---------- 전투펫(31·40절, 2026-10-15 사용자 결정으로 뽑기 방식 변경) ----------
/** 등급: 보통 · 희귀 · 전설. 뽑기는 생활펫 뽑기와 같은 확률·방식(1회 GACHA_PRICE원, 전설 0.1% · 희귀 10% · 보통 나머지). */
export type PetTier = "보통" | "희귀" | "전설";
export type BattlePetDef = { id: string; name: string; icon: string; tier: PetTier; role: string; text: string };
export const BATTLE_PETS: BattlePetDef[] = [
  { id: "battle-hedgehog", name: "가시 고슴도치", icon: "🦔", tier: "보통", role: "공격", text: "1.4초마다 가까운 적에게 피해 7" },
  { id: "battle-turtle", name: "방패 거북", icon: "🐢", tier: "보통", role: "방어", text: "22초마다 보호막 10(최대 1중첩)" },
  { id: "battle-sprite", name: "치유 요정", icon: "🧚", tier: "희귀", role: "회복", text: "16초마다 체력 4 회복" },
  { id: "battle-foxfire", name: "여우불", icon: "🦊", tier: "희귀", role: "지원", text: "8초마다 적 하나에 5초 표식(받는 피해 +10%)" },
  { id: "battle-hawk", name: "사냥매", icon: "🦅", tier: "희귀", role: "공격", text: "2.2초마다 가장 강한 적에게 피해 16" },
  { id: "battle-tiger", name: "백호의 혼", icon: "🐯", tier: "전설", role: "공격·방어", text: "5초마다 앞쪽 범위 피해 28, 체력 30% 이하에서 판당 1회 보호막 30" },
];
export const PET_TIER_RATE: Record<PetTier, number> = { 보통: 1 - GACHA_RARE_CHANCE - GACHA_LEGEND_CHANCE, 희귀: GACHA_RARE_CHANCE, 전설: GACHA_LEGEND_CHANCE };
export const PET_GACHA = { gold: GACHA_PRICE };
/** 중복 → 계약 조각, 조각으로 원하는 펫 교환·레벨업. */
export const DUPLICATE_SHARDS: Record<PetTier, number> = { 보통: 1, 희귀: 4, 전설: 15 };
export const PET_EXCHANGE = { 희귀: 30, 전설: 100 } as const;
export const PET_LEVELS = [{ level: 1, shards: 0, mult: 1 }, { level: 2, shards: 5, mult: 1.15 }, { level: 3, shards: 10, mult: 1.3 }, { level: 4, shards: 20, mult: 1.5 }, { level: 5, shards: 35, mult: 1.75 }];

/** 전투펫 뽑기 한 번(생활펫 뽑기와 같은 확률). */
export function rollBattlePet(random = Math.random) {
  const r = random(), tier: PetTier = r < PET_TIER_RATE.전설 ? "전설" : r < PET_TIER_RATE.전설 + PET_TIER_RATE.희귀 ? "희귀" : "보통";
  const pool = BATTLE_PETS.filter(p => p.tier === tier);
  return pool[Math.floor(random() * pool.length)];
}

// ---------- 진화 체험 훈련장(39절) ----------
/** 60초 동안 두 진화를 체험한다. 보스·보상 없음, 쓰러지지 않음. */
export const TRAINING_SECONDS = 60;
export const TRAINING_FLOOR: FloorDef = { floor: 0, zone: "진화 훈련장", monsters: ["pollen-mite", "thorn-rabbit", "boarling"], spawnRate: 1.6, maxAlive: 26, elite: { id: "field-brute", hp: 180, every: 20 }, boss: { id: "mini", name: "훈련용 허수아비", icon: "🎯", hp: 1, damage: 0, defense: 0 }, duration: TRAINING_SECONDS, training: true };
