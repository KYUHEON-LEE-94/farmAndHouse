/**
 * 탐험 장비(LIFE_CONTENT_EXPANSION_SPEC 3.5절). 강화 없이 플레이 방식만 바꾸고, 한 번에 하나만 장착한다. 내구도·수리 없음.
 * 문서의 `농업 섬유`는 토벌 제작 재료(농산물 5개)라서 탐험 장비에는 같은 양의 농산물(황금 제외, 아무 작물)을 직접 쓴다.
 */
import { CROPS } from "../farming";
import { parseItemKey, type Inventory } from "../items";
import { planConsume, usableOf, type ConsumeOptions, type Need } from "../stock";
import { LIFE2_ENABLED, LIFE3_ENABLED } from "./data";

export type ExploreTool = {
  id: string; name: string; icon: string; note: string;
  /** 일반(작은) 자원 채집 시간 감소 */
  gather?: number;
  /** 가방 칸 추가 */
  bag?: number;
  /** 움직이면서 채집(채집 범위 안에서) */
  moveGather?: boolean;
  /** 위험 경직 시간 감소 */
  stunCut?: number;
  /** 약초·꽃 1개 더 얻을 확률 */
  herb?: number;
  gold: number;
  /** 채집물 요구 */
  forage: { id: string; count: number }[];
  /** 아무 농산물(황금 제외) 개수 */
  crops: number;
  stage: 2 | 3;
};

export const EXPLORE_TOOLS: ExploreTool[] = [
  { id: "gather-gloves", name: "채집 장갑", icon: "🧤", note: "일반 자원 채집 시간 −20%", gather: 0.2, gold: 4000, forage: [{ id: "soft-twig", count: 5 }], crops: 10, stage: 2 },
  // 얻기 어려운 장비(2026-10-27 요청): 봄·여름 희귀 발견물 각 3개(천장 포함 최소 여러 판) + 큰 골드
  { id: "breeze-net", name: "바람결 채집망", icon: "🪁", note: "움직이면서 채집(범위 안에서는 끊기지 않음)", moveGather: true, gold: 30000, forage: [{ id: "four-leaf-flower", count: 3 }, { id: "blue-firefly", count: 3 }, { id: "flower-nectar", count: 10 }], crops: 30, stage: 2 },
  { id: "sturdy-basket", name: "튼튼한 바구니", icon: "🧺", note: "가방 +4칸", bag: 4, gold: 5000, forage: [{ id: "thick-reed", count: 8 }], crops: 10, stage: 2 },
  // 생활 3단계: 문서의 농업 섬유 1 → 농산물 5, 무두질 가죽 2 → 농산물 10(사냥 재료와 엮지 않는다)
  { id: "herb-sickle", name: "약초 낫", icon: "🌙", note: "약초·꽃 채집 시 20% 확률로 1개 더", herb: 0.2, gold: 6000, forage: [{ id: "iron-scrap", count: 6 }], crops: 5, stage: 3 },
  { id: "trail-boots", name: "탐험 장화", icon: "🥾", note: "위험에 맞았을 때 멈추는 시간 −35%", stunCut: 0.35, gold: 6000, forage: [{ id: "maple-sap", count: 4 }], crops: 10, stage: 3 },
];

export const toolInfo = (id: string | null | undefined) => EXPLORE_TOOLS.find(tool => tool.id === id);
export const availableTools = () => EXPLORE_TOOLS.filter(tool => (tool.stage === 2 ? LIFE2_ENABLED : LIFE3_ENABLED));
/** 장착한 장비의 효과(없으면 0) */
export const toolBonus = (id: string | null | undefined) => { const tool = toolInfo(id); return { bag: tool?.bag ?? 0, gather: tool?.gather ?? 0, move: tool?.moveGather === true, stun: tool?.stunCut ?? 0, herb: tool?.herb ?? 0 }; };
/** 엔진에 넘길 장비 효과 */
export const gearOpts = (id: string | null | undefined) => { const b = toolBonus(id); return { bagBonus: b.bag, gatherBonus: b.gather, moveGather: b.move, stunCut: b.stun, herbBonus: b.herb }; };

/** 제작에 쓸 묶음 계획: 채집물은 공용 소비 순서, 농산물은 황금 제외·낮은 품질·싼 작물부터. */
export function toolPlan(inventory: Inventory, tool: ExploreTool, opts: ConsumeOptions) {
  const needs: Need[] = tool.forage.map(entry => ({ category: "forage", id: entry.id, count: entry.count }));
  const plan = planConsume(inventory, needs, opts);
  const price = (id: string) => CROPS.find(crop => crop.id === id)?.sell ?? 0;
  const keys = Object.keys(inventory).filter(key => { const ref = parseItemKey(key); return ref.category === "crop" && !ref.golden && usableOf(inventory, key, opts) > 0; })
    .sort((a, b) => { const x = parseItemKey(a), y = parseItemKey(b); return x.quality - y.quality || price(x.id) - price(y.id) || (a < b ? -1 : 1); });
  let left = tool.crops;
  for (const key of keys) { if (left <= 0) break; const n = Math.min(left, usableOf(inventory, key, opts)); plan.take[key] = n; left -= n; }
  if (left > 0) plan.missing.push({ category: "crop", id: "any", count: left });
  plan.ok = plan.missing.length === 0;
  return plan;
}
