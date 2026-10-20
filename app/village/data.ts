/** 마을 시설 정의·단계별 비용·외형(LIFE_CONTENT_EXPANSION_SPEC 5.2·5.2.1·5.3·5.5절). */
import { TEST_MODE } from "../testMode";

/** 마을 기능 공개 여부. 운영 공개 승인 뒤 true로 바꾼다. 로컬 테스트 모드에서는 항상 보인다. */
export const VILLAGE_RELEASED = false;
export const VILLAGE_ENABLED = VILLAGE_RELEASED || TEST_MODE;
export const MAX_FACILITY_LEVEL = 3;

export type Facility = { id: string; name: string; icon: string; firstRelease: boolean };

/** 첫 공개는 탐험 안내소·공방 거리·마을 광장 3종(10절). */
export const FACILITIES: Facility[] = [
  { id: "guide-office", name: "탐험 안내소", icon: "🧭", firstRelease: true },
  { id: "greenhouse", name: "온실", icon: "🌱", firstRelease: false },
  { id: "pier", name: "선착장", icon: "⚓", firstRelease: false },
  { id: "craft-street", name: "공방 거리", icon: "🛠️", firstRelease: true },
  { id: "mine-station", name: "광차 정거장", icon: "🚃", firstRelease: false },
  { id: "plaza", name: "마을 광장", icon: "⛲", firstRelease: true },
];

/**
 * 납품 요구 품목. 농산물은 품질과 관계없이 같은 작물이면 되고(황금은 쓰지 않음), 물고기 id "any"는 전설·신화를 뺀 아무 물고기.
 * 실제로 낸 묶음은 아이템 키 그대로 contributions에 남겨 취소 때 정확히 돌려준다.
 */
export type VillageReq = { category: "crop" | "forage" | "fish"; id: string; count: number };
export type StageCost = { gold: number; needs: VillageReq[] };

/**
 * 첫 공개 시설 단계별 비용(5.3절 예산, 5.2.1절: 봄 채집물과 기존 생활 재료만, 한 시설은 최대 3개 콘텐츠).
 * 1단계 8천~1만5천 골드·일반 20~35개 / 2단계 3만5천~7만·60~100개·희귀 1~2 / 3단계 12만~25만·140~220개·희귀 3~5.
 */
export const STAGE_COSTS: Record<string, StageCost[]> = {
  // 탐험 안내소: 채집 + 농사 + 낚시
  "guide-office": [
    { gold: 10_000, needs: [{ category: "forage", id: "soft-twig", count: 12 }, { category: "forage", id: "young-herb", count: 8 }, { category: "crop", id: "potato", count: 10 }] },
    { gold: 50_000, needs: [{ category: "forage", id: "soft-twig", count: 30 }, { category: "forage", id: "wildflower", count: 25 }, { category: "crop", id: "cabbage", count: 15 }, { category: "fish", id: "any", count: 10 }, { category: "forage", id: "four-leaf-flower", count: 1 }] },
    { gold: 180_000, needs: [{ category: "forage", id: "soft-twig", count: 60 }, { category: "forage", id: "young-herb", count: 50 }, { category: "crop", id: "strawberry", count: 40 }, { category: "fish", id: "any", count: 30 }, { category: "forage", id: "four-leaf-flower", count: 4 }] },
  ],
  // 공방 거리: 채집 + 농사 + 낚시
  "craft-street": [
    { gold: 12_000, needs: [{ category: "forage", id: "soft-twig", count: 10 }, { category: "crop", id: "potato", count: 10 }, { category: "fish", id: "any", count: 8 }] },
    { gold: 55_000, needs: [{ category: "forage", id: "soft-twig", count: 25 }, { category: "forage", id: "young-herb", count: 20 }, { category: "crop", id: "lettuce", count: 25 }, { category: "fish", id: "any", count: 15 }, { category: "forage", id: "four-leaf-flower", count: 1 }] },
    { gold: 200_000, needs: [{ category: "forage", id: "soft-twig", count: 50 }, { category: "forage", id: "wildflower", count: 50 }, { category: "crop", id: "potato", count: 40 }, { category: "fish", id: "any", count: 40 }, { category: "forage", id: "four-leaf-flower", count: 4 }] },
  ],
  // 마을 광장: 채집 + 농사
  plaza: [
    { gold: 8_000, needs: [{ category: "forage", id: "wildflower", count: 15 }, { category: "crop", id: "strawberry", count: 10 }] },
    { gold: 40_000, needs: [{ category: "forage", id: "wildflower", count: 30 }, { category: "forage", id: "young-herb", count: 20 }, { category: "crop", id: "cabbage", count: 20 }, { category: "forage", id: "four-leaf-flower", count: 2 }] },
    { gold: 150_000, needs: [{ category: "forage", id: "wildflower", count: 60 }, { category: "forage", id: "soft-twig", count: 40 }, { category: "forage", id: "young-herb", count: 40 }, { category: "crop", id: "strawberry", count: 40 }, { category: "forage", id: "four-leaf-flower", count: 5 }] },
  ],
};

