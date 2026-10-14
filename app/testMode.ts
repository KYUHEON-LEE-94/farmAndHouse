/**
 * 테스트 모드: 로컬 개발 서버(vite dev, localhost:5179)에서만 자동으로 켜지고, 빌드해서 배포한 사이트에서는 자동으로 꺼진다.
 * 그래서 푸시할 때 손으로 끌 필요가 없다.
 *
 * 켜지면
 * - 아직 공개하지 않은 기능(사냥터·주방)이 보인다.
 * - 상점 아이템(무기·도구·물뿌리개·뿌리개·낚싯대·벽지)을 사지 않아도 모두 쓸 수 있다(저장에는 "가짐"으로 기록하지 않음).
 * - 계정 자동 저장을 막는다(테스트용 상태가 실제 계정에 올라가지 않게).
 */
export const TEST_MODE = Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);

/** 테스트 모드면 무엇이든 가진 것으로 본다. */
export const ownsItem = (list: string[], id: string) => TEST_MODE || list.includes(id);
