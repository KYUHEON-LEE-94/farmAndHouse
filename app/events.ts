import type { Season } from "./fishing";

export type BuffKind = "growth" | "price" | "seed" | "fish";
/** left: 횟수제 판매가 효과의 남은 농작물 수(있으면 시간 대신 수량으로 끝난다) */
export type Buff = { id: string; kind: BuffKind; label: string; multiplier: number; expiresAt: number; left?: number };
export type Effect = { text: string; money?: number; buff?: { kind: BuffKind; label: string; multiplier: number; minutes: number } };
export type Choice = { label: string; outcome: Effect | { chance: number; success: Effect; fail: Effect } };
export type StoryEvent = { id: string; title: string; icon: string; seasons?: Season[]; text: string; choices: Choice[] };

// 배수 의미: growth는 성장 시간(낮을수록 빠름), price는 판매가, seed는 씨앗값, fish는 희귀 물고기 확률.
export const BUFF_INFO: Record<BuffKind, { name: string; good: (multiplier: number) => boolean }> = {
  growth: { name: "성장 시간", good: multiplier => multiplier < 1 },
  price: { name: "판매가", good: multiplier => multiplier > 1 },
  seed: { name: "씨앗값", good: multiplier => multiplier < 1 },
  fish: { name: "희귀 어획", good: multiplier => multiplier > 1 },
};

export const EVENT_CHECK_SECONDS = 45;
export const EVENT_COOLDOWN_MINUTES = 3;
export const EVENT_CHANCE = 0.35;
/**
 * 2026-10-19 돌발 이벤트 1차 개선(RANDOM_EVENT_AUDIT 10절):
 * - 성장 효과는 확인을 누르는 순간 자라는 작물의 남은 시간에 바로 적용(시간제 성장 배수 폐지)
 * - 판매가 효과는 "다음 농작물 40개"(수량제, 대량 판매 폭주 방지). 씨앗·희귀 어획은 시간제 유지
 * - 효과 시작은 결과 창의 확인 버튼부터(돈은 선택 즉시)
 * - 지금 상태에서 효과가 없는 이벤트와 최근 3개 이벤트는 후보에서 뺀다
 */
export const PRICE_EVENT_COUNT = 40;
export const RECENT_EVENT_LIMIT = 3;
export const EVENT_MIN_GROWING = 4;
export const EVENT_MIN_EMPTY = 4;

