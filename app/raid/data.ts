import { TEST_MODE } from "../testMode";
import { GACHA_LEGEND_CHANCE, GACHA_PRICE, GACHA_RARE_CHANCE } from "../house";
/**
 * 탑 토벌 데이터(HUNTING_RAID.md 23~31절, raidBalanceVersion 1). 첫 구현은 1~10층.
 * 모든 거리는 논리 해상도 960×540 기준 px, 시간은 초.
 */
export const RAID_RELEASED = true;
export const RAID_ENABLED = RAID_RELEASED || TEST_MODE;
export const RAID_BALANCE_VERSION = 1;
export const RAID_MAX_FLOOR = 10;

export const ARENA_W = 960, ARENA_H = 540;
/** 2분 고밀도 웨이브 + 제한 없는 보스전(59절). FLOOR_SECONDS는 훈련장 외에는 쓰지 않는다(보스전 시간 초과 없음). */
export const FLOOR_SECONDS = 0, BOSS_AT = 120;
/** 생성량 ×1.6, 최대 동시 수 ×1.25(올림), 일반 몬스터 이동속도 +15%(빠른 적 제외), 간접 개입 0:30·1:00·1:30, 정예 40초·80초, 보스전 20초마다 소환. */
export const SPAWN_MUL = 1.6, MAX_ALIVE_MUL = 1.25, NORMAL_SPEED_MUL = 1.15, INTERVENTION_AT = [30, 60, 90], ELITE_AT = [40, 80], BOSS_SUMMON_EVERY = 20;

// ---------- 플레이어 ----------
export const PLAYER = { radius: 14, hp: 100, speed: 220, iframes: 0.6, dashCooldown: 2.4, dashTime: 0.16, dashSpeed: 720, critChance: 0.05, critMul: 1.5, absorb: 320, attackSlow: 0.15 };

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
const z1 = "꽃가루 들판", z2 = "침수된 수로";
export const FLOORS: FloorDef[] = [
  { floor: 1, zone: z1, monsters: ["pollen-mite"], spawnRate: 0.8, maxAlive: 16, elite: null, boss: { id: "mini", name: "강화 진드기", icon: "🐞", hp: 300, damage: 10, defense: 0, base: "pollen-mite" } },
  { floor: 2, zone: z1, monsters: ["pollen-mite", "thorn-rabbit"], spawnRate: 1.0, maxAlive: 20, elite: { id: "thorn-rabbit", hp: 220, count: 2 }, boss: { id: "mini", name: "토끼 정예", icon: "🐇", hp: 500, damage: 13, defense: 0, base: "thorn-rabbit" } },
  { floor: 3, zone: z1, monsters: ["pollen-mite", "thorn-rabbit", "spore-bee"], spawnRate: 1.15, maxAlive: 23, elite: { id: "spore-bee", hp: 260, count: 2 }, boss: { id: "mini", name: "포자 여왕", icon: "🐝", hp: 700, damage: 12, defense: 0, base: "spore-bee" } },
  { floor: 4, zone: z1, monsters: ["pollen-mite", "thorn-rabbit", "spore-bee", "boarling"], spawnRate: 1.3, maxAlive: 26, elite: { id: "field-brute", hp: 180, every: 30 }, boss: { id: "mini", name: "난폭종 우두머리", icon: "🦬", hp: 1000, damage: 26, defense: 3, base: "field-brute" } },
  { floor: 5, zone: z1, monsters: ["pollen-mite", "thorn-rabbit", "spore-bee", "boarling"], spawnRate: 1.4, maxAlive: 28, elite: { id: "field-brute", hp: 180, every: 25 }, boss: { id: "pollen-boar", name: "꽃가루 멧돼지", icon: "🐗", hp: 1650, damage: 22, defense: 3 } },
  { floor: 6, zone: z2, monsters: ["moss-slime"], spawnRate: 0.95, maxAlive: 18, elite: null, boss: { id: "mini", name: "거대 이끼괴물", icon: "🟢", hp: 650, damage: 16, defense: 1, base: "moss-slime" } },
  { floor: 7, zone: z2, monsters: ["moss-slime", "shock-eel"], spawnRate: 1.1, maxAlive: 21, elite: { id: "shock-eel", hp: 350, count: 2 }, boss: { id: "mini", name: "전기 뱀장어 우두머리", icon: "⚡", hp: 850, damage: 18, defense: 0, base: "shock-eel" } },
  { floor: 8, zone: z2, monsters: ["moss-slime", "shock-eel", "dart-frog"], spawnRate: 1.25, maxAlive: 24, elite: { id: "dart-frog", hp: 400, count: 2 }, boss: { id: "mini", name: "물총 개구리왕", icon: "🐸", hp: 1150, damage: 18, defense: 1, base: "dart-frog" } },
  { floor: 9, zone: z2, monsters: ["moss-slime", "shock-eel", "dart-frog", "shell-crab"], spawnRate: 1.35, maxAlive: 27, elite: { id: "canal-elite", hp: 300, every: 30 }, boss: { id: "mini", name: "수로 포식자 우두머리", icon: "🐊", hp: 1500, damage: 33, defense: 4, base: "canal-elite" } },
  { floor: 10, zone: z2, monsters: ["moss-slime", "shock-eel", "dart-frog", "shell-crab"], spawnRate: 1.5, maxAlive: 30, elite: { id: "canal-elite", hp: 300, every: 25 }, boss: { id: "storm-catfish", name: "폭풍 메기왕", icon: "🐟", hp: 2750, damage: 28, defense: 4 } },
];

