"use client";
import { flushSync } from "react-dom";
import { useRef, type Dispatch, type SetStateAction } from "react";
import { DISHES, DISH_GRADES } from "../kitchen";
import { applyTake, type ConsumeOptions } from "../stock";
import { parseItemKey, type Inventory } from "../items";
import { addCookedDish, batchLimit, completeLunchBatch, type CookingBatch } from "./batch";
import { activateLunch, enterLunchRun, lunchUnlocked, restoreLunchBuff, type LunchBuff } from "./lunch";
import { lunchPlan, lunchRecipe, type LunchRecipe } from "./recipes";
type Setter<T> = Dispatch<SetStateAction<T>>;
export function useLunchCooking(p: {
  inventory: Inventory; setInventory: Setter<Inventory>; options: ConsumeOptions;
  batch: CookingBatch | null; setBatch: Setter<CookingBatch | null>; buff: LunchBuff | null; setBuff: Setter<LunchBuff | null>;
  ids: string[]; setIds: Setter<string[]>; level: number; save: () => void; notice: (s: string) => void;
}) {
  const busy = useRef(false);
  const transaction = (update: () => void) => {
    if (busy.current) return;
    busy.current = true;
    try { flushSync(update); p.save(); } finally { busy.current = false; }
  };
  const start = (dish: LunchRecipe, quantity: number, expectedTake: Record<string, number>) => {
    if (p.batch || !lunchUnlocked(p.ids, DISHES.map(d => d.id)) || !Number.isInteger(quantity) || quantity < 1 || quantity > batchLimit(p.level)) return;
    const plan = lunchPlan(p.inventory, dish, quantity, p.options);
    if (!plan.ok || JSON.stringify(plan.take) !== JSON.stringify(expectedTake)) return p.notice("재료가 바뀌었어요. 다시 확인해 주세요.");
    transaction(() => { p.setInventory(applyTake(p.inventory, plan.take)); p.setBatch({ batchId: crypto.randomUUID(), dishId: dish.id, quantity, consumed: plan.take, seed: crypto.getRandomValues(new Uint32Array(1))[0], results: [], facilityLevelAtStart: p.level }); });
  };
  const progress = (results: Array<0 | 1 | 2>) => {
    if (!p.batch || results.length !== p.batch.results.length + 1 || results.length > 3 || !p.batch.results.every((v, i) => results[i] === v)) return;
    transaction(() => p.setBatch({ ...p.batch!, results }));
  };
  const finish = () => {
    if (!p.batch) return;
    const result = completeLunchBatch(p.inventory, p.batch, p.batch.batchId);
    if (!result) return;
    const id = p.batch.dishId;
    transaction(() => { p.setInventory(result.inventory); p.setIds(addCookedDish(p.ids, id)); p.setBatch(null); });
    p.notice(`🍱 ${lunchRecipe(id)?.name} 완성! ${result.counts.map((n, i) => `${DISH_GRADES[i].name} ${n}개`).join(" · ")}`);
  };
  const cancel = () => {
    if (window.confirm("조리를 취소할까요? 이미 사용한 재료는 반환되지 않아요.")) transaction(() => p.setBatch(null));
  };
  const eat = (key: string) => {
    const r = parseItemKey(key), dish = lunchRecipe(r.id);
    if (!dish || r.category !== "dish" || (p.inventory[key] ?? 0) < 1 || p.options.locks[key] || ![0, 1, 2].includes(r.quality)) return;
    if (restoreLunchBuff(p.buff) && !window.confirm(`${dish.name}(으)로 교체할까요? 현재 도시락 효과는 사라져요.`)) return;
    transaction(() => { p.setInventory(applyTake(p.inventory, { [key]: 1 })); p.setBuff(activateLunch(r.id, r.quality as 0 | 1 | 2)); });
    p.notice(`${dish.icon} ${dish.name} 효과가 시작됐어요.`);
  };
  const enterRun = () => {
    const result = enterLunchRun(p.buff);
    if (result.applied) transaction(() => p.setBuff(result.next));
    return result.applied;
  };
  return { start, progress, finish, cancel, eat, enterRun };
}
