/**
 * 가공 공방(절임 항아리): 창고 작물을 실제 시간 몇 분 동안 담가 비싼 가공품으로 만든다.
 * - 여러 작물을 섞는 레시피일수록 배율이 높다(단일 ×1.25, 2~3종 ×1.6~1.7, 4종 ×1.9) → 다품종 재배를 유도.
 * - 가공품은 원물 시세·시장 포화와 상관없는 고정가로 판다.
 * - 접속하지 않아도 시간은 흐르고, 다 되면 꺼내서 판다.
 *
 * 2026-10-16 개편(WORKSHOP_PROCESSING_REDESIGN.md, WORKSHOP_V2_ENABLED 동안만 화면에 나온다)
 * - 자유 가공(절임·주스·말랭이·잼): 같은 분류 작물을 아무거나 넣는다.
 * - 혼합 가공(채소 상자·과일 잼 세트·농가 특선 상자): 서로 다른 작물 여러 종.
 * - 특선 레시피: 예전 고정 조합(샐러드 도시락·깍두기·과일 바구니 잼·김장 상자).
 * - 완성품 값 = Σ(작물 시장 기준가 × 품질 × 황금 × 개수) × 배율. 담글 때 확정해 가공품 키에 넣는다.
 *   가공품 키 `레시피~작물+작물~가격`(예: `pickle~cucumber+radish~515`). 예전 키(`pickle` 등)는 예전 이름·가격 그대로 쓴다.
 */
import { CROPS, CROP_PRICE_SCALE, QUALITIES, cropReferencePrice, type Crop } from "./farming";
import { TEST_MODE } from "./testMode";

/** 생활 가공 개편 공개 여부. 공개 전에는 로컬 테스트 모드에서만 새 화면이 보인다. */
export const WORKSHOP_V2_RELEASED = false;
export const WORKSHOP_V2_ENABLED = WORKSHOP_V2_RELEASED || TEST_MODE;

export type Recipe = { id: string; name: string; icon: string; minutes: number; mult: number; inputs: { cropId: string; count: number }[] };
/** 예전 고정 레시피(공개 화면·예전 가공품 이름과 가격) */
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

/** 진행 중 작업. 개편 뒤 작업은 결과 키·이름·확정 가격을 함께 저장한다(예전 작업은 recipeId만). */
export type Job = { recipeId: string; doneAt: number; key?: string; name?: string; icon?: string; price?: number; minutes?: number };
export type Workshop = { slots: number; jobs: Job[] };
export const EMPTY_WORKSHOP: Workshop = { slots: WORKSHOP_START_SLOTS, jobs: [] };

/** 가공품 1개 값: 재료 기준가 합 × 레시피 배율(시세·포화 없음). 예전 레시피 기준. */
export function goodsPrice(recipe: Recipe) {
  return Math.round(recipe.inputs.reduce((sum, input) => sum + (CROPS.find(crop => crop.id === input.cropId)?.sell ?? 0) * CROP_PRICE_SCALE * input.count, 0) * recipe.mult);
}
/** 재료를 그냥 팔았을 때(기준가)와 비교한 이득. */
export function rawValue(recipe: Recipe) {
  return Math.round(recipe.inputs.reduce((sum, input) => sum + (CROPS.find(crop => crop.id === input.cropId)?.sell ?? 0) * CROP_PRICE_SCALE * input.count, 0));
}

// ---------- 개편: 자유·혼합·특선 가공 ----------
export type ProcessingTag = "fruit" | "leaf" | "root" | "fruitVegetable" | "grain" | "special";
/** 작물 분류(3절). 채소 = 잎채소·뿌리작물·열매채소. */
export const CROP_TAGS: Record<string, ProcessingTag> = {
  strawberry: "fruit", cherry: "fruit", watermelon: "fruit", koreanmelon: "fruit", peach: "fruit", blueberry: "fruit", grape: "fruit", apple: "fruit", persimmon: "fruit", tangerine: "fruit",
  cabbage: "leaf", lettuce: "leaf", spinach: "leaf", napa: "leaf", leek: "leaf", greenonion: "leaf", broccoli: "leaf",
  potato: "root", sweetpotato: "root", radish: "root", carrot: "root", garlic: "root", ginger: "root", peanut: "root",
  tomato: "fruitVegetable", cucumber: "fruitVegetable", pepper: "fruitVegetable", eggplant: "fruitVegetable", pumpkin: "fruitVegetable",
  corn: "grain", pea: "grain",
  pinemushroom: "special", asparagus: "special",
  "royal-strawberry": "special", "royal-melon": "special", "royal-grape": "special", "royal-ginseng": "special",
};
const VEG: ProcessingTag[] = ["leaf", "root", "fruitVegetable"];
export const TAG_NAME: Record<ProcessingTag, string> = { fruit: "과일", leaf: "잎채소", root: "뿌리작물", fruitVegetable: "열매채소", grain: "곡물·콩", special: "특산물" };

