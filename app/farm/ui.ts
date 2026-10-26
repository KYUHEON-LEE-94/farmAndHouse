/** 새 텃밭 화면(콘셉트 public/concepts/farm-field-ui-concept-v1.png). 운영 공개 승인 뒤 true로 바꾼다. 로컬 테스트 모드에서는 항상 보인다. */
import { TEST_MODE } from "../testMode";

export const FARM_V2_RELEASED = false;
export const FARM_V2_ENABLED = FARM_V2_RELEASED || TEST_MODE;
