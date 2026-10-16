/**
 * 가공 공방(절임 항아리): 창고 작물을 실제 시간 몇 분 동안 담가 비싼 가공품으로 만든다.
 * - 여러 작물을 섞는 레시피일수록 배율이 높다(단일 ×1.25, 2~3종 ×1.6~1.7, 4종 ×1.9) → 다품종 재배를 유도.
 * - 가공품은 원물 시세·시장 포화와 상관없는 고정가로 판다.
 * - 접속하지 않아도 시간은 흐르고, 다 되면 꺼내서 판다.
 */
import { CROPS, CROP_PRICE_SCALE } from "./farming";

export type Recipe = { id: string; name: string; icon: string; minutes: number; mult: number; inputs: { cropId: string; count: number }[] };
export const RECIPES: Recipe[] = [
  { id: "pickle", name: "오이피클", icon: "🥒", minutes: 3, mult: 1.25, inputs: [{ cropId: "cucumber", count: 4 }] },
  { id: "garlicpickle", name: "마늘장아찌", icon: "🧄", minutes: 3, mult: 1.25, inputs: [{ cropId: "garlic", count: 4 }] },
  { id: "applejuice", name: "사과주스", icon: "🧃", minutes: 4, mult: 1.25, inputs: [{ cropId: "apple", count: 3 }] },
  { id: "salad", name: "샐러드 도시락", icon: "🥗", minutes: 5, mult: 1.6, inputs: [{ cropId: "tomato", count: 2 }, { cropId: "cucumber", count: 2 }, { cropId: "cabbage", count: 2 }] },
  { id: "kkakdugi", name: "깍두기", icon: "🫙", minutes: 5, mult: 1.6, inputs: [{ cropId: "radish", count: 3 }, { cropId: "pepper", count: 1 }, { cropId: "garlic", count: 1 }] },
  { id: "fruitjam", name: "과일 바구니 잼", icon: "🍯", minutes: 6, mult: 1.7, inputs: [{ cropId: "strawberry", count: 2 }, { cropId: "peach", count: 1 }, { cropId: "grape", count: 2 }] },
  { id: "kimjang", name: "김장 상자", icon: "🥬", minutes: 8, mult: 1.9, inputs: [{ cropId: "cabbage", count: 3 }, { cropId: "radish", count: 2 }, { cropId: "pepper", count: 2 }, { cropId: "garlic", count: 2 }] },
];

export const WORKSHOP_START_SLOTS = 1;
export const WORKSHOP_MAX_SLOTS = 10; // 2026-10-16: 3 → 10
/** 다음 항아리 값: 지금 개수 × 4,000원(2개째 4,000 · 3개째 8,000 · … · 10개째 36,000). */
export function workshopSlotPrice(slots: number) { return slots * 4000; }

export type Job = { recipeId: string; doneAt: number };
export type Workshop = { slots: number; jobs: Job[] };
export const EMPTY_WORKSHOP: Workshop = { slots: WORKSHOP_START_SLOTS, jobs: [] };

/** 가공품 1개 값: 재료 기준가 합 × 레시피 배율(시세·포화 없음). */
export function goodsPrice(recipe: Recipe) {
  return Math.round(recipe.inputs.reduce((sum, input) => sum + (CROPS.find(crop => crop.id === input.cropId)?.sell ?? 0) * CROP_PRICE_SCALE * input.count, 0) * recipe.mult);
}
/** 재료를 그냥 팔았을 때(기준가)와 비교한 이득. */
export function rawValue(recipe: Recipe) {
  return Math.round(recipe.inputs.reduce((sum, input) => sum + (CROPS.find(crop => crop.id === input.cropId)?.sell ?? 0) * CROP_PRICE_SCALE * input.count, 0));
}