export type ProcRecipe = {
  id: string; kind: "free" | "mix" | "special"; name: string; icon: string; minutes: number; mult: number; note: string;
  /** 자유·혼합: 받는 분류(없으면 계절 한정 제외 모든 작물), 총 개수, 최소 종류 수, 종류당 최소 개수 */
  tags?: ProcessingTag[]; count?: number; distinct?: number; each?: number;
  /** 특선: 정확한 조합 */
  inputs?: { cropId: string; count: number }[];
};
export const PROC_RECIPES: ProcRecipe[] = [
  { id: "pickle", kind: "free", name: "절임", icon: "🫙", minutes: 3, mult: 1.25, tags: VEG, count: 4, note: "채소 아무거나 4개" },
  { id: "juice", kind: "free", name: "주스", icon: "🧃", minutes: 4, mult: 1.25, tags: ["fruit"], count: 3, note: "과일 아무거나 3개" },
  { id: "dried", kind: "free", name: "말랭이", icon: "🍂", minutes: 4, mult: 1.35, count: 4, note: "작물 아무거나 4개" },
  { id: "jam", kind: "free", name: "잼", icon: "🍯", minutes: 6, mult: 1.45, tags: ["fruit"], count: 5, note: "과일 아무거나 5개" },
  { id: "veggiebox", kind: "mix", name: "채소 상자", icon: "📦", minutes: 5, mult: 1.55, tags: VEG, count: 6, distinct: 3, each: 2, note: "서로 다른 채소 3종, 각 2개" },
  { id: "jamset", kind: "mix", name: "과일 잼 세트", icon: "🎁", minutes: 6, mult: 1.65, tags: ["fruit"], count: 5, distinct: 3, note: "서로 다른 과일 3종, 총 5개" },
  { id: "farmbox", kind: "mix", name: "농가 특선 상자", icon: "🧺", minutes: 8, mult: 1.75, count: 8, distinct: 4, note: "서로 다른 작물 4종, 총 8개" },
  { id: "salad", kind: "special", name: "샐러드 도시락", icon: "🥗", minutes: 5, mult: 1.7, inputs: [{ cropId: "tomato", count: 2 }, { cropId: "cucumber", count: 2 }, { cropId: "cabbage", count: 2 }], note: "토마토·오이·양배추" },
  { id: "kkakdugi", kind: "special", name: "깍두기", icon: "🫙", minutes: 5, mult: 1.75, inputs: [{ cropId: "radish", count: 3 }, { cropId: "pepper", count: 1 }, { cropId: "garlic", count: 1 }], note: "무·고추·마늘" },
  { id: "fruitjam", kind: "special", name: "과일 바구니 잼", icon: "🍯", minutes: 6, mult: 1.8, inputs: [{ cropId: "strawberry", count: 2 }, { cropId: "peach", count: 1 }, { cropId: "grape", count: 2 }], note: "딸기·복숭아·포도" },
  { id: "kimjang", kind: "special", name: "김장 상자", icon: "🥬", minutes: 8, mult: 2.0, inputs: [{ cropId: "cabbage", count: 3 }, { cropId: "radish", count: 2 }, { cropId: "pepper", count: 2 }, { cropId: "garlic", count: 2 }], note: "양배추·무·고추·마늘" },
];
export const procRecipe = (id: string) => PROC_RECIPES.find(r => r.id === id);

/** 가공에 넣을 작물 묶음(창고 키 단위). */
export type ProcessingInput = { cropId: string; quality: number; golden: boolean; count: number };

/** 이 작물을 이 레시피에 넣을 수 있나(계절 한정 작물은 자유·혼합 가공에서 뺀다). */
export function cropFits(recipe: ProcRecipe, crop: Crop) {
  if (recipe.inputs) return recipe.inputs.some(input => input.cropId === crop.id);
  if (crop.seasonalLimit) return false;
  return !recipe.tags || recipe.tags.includes(CROP_TAGS[crop.id] ?? "special");
}
const total = (inputs: ProcessingInput[]) => inputs.reduce((sum, input) => sum + input.count, 0);
const perCrop = (inputs: ProcessingInput[]) => { const out: Record<string, number> = {}; for (const input of inputs) out[input.cropId] = (out[input.cropId] ?? 0) + input.count; return out; };

