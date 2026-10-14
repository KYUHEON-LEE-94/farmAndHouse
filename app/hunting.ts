import { TEST_MODE } from "./testMode";
/**
 * 사냥: 초단기 사냥.
 * 동물 등장(예고 없이 바로)(움직임 시작) → 클릭할 때마다 즉시 판정(즉발형) → 체력 0이면 포획.
 * 제한 시간 안에 못 잡으면 도주. 결과는 1초 뒤 사라지고 다음 흔적이 나온다.
 * 동물은 속도·체력·움직임 속성을 가진다(토끼가 기준). 무기는 상점에서 사고, 데미지와 발사 간격이 다르다.
 */
export type MoveKind = "hop" | "zip" | "dash" | "charge" | "wander" | "stalk";
/** price: 상점에 팔 때 받는 값(원). */
export type Loot = { id: string; name: string; icon: string; price: number };
/** speed: 토끼 기준 배수, hp: 체력, defense: 방어력(무기 데미지에서 빼고 들어간다, 0이면 튕김), window: 제한 시간(초), size: 판정 반지름(사냥터 가로 % 기준). */
export type Animal = { id: string; name: string; icon: string; weight: number; speed: number; hp: number; defense: number; move: MoveKind; moveName: string; window: number; size: number; loot: Loot; rare: Loot };

/** 토끼 속도(사냥터 가로 %/초). 다른 동물은 이 배수. */
export const BASE_SPEED = 48;

export const ANIMALS: Animal[] = [
  { id: "rabbit", name: "토끼", icon: "🐇", weight: 30, speed: 1, hp: 2, defense: 0, move: "hop", moveName: "지그재그로 깡충", window: 3.5, size: 4.2, loot: { id: "rabbitfur", name: "토끼 털뭉치", icon: "🤍", price: 60 }, rare: { id: "luckyfoot", name: "행운의 털", icon: "🍀", price: 300 } },
  { id: "fox", name: "여우", icon: "🦊", weight: 15, speed: 1.6, hp: 2, defense: 1, move: "zip", moveName: "번개처럼 튀었다 멈칫", window: 3, size: 4, loot: { id: "foxfur", name: "여우 꼬리털", icon: "🧡", price: 100 }, rare: { id: "foxbead", name: "여우 구슬", icon: "🔮", price: 500 } },
  { id: "deer", name: "사슴", icon: "🦌", weight: 22, speed: 1.2, hp: 3, defense: 1, move: "dash", moveName: "곧게 내달림", window: 3.5, size: 4.8, loot: { id: "antler", name: "떨어진 사슴뿔", icon: "🦌", price: 100 }, rare: { id: "goldantler", name: "황금 뿔 조각", icon: "✨", price: 600 } },
  { id: "boar", name: "멧돼지", icon: "🐗", weight: 20, speed: 1.15, hp: 5, defense: 2, move: "charge", moveName: "돌진 후 급선회", window: 4, size: 5.2, loot: { id: "boarhair", name: "멧돼지 털", icon: "🧶", price: 140 }, rare: { id: "tusk", name: "엄니 조각", icon: "🦷", price: 700 } },
  { id: "bear", name: "곰", icon: "🐻", weight: 10, speed: 0.6, hp: 6, defense: 3, move: "wander", moveName: "느릿느릿 어슬렁", window: 5, size: 6, loot: { id: "bearfur", name: "곰 털뭉치", icon: "🟫", price: 240 }, rare: { id: "honey", name: "야생 꿀", icon: "🍯", price: 1000 } },
  { id: "tiger", name: "호랑이", icon: "🐅", weight: 3, speed: 0.9, hp: 10, defense: 4, move: "stalk", moveName: "웅크렸다 덮침", window: 6, size: 6.4, loot: { id: "tigerpelt", name: "호랑이 가죽", icon: "🐯", price: 800 }, rare: { id: "tigerfang", name: "호랑이 송곳니", icon: "🦷", price: 3000 } },
];
export const ALL_LOOT: Loot[] = ANIMALS.flatMap(animal => [animal.loot, animal.rare]);

/** 무기: 상점에서 산다. damage: 한 발 데미지, cooldown: 다음 발까지(초). 모두 즉발형(클릭한 순간 판정). */
export type Weapon = { id: string; name: string; icon: string; price: number; damage: number; cooldown: number; note: string };
export const WEAPONS: Weapon[] = [
  { id: "hand", name: "맨손", icon: "✊", price: 0, damage: 1, cooldown: 0.25, note: "토끼만 잡혀요" },
  { id: "slingshot", name: "딱총", icon: "🪀", price: 1500, damage: 2, cooldown: 0.3, note: "여우·사슴까지" },
  { id: "bow", name: "활", icon: "🏹", price: 5000, damage: 3, cooldown: 0.45, note: "멧돼지까지" },
  { id: "crossbow", name: "석궁", icon: "🎯", price: 12000, damage: 4, cooldown: 0.6, note: "곰까지(6방)" },
  { id: "shotgun", name: "엽총", icon: "🔫", price: 25000, damage: 6, cooldown: 0.8, note: "호랑이까지(5방)" },
];

