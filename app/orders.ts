/** 농사와 낚시가 함께 쓰는 일일 미션. 납품은 시장 포화를 올리지 않는다. */
import { CROPS, CROP_PRICE_SCALE, QUALITIES } from "./farming";
import { ALL_FISH, FISH } from "./fishing";

export type Npc = { id: string; name: string; icon: string; lines: string[] };
export const NPCS: Npc[] = [
  { id: "snack", name: "동네 분식집 사장", icon: "🧑‍🍳", lines: ["오늘 재료가 모자라요!", "단골들이 기다려요, 부탁해요~"] },
  { id: "cafe", name: "카페 사장", icon: "☕", lines: ["신메뉴 재료를 찾고 있어요.", "제철 재료를 구해 주세요!"] },
  { id: "school", name: "급식실 영양사", icon: "🍱", lines: ["아이들 점심 재료가 필요해요.", "건강한 식단에 꼭 넣고 싶어요."] },
  { id: "hansik", name: "한식당 주인", icon: "🍲", lines: ["손님상에 올릴 재료를 구해요.", "오늘 반찬은 이걸로 정했어요!"] },
];
export const FESTIVAL: Npc = { id: "festival", name: "계절 축제 위원회", icon: "🎪", lines: ["농장과 낚시터의 특산물을 함께 모아 주세요!"] };

export type CropOrderItem = { kind: "crop"; cropId: string; count: number; minQuality: number };
export type FishOrderItem = { kind: "fish"; fishId: string; count: number };
export type OrderItem = CropOrderItem | FishOrderItem;
export type OrderBonus = { kind: "fert" | "food"; id: string; count: number };
export type Order = { id: string; npc: Npc; line: string; items: OrderItem[]; reward: number; bonus?: OrderBonus; special: boolean };

function seeded(text: string) { let h = 2166136261; for (const char of text) h = Math.imul(h ^ char.charCodeAt(0), 16777619); return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const itemValue = (item: OrderItem) => item.kind === "crop" ? CROPS.find(c => c.id === item.cropId)!.sell * CROP_PRICE_SCALE * QUALITIES[item.minQuality].multiplier * item.count : ALL_FISH.find(f => f.id === item.fishId)!.price * item.count;
const round10 = (value: number) => Math.round(value / 10) * 10;

export function dailyOrders(dateKey: string): Order[] {
  const random = seeded(`wolru-missions-${dateKey}`), pick = <T,>(list: T[]) => list[Math.floor(random() * list.length)];
  const crops = CROPS.filter(crop => !crop.seasonalLimit).sort(() => random() - .5), fish = [...FISH].sort(() => random() - .5), npcs = [...NPCS].sort(() => random() - .5);
  const cropItem = (quality = 0): CropOrderItem => ({ kind: "crop", cropId: crops.shift()!.id, count: 3 + Math.floor(random() * 4), minQuality: quality });
  const fishItem = (): FishOrderItem => ({ kind: "fish", fishId: fish.shift()!.id, count: 1 + Math.floor(random() * 3) });
  const make = (id: string, npc: Npc, items: OrderItem[], special = false): Order => ({ id: `${dateKey}-${id}`, npc, line: pick(npc.lines), items, reward: round10(items.reduce((sum, item) => sum + itemValue(item), 0) * (special ? 1.8 : 1.45)), bonus: special ? { kind: "fert", id: "golden", count: 3 } : random() < .5 ? { kind: "fert", id: "compost", count: 3 } : { kind: "food", id: "kibble", count: 2 }, special });
  return [make("farm", npcs[0], [cropItem(), cropItem()]), make("fish", npcs[1], [fishItem(), fishItem()]), make("mixed", npcs[2], [cropItem(), fishItem()]), make("special", FESTIVAL, [cropItem(1), cropItem(1), fishItem()], true)];
}