export const STORY_EVENTS: StoryEvent[] = [
  { id: "merchant", title: "떠돌이 상인", icon: "🧳", text: "낡은 수레를 끄는 상인이 멈춰 섰어요. \"이 특제 영양제 한 병을 밭에 뿌리면 자라던 작물이 쑥쑥 큰다오. 300원이면 되지.\"", choices: [
    { label: "300원에 산다", outcome: { text: "특제 영양제를 밭에 뿌리자 자라던 작물들이 기운을 차려요.", money: -300, buff: { kind: "growth", label: "반짝 비료", multiplier: 0.75, minutes: 5 } } },
    { label: "반값에 흥정한다", outcome: { chance: 0.5, success: { text: "상인이 껄껄 웃으며 150원에 넘겨줬어요!", money: -150, buff: { kind: "growth", label: "반짝 비료", multiplier: 0.75, minutes: 5 } }, fail: { text: "상인이 기분이 상해 수레를 끌고 떠나버렸어요.", money: 0 } } },
    { label: "정중히 거절한다", outcome: { text: "상인은 아쉬운 듯 다음 마을로 향했어요." } },
  ] },
  { id: "crows", title: "까마귀 떼", icon: "🐦‍⬛", text: "검은 까마귀 떼가 밭 위를 빙빙 돌고 있어요. 새싹을 노리는 눈치예요.", choices: [
    { label: "허수아비를 세운다 (-200원)", outcome: { text: "든든한 허수아비 덕분에 밭이 조용해졌어요.", money: -200 } },
    { label: "소리를 질러 쫓는다", outcome: { chance: 0.6, success: { text: "까마귀들이 깜짝 놀라 멀리 날아갔어요." }, fail: { text: "까마귀들이 새싹을 쪼아 먹었어요. 작물이 기운을 잃었어요.", buff: { kind: "growth", label: "새싹 피해", multiplier: 1.3, minutes: 4 } } } },
  ] },
  { id: "grandma", title: "이웃 할머니", icon: "👵", text: "옆집 할머니가 갓 담근 김치를 한 통 들고 오셨어요. \"농사짓느라 고생 많지?\"", choices: [
    { label: "감사히 받는다", outcome: { text: "든든하게 밥을 먹고 나니 장사할 힘이 나요.", buff: { kind: "price", label: "할머니 김치", multiplier: 1.1, minutes: 5 } } },
    { label: "작물로 답례한다 (-150원)", outcome: { text: "할머니가 동네방네 칭찬해 주셔서 단골이 늘었어요.", money: -150, buff: { kind: "price", label: "동네 평판", multiplier: 1.2, minutes: 6 } } },
  ] },
  { id: "shower", title: "한여름 소나기", icon: "🌧️", seasons: ["여름"], text: "갑자기 하늘이 어두워지더니 굵은 소나기가 쏟아져요.", choices: [
    { label: "밭에 나가 물길을 낸다", outcome: { chance: 0.7, success: { text: "물길 덕분에 밭이 촉촉해져 작물이 신나게 자라요.", buff: { kind: "growth", label: "단비", multiplier: 0.8, minutes: 5 } }, fail: { text: "미끄러져 넘어졌어요! 옷을 갈아입느라 일이 늦어졌어요.", buff: { kind: "growth", label: "흙투성이", multiplier: 1.15, minutes: 3 } } } },
    { label: "창가에서 빗소리를 듣는다", outcome: { text: "빗소리에 마음이 편안해졌어요. 비가 그치자 물고기가 활발해요.", buff: { kind: "fish", label: "비 갠 강", multiplier: 1.25, minutes: 5 } } },
  ] },
  { id: "market-rumor", title: "장날 소문", icon: "📣", text: "\"오늘 읍내 장에 도시 손님들이 몰려왔대!\" 이장님의 방송이 들려요.", choices: [
    { label: "서둘러 장터로 간다", outcome: { text: "손님들이 줄을 섰어요. 작물이 비싸게 팔려요!", buff: { kind: "price", label: "장날 특수", multiplier: 1.15, minutes: 4 } } },
    { label: "하던 일을 마저 한다", outcome: { text: "묵묵히 밭을 돌봤어요. 작물이 조금 빨리 자라요.", buff: { kind: "growth", label: "꼼꼼한 손길", multiplier: 0.9, minutes: 4 } } },
  ] },
  { id: "old-angler", title: "강가의 노인", icon: "🎣", text: "강가에서 밀짚모자를 쓴 노인이 손짓해요. \"젊은이, 낚시 비법을 알려줄까? 대신 막걸리 한 병만 사 오게.\"", choices: [
    { label: "막걸리를 사 온다 (-120원)", outcome: { text: "노인이 찌 맞추는 법을 알려줬어요. 희귀 물고기가 더 잘 물어요!", money: -120, buff: { kind: "fish", label: "노인의 비법", multiplier: 1.3, minutes: 6 } } },
    { label: "그냥 옆에서 구경한다", outcome: { chance: 0.4, success: { text: "어깨너머로 요령을 익혔어요.", buff: { kind: "fish", label: "어깨너머 요령", multiplier: 1.15, minutes: 4 } }, fail: { text: "노인이 꾸벅꾸벅 졸기 시작했어요. 아무것도 배우지 못했어요." } } },
  ] },
  { id: "cold", title: "으슬으슬 감기", icon: "🤧", seasons: ["겨울"], text: "찬바람을 맞았더니 콧물이 나고 몸이 으슬으슬해요.", choices: [
    { label: "생강차를 사 마신다 (-150원)", outcome: { text: "뜨끈한 생강차 덕분에 금세 기운을 차렸어요.", money: -150 } },
    { label: "그냥 버틴다", outcome: { chance: 0.5, success: { text: "다행히 하룻밤 자고 나니 멀쩡해요." }, fail: { text: "몸이 무거워 밭일이 느려졌어요.", buff: { kind: "growth", label: "감기 몸살", multiplier: 1.25, minutes: 5 } } } },
  ] },
  { id: "maple-festival", title: "단풍 축제", icon: "🍁", seasons: ["가을"], text: "마을 단풍 축제가 열렸어요. 농산물 부스 참가비는 300원이래요.", choices: [
    { label: "부스를 연다 (-300원)", outcome: { text: "축제 손님들이 작물을 비싸게 사 가요!", money: -300, buff: { kind: "price", label: "축제 부스", multiplier: 1.25, minutes: 5 } } },
    { label: "구경만 한다", outcome: { text: "붉은 단풍길을 걸으며 기분 전환을 했어요." } },
  ] },
  { id: "seed-sale", title: "봄맞이 종묘상", icon: "🌱", seasons: ["봄"], text: "읍내 종묘상 사장님이 봄맞이 할인 쿠폰을 건네요. \"단골 되면 더 깎아 줄게!\"", choices: [
    { label: "단골 등록을 한다", outcome: { text: "씨앗을 싸게 살 수 있게 되었어요.", buff: { kind: "seed", label: "단골 할인", multiplier: 0.7, minutes: 6 } } },
    { label: "쿠폰만 챙긴다", outcome: { text: "쿠폰으로 잠시 씨앗값을 아껴요.", buff: { kind: "seed", label: "할인 쿠폰", multiplier: 0.85, minutes: 3 } } },
  ] },
  { id: "stray-cat", title: "길 잃은 고양이", icon: "🐈", text: "삐쩍 마른 고양이가 현관 앞에서 야옹 울고 있어요.", choices: [
    { label: "밥을 챙겨준다 (-80원)", outcome: { text: "배부른 고양이가 강가까지 따라와요. 물고기 냄새를 귀신같이 맡아요!", money: -80, buff: { kind: "fish", label: "고양이 친구", multiplier: 1.2, minutes: 6 } } },
    { label: "모른 척 지나간다", outcome: { text: "고양이는 담장 너머로 사라졌어요." } },
  ] },
  { id: "mole", title: "두더지 출몰", icon: "🦫", text: "밭 한가운데 흙더미가 불쑥 솟았어요. 두더지가 굴을 파고 있어요!", choices: [
    { label: "땅을 다진다 (-150원)", outcome: { text: "두더지가 다른 곳으로 이사 갔어요.", money: -150 } },
    { label: "내버려 둔다", outcome: { chance: 0.5, success: { text: "두더지 굴 덕분에 흙에 숨구멍이 생겼어요!", buff: { kind: "growth", label: "폭신한 흙", multiplier: 0.85, minutes: 4 } }, fail: { text: "뿌리가 상해서 작물이 비실비실해요.", buff: { kind: "growth", label: "뿌리 손상", multiplier: 1.3, minutes: 4 } } } },
  ] },
  { id: "wallet", title: "주운 지갑", icon: "👛", text: "밭둑에서 두툼한 지갑을 주웠어요. 안에는 500원과 이장님 명함이 들어 있어요.", choices: [
    { label: "이장님께 돌려준다", outcome: { chance: 0.7, success: { text: "이장님이 고맙다며 사례금 300원을 주셨어요!", money: 300, buff: { kind: "price", label: "정직한 농부", multiplier: 1.1, minutes: 5 } }, fail: { text: "이장님이 고맙다며 활짝 웃으셨어요. 마음이 따뜻해요." } } },
    { label: "슬쩍 챙긴다", outcome: { text: "500원을 챙겼지만 소문이 퍼져 손님들이 값을 깎아요.", money: 500, buff: { kind: "price", label: "나쁜 소문", multiplier: 0.85, minutes: 6 } } },
  ] },
  { id: "boss-patrol", title: "팀장님 순찰", icon: "👔", text: "등 뒤로 팀장님 발소리가 들려요! 화면에는 지금 농장이 떠 있는데…", choices: [
    { label: "Alt+Tab! 엑셀을 띄운다", outcome: { text: "아슬아슬하게 엑셀로 전환했어요. 팀장님이 고개를 끄덕이며 지나갔어요. 휴~" } },
    { label: "당당하게 계속 농사짓는다", outcome: { chance: 0.5, success: { text: "\"어? 이거 무슨 게임이야? 나도 해볼까\" 팀장님도 농부가 되었어요. 기분 좋게 작물이 팔려요!", buff: { kind: "price", label: "팀장님 공인", multiplier: 1.15, minutes: 5 } }, fail: { text: "\"자네, 보고서는?\" 업무 폭탄을 맞아 밭일할 틈이 없어요.", buff: { kind: "growth", label: "업무 폭탄", multiplier: 1.25, minutes: 4 } } } },
  ] },
  { id: "lunch", title: "점심시간", icon: "🍱", text: "꼬르륵… 점심시간이에요. 동료들이 새로 생긴 맛집에 가자고 해요.", choices: [
    { label: "맛집에 간다 (-200원)", outcome: { text: "든든하게 먹고 오니 손님 응대도 척척!", money: -200, buff: { kind: "price", label: "든든한 점심", multiplier: 1.1, minutes: 5 } } },
    { label: "도시락을 먹으며 농사짓는다", outcome: { text: "한 손엔 숟가락, 한 손엔 마우스. 작물이 조금 빨리 자라요.", buff: { kind: "growth", label: "점심 농사", multiplier: 0.9, minutes: 4 } } },
  ] },
  { id: "company-dinner", title: "회식 공지", icon: "🍻", text: "\"오늘 저녁 회식 있습니다~ 전원 참석!\" 단톡방이 울려요.", choices: [
    { label: "회비를 낸다 (-300원)", outcome: { text: "회식에서 농장 자랑을 했더니 단골이 생겼어요!", money: -300, buff: { kind: "price", label: "회식 인맥", multiplier: 1.2, minutes: 5 } } },
    { label: "몰래 빠진다", outcome: { chance: 0.5, success: { text: "아무도 눈치채지 못했어요. 남은 시간에 낚시를 즐겨요.", buff: { kind: "fish", label: "자유 시간", multiplier: 1.2, minutes: 4 } }, fail: { text: "\"어디 갔었어?\" 들켜 버렸어요. 마음이 무거워 일이 손에 안 잡혀요.", buff: { kind: "growth", label: "눈치 보기", multiplier: 1.2, minutes: 3 } } } },
  ] },
  { id: "messenger", title: "메신저 폭탄", icon: "💬", text: "업무 메신저 알림이 999+개 쌓였어요. 띠링띠링띠링…", choices: [
    { label: "하나하나 답장한다", outcome: { text: "모두 답장하느라 진이 빠졌지만 동료들이 고마워해요.", buff: { kind: "price", label: "칼답 평판", multiplier: 1.1, minutes: 4 } } },
    { label: "알림을 끈다", outcome: { chance: 0.5, success: { text: "고요한 평화… 농사에 집중할 수 있어요.", buff: { kind: "growth", label: "집중 모드", multiplier: 0.85, minutes: 4 } }, fail: { text: "급한 메시지가 있었네요. 뒤늦게 수습하느라 정신이 없어요.", buff: { kind: "growth", label: "뒷수습", multiplier: 1.2, minutes: 4 } } } },
  ] },
  { id: "coin-scam", title: "수상한 투자 권유", icon: "📈", text: "낯선 사람이 다가와요. \"농장 코인에 1,000원만 넣으면 세 배로 불려 드립니다!\"", choices: [
    { label: "1,000원 투자한다", outcome: { chance: 0.25, success: { text: "떡상!!! 2,800원이 되어 돌아왔어요!", money: 1800 }, fail: { text: "다음 날 그 사람은 사라졌어요… 1,000원이 증발했어요.", money: -1000 } } },
    { label: "단호하게 거절한다", outcome: { text: "현명한 선택! 마음이 편안해요." } },
  ] },
  { id: "parcel", title: "택배 도착", icon: "📦", text: "주문한 기억이 없는 택배가 회사로 왔어요. 보낸 사람: '고향 엄마'", choices: [
    { label: "열어본다", outcome: { chance: 0.6, success: { text: "엄마표 반찬과 용돈 봉투! 500원이 들어 있어요.", money: 500 }, fail: { text: "직접 키운 퇴비가 가득! 밭이 쑥쑥 자라요.", buff: { kind: "growth", label: "엄마표 퇴비", multiplier: 0.8, minutes: 4 } } } },
    { label: "동료와 나눈다", outcome: { text: "나눠 먹으니 인심이 좋아져 손님이 늘었어요.", buff: { kind: "price", label: "나눔 인심", multiplier: 1.12, minutes: 5 } } },
  ] },
  { id: "coffee", title: "커피 쿠폰", icon: "☕", text: "생일인 동료가 커피 쿠폰을 돌렸어요. 아이스 아메리카노 한 잔!", choices: [
    { label: "원샷한다", outcome: { text: "카페인 충전! 손이 빨라져요.", buff: { kind: "growth", label: "카페인 부스트", multiplier: 0.85, minutes: 3 } } },
    { label: "천천히 음미한다", outcome: { text: "여유가 생기니 물고기도 여유롭게 물어요.", buff: { kind: "fish", label: "여유로운 오후", multiplier: 1.15, minutes: 4 } } },
  ] },
  { id: "rainbow", title: "쌍무지개", icon: "🌈", seasons: ["봄", "여름"], text: "비가 그친 하늘에 쌍무지개가 떴어요! 소원을 빌면 이루어진대요.", choices: [
    { label: "\"희귀한 물고기를 낚게 해주세요\"", outcome: { text: "강물이 반짝이기 시작했어요. 희귀 물고기가 잘 물어요!", buff: { kind: "fish", label: "무지개 소원", multiplier: 1.3, minutes: 5 } } },
    { label: "\"부자 되게 해주세요\"", outcome: { text: "무지개 끝에서 동전 몇 닢을 주웠어요.", money: 400 } },
  ] },
  { id: "typhoon", title: "태풍 경보", icon: "🌀", seasons: ["여름"], text: "태풍이 북상 중이래요! 밭이 걱정돼요.", choices: [
    { label: "밭에 덮개를 씌운다 (-250원)", outcome: { text: "튼튼한 덮개 덕분에 작물이 무사해요.", money: -250 } },
    { label: "운에 맡긴다", outcome: { chance: 0.4, success: { text: "태풍이 비껴갔어요! 비 덕분에 오히려 촉촉해요.", buff: { kind: "growth", label: "태풍 뒤 단비", multiplier: 0.85, minutes: 4 } }, fail: { text: "바람에 작물이 쓰러졌어요. 다시 일으키느라 시간이 걸려요.", buff: { kind: "growth", label: "태풍 피해", multiplier: 1.35, minutes: 4 } } } },
  ] },
  { id: "harvest-moon", title: "한가위 보름달", icon: "🌕", seasons: ["가을"], text: "커다란 보름달이 떴어요. 마을 사람들이 강강술래를 하고 있어요.", choices: [
    { label: "함께 춤을 춘다", outcome: { text: "신나게 놀았더니 종묘상 사장님이 씨앗을 깎아 줬어요.", buff: { kind: "seed", label: "한가위 인심", multiplier: 0.75, minutes: 5 } } },
    { label: "달에게 소원을 빈다", outcome: { text: "풍년을 빌었더니 작물값이 올랐어요.", buff: { kind: "price", label: "풍년 기원", multiplier: 1.15, minutes: 5 } } },
  ] },
  { id: "first-snow", title: "첫눈", icon: "☃️", seasons: ["겨울"], text: "펑펑 첫눈이 내려요! 마을 아이들이 눈사람을 만들자고 졸라요.", choices: [
    { label: "눈사람을 만든다", outcome: { text: "아이들 부모님들이 고맙다며 작물을 비싸게 사 줬어요.", buff: { kind: "price", label: "첫눈 추억", multiplier: 1.12, minutes: 5 } } },
    { label: "얼음낚시를 간다", outcome: { text: "꽁꽁 언 강에서 물고기가 몰려 있는 구멍을 찾았어요!", buff: { kind: "fish", label: "얼음 구멍 명당", multiplier: 1.25, minutes: 4 } } },
  ] },
  { id: "fishing-contest", title: "마을 낚시대회", icon: "🏆", text: "이장님이 낚시대회를 연대요. 참가비 200원, 우승 상금 800원!", choices: [
    { label: "참가한다 (참가비 -200원)", outcome: { chance: 0.45, success: { text: "월척을 낚아 우승했어요!! 상금 800원(참가비를 빼면 +600원)!", money: 600 }, fail: { text: "아쉽게 2등… 참가상으로 낚시 요령을 배웠어요.", money: -200, buff: { kind: "fish", label: "대회 경험", multiplier: 1.1, minutes: 4 } } } },
    { label: "응원만 한다", outcome: { text: "응원하다 보니 목이 쉬었어요. 그래도 재밌었어요!" } },
  ] },
  { id: "blackout", title: "갑작스런 정전", icon: "🔌", text: "사무실 전기가 나갔어요! 모니터가 꺼지고 모두 웅성거려요.", choices: [
    { label: "손전등을 산다 (-100원)", outcome: { text: "손전등을 비추며 밭을 돌봤어요. 꼼꼼해서 작물이 잘 자라요.", money: -100, buff: { kind: "growth", label: "손전등 농사", multiplier: 0.9, minutes: 3 } } },
    { label: "이참에 낮잠을 잔다", outcome: { text: "푹 자고 일어났더니 개운해요! 물고기 입질도 잘 보여요.", buff: { kind: "fish", label: "꿀잠", multiplier: 1.15, minutes: 4 } } },
  ] },
  { id: "thief-cat", title: "생선 도둑", icon: "😼", text: "도둑고양이가 아이스박스에서 생선을 물고 달아나요!", choices: [
    { label: "쫓아간다", outcome: { chance: 0.6, success: { text: "생선을 되찾고, 덤으로 고양이가 숨겨 둔 동전도 찾았어요!", money: 250 }, fail: { text: "놓쳤어요… 담장 위에서 고양이가 비웃어요." } } },
    { label: "그냥 준다", outcome: { text: "배부른 고양이가 고맙다며 명당 자리를 알려 줬어요.", buff: { kind: "fish", label: "고양이의 보답", multiplier: 1.2, minutes: 5 } } },
  ] },
];