/** 사냥터 공개 여부. 공개할 때 HUNT_RELEASED를 true로 바꾼다. 로컬 테스트 모드에서는 항상 보이고 무기도 모두 열린다. */
export const HUNT_RELEASED = true;
export const HUNT_ENABLED = HUNT_RELEASED || TEST_MODE;
export const HUNT_TEST_UNLOCK_ALL = TEST_MODE;

export function pickAnimal(random = Math.random) {
  let roll = random() * ANIMALS.reduce((sum, animal) => sum + animal.weight, 0);
  for (const animal of ANIMALS) { roll -= animal.weight; if (roll < 0) return animal; }
  return ANIMALS[0];
}

export type HuntOutcome = "great" | "success" | "escape";
/** 대성공은 소재 2개 + 귀한 소재 40%, 성공은 소재 1개 + 귀한 소재 5%. */
export function rollLoot(animal: Animal, outcome: HuntOutcome, random = Math.random): Record<string, number> {
  if (outcome === "escape") return {};
  const out: Record<string, number> = { [animal.loot.id]: outcome === "great" ? 2 : 1 };
  if (random() < (outcome === "great" ? 0.4 : 0.05)) out[animal.rare.id] = 1;
  return out;
}

/** 움직임 상태(사냥터 % 좌표). 세로는 들판(30~90%) 안에서만 움직인다. */
export type Motion = { x: number; y: number; vx: number; vy: number; turnAt: number; pauseUntil: number };
const BOUNDS = { x0: 6, x1: 94, y0: 34, y1: 88 };

export function startMotion(animal: Animal, now: number, random = Math.random): Motion {
  const fromLeft = random() < 0.5, angle = (random() - 0.5) * 0.8, speed = BASE_SPEED * animal.speed;
  return { x: fromLeft ? BOUNDS.x0 : BOUNDS.x1, y: BOUNDS.y0 + random() * (BOUNDS.y1 - BOUNDS.y0), vx: Math.cos(angle) * speed * (fromLeft ? 1 : -1), vy: Math.sin(angle) * speed, turnAt: now + 300, pauseUntil: 0 };
}

/** 움직임 한 걸음(dt초). 동물마다 방향을 바꾸는 방식이 다르다. */
export function stepMotion(m: Motion, animal: Animal, now: number, dt: number, random = Math.random): Motion {
  const speed = BASE_SPEED * animal.speed;
  let { x, y, vx, vy, turnAt, pauseUntil } = m;
  if (now >= turnAt) {
    const angle = Math.atan2(vy, vx);
    if (animal.move === "hop") { const a = angle + (random() - 0.5) * 2.2; vx = Math.cos(a) * speed; vy = Math.sin(a) * speed; turnAt = now + 300 + random() * 250; }
    else if (animal.move === "dash") { const a = angle + (random() - 0.5) * 0.7; vx = Math.cos(a) * speed; vy = Math.sin(a) * speed; turnAt = now + 700 + random() * 500; }
    else if (animal.move === "charge") { const a = angle + (random() < 0.5 ? 1 : -1) * (1.6 + random() * 1.2); vx = Math.cos(a) * speed; vy = Math.sin(a) * speed; pauseUntil = now + 180; turnAt = now + 900 + random() * 600; }
    else if (animal.move === "zip") { const a = angle + (random() - 0.5) * 2.6; vx = Math.cos(a) * speed; vy = Math.sin(a) * speed; pauseUntil = now + 120 + random() * 160; turnAt = now + 450 + random() * 300; }
    else if (animal.move === "stalk") {
      // 웅크렸다가(멈춤) 두 배 속도로 덮친다.
      const a = angle + (random() - 0.5) * 2; vx = Math.cos(a) * speed * 2; vy = Math.sin(a) * speed * 2; pauseUntil = now + 500 + random() * 400; turnAt = pauseUntil + 450 + random() * 250;
    }
    else { const a = angle + (random() - 0.5) * 1.6; vx = Math.cos(a) * speed; vy = Math.sin(a) * speed; turnAt = now + 1200 + random() * 800; }
  }
  if (now >= pauseUntil) { x += vx * dt; y += vy * dt; }
  if (x < BOUNDS.x0 || x > BOUNDS.x1) { vx = -vx; x = Math.max(BOUNDS.x0, Math.min(BOUNDS.x1, x)); }
  if (y < BOUNDS.y0 || y > BOUNDS.y1) { vy = -vy; y = Math.max(BOUNDS.y0, Math.min(BOUNDS.y1, y)); }
  return { x, y, vx, vy, turnAt, pauseUntil };
}

/** 실제 데미지 = 무기 데미지 − 방어력(0 아래면 0, 튕겨 나감). */
export const damageTo = (weapon: Weapon, animal: Animal) => Math.max(0, weapon.damage - animal.defense);

/** 사냥터 입장권: 3,000원에 1분. */
export const HUNT_TICKET_PRICE = 3000;
export const HUNT_TICKET_MINUTES = 1;

/** 단계 시간(밀리초). */
export const RESULT_MS = 1000;
export const GAP_MS = 500;
