import type { ReactNode } from "react";

export type FurnitureKind = "floor" | "rug" | "wall";
export type ShopGroup = "furniture" | "decor" | "structure" | "yard" | "pet";
/** size는 [가로, 높이, 깊이] 미터. 벽 부착 가구는 mount 높이(바닥에서 중심까지)에 걸린다. */
export type Furniture = { id: string; name: string; icon: string; price: number; color: string; kind: FurnitureKind; group: ShopGroup; size: [number, number, number]; mount?: number; fixedMount?: boolean; yard?: boolean; pet?: boolean };
/** 바닥 가구는 x·z(방 중심 기준 미터)와 rot(도), 벽 가구는 wall(벽 번호)·u(벽 위치 0~1)·h(높이 m). story는 층(0=1층, 1=2층), 마당 소품은 층이 없다. */
export type PlacedItem = Furniture & { instanceId: string; x: number; z: number; rot: number; tint?: string; wall?: number; u?: number; h?: number; story?: number };
export type Theme = { id: string; name: string; price: number; swatch: string };
export type RoomShape = "rect" | "square" | "ell";
export type Room = { points: [number, number][]; width: number; depth: number; area: number };

export const WALL_HEIGHT = 2.6;
/** 한 층의 높이(벽 + 바닥 슬래브). 2층 바닥은 이 높이에 놓인다. */
export const STORY_HEIGHT = 2.85;
export const SECOND_FLOOR_PRICE = 20000;

