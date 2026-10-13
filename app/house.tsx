import type { ReactNode } from "react";

export type FurnitureKind = "floor" | "wall" | "rug";
export type Furniture = { id: string; name: string; icon: string; price: number; color: string; kind: FurnitureKind; width: number };
export type PlacedItem = Furniture & { instanceId: string; x: number; y: number; flip?: boolean; tint?: string };
export type Theme = { id: string; name: string; price: number; swatch: string };

// 방 단면 좌표(%) — 뒷벽 사각형을 기준으로 바닥·옆벽·천장이 원근으로 펼쳐진다.
export const BACK = { l: 14, r: 86, t: 10, b: 60 };
const VB_X = 1.6; // viewBox 160×100, 방 비율 16:10

export const FURNITURE: Furniture[] = [
  { id: "chair", name: "원목 의자", icon: "🪑", price: 500, color: "#c98f58", kind: "floor", width: 11 },
  { id: "plant", name: "몬스테라", icon: "🪴", price: 750, color: "#6f9a5a", kind: "floor", width: 13 },
  { id: "lamp", name: "스탠드 조명", icon: "💡", price: 900, color: "#e9c75d", kind: "floor", width: 8 },
  { id: "table", name: "원목 테이블", icon: "🪵", price: 1100, color: "#c08a57", kind: "floor", width: 21 },
  { id: "bookshelf", name: "책장", icon: "📚", price: 1400, color: "#a8744a", kind: "floor", width: 16 },
  { id: "sofa", name: "폭신 소파", icon: "🛋️", price: 1600, color: "#c78979", kind: "floor", width: 34 },
  { id: "bed", name: "포근한 침대", icon: "🛏️", price: 2200, color: "#8ba5bc", kind: "floor", width: 36 },
  { id: "piano", name: "업라이트 피아노", icon: "🎹", price: 3800, color: "#57514f", kind: "floor", width: 26 },
  { id: "rug", name: "둥근 러그", icon: "🟠", price: 600, color: "#b96555", kind: "rug", width: 40 },
  { id: "frame", name: "풍경 액자", icon: "🖼️", price: 450, color: "#d6b56d", kind: "wall", width: 13 },
  { id: "clock", name: "벽시계", icon: "🕰️", price: 650, color: "#7b8f7e", kind: "wall", width: 9 },
  { id: "shelf", name: "벽 선반", icon: "🪜", price: 550, color: "#b8875a", kind: "wall", width: 20 },
];

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

const FLOOR_COLORS: Record<string, [string, string]> = { oak: ["#c9965f", "#a97a48"], walnut: ["#7a5236", "#5a3b26"], tile: ["#efe4cf", "#c97b5d"] };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function itemLayout(item: PlacedItem) {
  if (item.kind === "wall") return { left: BACK.l + (item.x / 100) * (BACK.r - BACK.l), top: BACK.t + (item.y / 100) * (BACK.b - BACK.t), width: item.width * 0.72, z: 20 };
  const depth = item.y / 100, inset = BACK.l * (1 - depth), scale = (100 - inset * 2) / 100;
  return { left: inset + (item.x / 100) * (100 - inset * 2), top: BACK.b + (100 - BACK.b) * depth, width: item.width * scale, z: item.kind === "rug" ? 10 : 100 + Math.round(item.y * 10) };
}

export function pointToItem(kind: FurnitureKind, left: number, top: number) {
  if (kind === "wall") return { x: clamp(((left - BACK.l) / (BACK.r - BACK.l)) * 100, 5, 95), y: clamp(((top - BACK.t) / (BACK.b - BACK.t)) * 100, 10, 85) };
  const depth = clamp((top - BACK.b) / (100 - BACK.b), kind === "rug" ? 0.12 : 0.03, kind === "rug" ? 0.9 : 1);
  const inset = BACK.l * (1 - depth);
  return { x: clamp(((left - inset) / (100 - inset * 2)) * 100, 4, 96), y: depth * 100 };
}

