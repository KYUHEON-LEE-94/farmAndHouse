/**
 * 전투 각성 카드 확장(HUNTING_RAID.md 53절)과 자동 보조무기(62절).
 * - 카드마다 계열·등급·가중치·등장 조건을 두고, 레벨별 구성 보장을 먼저 채운 뒤 나머지를 가중치로 뽑는다.
 * - 처음부터 유효 후보만 거른다(뽑은 뒤 바꿔 끼우지 않는다).
 */
import type { AttackMode } from "./weapons";

export type AwakenCategory = "basic" | "special" | "auxiliary" | "survival" | "mobility" | "terrain" | "pet";
export type AwakenTier = "basic" | "advanced" | "rare";
/** 등장 조건 키(모두 만족해야 후보) */
export type AwakenReq = "evo" | "pet" | "food" | "shieldSrc" | "melee" | "ranged" | "area" | "slowTerrain" | "flowers" | "noAux" | "hasAux";
/** 쾌속: 한 판 보조무기 최대 칸 */
export const MAX_AUX = 3;
export type AwakenMeta = { cat: AwakenCategory; tier: AwakenTier; minLevel?: number; req?: AwakenReq[]; excludes?: string[]; weight?: number };

export const CATEGORY_LABEL: Record<AwakenCategory, { icon: string; name: string }> = {
  basic: { icon: "⚔️", name: "기본 공격" }, special: { icon: "🌟", name: "특수 공격" }, auxiliary: { icon: "🪃", name: "보조무기" },
  survival: { icon: "🛡️", name: "생존" }, mobility: { icon: "💨", name: "기동" }, terrain: { icon: "🗺️", name: "지형" }, pet: { icon: "🐾", name: "전투펫" },
};
const TIER_WEIGHT: Record<AwakenTier, number> = { basic: 100, advanced: 55, rare: 25 };
const TIER_MIN_LEVEL: Record<AwakenTier, number> = { basic: 2, advanced: 3, rare: 4 };

export const AWAKEN_META: Record<string, AwakenMeta> = {
  // 기본 공격(53.2·53.3)
  "keen-edge": { cat: "basic", tier: "basic" },
  "quick-grip": { cat: "basic", tier: "basic" },
  "long-handle": { cat: "basic", tier: "basic" },
  "critical-eye": { cat: "basic", tier: "basic" },
  "first-strike": { cat: "basic", tier: "basic" },
  "heavy-swing": { cat: "basic", tier: "advanced", req: ["melee"] },
  "double-cut": { cat: "basic", tier: "advanced" },
  "critical-force": { cat: "basic", tier: "advanced" },
  "boss-hunter": { cat: "basic", tier: "advanced" },
  "close-instinct": { cat: "basic", tier: "advanced", req: ["melee"], excludes: ["keep-distance"] },
  "keep-distance": { cat: "basic", tier: "advanced", req: ["ranged"], excludes: ["close-instinct"] },
  "battle-tempo": { cat: "basic", tier: "advanced" },
  "armor-crack": { cat: "basic", tier: "advanced" },
  "focused-swing": { cat: "basic", tier: "advanced" },
  "sweeping-edge": { cat: "basic", tier: "advanced", req: ["area"] },
  // 특수 공격(53.4)
  "special-force": { cat: "special", tier: "basic", req: ["evo"] },
  "special-haste": { cat: "special", tier: "basic", req: ["evo"] },
  "special-shield": { cat: "special", tier: "advanced", req: ["evo"] },
  "special-echo": { cat: "special", tier: "advanced", req: ["evo"] },
  "special-heal": { cat: "special", tier: "advanced", req: ["evo"] },
  "perfect-timing": { cat: "special", tier: "advanced", req: ["evo"] },
  "hunter-reset": { cat: "special", tier: "rare", req: ["evo"] },
  // 생존(53.5)
  vitality: { cat: "survival", tier: "basic" },
  "hard-leather": { cat: "survival", tier: "basic" },
  "emergency-shield": { cat: "survival", tier: "basic" },
  "thorn-armor": { cat: "survival", tier: "basic" },
  "steady-recovery": { cat: "survival", tier: "advanced" },
  "elite-remedy": { cat: "survival", tier: "advanced" },
  "food-expert": { cat: "survival", tier: "advanced", req: ["food"] },
  "shield-keeper": { cat: "survival", tier: "advanced", req: ["shieldSrc"] },
  "second-wind": { cat: "survival", tier: "rare" },
  // 기동·지형(53.6)
  "wind-step": { cat: "mobility", tier: "basic" },
  "quick-dash": { cat: "mobility", tier: "basic" },
  "long-dash": { cat: "mobility", tier: "basic" },
  "cutting-trail": { cat: "mobility", tier: "advanced" },
  "terrain-boots": { cat: "terrain", tier: "basic", req: ["slowTerrain"] },
  "opportunity-master": { cat: "terrain", tier: "advanced", req: ["flowers"] },
  "safe-route": { cat: "terrain", tier: "advanced" },
  "pressure-runner": { cat: "terrain", tier: "advanced" },
  // 전투펫(53.7)
  "pet-training": { cat: "pet", tier: "basic", req: ["pet"] },
  "pet-haste": { cat: "pet", tier: "basic", req: ["pet"] },
  "pet-bond": { cat: "pet", tier: "advanced", req: ["pet", "evo"] },
  "pet-guard": { cat: "pet", tier: "rare", req: ["pet"] },
  "pet-finisher": { cat: "pet", tier: "rare", req: ["pet", "evo"] },
  // 보조무기 획득(62.2·62.4): 한 판 1개, Lv.3부터
  "aux-slingshot": { cat: "auxiliary", tier: "basic", req: ["noAux"], weight: 70 },
  "aux-hand-sickle": { cat: "auxiliary", tier: "basic", req: ["noAux"], weight: 70 },
  "aux-seed-bomb": { cat: "auxiliary", tier: "advanced", req: ["noAux"], weight: 50 },
  "aux-sprinkler": { cat: "auxiliary", tier: "advanced", req: ["noAux"], weight: 50 },
  "aux-beehive": { cat: "auxiliary", tier: "advanced", req: ["noAux"], weight: 50 },
  "aux-scarecrow": { cat: "auxiliary", tier: "rare", req: ["noAux"], weight: 30 },
  // 보조무기 강화(62.3): 획득한 다음 레벨부터
  "auxiliary-power": { cat: "auxiliary", tier: "basic", minLevel: 3, req: ["hasAux"], weight: 45 },
  "auxiliary-range": { cat: "auxiliary", tier: "basic", minLevel: 3, req: ["hasAux"], weight: 35 },
  "auxiliary-haste": { cat: "auxiliary", tier: "advanced", req: ["hasAux"], weight: 15 },
  "auxiliary-mastery": { cat: "auxiliary", tier: "rare", req: ["hasAux"], weight: 8 },
};
export const isAuxCard = (id: string) => AWAKEN_META[id]?.cat === "auxiliary";
const ATTACK_CATS: AwakenCategory[] = ["basic", "special", "auxiliary"];

