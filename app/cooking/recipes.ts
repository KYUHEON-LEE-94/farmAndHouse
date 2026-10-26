import { CROPS } from "../farming";
import { ALL_FISH } from "../fishing";
import { FORAGE, LIFE2_ENABLED, LIFE3_ENABLED } from "../explore/data";
import { parseItemKey, type Inventory } from "../items";
import { consumeOrder, planConsume, usableOf, type ConsumeOptions, type Need } from "../stock";
import { inputValue } from "../workshop";

/** anyOf가 있으면 그중 서로 다른 count종을 각 1개씩(도시락 1개 기준) 쓴다(꽃꿀 과일 도시락). */
export type LunchIngredient = { category: "crop" | "forage" | "fish"; id: string; count: number; anyOf?: string[] };
export type LunchRecipe = { id: string; name: string; icon: string; target: "farm" | "fish" | "explore"; label: string; values: [number, number, number]; ingredients: LunchIngredient[]; /** 탐험 도시락 효과 종류(기본 채집 시간) */ effect?: "gather" | "speed"; /** 공개 단계(생활 콘텐츠 2·3단계 도시락) */ stage?: 2 | 3 };
export const LUNCHES: LunchRecipe[] = [
  { id: "forest-potato-wrap", name: "숲길 감자말이", icon: "🌿", target: "explore", label: "채집 시간 감소", values: [.08, .11, .15], ingredients: [{ category: "crop", id: "potato", count: 2 }, { category: "forage", id: "young-herb", count: 1 }, { category: "fish", id: "any", count: 1 }] },
  { id: "farmer-lunch", name: "든든한 농부 도시락", icon: "🍱", target: "farm", label: "물 소비 면제 확률", values: [.08, .12, .16], ingredients: [{ category: "crop", id: "potato", count: 1 }, { category: "crop", id: "sweetpotato", count: 1 }, { category: "fish", id: "any", count: 1 }] },
  { id: "spring-angler-lunch", name: "봄꽃 강태공 도시락", icon: "🌼", target: "fish", label: "입질 대기 감소", values: [.05, .08, .11], ingredients: [{ category: "fish", id: "any", count: 2 }, { category: "forage", id: "wildflower", count: 1 }, { category: "crop", id: "greenonion", count: 1 }] },
  // 생활 콘텐츠 2단계(여름 햇빛 습지와 함께 공개, 4.3절)
  { id: "nectar-fruit-lunch", name: "꽃꿀 과일 도시락", icon: "🍯", target: "explore", effect: "speed", label: "탐험 이동 속도", values: [.06, .09, .12], stage: 2, ingredients: [{ category: "crop", id: "fruit-mix", count: 2, anyOf: ["strawberry", "peach", "grape", "apple"] }, { category: "forage", id: "flower-nectar", count: 1 }] },
];
export const lunchRecipe = (id: string) => LUNCHES.find(d => d.id === id);
/** 지금 만들 수 있게 공개된 도시락(2·3단계 도시락은 해당 단계 공개 뒤) */
export const availableLunches = () => LUNCHES.filter(d => !d.stage || (d.stage === 2 ? LIFE2_ENABLED : LIFE3_ENABLED));
export function ingredientName(category: string, id: string) {
  if (id === "fruit-mix") return "딸기·복숭아·포도·사과 중 서로 다른 2종";
  return category === "crop" ? CROPS.find(c => c.id === id)?.name ?? id : category === "forage" ? FORAGE.find(c => c.id === id)?.name ?? id : id === "any" ? "아무 물고기(전설·신화 제외)" : ALL_FISH.find(f => f.id === id)?.name ?? id;
}
export function lunchPlan(inventory: Inventory, dish: LunchRecipe, quantity: number, opts: ConsumeOptions) {
  const needs: Need[] = dish.ingredients.filter(i => i.category !== "fish" && !i.anyOf).map(i => ({ category: i.category, id: i.id, count: i.count * quantity }));
  // 서로 다른 종류 고르기: 쓸 수 있는 수량이 많은 종류부터 count종을 골라 각 quantity개
  const picks: Need[] = [], short: Need[] = [];
  for (const i of dish.ingredients.filter(entry => entry.anyOf)) {
    const ranked = i.anyOf!.map(id => ({ id, n: consumeOrder(inventory, i.category, id, opts).reduce((sum, key) => sum + usableOf(inventory, key, opts), 0) })).filter(e => e.n >= quantity).sort((a, b) => b.n - a.n || a.id.localeCompare(b.id));
    ranked.slice(0, i.count).forEach(e => picks.push({ category: i.category, id: e.id, count: quantity }));
    if (ranked.length < i.count) short.push({ category: i.category, id: i.id, count: (i.count - ranked.length) * quantity });
  }
  const plan = planConsume(inventory, [...needs, ...picks], opts);
  plan.missing.push(...short);
  let fishLeft = dish.ingredients.filter(i => i.category === "fish").reduce((n, i) => n + i.count * quantity, 0);
  const fish = ALL_FISH.filter(f => f.rarity !== "전설" && f.rarity !== "신화").sort((a, b) => a.price - b.price || a.id.localeCompare(b.id));
  for (const f of fish) {
    const key = `fish:${f.id}`, n = Math.min(fishLeft, usableOf(inventory, key, opts));
    if (n > 0) { plan.take[key] = n; fishLeft -= n; }
  }
  if (fishLeft) plan.missing.push({ category: "fish", id: "any", count: fishLeft });
  plan.ok = plan.missing.length === 0;
  return plan;
}
/** 작물은 말랭이(4개 단위) 기준 비례 가치, 나머지는 원물 가격. 묶음 완제품의 즉시 판매액이 아님. */
export function lunchOpportunityCost(take: Record<string, number>) {
  return Math.round(Object.entries(take).reduce((total, [key, count]) => {
    const r = parseItemKey(key);
    if (r.category === "crop") return total + inputValue([{ cropId: r.id, quality: r.quality, golden: r.golden, count }]) * 1.35;
    return total + count * (r.category === "fish" ? ALL_FISH.find(f => f.id === r.id)?.price ?? 0 : FORAGE.find(f => f.id === r.id)?.price ?? 0);
  }, 0));
}
