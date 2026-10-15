/**
 * 토벌 무기 아이콘(무기 9종 + 진화 18종). 그림 파일 없이 SVG로 그린다.
 * - 기본 무기는 나무·쇠 색, 진화 A는 따뜻한 빛(빨강·금), 진화 B는 시원한 빛(초록·파랑) 테두리로 구분한다.
 * - UI는 <WeaponIcon id=… />, 전투 화면(캔버스)은 weaponArtUrl(id)로 이미지를 만들어 그린다.
 */
const O = "#2f2214";
const ln = (x1: number, y1: number, x2: number, y2: number, c: string, w = 5) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${O}" stroke-width="${w + 3}" stroke-linecap="round"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
const sh = (d: string, fill: string, sw = 2.5) => `<path d="${d}" fill="${fill}" stroke="${O}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
const ci = (cx: number, cy: number, r: number, fill: string, sw = 2.5) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${O}" stroke-width="${sw}"/>`;
const dot = (cx: number, cy: number, r: number, fill: string) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;
const st = (d: string, c: string, w = 2.5) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const WOOD = "#b07a44", DARK = "#4a3020", STEEL = "#dfe6ea", GOLD = "#e8b84a", RED = "#c8453a", GREEN = "#4f9a46", BLUE = "#4a9ad8";
const spark = (x: number, y: number, c: string) => st(`M${x} ${y - 5}V${y + 5}M${x - 5} ${y}H${x + 5}`, c, 2);

