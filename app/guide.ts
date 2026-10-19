/**
 * 처음 온 사람을 위한 기능 소개 가이드.
 * target: 강조할 화면 요소(CSS 선택자). tab: 그 단계에서 보여 줄 탭.
 */
export type GuideTab = "farm" | "fish" | "book" | "home" | "pets" | "casino" | "gacha";
export type GuideStep = { icon: string; title: string; body: string; target?: string; tab?: GuideTab; overlay?: "storage" | "missions"; panel?: "seed" | "workshop" };

export const GUIDE_DONE_KEY = "wolru-farm-guide";

export const GUIDE_STEPS: GuideStep[] = [
  { icon: "🐈‍⬛", title: "월루농가에 오신 걸 환영해요!", body: "일하는 척하면서 몰래 농사짓는 월급루팡 농장이에요. 주요 기능을 1분 만에 둘러볼게요. 언제든 건너뛸 수 있어요." },
  { icon: "🌸", title: "실제 시간으로 흐르는 사계절", target: ".season-strip", tab: "farm", body: "운영 시간(기본 9~18시)이 봄·여름·가을·겨울로 나뉘어요. 계절마다 심을 수 있는 작물이 달라지고, 계절이 지나면 지난 작물은 시들어요. ⚙ 설정에서 운영 시간을 바꿀 수 있어요." },
  { icon: "🌦️", title: "진짜 날씨와 효과", target: ".buff-bar", tab: "farm", body: "지금 실제 날씨가 게임에 반영돼요. 비 오면 자동으로 물이 들어가고, 맑으면 황금 작물이 잘 나와요. 펫과 이벤트 효과도 여기 보여요." },
  { icon: "📈", title: "5분마다 달라지는 작물 전략", target: ".seed-panel", tab: "farm", panel: "seed", body: "제철 씨앗을 골라요. 씨앗값은 고정이지만 판매가와 재배시간은 5분마다 작물별로 다시 정해져요. 비싼 작물만 고집하지 말고 이번 시세와 시간을 함께 보세요." },
  { icon: "🧰", title: "도구함과 비료", target: ".tool-dock", tab: "farm", body: "1 심기 · 2 수확 · 3 물뿌리개 · 4 우물 · 5~7 비료예요. 좋은 도구는 여러 칸을 한 번에 처리하고, 비료는 남은 성장시간과 다음 물주기 시점을 함께 앞당겨요." },
  { icon: "🐛", title: "밭 돌보기", target: ".plots", tab: "farm", body: "작물이 목말라하면 물을 주세요. 물을 잘 주면 품질이 올라 비싸게 팔려요. 벌레가 날아오면 아무 도구로나 눌러 잡아요. 비료를 줬다면 물 주는 시점도 빨라진다는 점을 기억하세요!" },
  { icon: "📦", title: "모든 획득물은 통합 창고로", target: ".storage-modal", tab: "farm", overlay: "storage", body: "농산물과 물고기를 한 창고에 보관해요. 농사와 낚시의 ‘바로 판매/창고 보관’을 따로 고를 수 있고 새 게임은 보관이 기본이에요. 잠금과 미션 예약분은 판매에서 빠져요. 어느 화면에서든 E로 열 수 있어요." },
  { icon: "📜", title: "농사·낚시 공용 미션", target: ".missions-modal", tab: "farm", overlay: "missions", body: "농산물·물고기·혼합 미션이 매일 와요. 재료를 전부 모을 필요 없이 창고에 있는 만큼 미리 납품할 수 있고, 남은 수량은 자동 예약돼요. 어느 화면에서든 M으로 열 수 있어요." },
  { icon: "🏺", title: "남은 작물은 가공하기", target: ".seed-panel", tab: "farm", panel: "workshop", body: "통합 창고의 작물을 절임 항아리에 넣어 가공품으로 만들 수 있어요. 여러 작물을 섞을수록 가치가 높고, 가공품은 시장 시세와 포화에 영향받지 않아요. 잠금·미션 예약분은 자동으로 제외돼요." },
  { icon: "🎣", title: "낚시터와 전설 물고기", target: ".fish-panel", tab: "fish", body: "입질이 오면 당기고 초록 막대 안에 물고기를 가둬요. 전설은 기본 1%이며 좋은 미끼와 낚싯대가 확률을 높여요. 돈이 없으면 맨손 낚시도 되지만 희귀·전설은 나오지 않아요." },
  { icon: "🏡", title: "나의 집 꾸미기", target: ".house3d", tab: "home", body: "번 돈으로 3D 집을 넓히고 가구를 놓아요. 끌어서 옮기고 돌릴 수 있어요. 펫도 집과 마당을 돌아다녀요." },
  { icon: "🐾", title: "펫 키우기와 안전 보관", target: ".main-menu", tab: "pets", body: "🛍️ 상점에서 펫을 뽑고 먹이를 사요. 먹이·산책·교감으로 최대 Lv3까지 키우고 닉네임도 지을 수 있어요. 아끼는 펫과 가구는 창고에서 잠가 실수로 판매하지 않게 보호하세요." },
  { icon: "🦝", title: "상점과 도박장", target: ".main-menu", tab: "farm", body: "🛍️ 상점에는 펫·가구 가챠와 펫 먹이가 있고, 🎲 도박장에서는 너구리 딜러와 한판! 단, 너구리는 지면 엄청 약 올려요." },
  { icon: "🙈", title: "보스 키 (ESC)", target: ".boss-button", tab: "farm", body: "누가 오면 ESC! 엑셀·VS Code·Figma 같은 업무 화면으로 순식간에 바뀌어요. 설정에서 퇴근 알림도 켤 수 있어요." },
  { icon: "👤", title: "계정으로 이어 하기", target: ".account-button", body: "아이디·비밀번호만 정하면 진행 상황이 계정에 저장돼서 다른 기기에서도 이어 할 수 있어요. 개인정보는 받지 않아요." },
  { icon: "🌱", title: "이제 시작해 볼까요?", body: "씨앗을 골라 밭에 심는 것부터! 이 가이드는 ⚙ 설정에서 언제든 다시 볼 수 있어요. 오늘도 월급 루팡 성공하세요~" },
];
