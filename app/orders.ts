/**
 * 오늘의 주문서: 현실 날짜마다 일반 주문 3개 + 특별 주문 1개.
 * 하루에 사계절이 다 지나가므로 다른 계절 작물도 섞어서, 창고에 미리 모아 두는 재미를 만든다.
 * 납품은 창고에서 하고, 시장 판매가 아니므로 시장 포화가 오르지 않는다. 못 끝내도 불이익은 없다.
 */
import { CROPS, CROP_PRICE_SCALE, QUALITIES } from "./farming";

export type Npc = { id: string; name: string; icon: string; lines: string[] };
export const NPCS: Npc[] = [
  { id: "snack", name: "동네 분식집 사장", icon: "🧑‍🍳", lines: ["오늘 떡볶이 재료가 모자라요!", "단골들이 기다려요, 부탁해요~"] },
  { id: "cafe", name: "카페 사장", icon: "☕", lines: ["신메뉴에 쓸 재료를 찾고 있어요.", "제철 과일 음료를 만들고 싶어요!"] },
  { id: "school", name: "급식실 영양사", icon: "🍱", lines: ["아이들 점심 재료가 필요해요.", "건강한 식단에 꼭 넣고 싶어요."] },
  { id: "hansik", name: "한식당 주인", icon: "🍲", lines: ["손님상에 올릴 재료를 구해요.", "오늘 반찬은 이걸로 정했어요!"] },
  { id: "grandma", name: "과일가게 할머니", icon: "👵", lines: ["아이고, 좋은 걸로 좀 갖다 줘요.", "우리 가게 단골들이 찾는구먼."] },
];
export const FESTIVAL: Npc = { id: "festival", name: "계절 축제 위원회", icon: "🎪", lines: ["축제 특산품 코너를 채워 주세요! 품질 좋은 것으로요!"] };

export type OrderItem = { cropId: string; count: number; minQuality: number };
export type OrderBonus = { kind: "fert" | "food"; id: string; count: number };
export type Order = { id: string; npc: Npc; line: string; items: OrderItem[]; reward: number; bonus?: OrderBonus; special: boolean };

/** 날짜 문자열로 매일 같은 순서의 난수를 만든다. */
function seeded(text: string) {
  let h = 2166136261;
  for (const char of text) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const baseValue = (item: OrderItem) => { const crop = CROPS.find(c => c.id === item.cropId)!; return crop.sell * CROP_PRICE_SCALE * QUALITIES[item.minQuality].multiplier * item.count; };
const round10 = (value: number) => Math.round(value / 10) * 10;

export function dailyOrders(dateKey: string): Order[] {
  const random = seeded(`wolru-orders-${dateKey}`), pick = <T,>(list: T[]) => list[Math.floor(random() * list.length)];
  const pool = [...CROPS].sort(() => random() - 0.5), used = new Set<string>(), npcs = [...NPCS].sort(() => random() - 0.5);
  const nextCrop = () => { const crop = pool.find(c => !used.has(c.id)) ?? pool[0]; used.add(crop.id); return crop; };
  const orders: Order[] = [];
  for (let i = 0; i < 3; i++) {
    const npc = npcs[i], kinds = random() < 0.5 ? 1 : 2;
    const items = Array.from({ length: kinds }, () => ({ cropId: nextCrop().id, count: 3 + Math.floor(random() * 4), minQuality: random() < 0.3 ? 1 : 0 }));
    const bonus: OrderBonus = random() < 0.5 ? { kind: "fert", id: pick(["compost", "premium"]), count: 3 } : { kind: "food", id: pick(["kibble", "jerky"]), count: 2 };
    orders.push({ id: `${dateKey}-${i}`, npc, line: pick(npc.lines), items, reward: round10(items.reduce((sum, item) => sum + baseValue(item), 0) * 1.4), bonus, special: false });
  }
  // 특별 주문: 서로 다른 계절 작물 3종, 좋음(★) 이상
  const seasons = ["봄", "여름", "가을", "겨울"].sort(() => random() - 0.5).slice(0, 3);
  const specialItems = seasons.map(season => { const crop = pool.find(c => !used.has(c.id) && c.seasons.includes(season as never)) ?? nextCrop(); used.add(crop.id); return { cropId: crop.id, count: 2 + Math.floor(random() * 2), minQuality: 1 }; });
  orders.push({ id: `${dateKey}-special`, npc: FESTIVAL, line: FESTIVAL.lines[0], items: specialItems, reward: round10(specialItems.reduce((sum, item) => sum + baseValue(item), 0) * 1.8), bonus: { kind: "fert", id: "golden", count: 3 }, special: true });
  return orders;
}
