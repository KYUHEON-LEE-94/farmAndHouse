/**
 * 아이템 공통 형식: 통합 창고·가공·주방·(앞으로) 사냥·토벌이 모두 같은 키로 아이템을 다룬다.
 *
 * 키 형식 `분류:id(:품질:황금)`
 *   crop:tomato:1:0  — 농산물(품질 0 보통·1 좋음·2 최상, 황금 0/1)
 *   fish:dace        — 물고기(등급 없음)
 *   goods:pickle     — 절임 항아리 가공품
 *   dish:maeuntang:2:0 — 주방 요리(사냥 준비물, 등급 0 보통·1 맛있음·2 일품)
 * 저장은 `inventory`(키 → 개수) 하나. 예전 저장(produce·fishStock·goods)은 migrateInventory로 옮긴다.
 */
export type ItemCategory = "crop" | "fish" | "goods" | "dish";
export type ItemRef = { category: ItemCategory; id: string; quality: number; golden: boolean };
export type Inventory = Record<string, number>;

export const ITEM_CATEGORIES: ItemCategory[] = ["crop", "fish", "goods", "dish"];
const HAS_QUALITY: Record<ItemCategory, boolean> = { crop: true, fish: false, goods: false, dish: true };

export function itemKey(ref: Pick<ItemRef, "category" | "id"> & Partial<ItemRef>) {
  return HAS_QUALITY[ref.category] ? `${ref.category}:${ref.id}:${ref.quality ?? 0}:${ref.golden ? 1 : 0}` : `${ref.category}:${ref.id}`;
}

export function parseItemKey(key: string): ItemRef {
  const [category, id, quality, golden] = key.split(":");
  return { category: (ITEM_CATEGORIES.includes(category as ItemCategory) ? category : "goods") as ItemCategory, id: id ?? "", quality: Number(quality) || 0, golden: golden === "1" };
}

/**
 * 분류별 "하위 키" 보기. 품질이 있는 분류(농산물·요리)는 `id|품질|황금`(농산물은 예전 produce 키와 같음),
 * 나머지는 id만 쓴다.
 */
function subKey(ref: ItemRef) { return HAS_QUALITY[ref.category] ? `${ref.id}|${ref.quality}|${ref.golden ? 1 : 0}` : ref.id; }
function fromSubKey(category: ItemCategory, sub: string): string {
  if (!HAS_QUALITY[category]) return itemKey({ category, id: sub });
  const [id, quality, golden] = sub.split("|");
  return itemKey({ category, id, quality: Number(quality) || 0, golden: golden === "1" });
}

/** 인벤토리에서 한 분류만 꺼낸 보기(하위 키 → 개수). */
export function pickCategory(inventory: Inventory, category: ItemCategory): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, count] of Object.entries(inventory)) {
    if (count <= 0) continue;
    const ref = parseItemKey(key);
    if (ref.category === category) out[subKey(ref)] = count;
  }
  return out;
}

/** 한 분류를 통째로 바꾼다(다른 분류는 그대로). 0개 이하는 지운다. */
export function replaceCategory(inventory: Inventory, category: ItemCategory, view: Record<string, number>): Inventory {
  const next: Inventory = {};
  for (const [key, count] of Object.entries(inventory)) if (parseItemKey(key).category !== category && count > 0) next[key] = count;
  for (const [sub, count] of Object.entries(view)) if (count > 0) next[fromSubKey(category, sub)] = count;
  return next;
}

/** 키 하나의 개수를 더하거나 뺀다(0 이하면 지움). */
export function addItem(inventory: Inventory, key: string, delta: number): Inventory {
  const count = (inventory[key] ?? 0) + delta, next = { ...inventory };
  if (count > 0) next[key] = count; else delete next[key];
  return next;
}

/** 예전 저장 형식을 통합 인벤토리로 옮긴다. 이미 inventory가 있으면 그대로 쓴다. */
export function migrateInventory(data: { inventory?: Inventory; produce?: Record<string, number>; fishStock?: Record<string, number>; goods?: Record<string, number> }): Inventory {
  if (data.inventory) return data.inventory;
  let inventory: Inventory = {};
  inventory = replaceCategory(inventory, "crop", data.produce ?? {});
  inventory = replaceCategory(inventory, "fish", data.fishStock ?? {});
  inventory = replaceCategory(inventory, "goods", data.goods ?? {});
  return inventory;
}
