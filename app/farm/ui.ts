/** 새 텃밭 화면(콘셉트 public/concepts/farm-field-ui-concept-v1.png). 운영 공개 승인 뒤 true로 바꾼다. 로컬 테스트 모드에서는 항상 보인다. */
import { TEST_MODE } from "../testMode";

export const FARM_V2_RELEASED = true; // 2026-10-26 운영 공개(사용자 요청)
export const FARM_V2_ENABLED = FARM_V2_RELEASED || TEST_MODE;

/** 새 낚시터 화면(콘셉트 public/concepts/fishing-ui-concept). 운영 공개 승인 뒤 true로 바꾼다. */
export const FISH_V2_RELEASED = false;
export const FISH_V2_ENABLED = FISH_V2_RELEASED || TEST_MODE;