export const FURNITURE: Furniture[] = [
  { id: "chair", name: "원목 의자", icon: "🪑", price: 500, color: "#c98f58", kind: "floor", group: "furniture", size: [0.5, 0.95, 0.5] },
  { id: "plant", name: "몬스테라", icon: "🪴", price: 750, color: "#6f9a5a", kind: "floor", group: "furniture", size: [0.7, 1.15, 0.7] },
  { id: "lamp", name: "스탠드 조명", icon: "💡", price: 900, color: "#e9c75d", kind: "floor", group: "furniture", size: [0.45, 1.6, 0.45] },
  { id: "table", name: "원목 테이블", icon: "🪵", price: 1100, color: "#c08a57", kind: "floor", group: "furniture", size: [1.3, 0.78, 0.75] },
  { id: "bookshelf", name: "책장", icon: "📚", price: 1400, color: "#a8744a", kind: "floor", group: "furniture", size: [0.95, 1.85, 0.38] },
  { id: "sofa", name: "폭신 소파", icon: "🛋️", price: 1600, color: "#c78979", kind: "floor", group: "furniture", size: [2, 0.85, 0.9] },
  { id: "bed", name: "포근한 침대", icon: "🛏️", price: 2200, color: "#8ba5bc", kind: "floor", group: "furniture", size: [1.6, 1, 2.1] },
  { id: "piano", name: "업라이트 피아노", icon: "🎹", price: 3800, color: "#57514f", kind: "floor", group: "furniture", size: [1.5, 1.3, 0.62] },
  { id: "rug", name: "둥근 러그", icon: "🟠", price: 600, color: "#b96555", kind: "rug", group: "furniture", size: [2.2, 0.02, 1.5] },
  { id: "armchair", name: "1인 소파", icon: "💺", price: 1300, color: "#8ba5bc", kind: "floor", group: "furniture", size: [0.95, 0.9, 0.9] },
  { id: "rocker", name: "흔들의자", icon: "🪑", price: 1200, color: "#a8744a", kind: "floor", group: "furniture", size: [0.7, 1, 0.95] },
  { id: "desk", name: "월루 업무 책상", icon: "💻", price: 1500, color: "#8a6a4a", kind: "floor", group: "furniture", size: [1.3, 1.15, 0.65] },
  { id: "wardrobe", name: "원목 옷장", icon: "🚪", price: 1900, color: "#b48a62", kind: "floor", group: "furniture", size: [1.2, 2, 0.6] },
  { id: "fishtank", name: "어항", icon: "🐠", price: 1800, color: "#4f6b5c", kind: "floor", group: "furniture", size: [1.1, 1.2, 0.45] },
  { id: "fridge", name: "냉장고", icon: "🧊", price: 2000, color: "#dfe8ea", kind: "floor", group: "furniture", size: [0.75, 1.8, 0.7] },
  { id: "tvstand", name: "TV와 거실장", icon: "📺", price: 2100, color: "#5b4a3a", kind: "floor", group: "furniture", size: [1.6, 1.1, 0.45] },
  { id: "kitchen", name: "주방 조리대", icon: "🍳", price: 2400, color: "#e9e1d3", kind: "floor", group: "furniture", size: [1.8, 0.95, 0.65] },
  { id: "bathtub", name: "욕조", icon: "🛁", price: 2600, color: "#f4f6f6", kind: "floor", group: "furniture", size: [1.7, 0.6, 0.8] },
  { id: "fireplace", name: "벽난로", icon: "🔥", price: 3200, color: "#b5654a", kind: "floor", group: "furniture", size: [1.4, 1.2, 0.5] },
  { id: "frame", name: "풍경 액자", icon: "🖼️", price: 450, color: "#d6b56d", kind: "wall", group: "decor", size: [0.75, 0.6, 0.05], mount: 1.6 },
  { id: "clock", name: "벽시계", icon: "🕰️", price: 650, color: "#7b8f7e", kind: "wall", group: "decor", size: [0.45, 0.45, 0.06], mount: 1.9 },
  { id: "shelf", name: "벽 선반", icon: "🪜", price: 550, color: "#b8875a", kind: "wall", group: "decor", size: [1, 0.45, 0.26], mount: 1.4 },
  { id: "curtain", name: "커튼", icon: "🎀", price: 500, color: "#e7b8a8", kind: "wall", group: "decor", size: [1.5, 1.6, 0.08], mount: 1.5 },
  { id: "mirror", name: "벽거울", icon: "🪞", price: 600, color: "#d6b56d", kind: "wall", group: "decor", size: [0.6, 1, 0.04], mount: 1.45 },
  { id: "walltv", name: "벽걸이 TV", icon: "📺", price: 1700, color: "#2b2b2b", kind: "wall", group: "decor", size: [1.3, 0.75, 0.06], mount: 1.5 },
  { id: "window", name: "창문", icon: "🪟", price: 300, color: "#fffaf0", kind: "wall", group: "structure", size: [1.2, 1.1, 0.12], mount: 1.45 },
  { id: "door", name: "나무 문", icon: "🚪", price: 400, color: "#b98352", kind: "wall", group: "structure", size: [0.95, 2.1, 0.12], mount: 1.05, fixedMount: true },
  { id: "partition", name: "가벽", icon: "🧱", price: 800, color: "#efe4cf", kind: "floor", group: "structure", size: [2, 2.4, 0.14] },
  { id: "arch", name: "아치 가벽", icon: "🏛️", price: 1200, color: "#efe4cf", kind: "floor", group: "structure", size: [2.2, 2.4, 0.14] },
  { id: "stairs", name: "원목 계단", icon: "🪜", price: 1500, color: "#b98352", kind: "floor", group: "structure", size: [1, 2.8, 2.6] },
  { id: "fence", name: "나무 울타리", icon: "🪵", price: 300, color: "#d9b98a", kind: "floor", group: "yard", size: [2, 0.9, 0.12], yard: true },
  { id: "flowerbed", name: "꽃밭", icon: "🌷", price: 450, color: "#e7899a", kind: "floor", group: "yard", size: [1.6, 0.5, 0.8], yard: true },
  { id: "stonepath", name: "징검돌 길", icon: "🪨", price: 250, color: "#b8b3a8", kind: "rug", group: "yard", size: [0.9, 0.05, 2.4], yard: true },
  { id: "appletree", name: "사과나무", icon: "🍎", price: 1300, color: "#6f9a5a", kind: "floor", group: "yard", size: [2, 3.2, 2], yard: true },
  { id: "bench", name: "정원 벤치", icon: "🪑", price: 700, color: "#9b7350", kind: "floor", group: "yard", size: [1.5, 0.85, 0.6], yard: true },
  { id: "mailbox", name: "빨간 우체통", icon: "📮", price: 350, color: "#c4574b", kind: "floor", group: "yard", size: [0.4, 1.2, 0.4], yard: true },
  { id: "streetlamp", name: "정원 가로등", icon: "🏮", price: 900, color: "#3f4a44", kind: "floor", group: "yard", size: [0.4, 2.4, 0.4], yard: true },
  { id: "pond", name: "작은 연못", icon: "🪷", price: 1600, color: "#6fa8c4", kind: "rug", group: "yard", size: [2.6, 0.1, 1.8], yard: true },
  { id: "doghouse", name: "강아지 집", icon: "🐶", price: 1100, color: "#c46a4b", kind: "floor", group: "yard", size: [1, 1.1, 1.1], yard: true },
  { id: "dog", name: "강아지", icon: "🐶", price: 3000, color: "#c08a52", kind: "floor", group: "pet", size: [0.45, 0.6, 0.8], pet: true },
  { id: "cat", name: "고양이", icon: "🐱", price: 3000, color: "#e0a35a", kind: "floor", group: "pet", size: [0.35, 0.45, 0.65], pet: true },
  { id: "rabbit", name: "토끼", icon: "🐰", price: 2500, color: "#f3efe7", kind: "floor", group: "pet", size: [0.3, 0.55, 0.45], pet: true },
  { id: "duck", name: "오리", icon: "🦆", price: 2500, color: "#f6d16a", kind: "floor", group: "pet", size: [0.3, 0.45, 0.45], pet: true },
  { id: "mole", name: "두더지", icon: "🐹", price: 3500, color: "#5c5350", kind: "floor", group: "pet", size: [0.3, 0.25, 0.42], pet: true },
  { id: "weasel", name: "족제비", icon: "🦦", price: 4000, color: "#a8743e", kind: "floor", group: "pet", size: [0.22, 0.3, 0.75], pet: true },
  { id: "tiger", name: "호랑이", icon: "🐯", price: 15000, color: "#e08a2e", kind: "floor", group: "pet", size: [0.7, 1, 1.7], pet: true },
  { id: "scarecrow", name: "허수아비", icon: "🧑‍🌾", price: 500, color: "#d6a64b", kind: "floor", group: "yard", size: [0.9, 1.8, 0.3], yard: true },
];

/** 펫마다 하나씩, 키우는 동안 항상 적용되는 작은 고유 효과. */
export const PET_BUFFS: Record<string, { title: string; text: string }> = {
  dog: { title: "든든한 경비견", text: "벌레가 날아오면 25% 확률로 짖어서 쫓아내요" },
  cat: { title: "생선 냄새", text: "희귀 물고기 확률 ×1.2" },
  rabbit: { title: "알뜰 장보기", text: "씨앗값 -5%" },
  duck: { title: "물놀이 친구", text: "물뿌리개 용량 +2" },
  mole: { title: "땅 고르기", text: "새로 심는 작물 성장 시간 -5%" },
  weasel: { title: "해충 사냥꾼", text: "벌레를 놓쳤을 때 판매가 피해 -10% → -5%" },
  tiger: { title: "산군의 위엄", text: "마을 이벤트 디버프 지속 시간 절반" },
};

export const TINTS = ["#c78979", "#e2b85a", "#81a96b", "#8ba5bc", "#9a7bb0", "#57514f", "#efe6d6"];

