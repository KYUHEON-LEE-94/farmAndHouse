/**
 * 주방(요리) — **사냥 준비물** 시스템. 가공(절임 항아리)과 확실히 구분한다.
 * - 가공: 농작물을 가공해 더 비싸게 "파는" 것(app/workshop.ts).
 * - 요리: 농산물·물고기로 "사냥에서 먹을" 음식을 만든다. 팔 수 없고 농사 버프도 없다.
 *   등급에 따라 사냥 능력치(공격·회복·추적·회피)가 달라진다. 만든 요리는 🎒 사냥 가방에 모인다.
 * - 요리할 때 타이밍 미니게임(3단계)을 한다. 맞출수록 좋은 등급이 나올 "확률"이 올라간다(확정은 아님).
 */
import { CROPS } from "./farming";
import { TEST_MODE } from "./testMode";

/** 주방 공개 여부. 토벌 기능이 나온 뒤 KITCHEN_RELEASED를 true로 바꿔 공개한다. 로컬 테스트 모드에서는 항상 보인다. */
export const KITCHEN_RELEASED = false;
export const KITCHEN_ENABLED = KITCHEN_RELEASED || TEST_MODE;

/** 재료: 특정 작물 n개, 또는 아무 물고기 n마리(전설 제외, 싼 것부터). */
export type Ingredient = { kind: "crop"; id: string; count: number } | { kind: "fish"; count: number };
/** 사냥에서 쓰일 능력치. */
export type HuntStat = "attack" | "heal" | "track" | "dodge" | "all";
/** values: 등급별 수치(보통·맛있음·일품). */
export type Dish = { id: string; name: string; icon: string; ingredients: Ingredient[]; stat: HuntStat; values: [number, number, number]; note: string };

export const HUNT_STATS: Record<HuntStat, { name: string; icon: string; unit: (value: number) => string }> = {
  attack: { name: "공격력", icon: "⚔️", unit: value => `+${value}%` },
  heal: { name: "지속 회복", icon: "💚", unit: value => `+${value}` },
  track: { name: "추적 시간", icon: "👣", unit: value => `+${value}초` },
  dodge: { name: "회피", icon: "💨", unit: value => `+${value}회` },
  all: { name: "모든 능력", icon: "🌟", unit: value => `+${value}%` },
};

export const DISHES: Dish[] = [
  { id: "maeuntang", name: "매운탕", icon: "🍲", ingredients: [{ kind: "fish", count: 2 }, { kind: "crop", id: "pepper", count: 1 }, { kind: "crop", id: "radish", count: 1 }], stat: "attack", values: [8, 12, 18], note: "얼큰해서 힘이 솟아요" },
  { id: "jorim", name: "감자 생선조림", icon: "🥘", ingredients: [{ kind: "crop", id: "potato", count: 2 }, { kind: "fish", count: 1 }, { kind: "crop", id: "greenonion", count: 1 }], stat: "heal", values: [10, 15, 22], note: "든든해서 오래 버텨요" },
  { id: "bibimbap", name: "텃밭 비빔밥", icon: "🥗", ingredients: [{ kind: "crop", id: "spinach", count: 1 }, { kind: "crop", id: "pepper", count: 1 }, { kind: "crop", id: "radish", count: 1 }, { kind: "crop", id: "broccoli", count: 1 }], stat: "track", values: [3, 5, 8], note: "몸이 가벼워 흔적을 오래 쫓아요" },
  { id: "gui", name: "생선구이 정식", icon: "🐟", ingredients: [{ kind: "fish", count: 1 }, { kind: "crop", id: "greenonion", count: 1 }, { kind: "crop", id: "cabbage", count: 1 }], stat: "dodge", values: [1, 1, 2], note: "날렵해져 공격을 피해요" },
  { id: "dosirak", name: "산해진미 도시락", icon: "🍱", ingredients: [{ kind: "fish", count: 2 }, { kind: "crop", id: "tomato", count: 1 }, { kind: "crop", id: "corn", count: 1 }, { kind: "crop", id: "sweetpotato", count: 1 }, { kind: "crop", id: "apple", count: 1 }], stat: "all", values: [5, 8, 12], note: "사계절 재료를 모은 특별 도시락" },
];

export const DISH_GRADES = [
  { name: "보통", stars: "" },
  { name: "맛있음", stars: "★" },
  { name: "일품", stars: "★★" },
] as const;

/** 미니게임 판정: 정확 2점, 좋음 1점, 놓침 0점. 3단계라 0~6점. */
export const COOK_STEPS = ["재료 넣기", "불 조절", "마무리"] as const;
export const COOK_MAX_SCORE = COOK_STEPS.length * 2;

/**
 * 점수별 등급 확률. 타이밍을 맞출수록 일품·맛있음 확률이 오르지만 확정은 아니다.
 * 0점: 보통 85% · 맛있음 14% · 일품 1%  →  6점: 보통 7% · 맛있음 50% · 일품 43%
 */
export function gradeChances(score: number): [number, number, number] {
  const s = Math.max(0, Math.min(COOK_MAX_SCORE, score));
  const best = 0.01 + 0.07 * s, good = 0.14 + 0.06 * s;
  return [Math.max(0, 1 - best - good), good, best];
}
export function rollGrade(score: number, random = Math.random) {
  const [, good, best] = gradeChances(score), roll = random();
  return roll < best ? 2 : roll < best + good ? 1 : 0;
}

/** 사냥 능력치 설명(예: "⚔️ 공격력 +12%"). */
export function dishEffectText(dish: Dish, grade: number) {
  const stat = HUNT_STATS[dish.stat];
  return `${stat.icon} ${stat.name} ${stat.unit(dish.values[grade])}`;
}
export const cropName = (id: string) => CROPS.find(crop => crop.id === id)?.name ?? id;
export const cropIcon = (id: string) => CROPS.find(crop => crop.id === id)?.icon ?? "🌱";