// ---------- 전투 각성(25절) ----------
export const AWAKEN_XP = [0, 15, 38, 68, 105]; // Lv.1~5 누적(59절). Lv.6부터는 xpForLevel.
export const AWAKEN_GUARANTEE = [{ at: 55, level: 3 }, { at: 95, level: 4 }];
/** 줍지 않은 경험치 구슬 전역 자동 흡수(초), 흡수 반경 안 끌림 속도(59.3절). */
export const ORB_AUTO = 2, ORB_PULL = 900;
/** 그 레벨이 되는 데 필요한 누적 경험치. Lv.6부터 다음 레벨까지 45 + 12 × (레벨 − 5). */
export function xpForLevel(level: number) {
  if (level <= 5) return AWAKEN_XP[Math.max(0, level - 1)];
  let xp = AWAKEN_XP[4];
  for (let l = 5; l < level; l++) xp += 45 + 12 * (l - 5);
  return xp;
}
/** 유효 카드가 모자랄 때 채우는 무제한 성장 카드(59.2절). */
export const ENDLESS_AWAKENINGS = ["endless-edge", "endless-life", "endless-haste"];
export type AwakenId = string;
export const AWAKENINGS: Record<string, { name: string; text: string; max: number; final?: Evolution }> = {
  "keen-edge": { name: "날 세우기", text: "주무기 피해 +22%", max: 2 },
  "quick-grip": { name: "빠른 손잡이", text: "공격 간격 −14%", max: 2 },
  "long-handle": { name: "긴 자루", text: "사거리 +22%, 공격각 +10도", max: 2 },
  "heavy-swing": { name: "묵직한 휘두르기", text: "밀어내기 +50%, 정예 피해 +12%", max: 1 },
  "double-cut": { name: "이중 베기", text: "세 번째 공격마다 55% 피해로 한 번 더", max: 1 },
  vitality: { name: "활력", text: "최대 체력 +25, 즉시 25 회복", max: 2 },
  "hard-leather": { name: "단단한 가죽", text: "받는 피해 −2(최소 1)", max: 2 },
  "wind-step": { name: "바람걸음", text: "이동속도 +12%", max: 2 },
  "quick-dash": { name: "빠른 회피", text: "회피 대시 재사용시간 −18%", max: 2 },
  "emergency-shield": { name: "비상 보호막", text: "체력 30% 이하가 되면 보호막 25(판당 1회)", max: 1 },
  "wide-gather": { name: "넓은 수집", text: "경험치 흡수 반경 +45px", max: 2 },
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
  // 59.2절 무제한 성장 카드(중복 제한 없음)
  "endless-edge": { name: "끝없는 날", text: "주무기 기본·특수 공격 피해 +6%", max: 999 },
  "endless-life": { name: "끈질긴 생명", text: "최대 체력 +10, 즉시 체력 10 회복", max: 999 },
  "endless-haste": { name: "멈추지 않는 손", text: "기본 공격 간격 −3% · 특수 공격 재사용 −2%", max: 999 },
};
export const COMMON_AWAKENINGS: AwakenId[] = ["keen-edge", "quick-grip", "long-handle", "heavy-swing", "double-cut", "vitality", "hard-leather", "wind-step", "quick-dash", "emergency-shield", "wide-gather", "pet-training"];