export const WALLPAPERS: Theme[] = [
  { id: "stripe", name: "크림 스트라이프", price: 0, swatch: "repeating-linear-gradient(90deg,#f4e9d4 0 5px,#e9d8b8 5px 8px)" },
  { id: "flower", name: "들꽃 무늬", price: 400, swatch: "radial-gradient(circle at 30% 30%,#e7aeb0 2px,transparent 3px),radial-gradient(circle at 75% 70%,#b6cd9b 2px,transparent 3px),#f7e7e2" },
  { id: "mint", name: "민트 체크", price: 650, swatch: "linear-gradient(#cfe3d5 2px,transparent 2px) 0 0/8px 8px,linear-gradient(90deg,#cfe3d5 2px,transparent 2px) 0 0/8px 8px,#e4f0e7" },
  { id: "panel", name: "원목 판넬", price: 900, swatch: "repeating-linear-gradient(90deg,#c99d6e 0 7px,#a87a4c 7px 8px)" },
];

export const FLOORS: Theme[] = [
  { id: "oak", name: "원목 마루", price: 0, swatch: "repeating-linear-gradient(90deg,#c9965f 0 7px,#a97a48 7px 8px)" },
  { id: "walnut", name: "월넛 마루", price: 500, swatch: "repeating-linear-gradient(90deg,#7a5236 0 7px,#5f3f29 7px 8px)" },
  { id: "tile", name: "체크 타일", price: 700, swatch: "conic-gradient(#efe4cf 25%,#c97b5d 0 50%,#efe4cf 0 75%,#c97b5d 0) 0 0/12px 12px" },
];

/** 집 단계별 평수. price는 그 단계로 증축하는 비용. */
export const HOUSE_SIZES = [
  { level: 1, name: "작은 농막", pyeong: 8, price: 0 },
  { level: 2, name: "아담한 농가", pyeong: 12, price: 4500 },
  { level: 3, name: "햇살 농가", pyeong: 18, price: 9000 },
  { level: 4, name: "넓은 전원주택", pyeong: 25, price: 15000 },
  { level: 5, name: "꿈의 전원주택", pyeong: 34, price: 24000 },
  { level: 6, name: "언덕 위 대저택", pyeong: 45, price: 36000 },
];
/** 마당 단계: 집 둘레로 확보되는 여유 폭(m). */
export const YARD_SIZES = [
  { level: 1, name: "작은 앞마당", margin: 3, price: 0 },
  { level: 2, name: "넓은 마당", margin: 5, price: 3000 },
  { level: 3, name: "정원 딸린 마당", margin: 7.5, price: 8000 },
];

export function yardBounds(room: Room, yardLevel: number) {
  const margin = (YARD_SIZES.find(size => size.level === yardLevel) ?? YARD_SIZES[0]).margin;
  return { minX: -room.width / 2 - margin, maxX: room.width / 2 + margin, minZ: -room.depth / 2 - margin * 0.6, maxZ: room.depth / 2 + margin * 1.3 };
}

/** 마당 소품은 마당 경계 안, 집 벽 바깥에만 둘 수 있다. */
export function fitsInYard(room: Room, yardLevel: number, x: number, z: number, margin = 0.35) {
  const b = yardBounds(room, yardLevel);
  if (x < b.minX + margin || x > b.maxX - margin || z < b.minZ + margin || z > b.maxZ - margin) return false;
  return ![[0, 0], [margin, 0], [-margin, 0], [0, margin], [0, -margin]].some(([dx, dz]) => pointInRoom(room.points, x + dx, z + dz));
}
export const SHAPES: { id: RoomShape; name: string; note: string }[] = [
  { id: "rect", name: "직사각형", note: "가로로 긴 기본 구조" },
  { id: "square", name: "정사각형", note: "어느 방향이든 균형 잡힌 구조" },
  { id: "ell", name: "ㄱ자", note: "한쪽 모서리가 꺾인 구조" },
];
export const REMODEL_PRICE = 800;
const PYEONG_M2 = 3.3058;

/** 평수와 구조로 방 바닥 다각형을 만든다. 0번 벽은 항상 뒷벽(-z)이다. */
export function roomFor(level: number, shape: RoomShape): Room {
  const area = (HOUSE_SIZES.find(size => size.level === level) ?? HOUSE_SIZES[0]).pyeong * PYEONG_M2;
  if (shape === "ell") {
    const cut = 0.42, depth = Math.sqrt(area / (1 - cut * cut) / 1.25), width = depth * 1.25;
    const [w, d, cw, cd] = [width / 2, depth / 2, width * cut, depth * cut];
    return { width, depth, area, points: [[-w, -d], [w, -d], [w, d - cd], [w - cw, d - cd], [w - cw, d], [-w, d]] };
  }
  const aspect = shape === "square" ? 1 : 1.45, depth = Math.sqrt(area / aspect), width = depth * aspect;
  return { width, depth, area, points: [[-width / 2, -depth / 2], [width / 2, -depth / 2], [width / 2, depth / 2], [-width / 2, depth / 2]] };
}

