import type { Season } from "./fishing";

export type BuffKind = "growth" | "price" | "seed" | "fish";
export type Buff = { id: string; kind: BuffKind; label: string; multiplier: number; expiresAt: number };
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

export const STORY_EVENTS: StoryEvent[] = [
  { id: "merchant", title: "떠돌이 상인", icon: "🧳", text: "낡은 수레를 끄는 상인이 멈춰 섰어요. \"이 반짝이는 비료 한 봉지면 작물이 쑥쑥 자란다오. 300원이면 되지.\"", choices: [
    { label: "300원에 산다", outcome: { text: "비료를 뿌리자 흙에서 달큰한 냄새가 나요.", money: -300, buff: { kind: "growth", label: "반짝 비료", multiplier: 0.75, minutes: 5 } } },
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
    { label: "창가에서 빗소리를 듣는다", outcome: { text: "빗소리에 마음이 편안해졌어요. 비가 그치자 물고기가 활발해요.", buff: { kind: "fish", label: "비 갠 강", multiplier: 1.8, minutes: 5 } } },
  ] },
  { id: "market-rumor", title: "장날 소문", icon: "📣", text: "\"오늘 읍내 장에 도시 손님들이 몰려왔대!\" 이장님의 방송이 들려요.", choices: [
    { label: "서둘러 장터로 간다", outcome: { text: "손님들이 줄을 섰어요. 작물이 비싸게 팔려요!", buff: { kind: "price", label: "장날 특수", multiplier: 1.15, minutes: 4 } } },
    { label: "하던 일을 마저 한다", outcome: { text: "묵묵히 밭을 돌봤어요. 작물이 조금 빨리 자라요.", buff: { kind: "growth", label: "꼼꼼한 손길", multiplier: 0.9, minutes: 4 } } },
  ] },
  { id: "old-angler", title: "강가의 노인", icon: "🎣", text: "강가에서 밀짚모자를 쓴 노인이 손짓해요. \"젊은이, 낚시 비법을 알려줄까? 대신 막걸리 한 병만 사 오게.\"", choices: [
    { label: "막걸리를 사 온다 (-120원)", outcome: { text: "노인이 찌 맞추는 법을 알려줬어요. 희귀 물고기가 더 잘 물어요!", money: -120, buff: { kind: "fish", label: "노인의 비법", multiplier: 2, minutes: 6 } } },
    { label: "그냥 옆에서 구경한다", outcome: { chance: 0.4, success: { text: "어깨너머로 요령을 익혔어요.", buff: { kind: "fish", label: "어깨너머 요령", multiplier: 1.4, minutes: 4 } }, fail: { text: "노인이 꾸벅꾸벅 졸기 시작했어요. 아무것도 배우지 못했어요." } } },
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
    { label: "밥을 챙겨준다 (-80원)", outcome: { text: "배부른 고양이가 강가까지 따라와요. 물고기 냄새를 귀신같이 맡아요!", money: -80, buff: { kind: "fish", label: "고양이 친구", multiplier: 1.6, minutes: 6 } } },
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
];

export function pickEvent(season: Season, random = Math.random) {
  const pool = STORY_EVENTS.filter(event => !event.seasons || event.seasons.includes(season));
  return pool[Math.floor(random() * pool.length)];
}

export function resolveChoice(choice: Choice, random = Math.random): Effect {
  return "chance" in choice.outcome ? (random() < choice.outcome.chance ? choice.outcome.success : choice.outcome.fail) : choice.outcome;
}

export function buffMultiplier(buffs: Buff[], kind: BuffKind, now: number) {
  return buffs.filter(buff => buff.kind === kind && buff.expiresAt > now).reduce((total, buff) => total * buff.multiplier, 1);
}