/** 이벤트가 효과를 내려면 필요한 상태(선택지 결과에서 자동으로 계산) */
export type EventContext = { growing: number; empty: number; fish: number };
const effectsOf = (event: StoryEvent) => event.choices.flatMap(c => ("chance" in c.outcome ? [c.outcome.success, c.outcome.fail] : [c.outcome]));
export function eventFits(event: StoryEvent, ctx: EventContext) {
  const kinds = new Set(effectsOf(event).map(e => e.buff?.kind).filter(Boolean));
  if (kinds.has("growth") && ctx.growing < EVENT_MIN_GROWING) return false; // 자라는 작물이 없으면 까마귀·두더지·태풍 등 제외
  if (kinds.has("seed") && ctx.empty < EVENT_MIN_EMPTY) return false;        // 빈 밭이 없으면 씨앗 할인 제외
  if (event.id === "thief-cat" && ctx.fish < 1) return false;                 // 창고 물고기가 없으면 생선 도둑 제외
  return true;
}
/** 계절·현재 상태·최근 3개 제외로 고른다. 후보가 없으면 null(이번 검사는 건너뜀) */
export function pickEvent(season: Season, ctx: EventContext = { growing: 99, empty: 99, fish: 99 }, recent: string[] = [], random = Math.random): StoryEvent | null {
  const pool = STORY_EVENTS.filter(event => (!event.seasons || event.seasons.includes(season)) && !recent.slice(-RECENT_EVENT_LIMIT).includes(event.id) && eventFits(event, ctx));
  return pool.length ? pool[Math.floor(random() * pool.length)] : null;
}
/** 횟수제 판매가 효과: n개 판매 묶음에 적용할 배율(남은 수량만큼만 보너스) */
export function priceBuffFactor(buffs: Buff[], n: number, now: number) {
  if (n <= 0) return 1;
  return buffs.filter(b => b.kind === "price" && b.left !== undefined && b.left > 0 && b.expiresAt > now).reduce((t, b) => t * (1 + (b.multiplier - 1) * Math.min(b.left!, n) / n), 1);
}
/** n개 판매 뒤 남은 수량을 줄이고 다 쓴 효과는 지운다 */
export function consumePriceBuffs(buffs: Buff[], n: number) {
  return buffs.map(b => (b.kind === "price" && b.left !== undefined ? { ...b, left: b.left - n } : b)).filter(b => b.left === undefined || b.left > 0);
}

export function resolveChoice(choice: Choice, random = Math.random): Effect {
  return "chance" in choice.outcome ? (random() < choice.outcome.chance ? choice.outcome.success : choice.outcome.fail) : choice.outcome;
}

export function buffMultiplier(buffs: Buff[], kind: BuffKind, now: number) {
  return buffs.filter(buff => buff.kind === kind && buff.expiresAt > now && buff.left === undefined).reduce((total, buff) => total * buff.multiplier, 1);
}
