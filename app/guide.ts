/**
 * 처음 온 사람을 위한 기능 소개 가이드.
 * target: 강조할 화면 요소(CSS 선택자). tab: 그 단계에서 보여 줄 탭.
 */
export type GuideTab = "farm" | "fish" | "book" | "home" | "pets" | "casino" | "gacha";
export type GuideStep = { icon: string; title: string; body: string; target?: string; tab?: GuideTab };

export const GUIDE_DONE_KEY = "wolru-farm-guide";

export const GUIDE_STEPS: GuideStep[] = [
  { icon: "🐈‍⬛", title: "월루농가에 오신 걸 환영해요!", body: "일하는 척하면서 몰래 농사짓는 월급루팡 농장이에요. 주요 기능을 1분 만에 둘러볼게요. 언제든 건너뛸 수 있어요." },
  { icon: "🌸", title: "실제 시간으로 흐르는 사계절", target: ".season-strip", tab: "farm", body: "운영 시간(기본 9~18시)이 봄·여름·가을·겨울로 나뉘어요. 계절마다 심을 수 있는 작물이 달라지고, 계절이 지나면 지난 작물은 시들어요." },
  { icon: "🌦️", title: "진짜 날씨와 효과", target: ".buff-bar", tab: "farm", body: "지금 실제 날씨가 게임에 반영돼요. 비 오면 자동으로 물이 들어가고, 맑으면 황금 작물이 잘 나와요. 펫과 이벤트 효과도 여기 보여요." },
  { icon: "🥔", title: "씨앗 고르기", target: ".seed-panel", tab: "farm", body: "제철 씨앗을 골라요. 시세가 5분마다 바뀌니 비싼 때를 노려 보세요. 아래에서 밭을 넓히고 더 좋은 도구도 살 수 있어요." },
  { icon: "🧰", title: "도구함 (단축키 1~5)", target: ".tool-dock", tab: "farm", body: "1 심기 · 2 수확 · 3 물뿌리개 · 4 우물 · 5 비료(비료 칸을 눌러 종류 고르기). 좋은 도구는 여러 칸을 한 번에 심고 거둬요. 누른 채 밭을 쓸면 연달아 돼요." },
  { icon: "🐛", title: "밭 돌보기", target: ".plots", tab: "farm", body: "작물이 목말라하면 물을 주세요. 물을 잘 주면 품질이 올라 비싸게 팔려요. 벌레가 날아오면 아무 도구로나 눌러 잡아요!" },
  { icon: "🎣", title: "낚시터", target: ".fish-panel", tab: "fish", body: "낚싯대를 던지고 입질이 오면 당겨요. 초록 막대 안에 물고기를 가두는 미니게임이에요. 돈이 없으면 🫳 맨손 낚시도 돼요." },
  { icon: "🏡", title: "나의 집 꾸미기", target: ".house3d", tab: "home", body: "번 돈으로 3D 집을 넓히고 가구를 놓아요. 끌어서 옮기고 돌릴 수 있어요. 펫도 집과 마당을 돌아다녀요." },
  { icon: "🐾", title: "펫 키우기", target: ".tabs", tab: "farm", body: "🛍️ 상점에서 펫을 뽑고 먹이를 사요. 🐾 펫 탭에서 먹이·산책·교감으로 애정도를 채우면 레벨업! 레벨이 오를수록 펫 능력이 강해져요(최대 Lv3)." },
  { icon: "🦝", title: "상점과 도박장", target: ".tabs", tab: "farm", body: "🛍️ 상점에는 펫·가구 가챠와 펫 먹이가 있고, 🎲 도박장에서는 너구리 딜러와 한판! 단, 너구리는 지면 엄청 약 올려요." },
  { icon: "🙈", title: "보스 키 (ESC)", target: ".boss-button", tab: "farm", body: "누가 오면 ESC! 엑셀·VS Code·Figma 같은 업무 화면으로 순식간에 바뀌어요. 설정에서 퇴근 알림도 켤 수 있어요." },
  { icon: "👤", title: "계정으로 이어 하기", target: ".account-button", body: "아이디·비밀번호만 정하면 진행 상황이 계정에 저장돼서 다른 기기에서도 이어 할 수 있어요. 개인정보는 받지 않아요." },
  { icon: "🌱", title: "이제 시작해 볼까요?", body: "씨앗을 골라 밭에 심는 것부터! 이 가이드는 ⚙ 설정에서 언제든 다시 볼 수 있어요. 오늘도 월급 루팡 성공하세요~" },
];
