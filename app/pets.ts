/**
 * 펫 키우기: 먹이·산책·교감으로 애정도를 올리고, 애정도가 가득 차면 레벨업(최대 100).
 * 레벨이 오를 때마다 그 펫의 능력이 강해진다(기본 능력의 레벨당 0.1%씩 증가).
 */
export type PetFood = { id: string; name: string; icon: string; price: number; affection: number; note: string };
export const PET_FOODS: PetFood[] = [
  { id: "kibble", name: "기본 사료", icon: "🥣", price: 200, affection: 10, note: "애정도 +10" },
  { id: "jerky", name: "고기 간식", icon: "🍖", price: 600, affection: 25, note: "애정도 +25" },
  { id: "tuna", name: "특제 참치", icon: "🍣", price: 1500, affection: 50, note: "애정도 +50" },
  { id: "cake", name: "왕실 케이크", icon: "🎂", price: 4000, affection: 100, note: "애정도 +100 (한 번에 가득!)" },
];

export const PET_MAX_LEVEL = 100;
export const AFFECTION_MAX = 100;
/** Lv1 기본 효과. 설명과 실제 플레이 계산에서 같은 값을 사용한다. */
export const PET_BASE = {
  dog: 0.20, cat: 0.16, rabbit: 0.04, duck: 2, mole: 0.04,
  weasel: 0.40, tiger: 0.40, dragon: 0.12, phoenix: 0.20,
  whitetiger: 0.80, blacktortoise: 6, gumiho: 0.12,
  dogCatch: 0.20, catCatch: 0.12,
} as const;
export function petBugPenalty(weaselPower: number, whiteTigerPower: number) {
  return 0.1 * (1 - Math.max(PET_BASE.weasel * weaselPower, PET_BASE.whitetiger * whiteTigerPower));
}
/** 기본 능력 대비 레벨당 0.1% 증가(복리 아님). */
export const PET_POWER = Array.from({ length: PET_MAX_LEVEL }, (_, index) => 1 + index * 0.001);
const levelSteps = (level: number) => Math.max(0, Math.min(PET_MAX_LEVEL, Math.floor(level)) - 1);
export const friendSaleBonus = (level: number) => levelSteps(level) * 0.0001;
export const whiteTigerBugReduction = (level: number) => levelSteps(level) * 0.001;

/** 배부름: 먹이 한 번에 +40, 1분에 1씩 줄어든다. 80 이상이면 배불러서 안 먹는다. */
export const FULL_PER_FEED = 40;
export const FULL_REFUSE = 80;
export const HUNGER_PER_MINUTE = 1;
export const WALK_COOLDOWN_MIN = 15;
export const WALK_AFFECTION = 8;
export const PLAY_COOLDOWN_MIN = 5;
export const PLAY_AFFECTION = 3;

export type PetCare = { affection: number; level: number; full: number; fullAt: number; walkAt: number; playAt: number };
export const newCare = (now = Date.now()): PetCare => ({ affection: 0, level: 1, full: 50, fullAt: now, walkAt: 0, playAt: 0 });

export function fullness(care: PetCare, now: number) {
  return Math.max(0, Math.min(100, care.full - ((now - care.fullAt) / 60000) * HUNGER_PER_MINUTE));
}

/** 애정도를 더하고, 가득 차면 레벨업. 최대 레벨이면 100에서 멈춘다. */
export function addAffection(care: PetCare, amount: number) {
  let affection = care.affection + amount, level = care.level, leveled = 0;
  while (affection >= AFFECTION_MAX && level < PET_MAX_LEVEL) { affection -= AFFECTION_MAX; level++; leveled++; }
  if (level >= PET_MAX_LEVEL) affection = Math.min(affection, AFFECTION_MAX);
  return { care: { ...care, affection, level }, leveled };
}

const pct = (value: number) => `${Math.round(value * 100000) / 1000}%`;

/** 레벨별 능력 설명. 일반 펫은 Lv1 능력이 없고, Lv2부터 작은 판매가 보너스가 생긴다. */
export function petAbility(id: string, level: number, special: boolean): string {
  const p = PET_POWER[levelSteps(level)];
  if (!special) return level <= 1 ? "능력 없음 (Lv2부터 정든 친구 효과)" : `정든 친구: 작물 판매가 +${pct(friendSaleBonus(level))}`;
  switch (id) {
    case "dog": return `벌레가 날아오면 ${pct(PET_BASE.dog * p)} 확률로 짖어서 쫓아내요`;
    case "cat": return `희귀 물고기 확률 ×${(1 + PET_BASE.cat * p).toFixed(4)}`;
    case "rabbit": return `씨앗값 -${pct(PET_BASE.rabbit * p)}`;
    case "duck": return `물뿌리개 용량 +${Math.round(PET_BASE.duck * p)}`;
    case "mole": return `새로 심는 작물 성장 시간 -${pct(PET_BASE.mole * p)}`;
    case "weasel": return `벌레를 놓쳤을 때 판매가 피해 -10% → -${pct(petBugPenalty(p, 0))}`;
    case "tiger": return `마을 이벤트 디버프 지속 시간 ×${tigerDebuff(level)}`;
    case "dragon": return `새로 심는 작물 성장 시간 -${pct(PET_BASE.dragon * p)}`;
    case "phoenix": return `낚시 미니게임 게이지가 ${pct(PET_BASE.phoenix * p)} 빨리 참`;
    case "whitetiger": return `벌레를 놓쳤을 때 판매가 피해 -10% → -${pct(petBugPenalty(0, p))}${level > 1 ? ` · 벌레 출현 -${pct(whiteTigerBugReduction(level))}` : ""}`;
    case "blacktortoise": return `물뿌리개 용량 +${Math.round(PET_BASE.blacktortoise * p)}`;
    case "gumiho": return `작물 판매가 +${pct(PET_BASE.gumiho * p)}`;
    default: return "";
  }
}

/** 호랑이 디버프 지속 배수: 피해 시간 감소 효과가 레벨당 기본 효과의 0.1%씩 증가. */
export function tigerDebuff(level: number) { return Number((1 - PET_BASE.tiger * PET_POWER[levelSteps(level)]).toFixed(4)); }

/** 받침에 맞는 조사를 붙인다. 예) josa("강아지", "이가") → "강아지가", josa("호랑이", "을를") → "호랑이를". */
export function josa(word: string, pair: "이가" | "을를" | "와과" | "은는") {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const batchim = code >= 0 && code <= 11171 && code % 28 !== 0;
  const [withB, without] = pair === "이가" ? ["이", "가"] : pair === "을를" ? ["을", "를"] : pair === "와과" ? ["과", "와"] : ["은", "는"];
  return word + (batchim ? withB : without);
}
