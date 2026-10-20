import { CROPS } from "../farming";
import { ALL_FISH } from "../fishing";
import { FORAGE } from "../explore/data";
import { parseItemKey, type Inventory } from "../items";
import { planConsume, usableOf, type ConsumeOptions, type Need } from "../stock";
import { inputValue } from "../workshop";

export type LunchRecipe = { id: string; name: string; icon: string; target: "farm" | "fish" | "explore"; label: string; values: [number, number, number]; ingredients: Array<{ category: "crop" | "forage" | "fish"; id: string; count: number }> };
export const LUNCHES: LunchRecipe[] = [
  { id: "forest-potato-wrap", name: "숲길 감자말이", icon: "🌿", target: "explore", label: "채집 시간 감소", values: [.08, .11, .15], ingredients: [{ category: "crop", id: "potato", count: 2 }, { category: "forage", id: "young-herb", count: 1 }, { category: "fish", id: "any", count: 1 }] },
  { id: "farmer-lunch", name: "든든한 농부 도시락", icon: "🍱", target: "farm", label: "물 소비 면제 확률", values: [.08, .12, .16], ingredients: [{ category: "crop", id: "potato", count: 1 }, { category: "crop", id: "sweetpotato", count: 1 }, { category: "fish", id: "any", count: 1 }] },
  { id: "spring-angler-lunch", name: "봄꽃 강태공 도시락", icon: "🌼", target: "fish", label: "입질 대기 감소", values: [.05, .08, .11], ingredients: [{ category: "fish", id: "any", count: 2 }, { category: "forage", id: "wildflower", count: 1 }, { category: "crop", id: "greenonion", count: 1 }] },
];
export const lunchRecipe = (id: string) => LUNCHES.find(d => d.id === id);
export function ingredientName(category: string, id: string) {
  return category === "crop" ? CROPS.find(c => c.id === id)?.name ?? id : category === "forage" ? FORAGE.find(c => c.id === id)?.name ?? id : id === "any" ? "아무 물고기(전설·신화 제외)" : ALL_FISH.find(f => f.id === id)?.name ?? id;
}
export function lunchPlan(inventory: Inventory, dish: LunchRecipe, quantity: number, opts: ConsumeOptions) {
  const needs: Need[] = dish.ingredients.filter(i => i.category !== "fish").map(i => ({ ...i, count: i.count * quantity }));
  const plan = planConsume(inventory, needs, opts);
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