/** 지금 복구할 수 있는(데이터가 있는) 시설. 나머지는 지도에 "준비 중"으로만 보인다. */
export const isOpenFacility = (id: string) => Boolean(STAGE_COSTS[id]);
export const stageCost = (id: string, level: number): StageCost | null => STAGE_COSTS[id]?.[level] ?? null;

/** 단계별 효과 설명(5.2·5.2.1절). index = 완공 단계 - 1 */
export const STAGE_EFFECTS: Record<string, [string, string, string]> = {
  "guide-office": ["탐험 미니맵에 아직 캐지 않은 일반 자원 위치 표시", "입장 전 일반 재료 1종 집중 탐색(자원 30% 교체) · 4계절 공개 후 비계절 지역 선택", "판마다 일반 자원 1곳을 큰 자원(2개)으로 교체"],
  greenhouse: ["현재 계절 외 씨앗 2종 구매", "비계절 재배칸 2칸", "비계절 재배칸 4칸"],
  pier: ["낚시 결과에 어종 누적 포획 수 표시", "미끼 프리셋 2개", "전설 도감 힌트"],
  "craft-street": ["도시락 즐겨찾기 · 부족 재료 탐험 바로가기", "같은 도시락 최대 3개 일괄 조리", "일괄 조리 최대 5개 + 생활 가공 대기열 개선"],
  "mine-station": ["비겨울 계절에 서리 동굴 하루 2회", "탐험 장비 프리셋 2개", "희귀 샛길 확률 +5%p"],
  plaza: ["복구 기념 꽃상자(집 꾸미기, 판매 불가) 지급", "계절 장식 전시", "완공 기념 동상 · 칭호 「마을을 되살린 농부」"],
};

/** 시설 외형(5.5절): 0 무너짐 → 1 기본 복구 → 2 간판·꽃·도구 → 3 계절 장식·야간 조명. */
export const FACILITY_LOOK: Record<string, [string, string, string, string]> = {
  "guide-office": ["🏚️", "🏠", "🏠🪧", "🏠🪧🏮"],
  greenhouse: ["🏚️", "🛖", "🛖🌷", "🛖🌷✨"],
  pier: ["🪵", "⚓", "⚓🛶", "⚓🛶🏮"],
  "craft-street": ["🏚️", "🏭", "🏭🛠️", "🏭🛠️🏮"],
  "mine-station": ["🪨", "🚃", "🚃🪧", "🚃🪧🏮"],
  plaza: ["🌿", "⛲", "⛲🌷", "⛲🌷🗿"],
};

/** 광장 단계별 외형 보상 id(claimedCosmetics에 기록, 단계당 한 번). 1단계만 실제 가구를 준다. */
export const PLAZA_REWARDS: Record<number, { id: string; furniture?: string; title?: string }> = {
  1: { id: "plaza-1-flowerbox", furniture: "restore-flowerbox" },
  2: { id: "plaza-2-season-deco" },
  3: { id: "plaza-3-statue", title: "마을을 되살린 농부" },
};