const floorPoint = (u: number, depth: number) => {
  const inset = BACK.l * (1 - depth);
  return `${((inset + u * (100 - inset * 2)) * VB_X).toFixed(2)},${(BACK.b + (100 - BACK.b) * depth).toFixed(2)}`;
};

function FloorPattern({ floor }: { floor: string }) {
  const [base, seam] = FLOOR_COLORS[floor] ?? FLOOR_COLORS.oak;
  const rows = 6, cols = floor === "tile" ? 8 : 11;
  const depthAt = (row: number) => Math.pow(row / rows, 1.35);
  const shapes: ReactNode[] = [<polygon key="base" points={`${floorPoint(0, 0)} ${floorPoint(1, 0)} ${floorPoint(1, 1)} ${floorPoint(0, 1)}`} fill={base} />];
  if (floor === "tile") {
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) if ((row + col) % 2) {
      const [d0, d1, u0, u1] = [depthAt(row), depthAt(row + 1), col / cols, (col + 1) / cols];
      shapes.push(<polygon key={`t${row}-${col}`} points={`${floorPoint(u0, d0)} ${floorPoint(u1, d0)} ${floorPoint(u1, d1)} ${floorPoint(u0, d1)}`} fill={seam} />);
    }
  } else {
    for (let col = 1; col < cols; col++) shapes.push(<polyline key={`c${col}`} points={`${floorPoint(col / cols, 0)} ${floorPoint(col / cols, 1)}`} stroke={seam} strokeWidth=".45" />);
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) if ((row * 2 + col) % 3 === 0) {
      const depth = (depthAt(row) + depthAt(row + 1)) / 2;
      shapes.push(<polyline key={`j${row}-${col}`} points={`${floorPoint(col / cols, depth)} ${floorPoint((col + 1) / cols, depth)}`} stroke={seam} strokeWidth=".4" />);
    }
  }
  return <>{shapes}</>;
}

function WallpaperDef({ wallpaper }: { wallpaper: string }) {
  if (wallpaper === "flower") return <pattern id="wallpaper" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#f7e7e2" /><circle cx="2" cy="2" r=".9" fill="#e7aeb0" /><circle cx="6" cy="6" r=".9" fill="#b6cd9b" /></pattern>;
  if (wallpaper === "mint") return <pattern id="wallpaper" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#e4f0e7" /><rect width="8" height="1" fill="#cfe3d5" /><rect width="1" height="8" fill="#cfe3d5" /></pattern>;
  if (wallpaper === "panel") return <pattern id="wallpaper" width="7" height="10" patternUnits="userSpaceOnUse"><rect width="7" height="10" fill="#c99d6e" /><rect width=".6" height="10" fill="#a87a4c" /></pattern>;
  return <pattern id="wallpaper" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#f4e9d4" /><rect width="3" height="8" fill="#ecdcbf" /></pattern>;
}

