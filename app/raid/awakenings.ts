/**
 * 전투 각성 카드 확장(HUNTING_RAID.md 53절)과 자동 보조무기(62절).
 * - 카드마다 계열·등급·가중치·등장 조건을 두고, 레벨별 구성 보장을 먼저 채운 뒤 나머지를 가중치로 뽑는다.
 * - 처음부터 유효 후보만 거른다(뽑은 뒤 바꿔 끼우지 않는다).
 */
import type { AttackMode } from "./weapons";

export type AwakenCategory = "basic" | "special" | "auxiliary" | "survival" | "mobility" | "terrain" | "pet";
export type AwakenTier = "basic" | "advanced" | "rare";
/** 등장 조건 키(모두 만족해야 후보) */
export type AwakenReq = "evo" | "pet" | "food" | "shieldSrc" | "melee" | "ranged" | "area" | "slowTerrain" | "flowers" | "noAux" | "hasAux" | "poison" | "longReach";
/** 쾌속: 한 판 보조무기 최대 칸 */
export const MAX_AUX = 3;
/** modes: 이 공격 방식에서만 제시(WEAPON_CARD_UI_DESIGN_SPEC 1절 allowedModes). 있으면 "공격 방식 전용 카드". */
export type AwakenMeta = { cat: AwakenCategory; tier: AwakenTier; minLevel?: number; req?: AwakenReq[]; excludes?: string[]; weight?: number; modes?: AttackMode[] };
/** 공격 방식 묶음과 카드 호환 태그 */
const ARC: AttackMode[] = ["arc"], SLAM: AttackMode[] = ["slam"], SPRAY: AttackMode[] = ["channel", "beam"], LOB: AttackMode[] = ["lob"], LINE: AttackMode[] = ["thrust", "hook"], SHOT: AttackMode[] = ["arrow", "bolt"], GUN: AttackMode[] = ["bullet", "spread"];
export const MODE_TAG: Record<AttackMode, string> = { arc: "베기형", slam: "충격형", channel: "분사형", beam: "분사형", lob: "투척형", thrust: "찌르기형", hook: "찌르기형", arrow: "투사체형", bolt: "투사체형", bullet: "총기형", spread: "총기형" };
/** 카드가 공격 방식 전용이면 그 태그, 아니면 "공용" */
export const cardTag = (id: string) => { const m = AWAKEN_META[id]?.modes; return m?.length ? MODE_TAG[m[0]] : "공용"; };
export const isModeCard = (id: string) => Boolean(AWAKEN_META[id]?.modes?.length);

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
  // ---- 공격 방식 전용(WEAPON_CARD_UI_DESIGN_SPEC 1절) ----
  // 베기형(arc): 자루 연장·베기 각도·연속 베기·휩쓸기
  "long-handle": { cat: "basic", tier: "basic", modes: ARC },
  "wide-arc": { cat: "basic", tier: "basic", modes: ARC },
  "critical-eye": { cat: "basic", tier: "basic" },
  "first-strike": { cat: "basic", tier: "basic" },
  "heavy-swing": { cat: "basic", tier: "advanced", req: ["melee"] },
  "double-cut": { cat: "basic", tier: "advanced", modes: ARC },
  "critical-force": { cat: "basic", tier: "advanced" },
  "boss-hunter": { cat: "basic", tier: "advanced" },
  "close-instinct": { cat: "basic", tier: "advanced", req: ["melee"], excludes: ["keep-distance"] },
  // 거리 유지: 실제로 260px 밖을 맞힐 수 있는 무기만(낚싯대처럼 사거리가 짧으면 효과 0)
  "keep-distance": { cat: "basic", tier: "advanced", req: ["ranged", "longReach"], excludes: ["close-instinct"] },
  "battle-tempo": { cat: "basic", tier: "advanced" },
  "armor-crack": { cat: "basic", tier: "advanced" },
  "focused-swing": { cat: "basic", tier: "advanced" },
  "sweeping-edge": { cat: "basic", tier: "advanced", modes: ARC },
  // 충격형(slam): 충격 반경·내려찍기 거리·여진·경직
  "impact-radius": { cat: "basic", tier: "basic", modes: SLAM },
  "slam-reach": { cat: "basic", tier: "basic", modes: SLAM },
  aftershock: { cat: "basic", tier: "advanced", modes: SLAM },
  "stun-slam": { cat: "basic", tier: "advanced", modes: SLAM },
  // 분사형(channel·beam): 분사 길이·분사 폭·틱 속도·집중 피해
  "spray-length": { cat: "basic", tier: "basic", modes: SPRAY },
  "spray-width": { cat: "basic", tier: "basic", modes: SPRAY },
  "spray-tick": { cat: "basic", tier: "advanced", modes: SPRAY },
  "focus-spray": { cat: "basic", tier: "advanced", modes: SPRAY },
  // 투척형(lob): 투척 거리·폭발 반경·추가 투사체·장판 지속시간(독 장판 무기만)
  "throw-range": { cat: "basic", tier: "basic", modes: LOB },
  "blast-radius": { cat: "basic", tier: "basic", modes: LOB },
  "extra-bomb": { cat: "basic", tier: "advanced", modes: LOB },
  lingering: { cat: "basic", tier: "advanced", modes: LOB, req: ["poison"] },
  // 찌르기형(thrust·hook): 찌르기 길이·폭, 관통(낚싯줄), 2차 타격, 연쇄 대상
  "line-reach": { cat: "basic", tier: "basic", modes: LINE },
  "pierce-line": { cat: "basic", tier: "advanced", modes: ["hook"] },
  "line-double": { cat: "basic", tier: "advanced", modes: LINE },
  "chain-target": { cat: "basic", tier: "advanced", modes: LINE },
  // 투사체형(arrow·bolt): 사거리·탄속·다중 발사·관통
  "shot-range": { cat: "basic", tier: "basic", modes: SHOT },
  "shot-speed": { cat: "basic", tier: "basic", modes: SHOT },
  "multi-shot": { cat: "basic", tier: "advanced", modes: SHOT },
  "pierce-shot": { cat: "basic", tier: "advanced", modes: SHOT },
  // 총기형(bullet·spread): 발사 간격·추가 탄환·주기적 강화탄·집탄(산탄만)
  "gun-rate": { cat: "basic", tier: "basic", modes: GUN },
  "extra-pellet": { cat: "basic", tier: "basic", modes: GUN },
  "power-round": { cat: "basic", tier: "advanced", modes: GUN },
  "tight-spread": { cat: "basic", tier: "advanced", modes: ["spread"] },
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
  /** 무기 특수 효과 키(예: poison), 최대 타격 거리(사거리 + 폭발 반경) */
  fx?: string[]; reach?: number;
};
function reqOk(r: AwakenReq, c: ChoiceContext) {
  switch (r) {
    case "evo": return c.evo; case "pet": return c.pet; case "food": return c.food; case "shieldSrc": return c.shieldSrc;
    case "melee": return MELEE.includes(c.mode); case "ranged": return RANGED.includes(c.mode); case "area": return AREA.includes(c.mode);
    case "slowTerrain": return c.slowTerrain; case "flowers": return c.flowers;
    case "noAux": return c.auxCount < MAX_AUX; case "hasAux": return c.auxCount > 0 && c.level > c.auxLevel;
    case "poison": return Boolean(c.fx?.includes("poison"));
    case "longReach": return (c.reach ?? 0) >= 260;
  }
}
/** 지금 레벨에서 제시할 수 있는 카드(중첩 미만·조건 만족·배타 카드 없음). */
export function validCards(c: ChoiceContext) {
  return Object.entries(AWAKEN_META).filter(([id, m]) => (c.picks[id] ?? 0) < c.maxOf(id)
    && c.level >= (m.minLevel ?? TIER_MIN_LEVEL[m.tier])
    && (!m.modes || m.modes.includes(c.mode))
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
  // WEAPON_CARD_UI_DESIGN_SPEC 1절 제시 구성
  if (c.level === 2) { take(id => cat(id) === "basic"); take(id => cat(id) === "survival" || cat(id) === "mobility"); }
  else if (c.level === 3 || c.level === 4) { take(isModeCard); }
  else if (c.level === 5) { take(id => tier(id) !== "basic"); }
  else { take(isModeCard); take(id => !isModeCard(id)); take(id => !isModeCard(id)); }
  while (out.length < count) { const before = out.length; take(() => true); if (out.length === before) break; }
  // 보여 주는 순서는 섞는다
  return out.sort(() => c.random() - 0.5);
}