// ---------- 음식(29절): 주방 요리 id → 탑 효과(등급별 수치) ----------
export type FoodEffect = { kind: "attack" | "heal" | "speed" | "shield" | "all" | "regen" | "haste"; heal: boolean; seconds: number; values: [number, number, number]; text: (v: number) => string };
export const FOOD_EFFECTS: Record<string, FoodEffect> = {
  maeuntang: { kind: "attack", heal: false, seconds: 60, values: [10, 15, 22], text: v => `60초 공격력 +${v}%` },
  jorim: { kind: "heal", heal: true, seconds: 0, values: [25, 35, 50], text: v => `체력 ${v} 즉시 회복` },
  bibimbap: { kind: "speed", heal: false, seconds: 60, values: [12, 18, 25], text: v => `60초 이동속도 +${v}%` },
  gui: { kind: "shield", heal: true, seconds: 60, values: [20, 30, 45], text: v => `60초 보호막 ${v}` },
  dosirak: { kind: "all", heal: false, seconds: 45, values: [6, 9, 13], text: v => `45초 공격력·공격속도·이동속도 +${v}%` },
};
export const MAX_HEAL_FOODS = 2;

// ---------- 재료와 보상(28절) ----------
export const RAID_ITEMS: Record<string, { name: string; icon: string }> = {
  "pollen-clump": { name: "꽃가루 뭉치", icon: "🌼" }, "field-essence": { name: "들판 정수", icon: "🌿" }, "pollen-tusk": { name: "꽃가루 멧돼지 엄니", icon: "🦷" },
  "canal-moss": { name: "수로 이끼", icon: "💧" }, "mist-crystal": { name: "물안개 결정", icon: "🔷" }, "storm-whisker": { name: "폭풍 메기 수염", icon: "⚡" },
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
};
export const zoneCommon = (floor: number) => (floor <= 5 ? "pollen-clump" : "canal-moss");

// ---------- 생활 재료(27절) ----------
export const LIFE_MATS: Record<string, { name: string; icon: string; recipe: string }> = {
  "farm-fiber": { name: "튼튼한 농업 섬유", icon: "🧵", recipe: "농산물 5개(황금 제외)" },
  "fish-oil": { name: "정제 물고기 기름", icon: "🫗", recipe: "물고기 3마리(전설·신화 제외)" },
  "tanned-leather": { name: "무두질 가죽", icon: "🟫", recipe: "일반 사냥 소재 3개(희귀 소재 제외)" },
  "artisan-core": { name: "생활 장인의 핵", icon: "💠", recipe: "농업 섬유 1 · 물고기 기름 1 · 무두질 가죽 1 · 가공품 아무 종류 1" },
};
export const HUNT_COMMON_LOOT = ["rabbitfur", "foxfur", "antler", "boarhair", "bearfur", "tigerpelt"];
export const HUNT_RARE_LOOT = ["luckyfoot", "foxbead", "goldantler", "tusk", "honey", "tigerfang"];