export function RoomShell({ wallpaper, floor }: { wallpaper: string; floor: string }) {
  const [bl, br, bt, bb] = [BACK.l * VB_X, BACK.r * VB_X, BACK.t, BACK.b];
  return (
    <svg className="room-shell" viewBox="0 0 160 100" aria-hidden="true">
      <defs>
        <WallpaperDef wallpaper={wallpaper} />
        <linearGradient id="floorShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2b1a0e" stopOpacity=".28" /><stop offset=".55" stopColor="#2b1a0e" stopOpacity="0" /></linearGradient>
      </defs>
      <rect x={bl} y={bt} width={br - bl} height={bb - bt} fill="url(#wallpaper)" />
      <rect x={bl} y={bb - 15} width={br - bl} height="15" fill="#5a3b1e" opacity=".09" />
      <rect x={bl} y={bb - 15.6} width={br - bl} height=".9" fill="#fffaf0" opacity=".8" />
      <polygon points={`0,0 ${bl},${bt} ${bl},${bb} 0,100`} fill="url(#wallpaper)" /><polygon points={`0,0 ${bl},${bt} ${bl},${bb} 0,100`} fill="#3c2814" opacity=".16" />
      <polygon points={`160,0 ${br},${bt} ${br},${bb} 160,100`} fill="url(#wallpaper)" /><polygon points={`160,0 ${br},${bt} ${br},${bb} 160,100`} fill="#3c2814" opacity=".1" />
      <polygon points={`0,0 160,0 ${br},${bt} ${bl},${bt}`} fill="#fbf5ea" /><polygon points={`0,0 160,0 ${br},${bt} ${bl},${bt}`} fill="#7a5a30" opacity=".06" />
      <FloorPattern floor={floor} />
      <polygon points={`${bl},${bb} ${br},${bb} 160,100 0,100`} fill="url(#floorShade)" />
      <rect x={bl} y={bb - 1.6} width={br - bl} height="1.6" fill="#efe2c8" />
      <polygon points={`0,98.4 ${bl},${bb - 1.6} ${bl},${bb} 0,100`} fill="#d9c8a8" /><polygon points={`160,98.4 ${br},${bb - 1.6} ${br},${bb} 160,100`} fill="#e3d3b4" />
      <g stroke="#5a3b1e" strokeOpacity=".2" strokeWidth=".35" fill="none"><polyline points={`0,0 ${bl},${bt} ${bl},${bb} 0,100`} /><polyline points={`160,0 ${br},${bt} ${br},${bb} 160,100`} /><line x1={bl} y1={bt} x2={br} y2={bt} /></g>
      <g className="door"><rect x="33" y="25" width="17" height="35" fill="#efe2c8" /><rect x="34.6" y="26.6" width="13.8" height="33.4" fill="#b98352" /><rect x="36.4" y="29" width="10.2" height="11" fill="none" stroke="#9a6a3e" strokeWidth=".6" /><rect x="36.4" y="43" width="10.2" height="13" fill="none" stroke="#9a6a3e" strokeWidth=".6" /><circle cx="46.4" cy="43" r=".9" fill="#e2b85a" /></g>
      <g className="window-scene">
        <rect x="88" y="16.5" width="34" height="25" rx="1" fill="#fffaf0" />
        <rect className="win-sky" x="90" y="18.5" width="30" height="21" />
        <circle className="win-sun" cx="114" cy="23.5" r="2.6" />
        <path className="win-hill" d="M90 35 Q100 29 108 33 T120 31 V39.5 H90 Z" />
        <rect x="98" y="29" width="1.2" height="6" fill="#7a5236" /><circle className="win-leaf" cx="98.6" cy="28" r="3.6" />
        <rect x="104.6" y="18.5" width=".9" height="21" fill="#fffaf0" /><rect x="90" y="28.6" width="30" height=".9" fill="#fffaf0" />
        <path d="M86.5 15.5 H94 Q92 28 95 42 H86.5 Z" fill="#ecd3c1" /><path d="M123.5 15.5 H116 Q118 28 115 42 H123.5 Z" fill="#ecd3c1" />
        <rect x="85.5" y="14.6" width="39" height="1.2" rx=".6" fill="#8a6a48" />
        <rect x="87" y="41.5" width="36" height="1.8" rx=".5" fill="#fffaf0" />
      </g>
      <g className="pendant"><line x1="80" y1="0" x2="80" y2="7" stroke="#3a3027" strokeWidth=".35" /><path d="M75.5 11 L84.5 11 L82.2 7 L77.8 7 Z" fill="#2f3d33" /><ellipse cx="80" cy="11.2" rx="2" ry=".9" fill="#ffe9a8" /></g>
    </svg>
  );
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
};

export function FurnitureArt({ id, flip }: { id: string; flip?: boolean }) {
  const art = ART[id];
  if (!art) return null;
  return <svg className="art" viewBox={art.viewBox} style={flip ? { transform: "scaleX(-1)" } : undefined} aria-hidden="true">{art.body}</svg>;
}

export function artAspect(id: string) {
  const [, , width, height] = (ART[id]?.viewBox ?? "0 0 1 1").split(" ").map(Number);
  return height / width;
}
