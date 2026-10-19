/** 마을 시설 정의(LIFE_CONTENT_EXPANSION_SPEC 5.2절). 단계별 비용·효과는 4단계에서 채운다. */

/** 마을 기능 공개 여부. 4단계(마을 복구) 구현 뒤 true로 바꾼다. */
export const VILLAGE_RELEASED = false;
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