// ---------- 자동 보조무기(62.2) ----------
export type AuxId = "aux-slingshot" | "aux-hand-sickle" | "aux-seed-bomb" | "aux-sprinkler" | "aux-beehive" | "aux-scarecrow";
export type AuxDef = { id: AuxId; name: string; icon: string; cd: number; range: number; damage: number; text: string };
export const AUX_WEAPONS: Record<AuxId, AuxDef> = {
  "aux-slingshot": { id: "aux-slingshot", name: "참새 새총", icon: "🐦", cd: 3.2, range: 360, damage: 12, text: "3.2초마다 가장 가까운 적에게 돌멩이(피해 12)" },
  "aux-hand-sickle": { id: "aux-hand-sickle", name: "날아가는 손낫", icon: "🪃", cd: 5, range: 300, damage: 16, text: "5초마다 손낫이 날아갔다 돌아옴(16 + 돌아올 때 8, 최대 3명)" },
  "aux-seed-bomb": { id: "aux-seed-bomb", name: "톡톡 씨앗탄", icon: "🌰", cd: 7, range: 380, damage: 20, text: "7초마다 적이 가장 많은 곳에 씨앗탄(반경 65, 피해 20, 최대 5명)" },
  "aux-sprinkler": { id: "aux-sprinkler", name: "꼬마 스프링클러", icon: "💦", cd: 10, range: 105, damage: 3, text: "10초마다 4초간 물 뿌리기(1초마다 3, 둔화 10%, 최대 4명)" },
  "aux-beehive": { id: "aux-beehive", name: "휴대 벌통", icon: "🐝", cd: 8, range: 320, damage: 7, text: "8초마다 체력 높은 적에게 벌 3마리(각 7)" },
  "aux-scarecrow": { id: "aux-scarecrow", name: "깜짝 허수아비", icon: "🎃", cd: 12, range: 130, damage: 8, text: "주변 적 5명 이상일 때 12초마다 쾅(8·밀어내기·경직)" },
};
export const AUX_MASTERY_TEXT: Record<AuxId, string> = {
  "aux-slingshot": "적중 후 120px 안 1명에게 40% 도탄", "aux-hand-sickle": "돌아오는 피해 12, 최대 4명", "aux-seed-bomb": "폭발 뒤 2초간 싹 장판(초당 2)",
  "aux-sprinkler": "5초 유지, 둔화 13%", "aux-beehive": "벌 1마리 추가", "aux-scarecrow": "주변 4명부터 발동, 보호막 6(3초)",
};

