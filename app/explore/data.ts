/**
 * 채집·탐험 데이터(LIFE_CONTENT_EXPANSION_SPEC 3·6절).
 * 채집물은 통합 인벤토리의 `forage:id` 키로 저장한다(품질·황금 없음).
 */
import type { Season } from "../fishing";
import { TEST_MODE } from "../testMode";

/** 탐험 기능 공개 여부. 운영 공개 승인 뒤 true로 바꾼다(10절 출시 기준). 로컬 테스트 모드에서는 항상 보인다. */
export const EXPLORE_RELEASED = false;
export const EXPLORE_ENABLED = EXPLORE_RELEASED || TEST_MODE;

export type ForageItem = {
  id: string;
  name: string;
  icon: string;
  season: Season;
  /** 지역 희귀 발견물(판당 최대 1개, 5회 미획득 천장) */
  rare: boolean;
  /** 고정 저가 판매가(시세·포화 없음, 7.1절) */
  price: number;
};

/** 계절 지역 4곳 × (일반 3종 + 희귀 1종) = 16종(3.3절). 판매가는 2단계 경제 시뮬레이션에서 다시 맞춘다. */
export const FORAGE: ForageItem[] = [
  { id: "young-herb", name: "어린 약초", icon: "🌿", season: "봄", rare: false, price: 30 },
  { id: "wildflower", name: "들꽃", icon: "🌼", season: "봄", rare: false, price: 25 },
  { id: "soft-twig", name: "부드러운 나뭇가지", icon: "🪵", season: "봄", rare: false, price: 20 },
  { id: "four-leaf-flower", name: "네잎꽃", icon: "🍀", season: "봄", rare: true, price: 300 },
  { id: "fragrant-herb", name: "향초", icon: "🌱", season: "여름", rare: false, price: 30 },
  { id: "flower-nectar", name: "꽃꿀", icon: "🍯", season: "여름", rare: false, price: 35 },
  { id: "thick-reed", name: "굵은 갈대", icon: "🎋", season: "여름", rare: false, price: 20 },
  { id: "blue-firefly", name: "푸른 반딧불", icon: "✨", season: "여름", rare: true, price: 300 },
  { id: "wild-berry", name: "야생 열매", icon: "🫐", season: "가을", rare: false, price: 30 },
  { id: "forest-nut", name: "숲 견과", icon: "🌰", season: "가을", rare: false, price: 30 },
  { id: "maple-sap", name: "단풍 수액", icon: "🍁", season: "가을", rare: false, price: 35 },
  { id: "golden-acorn", name: "황금 도토리", icon: "🥇", season: "가을", rare: true, price: 300 },
  { id: "winter-herb", name: "겨울 약초", icon: "🪴", season: "겨울", rare: false, price: 35 },
  { id: "ice-crystal", name: "얼음 결정", icon: "🧊", season: "겨울", rare: false, price: 30 },
  { id: "iron-scrap", name: "철 조각", icon: "🔩", season: "겨울", rare: false, price: 25 },
  { id: "starlight-ice", name: "별빛 얼음", icon: "💠", season: "겨울", rare: true, price: 300 },
];

export const forageInfo = (id: string) => FORAGE.find(item => item.id === id);
export const forageKey = (id: string) => `forage:${id}`;

export type ExploreRegion = { id: string; name: string; icon: string; season: Season; released: boolean };

/** 계절별 기본 지역(3.3절). 첫 공개는 봄 숲길 하나. */
export const REGIONS: ExploreRegion[] = [
  { id: "sprout-trail", name: "새싹 숲길", icon: "🌳", season: "봄", released: true },
  { id: "sun-marsh", name: "햇빛 습지", icon: "🌾", season: "여름", released: false },
  { id: "maple-valley", name: "단풍 골짜기", icon: "🍂", season: "가을", released: false },
  { id: "frost-cave", name: "서리 동굴", icon: "🕳️", season: "겨울", released: false },
];

/**
 * 지금 입장할 수 있는 지역(3.3절).
 * 공개 지역이 4곳 미만이면 공개된 지역은 계절과 관계없이 항상 열린다.
 * 4곳이 모두 공개되면 현재 계절 지역만 무료이고, 비계절 지역은 시설 해금(extraOpen)으로만 열린다.
 */
export function openRegions(season: Season | "휴식", extraOpen: string[] = [], regions = REGIONS): ExploreRegion[] {
  const released = regions.filter(region => region.released);
  if (released.length < 4) return released;
  return released.filter(region => region.season === season || extraOpen.includes(region.id));
}

/** 현재 계절 지역이면 자원 등장량 +20%(계절 정체성 보너스). */
export const inSeasonBonus = (region: ExploreRegion, season: Season | "휴식") => region.season === season;
