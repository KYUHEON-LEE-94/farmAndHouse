/**
 * 펫 키우기: 먹이·산책·교감으로 애정도를 올리고, 애정도가 가득 차면 레벨업(최대 3).
 * 레벨이 오를 때마다 그 펫의 능력이 강해진다(능력 배수 Lv1 ×1 · Lv2 ×1.25 · Lv3 ×1.5).
 */
export type PetFood = { id: string; name: string; icon: string; price: number; affection: number; note: string };
export const PET_FOODS: PetFood[] = [
  { id: "kibble", name: "기본 사료", icon: "🥣", price: 200, affection: 10, note: "애정도 +10" },
  { id: "jerky", name: "고기 간식", icon: "🍖", price: 600, affection: 25, note: "애정도 +25" },
  { id: "tuna", name: "특제 참치", icon: "🍣", price: 1500, affection: 50, note: "애정도 +50" },
  { id: "cake", name: "왕실 케이크", icon: "🎂", price: 4000, affection: 100, note: "애정도 +100 (한 번에 가득!)" },
];

export const PET_MAX_LEVEL = 3;
export const AFFECTION_MAX = 100;
/** 능력 배수: 레벨 1·2·3. */
export const PET_POWER = [1, 1.25, 1.5];

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

const pct = (value: number) => `${Math.round(value * 1000) / 10}%`;

/** 레벨별 능력 설명. 일반 펫은 Lv1 능력이 없고, Lv2·3에 작은 판매가 보너스가 생긴다. */
export function petAbility(id: string, level: number, special: boolean): string {
  const p = PET_POWER[Math.max(0, Math.min(PET_MAX_LEVEL, level) - 1)];
  if (!special) return level <= 1 ? "능력 없음 (Lv2부터 정든 친구 효과)" : `정든 친구: 작물 판매가 +${level - 1}%`;
  switch (id) {
    case "dog": return `벌레가 날아오면 ${pct(0.25 * p)} 확률로 짖어서 쫓아내요`;
    case "cat": return `희귀 물고기 확률 ×${(1 + 0.2 * p).toFixed(2)}`;
    case "rabbit": return `씨앗값 -${pct(0.05 * p)}`;
    case "duck": return `물뿌리개 용량 +${Math.round(2 * p)}`;
    case "mole": return `새로 심는 작물 성장 시간 -${pct(0.05 * p)}`;
    case "weasel": return `벌레를 놓쳤을 때 판매가 피해 -10% → -${pct(0.1 * (1 - 0.5 * p))}`;
    case "tiger": return `마을 이벤트 디버프 지속 시간 ×${tigerDebuff(level)}`;
    case "dragon": return `새로 심는 작물 성장 시간 -${pct(0.15 * p)}`;
    case "phoenix": return `낚시 미니게임 게이지가 ${pct(0.25 * p)} 빨리 참`;
    case "whitetiger": return `벌레를 놓쳐도 작물이 상하지 않음${level > 1 ? ` · 벌레 출현 -${(level - 1) * 15}%` : ""}`;
    case "blacktortoise": return `물뿌리개 용량 +${Math.round(8 * p)}`;
    case "gumiho": return `작물 판매가 +${pct(0.15 * p)}`;
    default: return "";
  }
}

/** 호랑이 디버프 지속 배수: Lv1 0.5 · Lv2 0.45 · Lv3 0.4 */
export function tigerDebuff(level: number) { return [0.5, 0.45, 0.4][Math.max(0, Math.min(PET_MAX_LEVEL, level) - 1)]; }

/** 받침에 맞는 조사를 붙인다. 예) josa("강아지", "이가") → "강아지가", josa("호랑이", "을를") → "호랑이를". */
export function josa(word: string, pair: "이가" | "을를" | "와과" | "은는") {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const batchim = code >= 0 && code <= 11171 && code % 28 !== 0;
  const [withB, without] = pair === "이가" ? ["이", "가"] : pair === "을를" ? ["을", "를"] : pair === "와과" ? ["과", "와"] : ["은", "는"];
  return word + (batchim ? withB : without);
}