export function pointInRoom(points: [number, number][], x: number, z: number) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, zi] = points[i], [xj, zj] = points[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** 중심점과 주변 네 점이 모두 방 안이면 둘 수 있다. */
export function fitsInRoom(points: [number, number][], x: number, z: number, margin = 0.2) {
  return [[0, 0], [margin, 0], [-margin, 0], [0, margin], [0, -margin]].every(([dx, dz]) => pointInRoom(points, x + dx, z + dz));
}

/** 벽 번호의 시작점, 방향, 길이, 안쪽 법선. */
export function wallInfo(points: [number, number][], index: number) {
  const [ax, az] = points[index % points.length], [bx, bz] = points[(index + 1) % points.length];
  const length = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / length, dz = (bz - az) / length;
  const [mx, mz] = [(ax + bx) / 2, (az + bz) / 2];
  const normal: [number, number] = pointInRoom(points, mx - dz * 0.05, mz + dx * 0.05) ? [-dz, dx] : [dz, -dx];
  return { start: [ax, az] as [number, number], dir: [dx, dz] as [number, number], length, normal };
}

function PianoKeys() {
  const step = 148 / 14;
  return <>{Array.from({ length: 13 }).map((_, key) => <rect key={`w${key}`} x={6 + (key + 1) * step - .3} y="86" width=".6" height="15" fill="#d9d2c3" />)}{[0, 1, 3, 4, 5, 7, 8, 10, 11, 12].map(key => <rect key={key} x={6 + (key + 1) * step - 3} y="86" width="6" height="9" fill="#2b2522" />)}</>;
}

const ART: Record<string, { viewBox: string; body: ReactNode }> = {
  chair: { viewBox: "0 0 60 100", body: <><rect className="d" x="12" y="4" width="36" height="42" rx="6" /><rect className="m" x="16" y="8" width="28" height="34" rx="4" /><rect className="l" x="20" y="14" width="20" height="5" rx="2" /><rect className="l" x="20" y="25" width="20" height="5" rx="2" /><rect className="d" x="11" y="58" width="6" height="40" rx="2" /><rect className="d" x="43" y="58" width="6" height="40" rx="2" /><rect className="l" x="6" y="46" width="48" height="9" rx="4" /><rect className="d" x="6" y="53" width="48" height="6" rx="2" /></> },
  plant: { viewBox: "0 0 80 124", body: <><g stroke="#4c6b3d" strokeWidth="2" fill="none"><path d="M40 82 Q38 60 26 46" /><path d="M40 82 Q44 58 54 40" /><path d="M40 82 V26" /><path d="M40 82 Q34 72 28 66" /><path d="M40 82 Q48 72 52 64" /></g><ellipse className="m" cx="25" cy="45" rx="18" ry="11" transform="rotate(-35 25 45)" /><ellipse className="d" cx="55" cy="40" rx="18" ry="11" transform="rotate(30 55 40)" /><ellipse className="l" cx="40" cy="22" rx="12" ry="19" /><ellipse className="d" cx="28" cy="66" rx="15" ry="8" transform="rotate(-15 28 66)" /><ellipse className="m" cx="53" cy="63" rx="15" ry="8" transform="rotate(20 53 63)" /><path d="M22 84 H58 L54 122 H26 Z" fill="#c9784f" /><rect x="18" y="79" width="44" height="8" rx="3" fill="#b0623f" /></> },
  lamp: { viewBox: "0 0 50 150", body: <><rect x="23" y="34" width="4" height="106" fill="#5b4a3a" /><ellipse cx="25" cy="144" rx="15" ry="5" fill="#4a3b2e" /><path className="m" d="M8 36 L16 6 H34 L42 36 Z" /><path className="l" d="M16 6 H34 L35.5 12 H14.5 Z" /><ellipse cx="25" cy="37" rx="9" ry="2.5" fill="#fff4c7" /></> },
  table: { viewBox: "0 0 160 100", body: <><rect className="d" x="12" y="30" width="10" height="68" rx="3" /><rect className="d" x="138" y="30" width="10" height="68" rx="3" /><rect className="d" x="40" y="30" width="7" height="56" rx="3" opacity=".7" /><rect className="d" x="113" y="30" width="7" height="56" rx="3" opacity=".7" /><path className="l" d="M14 10 H146 L160 22 H0 Z" /><rect className="m" x="0" y="22" width="160" height="10" rx="3" /><path d="M72 4 H88 L86 16 H74 Z" fill="#7da0b5" /><circle cx="76" cy="0" r="5" fill="#f2b5c4" /><circle cx="84" cy="1" r="5" fill="#f6d16a" /></> },
  bookshelf: { viewBox: "0 0 100 170", body: <><rect className="d" x="0" y="0" width="100" height="170" rx="4" /><rect x="8" y="8" width="84" height="154" fill="#3a2716" opacity=".45" /><rect className="m" x="4" y="56" width="92" height="6" /><rect className="m" x="4" y="108" width="92" height="6" /><g><rect x="12" y="20" width="9" height="36" fill="#c4574b" /><rect x="22" y="16" width="8" height="40" fill="#e2b85a" /><rect x="31" y="22" width="10" height="34" fill="#4f7a6a" /><rect x="44" y="26" width="9" height="30" fill="#8ba5bc" transform="rotate(-12 48 56)" /><rect x="64" y="18" width="10" height="38" fill="#9a7bb0" /><rect x="75" y="24" width="12" height="32" fill="#efe6d6" /><rect x="12" y="74" width="10" height="34" fill="#efe6d6" /><rect x="23" y="70" width="8" height="38" fill="#57514f" /><rect x="32" y="76" width="11" height="32" fill="#c78979" /><circle cx="70" cy="96" r="11" fill="#81a96b" /><rect x="63" y="96" width="14" height="12" fill="#c9784f" /><rect x="12" y="132" width="34" height="30" rx="2" fill="#d9c39b" /><rect x="52" y="124" width="9" height="38" fill="#4f7a6a" /><rect x="62" y="128" width="9" height="34" fill="#e2b85a" /><rect x="72" y="122" width="10" height="40" fill="#c4574b" /></g></> },
  sofa: { viewBox: "0 0 200 104", body: <><rect className="m" x="14" y="8" width="172" height="54" rx="18" /><rect className="l" x="26" y="18" width="70" height="38" rx="12" /><rect className="l" x="104" y="18" width="70" height="38" rx="12" /><rect className="m" x="10" y="52" width="180" height="30" rx="9" /><rect className="l" x="24" y="50" width="152" height="9" rx="4" /><rect className="d" x="0" y="34" width="32" height="54" rx="14" /><rect className="d" x="168" y="34" width="32" height="54" rx="14" /><rect x="16" y="86" width="8" height="16" rx="2" fill="#5b3d26" /><rect x="176" y="86" width="8" height="16" rx="2" fill="#5b3d26" /></> },
  bed: { viewBox: "0 0 220 124", body: <><rect className="d" x="8" y="0" width="204" height="78" rx="18" /><rect className="m" x="18" y="10" width="184" height="40" rx="12" opacity=".55" /><rect x="6" y="56" width="208" height="30" rx="8" fill="#fbf6ec" /><ellipse cx="62" cy="58" rx="36" ry="12" fill="#fffdf7" /><ellipse cx="158" cy="58" rx="36" ry="12" fill="#fffdf7" /><rect className="m" x="6" y="68" width="208" height="38" rx="8" /><rect className="l" x="6" y="68" width="208" height="9" rx="4" /><rect x="14" y="104" width="10" height="18" rx="2" fill="#6d4a2e" /><rect x="196" y="104" width="10" height="18" rx="2" fill="#6d4a2e" /></> },
  piano: { viewBox: "0 0 160 140", body: <><rect className="m" x="6" y="8" width="148" height="78" rx="4" /><rect className="d" x="0" y="0" width="160" height="12" rx="4" /><rect x="44" y="26" width="72" height="24" rx="2" fill="#f3ead6" /><g stroke="#b9ab8f" strokeWidth="1"><line x1="50" y1="33" x2="110" y2="33" /><line x1="50" y1="38" x2="110" y2="38" /><line x1="50" y1="43" x2="104" y2="43" /></g><rect className="d" x="0" y="78" width="160" height="8" rx="2" /><rect x="6" y="86" width="148" height="15" fill="#fbf8f0" /><PianoKeys /><rect className="m" x="6" y="101" width="148" height="8" /><rect className="d" x="14" y="109" width="10" height="29" /><rect className="d" x="136" y="109" width="10" height="29" /><rect x="70" y="130" width="6" height="8" rx="2" fill="#d6b56d" /><rect x="84" y="130" width="6" height="8" rx="2" fill="#d6b56d" /></> },
  rug: { viewBox: "0 0 200 60", body: <><ellipse className="d" cx="100" cy="31" rx="99" ry="28" /><ellipse className="m" cx="100" cy="30" rx="96" ry="27" /><ellipse className="l" cx="100" cy="30" rx="80" ry="21" /><ellipse className="m" cx="100" cy="30" rx="62" ry="15" /><ellipse className="l" cx="100" cy="30" rx="40" ry="9" opacity=".7" /></> },
  frame: { viewBox: "0 0 80 64", body: <><rect className="m" x="0" y="0" width="80" height="64" rx="3" /><rect className="d" x="5" y="5" width="70" height="54" /><rect x="8" y="8" width="64" height="48" fill="#bfe0e6" /><circle cx="56" cy="20" r="6" fill="#f6d16a" /><path d="M8 46 Q24 30 40 42 T72 36 V56 H8 Z" fill="#8bb46f" /><path d="M8 50 Q30 42 50 50 T72 48 V56 H8 Z" fill="#6f9a5a" /></> },
  clock: { viewBox: "0 0 64 64", body: <><circle className="d" cx="32" cy="32" r="31" /><circle className="m" cx="32" cy="32" r="28" /><circle cx="32" cy="32" r="23" fill="#fffaf0" />{[0, 90, 180, 270].map(angle => <rect key={angle} x="31" y="11" width="2" height="5" fill="#57514f" transform={`rotate(${angle} 32 32)`} />)}<rect x="31" y="18" width="2" height="15" rx="1" fill="#2f3d33" transform="rotate(35 32 32)" /><rect x="31" y="22" width="2" height="11" rx="1" fill="#2f3d33" transform="rotate(-70 32 32)" /><circle cx="32" cy="32" r="2.2" fill="#c4574b" /></> },
  shelf: { viewBox: "0 0 140 70", body: <><rect x="10" y="20" width="9" height="30" rx="2" fill="#c4574b" /><rect x="20" y="16" width="8" height="34" rx="2" fill="#4f7a6a" /><rect x="29" y="24" width="9" height="26" rx="2" fill="#e2b85a" transform="rotate(12 33 50)" /><path d="M58 30 H78 L76 50 H60 Z" fill="#c9784f" /><ellipse cx="62" cy="24" rx="8" ry="5" fill="#81a96b" transform="rotate(-30 62 24)" /><ellipse cx="74" cy="22" rx="8" ry="5" fill="#6f9a5a" transform="rotate(30 74 22)" /><rect x="96" y="30" width="16" height="20" rx="4" fill="#cfe3e8" opacity=".9" /><rect x="94" y="27" width="20" height="4" rx="2" fill="#b98352" /><rect x="118" y="36" width="12" height="14" rx="6" fill="#efe6d6" /><rect className="m" x="0" y="50" width="140" height="7" rx="2" /><path className="d" d="M14 57 h8 l-8 12 Z" /><path className="d" d="M118 57 h8 v12 Z" /></> },
  armchair: { viewBox: "0 0 100 90", body: <><rect className="m" x="10" y="4" width="80" height="50" rx="14" /><rect className="l" x="16" y="48" width="68" height="20" rx="8" /><rect className="d" x="0" y="34" width="20" height="44" rx="9" /><rect className="d" x="80" y="34" width="20" height="44" rx="9" /><rect className="m" x="14" y="64" width="72" height="16" rx="5" /><rect x="16" y="80" width="6" height="10" fill="#5b3d26" /><rect x="78" y="80" width="6" height="10" fill="#5b3d26" /></> },
  rocker: { viewBox: "0 0 90 110", body: <><rect className="m" x="22" y="4" width="46" height="56" rx="8" /><rect className="l" x="28" y="12" width="34" height="6" rx="2" /><rect className="l" x="28" y="26" width="34" height="6" rx="2" /><rect className="l" x="16" y="58" width="58" height="10" rx="4" /><rect className="d" x="20" y="68" width="6" height="26" /><rect className="d" x="64" y="68" width="6" height="26" /><path className="d" d="M4 92 Q45 112 86 92 L86 98 Q45 118 4 98 Z" /></> },
  desk: { viewBox: "0 0 140 110", body: <><rect x="40" y="2" width="60" height="40" rx="3" fill="#222" /><rect x="44" y="6" width="52" height="32" fill="#cfe8c8" /><g fill="#7fb07a">{[10, 16, 22, 28].map(y => <rect key={y} x="47" y={y} width="46" height="2" />)}</g><rect x="66" y="42" width="8" height="12" fill="#333" /><rect className="m" x="0" y="54" width="140" height="10" rx="2" /><rect className="d" x="6" y="64" width="8" height="46" /><rect className="d" x="126" y="64" width="8" height="46" /><rect className="d" x="96" y="64" width="34" height="34" /><rect x="50" y="48" width="40" height="5" rx="1" fill="#ddd" /><rect x="108" y="40" width="10" height="14" rx="3" fill="#efe6d6" /></> },
  wardrobe: { viewBox: "0 0 90 150", body: <><rect className="m" x="0" y="4" width="90" height="146" rx="3" /><rect className="d" x="-2" y="0" width="94" height="8" rx="2" /><rect className="d" x="44" y="10" width="2" height="136" /><rect className="l" x="6" y="14" width="34" height="128" rx="2" opacity=".35" /><rect className="l" x="50" y="14" width="34" height="128" rx="2" opacity=".35" /><rect x="36" y="70" width="4" height="16" rx="2" fill="#e2b85a" /><rect x="50" y="70" width="4" height="16" rx="2" fill="#e2b85a" /></> },
  fishtank: { viewBox: "0 0 120 110", body: <><rect x="4" y="2" width="112" height="56" rx="3" fill="#9fd3e6" opacity=".75" /><rect x="4" y="46" width="112" height="12" fill="#e8d6a8" /><path d="M30 26 l12 -7 v14 z M42 26 a9 6 0 1 0 0.1 0" fill="#f08a3a" /><path d="M78 36 l10 -6 v12 z M88 36 a8 5 0 1 0 0.1 0" fill="#e2483a" /><rect x="94" y="30" width="3" height="16" fill="#4f7a3e" /><rect className="m" x="0" y="58" width="120" height="52" rx="3" /><rect className="d" x="0" y="58" width="120" height="6" /></> },
  fridge: { viewBox: "0 0 70 150", body: <><rect className="m" x="0" y="0" width="70" height="150" rx="6" /><rect className="d" x="0" y="54" width="70" height="3" /><rect x="56" y="18" width="5" height="26" rx="2" fill="#8a9598" /><rect x="56" y="66" width="5" height="40" rx="2" fill="#8a9598" /><rect x="10" y="10" width="14" height="10" rx="2" fill="#f2b5c4" /></> },
  tvstand: { viewBox: "0 0 140 100", body: <><rect x="20" y="0" width="100" height="58" rx="3" fill="#1d1d1d" /><rect x="24" y="4" width="92" height="50" fill="#5a8fb5" /><path d="M24 40 Q50 26 70 38 T116 34 V54 H24 Z" fill="#7fb460" /><rect className="m" x="0" y="62" width="140" height="38" rx="3" /><rect className="d" x="6" y="68" width="62" height="26" rx="2" opacity=".5" /><rect className="d" x="72" y="68" width="62" height="26" rx="2" opacity=".5" /></> },
  kitchen: { viewBox: "0 0 160 90", body: <><rect x="0" y="16" width="160" height="8" fill="#7d7a74" /><rect className="m" x="4" y="24" width="152" height="66" /><rect x="24" y="10" width="40" height="8" rx="2" fill="#b9c3c6" /><path d="M40 10 V0 H50" fill="none" stroke="#8a9598" strokeWidth="3" /><circle cx="110" cy="13" r="7" fill="#222" /><circle cx="134" cy="13" r="7" fill="#222" />{[8, 58, 108].map(x => <rect key={x} className="d" x={x} y="32" width="44" height="52" rx="2" opacity=".35" />)}</> },
  bathtub: { viewBox: "0 0 160 80", body: <><rect className="m" x="0" y="10" width="160" height="58" rx="18" /><rect x="10" y="12" width="140" height="14" rx="7" fill="#a9d8f0" /><circle cx="40" cy="12" r="6" fill="#fff" /><circle cx="52" cy="10" r="5" fill="#fff" /><circle cx="120" cy="12" r="6" fill="#fff" /><circle cx="22" cy="72" r="6" fill="#d6b56d" /><circle cx="138" cy="72" r="6" fill="#d6b56d" /></> },
  fireplace: { viewBox: "0 0 120 100", body: <><rect className="m" x="6" y="12" width="108" height="88" /><g className="d" opacity=".35">{[24, 40, 56, 72, 88].map(y => <rect key={y} x="6" y={y} width="108" height="2" />)}</g><rect x="0" y="4" width="120" height="10" rx="2" fill="#efe2c8" /><path d="M34 100 V60 A26 26 0 0 1 86 60 V100 Z" fill="#2a1a10" /><path d="M48 98 Q46 80 58 70 Q56 84 66 78 Q74 88 70 98 Z" fill="#f08a3a" /><path d="M54 98 Q54 88 60 82 Q62 90 66 98 Z" fill="#ffd25a" /></> },
  curtain: { viewBox: "0 0 120 120", body: <><rect x="0" y="0" width="120" height="5" rx="2" fill="#8a6a48" /><path className="m" d="M4 5 H46 Q40 60 50 118 H4 Z" /><path className="m" d="M116 5 H74 Q80 60 70 118 H116 Z" /><g className="d" opacity=".3"><rect x="14" y="5" width="3" height="113" /><rect x="28" y="5" width="3" height="113" /><rect x="88" y="5" width="3" height="113" /><rect x="102" y="5" width="3" height="113" /></g></> },
  mirror: { viewBox: "0 0 60 100", body: <><rect className="m" x="0" y="0" width="60" height="100" rx="30" /><rect x="6" y="6" width="48" height="88" rx="24" fill="#dfeef3" /><path d="M16 30 L30 16 M16 44 L40 20" stroke="#fff" strokeWidth="3" /></> },
  walltv: { viewBox: "0 0 130 76", body: <><rect className="m" x="0" y="0" width="130" height="76" rx="3" /><rect x="5" y="5" width="120" height="66" fill="#5a8fb5" /><path d="M5 52 Q40 34 64 48 T125 42 V71 H5 Z" fill="#7fb460" /><circle cx="100" cy="20" r="7" fill="#ffe08a" /></> },
  dog: { viewBox: "0 0 100 90", body: <><ellipse className="m" cx="46" cy="56" rx="30" ry="18" /><rect className="d" x="22" y="66" width="8" height="22" rx="3" /><rect className="d" x="58" y="66" width="8" height="22" rx="3" /><path className="d" d="M14 50 Q2 40 8 30" stroke="#7a5236" strokeWidth="6" fill="none" /><circle className="m" cx="74" cy="34" r="18" /><ellipse className="d" cx="62" cy="34" rx="7" ry="14" /><ellipse cx="88" cy="40" rx="8" ry="6" fill="#efd9b8" /><circle cx="93" cy="38" r="3" fill="#222" /><circle cx="78" cy="30" r="3" fill="#222" /></> },
  cat: { viewBox: "0 0 100 90", body: <><path className="d" d="M18 60 Q2 50 10 24" stroke="#b9772f" strokeWidth="6" fill="none" /><ellipse className="m" cx="44" cy="60" rx="28" ry="16" /><rect className="m" x="24" y="68" width="7" height="20" rx="3" /><rect className="m" x="56" y="68" width="7" height="20" rx="3" /><circle className="m" cx="72" cy="38" r="17" /><path className="m" d="M58 28 L60 10 L70 22 Z M86 28 L84 10 L74 22 Z" /><circle cx="66" cy="38" r="3" fill="#222" /><circle cx="80" cy="38" r="3" fill="#222" /><path d="M70 46 l3 2 l3 -2" stroke="#222" fill="none" /></> },
  rabbit: { viewBox: "0 0 80 100", body: <><ellipse className="m" cx="40" cy="70" rx="26" ry="22" /><circle className="m" cx="40" cy="42" r="16" /><ellipse className="m" cx="32" cy="14" rx="6" ry="18" /><ellipse className="m" cx="48" cy="14" rx="6" ry="18" /><ellipse cx="32" cy="14" rx="3" ry="13" fill="#f2b5c4" /><ellipse cx="48" cy="14" rx="3" ry="13" fill="#f2b5c4" /><circle cx="34" cy="42" r="2.5" fill="#222" /><circle cx="46" cy="42" r="2.5" fill="#222" /><circle cx="40" cy="49" r="2.5" fill="#f2899a" /></> },
  duck: { viewBox: "0 0 90 90", body: <><ellipse className="m" cx="42" cy="58" rx="30" ry="20" /><path className="d" d="M14 52 L4 44 L16 46 Z" /><circle className="m" cx="62" cy="30" r="15" /><path d="M74 30 L90 34 L74 38 Z" fill="#f08a3a" /><circle cx="66" cy="26" r="3" fill="#222" /><rect x="34" y="76" width="4" height="12" fill="#f08a3a" /><rect x="48" y="76" width="4" height="12" fill="#f08a3a" /></> },
  mole: { viewBox: "0 0 100 70", body: <><ellipse className="m" cx="46" cy="42" rx="38" ry="24" /><ellipse cx="86" cy="44" rx="8" ry="6" fill="#f2899a" /><circle cx="74" cy="34" r="2.5" fill="#111" /><ellipse cx="62" cy="64" rx="9" ry="5" fill="#f2b5c4" /><ellipse cx="30" cy="64" rx="9" ry="5" fill="#f2b5c4" /></> },
  weasel: { viewBox: "0 0 120 70", body: <><path className="d" d="M14 44 Q4 40 2 26" stroke="#7a5236" strokeWidth="7" fill="none" /><rect className="m" x="14" y="34" width="72" height="20" rx="10" /><rect className="m" x="20" y="48" width="6" height="18" rx="3" /><rect className="m" x="72" y="48" width="6" height="18" rx="3" /><circle className="m" cx="94" cy="34" r="14" /><ellipse cx="100" cy="40" rx="9" ry="6" fill="#f3e3c4" /><circle cx="96" cy="30" r="2.5" fill="#222" /><circle cx="108" cy="38" r="2.5" fill="#222" /><circle className="m" cx="88" cy="22" r="5" /></> },
  tiger: { viewBox: "0 0 120 90", body: <><path className="m" d="M12 50 Q0 36 8 22" stroke="#e08a2e" strokeWidth="7" fill="none" /><ellipse className="m" cx="54" cy="54" rx="40" ry="22" /><g fill="#2a1d14">{[30, 44, 58, 72].map(x => <path key={x} d={`M${x} 34 l4 0 l-3 18 z`} />)}</g><rect className="m" x="24" y="64" width="10" height="24" rx="4" /><rect className="m" x="70" y="64" width="10" height="24" rx="4" /><circle className="m" cx="92" cy="34" r="20" /><circle className="m" cx="78" cy="16" r="6" /><circle className="m" cx="106" cy="16" r="6" /><ellipse cx="96" cy="44" rx="11" ry="8" fill="#f8efe0" /><circle cx="86" cy="30" r="3" fill="#222" /><circle cx="100" cy="30" r="3" fill="#222" /><path d="M86 22 l4 6 M98 22 l-2 6" stroke="#2a1d14" strokeWidth="2.5" /></> },
  stairs: { viewBox: "0 0 100 100", body: <>{[0, 1, 2, 3, 4].map(i => <rect key={i} className={i % 2 ? "m" : "l"} x={i * 18} y={80 - i * 18} width={100 - i * 18} height="20" />)}</> },
  fence: { viewBox: "0 0 140 70", body: <><rect className="d" x="0" y="22" width="140" height="8" /><rect className="d" x="0" y="46" width="140" height="8" />{[4, 34, 64, 94, 124].map(x => <path key={x} className="m" d={`M${x} 70 V12 L${x + 6} 2 L${x + 12} 12 V70 Z`} />)}</> },
  flowerbed: { viewBox: "0 0 120 60", body: <><rect className="d" x="0" y="34" width="120" height="26" rx="4" /><rect x="6" y="30" width="108" height="10" rx="4" fill="#6b4a32" />{[14, 34, 54, 74, 94, 108].map((x, i) => <g key={x}><rect x={x - 1} y="14" width="2" height="18" fill="#4f7a3e" /><circle cx={x} cy="12" r="7" className={i % 2 ? "m" : "l"} /></g>)}</> },
  stonepath: { viewBox: "0 0 60 120", body: <>{[[18, 14], [40, 40], [20, 66], [40, 94]].map(([x, y]) => <ellipse key={y} className="m" cx={x} cy={y} rx="14" ry="10" />)}</> },
  appletree: { viewBox: "0 0 100 130", body: <><rect x="44" y="70" width="12" height="60" fill="#7a5236" /><circle className="m" cx="50" cy="48" r="40" /><circle className="l" cx="36" cy="36" r="16" opacity=".5" />{[[30, 52], [60, 34], [68, 62], [44, 70], [52, 20]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="5" fill="#d8453a" />)}</> },
  bench: { viewBox: "0 0 140 80", body: <><rect className="m" x="0" y="8" width="140" height="10" rx="3" /><rect className="m" x="0" y="22" width="140" height="10" rx="3" /><rect className="l" x="0" y="42" width="140" height="12" rx="3" /><rect x="10" y="54" width="8" height="26" fill="#3f4a44" /><rect x="122" y="54" width="8" height="26" fill="#3f4a44" /><rect x="10" y="8" width="6" height="46" fill="#3f4a44" /><rect x="124" y="8" width="6" height="46" fill="#3f4a44" /></> },
  mailbox: { viewBox: "0 0 50 120", body: <><rect x="21" y="44" width="8" height="76" fill="#5b4a3a" /><path className="m" d="M4 22 A21 18 0 0 1 46 22 V50 H4 Z" /><rect className="d" x="4" y="30" width="42" height="4" /><rect x="40" y="10" width="4" height="22" fill="#e2b85a" /></> },
  streetlamp: { viewBox: "0 0 50 150", body: <><rect className="m" x="22" y="30" width="6" height="114" /><rect className="d" x="12" y="140" width="26" height="10" rx="2" /><path className="m" d="M10 30 L18 8 H32 L40 30 Z" /><rect x="16" y="16" width="18" height="12" fill="#fff1b8" /></> },
  pond: { viewBox: "0 0 200 120", body: <><ellipse cx="100" cy="62" rx="98" ry="56" fill="#a9a398" /><ellipse className="m" cx="100" cy="60" rx="86" ry="46" /><ellipse className="l" cx="76" cy="46" rx="26" ry="10" opacity=".6" /><circle cx="130" cy="70" r="9" fill="#6f9a5a" /><circle cx="133" cy="66" r="4" fill="#f2b5c4" /></> },
  doghouse: { viewBox: "0 0 100 100", body: <><path className="d" d="M0 44 L50 4 L100 44 Z" /><rect className="m" x="10" y="40" width="80" height="60" /><path d="M36 100 V70 A14 14 0 0 1 64 70 V100 Z" fill="#3b2a1e" /><rect x="40" y="48" width="20" height="8" rx="2" fill="#efe6d6" /></> },
  scarecrow: { viewBox: "0 0 90 150", body: <><rect x="42" y="30" width="6" height="120" fill="#7a5236" /><rect x="6" y="58" width="78" height="6" fill="#7a5236" /><circle cx="45" cy="30" r="15" fill="#efd9a8" /><path className="m" d="M22 18 H68 L58 4 H32 Z" /><rect className="m" x="16" y="14" width="58" height="6" rx="3" /><path d="M24 58 H66 L60 104 H30 Z" fill="#6f8fb5" /><rect x="26" y="66" width="38" height="6" fill="#c4574b" /></> },
  window: { viewBox: "0 0 100 92", body: <><rect className="m" x="0" y="0" width="100" height="92" rx="3" /><rect x="7" y="7" width="86" height="78" fill="#bfe0ec" /><path d="M7 62 Q30 48 52 58 T93 54 V85 H7 Z" fill="#9cc57a" /><rect className="m" x="47" y="7" width="6" height="78" /><rect className="m" x="7" y="42" width="86" height="6" /><rect className="d" x="-4" y="86" width="108" height="6" rx="2" /></> },
  door: { viewBox: "0 0 90 180", body: <><rect x="0" y="0" width="90" height="180" fill="#efe2c8" /><rect className="m" x="8" y="8" width="74" height="172" rx="2" /><rect className="d" x="18" y="20" width="54" height="56" rx="3" opacity=".55" /><rect className="d" x="18" y="92" width="54" height="74" rx="3" opacity=".55" /><circle cx="70" cy="98" r="5" fill="#e2b85a" /></> },
  partition: { viewBox: "0 0 160 120", body: <><rect className="m" x="0" y="0" width="160" height="120" /><rect className="d" x="0" y="108" width="160" height="12" opacity=".6" /><rect className="l" x="0" y="0" width="160" height="6" /></> },
  arch: { viewBox: "0 0 160 120", body: <><path className="m" d="M0 0 H160 V120 H112 V58 A32 32 0 0 0 48 58 V120 H0 Z" /><rect className="d" x="0" y="108" width="48" height="12" opacity=".6" /><rect className="d" x="112" y="108" width="48" height="12" opacity=".6" /><rect className="l" x="0" y="0" width="160" height="6" /></> },
};

export function FurnitureArt({ id, flip }: { id: string; flip?: boolean }) {
  const art = ART[id];
  if (!art) return null;
  return <svg className="art" viewBox={art.viewBox} style={flip ? { transform: "scaleX(-1)" } : undefined} aria-hidden="true">{art.body}</svg>;
}