const ART: Record<string, string> = {
  // ----- 농사용 낫 → 전투 대낫 / 회전 수확날
  "raid-scythe": ln(14, 58, 44, 12, WOOD) + sh("M44 12C30 4 13 9 6 22C17 16 30 15 46 17Z", STEEL),
  "great-scythe": ln(14, 60, 46, 10, DARK, 6) + ln(26, 42, 30, 37, GOLD, 6) + sh("M48 10C28 0 6 8 2 28C15 15 32 13 50 16Z", "#3b3f4a") + st("M46 11C30 4 11 10 4 25", GOLD, 2) + ci(47, 13, 4, RED, 2),
  "harvest-blade": sh("M32 32C30 18 40 8 54 8C46 12 40 20 40 30Z", STEEL) + sh("M32 32C34 46 24 56 10 56C18 52 24 44 24 34Z", STEEL) + sh("M20 14C26 12 30 16 30 22C24 22 20 18 20 14Z", GREEN, 2) + sh("M44 50C38 52 34 48 34 42C40 42 44 46 44 50Z", GREEN, 2) + ci(32, 32, 7, "#2f6a2c") + ci(32, 32, 3, GOLD, 1.5),
  // ----- 괭이 → 지진 망치 / 암석 분쇄기
  "raid-hoe": ln(16, 58, 42, 14, WOOD) + sh("M36 10L56 18L52 26L34 18Z", "#aab4ba"),
  "quake-hammer": ln(18, 60, 38, 26, DARK, 6) + sh("M22 8H54V30H22Z", "#8a6a4a") + st("M30 10L34 18L30 24M44 12L40 20L46 28", "#ff9a3a", 2.5) + sh("M20 12H24V26H20Z", GOLD, 2),
  "rock-crusher": ln(16, 60, 34, 34, DARK, 6) + sh("M40 8L48 14L56 12L54 22L60 30L50 32L46 40L38 34L30 36L32 26L26 18L36 18Z", "#9aa0a4") + ci(42, 24, 6, "#6e7478", 2) + dot(12, 30, 3, "#9aa0a4") + dot(8, 40, 2, "#9aa0a4"),
  // ----- 물뿌리개 → 고압 물대포 / 빙결 분사기
  "raid-can": sh("M14 26H40V52H14Z", "#5aa86a") + sh("M40 32L56 20L58 24L42 40Z", "#5aa86a") + st("M18 26C18 14 36 14 36 26", O, 4) + dot(58, 30, 2.5, BLUE) + dot(54, 36, 2, BLUE),
  "water-cannon": sh("M8 30H40V44H8Z", "#3f6f9a") + sh("M40 26H48V48H40Z", "#2f5a80") + ci(14, 52, 6, DARK) + sh("M48 30C56 24 62 30 60 37C62 44 56 48 48 44Z", "#bfe6ff", 2) + st("M52 34H58M52 40H57", BLUE, 2),
  "frost-sprayer": sh("M12 18H30V54H12Z", "#bfe8f4") + sh("M30 30H48V38H30Z", "#7ab8d0") + st("M21 26V46M14 36H28M16 30L26 42M26 30L16 42", "#4a9ad8", 2) + st("M54 26V42M47 34H61M49 29L59 39M59 29L49 39", "#e6f8ff", 2.5),
  // ----- 비료 살포기 → 독성 분사기 / 폭발 씨앗 발사기
  "raid-spreader": sh("M14 20H44L38 44H20Z", "#c8a060") + ln(29, 44, 29, 56, DARK, 4) + ci(29, 57, 4, DARK, 2) + dot(24, 28, 2.5, "#6a4a20") + dot(32, 32, 2.5, "#6a4a20") + dot(36, 26, 2.5, "#6a4a20"),
  "toxic-sprayer": sh("M10 18H30V54H10Z", "#7a4a9a") + sh("M30 30H48V38H30Z", "#5a3a72") + sh("M48 28C58 26 62 34 58 40C54 44 48 40 48 34Z", "#9adf4a", 2) + dot(20, 30, 3, "#9adf4a") + dot(16, 42, 2, "#9adf4a") + dot(54, 50, 3, "#9adf4a"),
  "seed-launcher": ln(10, 44, 44, 26, "#6a7a3a", 9) + ci(50, 22, 9, "#c87a30") + st("M46 18C50 16 54 18 54 22", "#ffe1a0", 2) + spark(58, 10, GOLD) + ci(16, 52, 5, DARK, 2),
  // ----- 낚시 작살 → 삼지창 / 사슬 작살
  "raid-harpoon": ln(10, 58, 46, 18, WOOD, 4) + sh("M46 18L58 6L54 22L50 20L48 26Z", STEEL),
  trident: ln(12, 58, 40, 26, "#2f8a8a", 5) + sh("M40 26L44 8L48 22L52 6L52 24L60 14L54 30Z", GOLD) + ci(40, 27, 4, "#4ad0d0", 2),
  "chain-harpoon": sh("M44 20L58 6L54 24L50 22L48 28Z", STEEL) + ci(40, 28, 4, "none", 3) + ci(33, 35, 4, "none", 3) + ci(26, 42, 4, "none", 3) + ci(19, 49, 4, "none", 3) + ci(12, 56, 4, "#9aa0a4", 2),
  // ----- 낚싯대 → 번개 낚싯대 / 포획 그물 발사기
  "raid-rod": st("M10 58C24 40 36 20 54 8", O, 6) + st("M10 58C24 40 36 20 54 8", WOOD, 3.5) + st("M54 8V40", "#5a5a5a", 1.5) + ci(54, 44, 4, "#fff", 2) + sh("M50 44H58V48H50Z", RED, 1.5),
  "thunder-rod": st("M10 58C24 40 36 20 54 8", O, 6) + st("M10 58C24 40 36 20 54 8", "#3a3a5a", 3.5) + sh("M54 10L46 30H54L46 52L62 26H54L60 10Z", "#ffd84a", 2),
  "net-launcher": sh("M8 34H32V46H8Z", "#6a7a8a") + ci(12, 52, 5, DARK, 2) + sh("M32 22L60 10V56L32 46Z", "rgba(240,230,200,.35)", 2.5) + st("M36 22L56 52M44 18L58 40M36 34L60 24M34 42L58 50", "#e8dcc0", 1.8),
  // ----- 사냥 활 → 저격 장궁 / 연사궁
  "raid-bow": st("M20 6C46 18 46 46 20 58", O, 6) + st("M20 6C46 18 46 46 20 58", WOOD, 3.5) + st("M20 6V58", "#eee", 1.5) + ln(14, 32, 52, 32, "#d8c8a0", 2) + sh("M52 28L60 32L52 36Z", STEEL, 1.5),
  longbow: st("M16 2C50 16 50 48 16 62", O, 6) + st("M16 2C50 16 50 48 16 62", "#3a2a3a", 3.5) + st("M16 2V62", "#eee", 1.5) + ci(46, 32, 7, "none", 2) + st("M46 22V42M36 32H56", GOLD, 1.8),
  "rapid-bow": st("M14 8C38 18 38 46 14 56", O, 6) + st("M14 8C38 18 38 46 14 56", "#2f6a4a", 3.5) + st("M14 8V56", "#eee", 1.5) + ln(12, 24, 56, 16, "#d8c8a0", 1.5) + ln(12, 32, 58, 32, "#d8c8a0", 1.5) + ln(12, 40, 56, 48, "#d8c8a0", 1.5) + sh("M56 12L62 15L56 20Z", STEEL, 1.2) + sh("M58 28L64 32L58 36Z", STEEL, 1.2) + sh("M56 44L62 49L56 52Z", STEEL, 1.2),
  // ----- 엽총 → 소총 / 대형석궁
  "raid-shotgun": sh("M6 38L22 30H58V36H26L14 48Z", WOOD) + ln(24, 30, 58, 30, "#5a5a62", 3) + ln(24, 35, 58, 35, "#5a5a62", 3),
  rifle: sh("M4 40L18 32H60V37H22L12 48Z", "#6a4a2a") + ln(20, 32, 62, 32, "#4a4a52", 3) + sh("M28 22H46V28H28Z", "#2a2a32", 2) + ci(46, 25, 3, BLUE, 1.5),
  "siege-crossbow": ln(10, 50, 50, 22, DARK, 7) + st("M30 6C52 14 58 30 56 46", O, 6) + st("M30 6C52 14 58 30 56 46", "#8a5a2a", 3.5) + st("M30 6L56 46", "#eee", 1.5) + ln(18, 46, 58, 18, "#aab4ba", 3) + sh("M56 14L62 10L60 20Z", STEEL, 1.5),
  // ----- 사냥 칼 → 쌍검 / 대검
  "raid-knife": sh("M20 44L48 10C54 8 56 12 52 18L26 48Z", STEEL) + ln(12, 56, 22, 46, "#8a5a2a", 6) + ln(18, 42, 28, 52, DARK, 3),
  "twin-blades": sh("M14 50L42 8C46 6 48 10 46 14L20 54Z", "#cfeef4") + sh("M50 50L22 8C18 6 16 10 18 14L44 54Z", "#cfeef4") + ln(10, 58, 16, 52, "#2f5a6a", 5) + ln(54, 58, 48, 52, "#2f5a6a", 5) + spark(32, 30, "#7ae8ff"),
  greatsword: sh("M28 6H36L38 44H26Z", "#c8d0d6") + st("M32 8V42", "#8a949a", 1.5) + sh("M16 44H48V50H16Z", GOLD) + ln(32, 50, 32, 60, "#6a2a2a", 6) + ci(32, 47, 3, RED, 1.5),
};
/** 진화 쪽(A·B) 빛 테두리 */
const GLOW: Record<string, string> = {
  "great-scythe": "a", "harvest-blade": "b", "quake-hammer": "a", "rock-crusher": "b", "water-cannon": "a", "frost-sprayer": "b",
  "toxic-sprayer": "a", "seed-launcher": "b", trident: "a", "chain-harpoon": "b", "thunder-rod": "a", "net-launcher": "b",
  longbow: "a", "rapid-bow": "b", rifle: "a", "siege-crossbow": "b", "twin-blades": "a", greatsword: "b",
};

export function weaponSvg(id: string) {
  const body = ART[id] ?? ART["raid-scythe"], glow = GLOW[id];
  const halo = glow ? `<defs><radialGradient id="glow-${id}"><stop offset="0" stop-color="${glow === "a" ? "#ffd27a" : "#9ce7b0"}" stop-opacity=".85"/><stop offset="1" stop-color="${glow === "a" ? "#ffd27a" : "#9ce7b0"}" stop-opacity="0"/></radialGradient></defs><circle cx="32" cy="32" r="31" fill="url(#glow-${id})"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${halo}${body}</svg>`;
}
const urls = new Map<string, string>();
export function weaponArtUrl(id: string) {
  let url = urls.get(id);
  if (!url) { url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(weaponSvg(id))}`; urls.set(id, url); }
  return url;
}
/** 무기 아이콘. id는 무기 id 또는 진화 id. */
export function WeaponIcon({ id, size = 36, className = "" }: { id: string; size?: number; className?: string }) {
  return <span className={`weapon-icon ${className}`} style={{ width: size, height: size }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: weaponSvg(id) }} />;
}