/** 무기 공격 방식 태그 */
const MELEE: AttackMode[] = ["arc", "slam", "thrust", "channel", "beam", "spread"];
const RANGED: AttackMode[] = ["arrow", "bullet", "bolt", "hook", "lob"];
const AREA: AttackMode[] = ["arc", "slam", "spread", "channel", "lob"];

export type ChoiceContext = {
  level: number; picks: Partial<Record<string, number>>; maxOf: (id: string) => number;
  mode: AttackMode; evo: boolean; pet: boolean; food: boolean; shieldSrc: boolean; slowTerrain: boolean; flowers: boolean;
  /** 이미 가진 보조무기 수, 첫 보조무기를 얻은 레벨 */
  auxCount: number; auxLevel: number; random: () => number;
};
function reqOk(r: AwakenReq, c: ChoiceContext) {
  switch (r) {
    case "evo": return c.evo; case "pet": return c.pet; case "food": return c.food; case "shieldSrc": return c.shieldSrc;
    case "melee": return MELEE.includes(c.mode); case "ranged": return RANGED.includes(c.mode); case "area": return AREA.includes(c.mode);
    case "slowTerrain": return c.slowTerrain; case "flowers": return c.flowers;
    case "noAux": return c.auxCount < MAX_AUX; case "hasAux": return c.auxCount > 0 && c.level > c.auxLevel;
  }
}
/** 지금 레벨에서 제시할 수 있는 카드(중첩 미만·조건 만족·배타 카드 없음). */
export function validCards(c: ChoiceContext) {
  return Object.entries(AWAKEN_META).filter(([id, m]) => (c.picks[id] ?? 0) < c.maxOf(id)
    && c.level >= (m.minLevel ?? TIER_MIN_LEVEL[m.tier])
    && (m.req ?? []).every(r => reqOk(r, c))
    && !(m.excludes ?? []).some(x => (c.picks[x] ?? 0) > 0)).map(([id]) => id);
}
const weightOf = (id: string) => AWAKEN_META[id].weight ?? TIER_WEIGHT[AWAKEN_META[id].tier];
function weighted(ids: string[], random: () => number) {
  const total = ids.reduce((sum, id) => sum + weightOf(id), 0);
  let roll = random() * total;
  for (const id of ids) { roll -= weightOf(id); if (roll < 0) return id; }
  return ids[ids.length - 1];
}
/**
 * 레벨업 카드 3장(Lv.5 최종 각성은 엔진이 따로). 구성 보장(53.1·53.8):
 * Lv.2 기본 등급만 · 공격 1 + 생존/기동 1 / Lv.3 공격 1 + 고급 1 + 아직 안 고른 계열 1 / Lv.4 무기 시너지 1 + 생존 1 + 고급·희귀 1.
 * 한 화면에 보조무기 카드는 최대 1장. 모자라면 아무 유효 카드로 채운다.
 */
export function rollChoices(c: ChoiceContext, count = 3, extraPool?: string[]) {
  let pool = validCards(c);
  if (c.level === 2) pool = pool.filter(id => AWAKEN_META[id].tier === "basic");
  if (extraPool) pool = pool.filter(id => extraPool.includes(id));
  const out: string[] = [];
  const take = (pred: (id: string) => boolean) => {
    if (out.length >= count) return;
    const acquire = (id: string) => id.startsWith("aux-");
    const cand = pool.filter(id => !out.includes(id) && pred(id) && !(isAuxCard(id) && out.some(o => isAuxCard(o) && acquire(o) === acquire(id))));
    if (cand.length) out.push(weighted(cand, c.random));
  };
  const cat = (id: string) => AWAKEN_META[id].cat, tier = (id: string) => AWAKEN_META[id].tier;
  const pickedCats = new Set(Object.keys(c.picks).filter(id => (c.picks[id] ?? 0) > 0 && AWAKEN_META[id]).map(cat));
  if (c.level === 2) { take(id => ATTACK_CATS.includes(cat(id))); take(id => cat(id) === "survival" || cat(id) === "mobility"); }
  else if (c.level === 3) { take(id => ATTACK_CATS.includes(cat(id))); take(id => tier(id) !== "basic"); take(id => !pickedCats.has(cat(id))); }
  else if (c.level === 4) { take(id => cat(id) === "basic" || cat(id) === "special" || cat(id) === "auxiliary"); take(id => cat(id) === "survival"); take(id => tier(id) !== "basic"); }
  else if (c.level === 5) { take(id => tier(id) !== "basic"); }
  while (out.length < count) { const before = out.length; take(() => true); if (out.length === before) break; }
  // 보여 주는 순서는 섞는다
  return out.sort(() => c.random() - 0.5);
}