/** 재료 구성이 레시피 조건에 맞으면 null, 아니면 이유. */
export function checkInputs(recipe: ProcRecipe, inputs: ProcessingInput[]): string | null {
  const counts = perCrop(inputs);
  for (const input of inputs) { const crop = CROPS.find(c => c.id === input.cropId); if (!crop || !cropFits(recipe, crop)) return `${crop?.name ?? input.cropId}은(는) ${recipe.name}에 넣을 수 없어요.`; }
  if (recipe.inputs) {
    for (const need of recipe.inputs) if ((counts[need.cropId] ?? 0) !== need.count) { const crop = CROPS.find(c => c.id === need.cropId); return `${crop?.icon ?? ""} ${crop?.name ?? need.cropId} ${need.count}개가 필요해요.`; }
    return null;
  }
  if (total(inputs) !== recipe.count) return `재료를 ${recipe.count}개 골라 주세요.`;
  const kinds = Object.keys(counts).length;
  if (recipe.distinct && kinds < recipe.distinct) return `서로 다른 작물 ${recipe.distinct}종이 필요해요.`;
  if (recipe.each && Object.values(counts).some(n => n < recipe.each!)) return `작물마다 ${recipe.each}개씩 넣어 주세요.`;
  return null;
}

/** 재료 가치(시장 기준가 × 품질 × 황금). 시세·포화와 상관없다. */
export function inputValue(inputs: ProcessingInput[]) {
  return inputs.reduce((sum, input) => { const crop = CROPS.find(c => c.id === input.cropId); return sum + (crop ? cropReferencePrice(crop) * QUALITIES[input.quality].multiplier * (input.golden ? 3 : 1) * input.count : 0); }, 0);
}

const SINGLE_NAME: Record<string, Record<string, string>> = { pickle: { cucumber: "오이피클", garlic: "마늘장아찌", radish: "무절임" } };
/** 완성품 이름: 자유 가공은 한 작물이면 작물 이름, 섞으면 `모둠`. */
function productName(recipe: ProcRecipe, cropIds: string[]) {
  if (recipe.kind !== "free") return recipe.name;
  if (cropIds.length === 1) {
    const special = SINGLE_NAME[recipe.id]?.[cropIds[0]]; if (special) return special;
    const crop = CROPS.find(c => c.id === cropIds[0]); const n = crop?.name ?? cropIds[0];
    return recipe.id === "pickle" ? `${n} 절임` : recipe.id === "juice" ? `${n}주스` : recipe.id === "dried" ? `${n} 말랭이` : `${n}잼`;
  }
  return recipe.id === "pickle" ? "모둠 채소 절임" : recipe.id === "juice" ? "모둠 과일주스" : recipe.id === "dried" ? "모둠 말랭이" : "모둠 과일잼";
}
function productIcon(recipe: ProcRecipe, cropIds: string[]) {
  if (recipe.kind === "free" && cropIds.length === 1) return CROPS.find(c => c.id === cropIds[0])?.icon ?? recipe.icon;
  return recipe.icon;
}

export type Product = { key: string; name: string; icon: string; price: number; raw: number };
/** 담글 때 완성품을 확정한다(가격이 키에 들어가서 나중에 기준가가 바뀌어도 그대로). */
export function processResult(recipe: ProcRecipe, inputs: ProcessingInput[]): Product {
  const cropIds = [...new Set(inputs.filter(i => i.count > 0).map(i => i.cropId))].sort();
  const raw = Math.round(inputValue(inputs)), price = Math.round(raw * recipe.mult);
  return { key: `${recipe.id}~${cropIds.join("+")}~${price}`, name: productName(recipe, cropIds), icon: productIcon(recipe, cropIds), price, raw };
}