// ---------- 강화(11·27·33절) ----------
/** need: 탑 재료·생활 재료 id → 개수. 특수 키: "rare-hunt"(희귀 사냥 소재 아무거나), "goods"(가공품 아무거나), "good-crop"(좋은 품질 이상 농산물). */
export type EnhanceStep = { to: number; chance: number; drop: number; gold: number; need: Record<string, number>; open?: { gold: number; need: Record<string, number> } };
export const ENHANCE: EnhanceStep[] = [
  { to: 1, chance: 1, drop: 0, gold: 300, need: { "farm-fiber": 1 } },
  { to: 2, chance: 1, drop: 0, gold: 450, need: { "fish-oil": 1 } },
  { to: 3, chance: 1, drop: 0, gold: 650, need: { "tanned-leather": 1 } },
  { to: 4, chance: 0.95, drop: 0.01, gold: 900, need: { "farm-fiber": 1, "fish-oil": 1 } },
  { to: 5, chance: 0.95, drop: 0.01, gold: 1300, need: { "tanned-leather": 2 } },
  { to: 6, chance: 0.85, drop: 0.01, gold: 1900, need: { "farm-fiber": 2, goods: 1 } },
  { to: 7, chance: 0.85, drop: 0.01, gold: 2700, need: { "fish-oil": 2, "tanned-leather": 1 } },
  { to: 8, chance: 0.75, drop: 0.02, gold: 3800, need: { "artisan-core": 1 } },
  { to: 9, chance: 0.75, drop: 0.02, gold: 5200, need: { "artisan-core": 1, "rare-hunt": 1 } },
  { to: 10, chance: 0.65, drop: 0.02, gold: 7500, need: { "artisan-core": 2, "rare-hunt": 1, "good-crop": 2 } },
  { to: 11, chance: 0.5, drop: 0.03, gold: 8000, need: { "pollen-clump": 2, "field-essence": 1 }, open: { gold: 3000, need: { "pollen-tusk": 1 } } },
  { to: 12, chance: 0.4, drop: 0.03, gold: 10000, need: { "canal-moss": 2, "mist-crystal": 1 }, open: { gold: 4000, need: { "storm-whisker": 1 } } },
  { to: 13, chance: 0.3, drop: 0.04, gold: 13000, need: { "maple-fragment": 2, "maze-amber": 1 }, open: { gold: 5000, need: { "crimson-antler": 2 } } },
  { to: 14, chance: 0.22, drop: 0.04, gold: 17000, need: { "frost-ore": 2, "glacier-crystal": 1 }, open: { gold: 7000, need: { "ironbear-core": 2 } } },
  { to: 15, chance: 0.15, drop: 0.05, gold: 22000, need: { "ancient-bark": 2, "spirit-crystal": 1 }, open: { gold: 10000, need: { "guardian-seed": 2 } } },
];
/** 11~15층 이상 재료(아직 층이 없어 이름만). */
export const UPPER_ITEMS: Record<string, { name: string; icon: string }> = {
  "maple-fragment": { name: "단풍 파편", icon: "🍁" }, "maze-amber": { name: "미궁 호박", icon: "🟠" }, "crimson-antler": { name: "붉은 뿔", icon: "🦌" },
  "frost-ore": { name: "서리 광석", icon: "🧊" }, "glacier-crystal": { name: "빙하 결정", icon: "💎" }, "ironbear-core": { name: "철갑곰의 핵", icon: "🐻" },
  "ancient-bark": { name: "고대 수피", icon: "🪵" }, "spirit-crystal": { name: "정령 결정", icon: "🔮" }, "guardian-seed": { name: "수호자의 씨앗", icon: "🌰" },
};
/** 진화 변경 비용(39절): 30,000골드 + 생활 장인의 핵 3, +13 이상이면 미궁 호박 2 추가. 첫 선택은 무료. */
export const EVOLUTION_CHANGE = { gold: 30000, need: { "artisan-core": 3 } as Record<string, number>, upper: { "maze-amber": 2 } as Record<string, number> };

// ---------- 방어구(26절) ----------
export type ArmorSlot = "head" | "body" | "legs";
export type ArmorDef = { id: string; slot: ArmorSlot; name: string; icon: string; tier: 1 | 2; gold: number; need: Record<string, number>;
  stats: { hp?: number; defense?: number; crit?: number; absorb?: number; speed?: number; dashCd?: number; startShield?: number }; text: string };
export const ARMORS: ArmorDef[] = [
  { id: "leather-hood", slot: "head", name: "가죽 두건", icon: "🧢", tier: 1, gold: 2000, need: { rabbitfur: 8, foxfur: 3 }, stats: { crit: 0.05, absorb: 25 }, text: "치명타 +5% · 흡수 반경 +25px" },
  { id: "reinforced-hood", slot: "head", name: "강화 가죽 두건", icon: "⛑️", tier: 2, gold: 5000, need: { rabbitfur: 12, foxfur: 8, antler: 2, "field-essence": 2 }, stats: { crit: 0.1, absorb: 45 }, text: "치명타 +10% · 흡수 반경 +45px · 상태 이상 −15%" },
  { id: "leather-vest", slot: "body", name: "가죽 조끼", icon: "🦺", tier: 1, gold: 2500, need: { boarhair: 8, bearfur: 2 }, stats: { hp: 20, defense: 2 }, text: "최대 체력 +20 · 방어력 +2" },
  { id: "reinforced-vest", slot: "body", name: "강화 가죽 조끼", icon: "🥋", tier: 2, gold: 6000, need: { boarhair: 12, bearfur: 6, tusk: 1, "field-essence": 2 }, stats: { hp: 35, defense: 4, startShield: 15 }, text: "최대 체력 +35 · 방어력 +4 · 시작 보호막 15" },
  { id: "leather-boots", slot: "legs", name: "가죽 장화", icon: "👢", tier: 1, gold: 2000, need: { rabbitfur: 6, foxfur: 3, antler: 2 }, stats: { speed: 0.08, dashCd: 0.1 }, text: "이동속도 +8% · 회피 재사용 −10%" },
  { id: "reinforced-boots", slot: "legs", name: "강화 가죽 장화", icon: "🥾", tier: 2, gold: 5000, need: { rabbitfur: 10, foxfur: 6, antler: 4, "field-essence": 2 }, stats: { speed: 0.14, dashCd: 0.2 }, text: "이동속도 +14% · 회피 재사용 −20% · 밀려남 −25%" },
];
export const SLOT_NAME: Record<ArmorSlot, string> = { head: "머리", body: "몸통", legs: "다리" };

/** 저장(42절 중 1~10층 범위). */
export type RaidSave = {
  balanceVersion: number; highestFloor: number; unlockedFloor: number; firstClears: number[];
  weapons: Record<string, { enhancement: number; evolution: Evolution | null; unlockedEnhancements: number[] }>;
  equipped: { weapon: string; head: string | null; body: string | null; legs: string | null; battlePet?: string | null };
  battlePets?: Record<string, { level: number }>; petPity?: number;
  armorOwned: string[];
  stabilizers: number; towerSeals: number; contractShards: number;
};
export const EMPTY_RAID: RaidSave = { balanceVersion: RAID_BALANCE_VERSION, highestFloor: 0, unlockedFloor: 1, firstClears: [], weapons: { "raid-scythe": { enhancement: 0, evolution: null, unlockedEnhancements: [] } }, equipped: { weapon: "raid-scythe", head: null, body: null, legs: null, battlePet: null }, battlePets: {}, petPity: 0, armorOwned: [], stabilizers: 0, towerSeals: 0, contractShards: 0 };

/** 착용한 방어구 능력 합계. */
export function gearOf(raid: RaidSave) {
  const g = { hp: 0, defense: 0, crit: 0, absorb: 0, speed: 0, dashCd: 0, startShield: 0 };
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