/** 가공품 키 → 이름·아이콘·개당 가격(예전 키도 처리). */
export function goodsInfo(key: string): { name: string; icon: string; price: number } {
  if (key.includes("~")) {
    const [recipeId, crops, price] = key.split("~"), recipe = procRecipe(recipeId), cropIds = crops ? crops.split("+") : [];
    if (recipe) return { name: productName(recipe, cropIds), icon: productIcon(recipe, cropIds), price: Number(price) || 0 };
    return { name: key, icon: "🎁", price: Number(price) || 0 };
  }
  const old = RECIPES.find(r => r.id === key);
  return old ? { name: old.name, icon: old.icon, price: goodsPrice(old) } : { name: key, icon: "🎁", price: 0 };
}
/** 진행 중 작업의 이름·아이콘·총 시간(분) */
export function jobInfo(job: Job) {
  if (job.key) return { name: job.name ?? goodsInfo(job.key).name, icon: job.icon ?? goodsInfo(job.key).icon, minutes: job.minutes ?? procRecipe(job.recipeId)?.minutes ?? 5, key: job.key };
  const old = RECIPES.find(r => r.id === job.recipeId);
  return old ? { name: old.name, icon: old.icon, minutes: old.minutes, key: old.id } : null;
}

/** 창고에서 쓸 수 있는 묶음(잠금·예약분을 뺀 수량). */
export type Stock = { cropId: string; quality: number; golden: boolean; n: number };

/**
 * 자동 채우기: 황금(허용 안 하면)·계절 한정은 빼고 낮은 품질부터.
 * 자유 가공은 많이 가진 작물부터 채워 이름이 깔끔해지고, 혼합 가공은 많이 가진 작물 종류부터 고른다.
 */
export function autoFill(recipe: ProcRecipe, stock: Stock[], allowGolden = false): ProcessingInput[] | null {
  const pool = stock.filter(s => s.n > 0 && (allowGolden || !s.golden)).filter(s => { const crop = CROPS.find(c => c.id === s.cropId); return !!crop && cropFits(recipe, crop); });
  const byCrop: Record<string, Stock[]> = {};
  for (const s of pool) (byCrop[s.cropId] ??= []).push(s);
  for (const list of Object.values(byCrop)) list.sort((a, b) => Number(a.golden) - Number(b.golden) || a.quality - b.quality);
  const have = (id: string) => byCrop[id]?.reduce((sum, s) => sum + s.n, 0) ?? 0;
  const out: ProcessingInput[] = [], used = new Map<Stock, number>();
  const take = (cropId: string, n: number) => {
    for (const s of byCrop[cropId] ?? []) { if (n <= 0) break; const left = s.n - (used.get(s) ?? 0), k = Math.min(left, n); if (k <= 0) continue; used.set(s, (used.get(s) ?? 0) + k); n -= k;
      const same = out.find(o => o.cropId === s.cropId && o.quality === s.quality && o.golden === s.golden); if (same) same.count += k; else out.push({ cropId: s.cropId, quality: s.quality, golden: s.golden, count: k }); }
    return n;
  };
  if (recipe.inputs) { for (const need of recipe.inputs) if (have(need.cropId) < need.count) return null; for (const need of recipe.inputs) take(need.cropId, need.count); return out; }
  const order = Object.keys(byCrop).sort((a, b) => have(b) - have(a));
  const need = recipe.count ?? 0;
  if (recipe.distinct) {
    const each = recipe.each ?? 1, picked = order.filter(id => have(id) >= each).slice(0, recipe.distinct);
    if (picked.length < recipe.distinct) return null;
    for (const id of picked) take(id, each);
    // 남은 개수는 많이 가진 작물부터(고른 종류가 앞쪽이라 대개 그 안에서 끝난다)
    let left = need - picked.length * each;
    if (!recipe.each) for (const id of order) { if (left <= 0) break; left = take(id, left); }
    return total(out) === need && !checkInputs(recipe, out) ? out : null;
  }
  let left = need;
  for (const id of order) { if (left <= 0) break; left = take(id, left); }
  return left > 0 ? null : out;
}

/** 지금 창고로 몇 번 만들 수 있나(자동 채우기 반복, 최대 cap). */
export function maxBatches(recipe: ProcRecipe, stock: Stock[], allowGolden = false, cap = 99) {
  let left = stock.map(s => ({ ...s })), n = 0;
  while (n < cap) {
    const inputs = autoFill(recipe, left, allowGolden); if (!inputs) break;
    left = subtractStock(left, inputs); n++;
  }
  return n;
}
export function subtractStock(stock: Stock[], inputs: ProcessingInput[]): Stock[] {
  const next = stock.map(s => ({ ...s }));
  for (const input of inputs) { const s = next.find(x => x.cropId === input.cropId && x.quality === input.quality && x.golden === input.golden); if (s) s.n -= input.count; }
  return next.filter(s => s.n > 0);
}
