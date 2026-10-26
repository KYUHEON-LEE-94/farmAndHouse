const INK = "#342519", LEATHER = "#a86f3f", DARK = "#714527", FUR = "#efe2c5", METAL = "#78909a", LIGHT = "#c7d5d8", GOLD = "#ddb451";
const path = (d: string, fill: string, stroke = INK, sw = 2.5) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
const line = (d: string, stroke: string, sw = 2.5) => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
const circle = (x: number, y: number, r: number, fill: string, stroke = INK, sw = 2) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;

const ART: Record<string, string> = {
  "leather-hood": path("M15 42C15 20 22 10 32 8C42 10 49 20 49 42L42 55L36 47H28L22 55Z", LEATHER) + path("M21 35C22 25 26 20 32 19C38 20 42 25 43 35L37 43H27Z", FUR) + line("M18 38L14 48M46 38L50 48", DARK, 4),
  "reinforced-hood": path("M13 39C13 18 21 8 32 7C43 8 51 18 51 39L45 55L37 47H27L19 55Z", DARK) + path("M19 33C20 22 25 16 32 15C39 16 44 22 45 33L38 43H26Z", FUR) + path("M18 18L25 9L30 17M46 18L39 9L34 17", METAL) + path("M27 8H37L40 17L32 21L24 17Z", LIGHT) + circle(32, 14, 3, GOLD),
  "leather-vest": path("M20 10L29 16H35L44 10L53 23L46 28V56H18V28L11 23Z", LEATHER) + path("M25 13C27 21 37 21 39 13", FUR) + line("M32 21V55M23 31H41M23 42H41", DARK, 2) + circle(32, 31, 2, GOLD, INK, 1),
  "reinforced-vest": path("M18 9L28 15H36L46 9L56 23L48 29V57H16V29L8 23Z", DARK) + path("M24 12C27 21 37 21 40 12", FUR) + path("M18 25L27 20H37L46 25L43 51H21Z", METAL) + path("M27 22H37L40 47L32 53L24 47Z", LIGHT) + line("M14 23L21 30M50 23L43 30", GOLD, 3) + circle(32, 34, 3, GOLD),
  "leather-boots": path("M18 8H31L29 39L40 49C43 52 41 57 37 57H10C7 57 6 53 9 50L17 42Z", LEATHER) + path("M35 8H48L47 42L55 50C58 53 57 57 53 57H34C31 57 30 53 33 50L38 45Z", DARK) + line("M17 20H29M36 20H47", FUR, 4),
  "reinforced-boots": path("M15 7H31L29 39L40 49C44 53 42 58 37 58H8C5 58 4 53 8 49L15 42Z", DARK) + path("M34 7H50L48 42L56 50C60 54 57 58 53 58H33C29 58 29 53 32 49L38 44Z", DARK) + path("M14 16H31L29 27H14Z", METAL) + path("M34 16H50L48 27H34Z", METAL) + path("M8 48H38L42 53L37 58H8Z", LIGHT) + path("M33 48H55L59 53L53 58H33Z", LIGHT) + line("M18 10L27 24M38 10L47 24", GOLD, 2.5),
};
// 단풍 추적자·설산 방벽: 강화 가죽 모양에 구역 색을 입힌다.
const tint = (svg: string, map: Record<string, string>) => Object.entries(map).reduce((out, [from, to]) => out.split(`"${from}"`).join(`"${to}"`), svg);
const MAPLE = { [DARK]: "#a3401f", [LEATHER]: "#d9772f", [METAL]: "#e6a23c", [FUR]: "#f6d9a8" }, FROST = { [DARK]: "#4f7d99", [LEATHER]: "#8fb8cf", [METAL]: "#d8eef8", [FUR]: "#ffffff" };
const ANCIENT = { [DARK]: "#2f5236", [LEATHER]: "#6f9a5c", [METAL]: "#c9b16a", [FUR]: "#e6f0d0" }, CORE = { [DARK]: "#2a2150", [LEATHER]: "#6b58b0", [METAL]: "#ffd36a", [FUR]: "#d9ccff" };
for (const slot of ["hood", "vest", "boots"]) { ART[`ancient-${slot}`] = tint(ART[`reinforced-${slot}`], ANCIENT); ART[`core-${slot}`] = tint(ART[`reinforced-${slot}`], CORE); }
const SKY = { [DARK]: "#3b6ea8", [LEATHER]: "#8fc0e8", [METAL]: "#f2f6ff", [FUR]: "#ffe9a8" };
for (const slot of ["hood", "vest", "boots"]) ART[`sky-${slot}`] = tint(ART[`reinforced-${slot}`], SKY);
const STAR = { [DARK]: "#2b1f5c", [LEATHER]: "#7b62d6", [METAL]: "#ffe58a", [FUR]: "#e9e1ff" };
for (const slot of ["hood", "vest", "boots"]) ART[`star-${slot}`] = tint(ART[`reinforced-${slot}`], STAR);
// 9단계 시계 정원 수호자(RAID_FLOOR_50_IMPLEMENTATION_PLAN 6.1절): 청동 몸체 + 청록 유리, 부위마다 작은 청동 톱니
const CLOCK = { [DARK]: "#6b4a1f", [LEATHER]: "#b8862f", [METAL]: "#5fc9c0", [FUR]: "#f4e4b4" };
const cog = (x: number, y: number) => line(`M${x} ${y - 7}V${y - 5}M${x} ${y + 5}V${y + 7}M${x - 7} ${y}H${x - 5}M${x + 5} ${y}H${x + 7}M${x - 5} ${y - 5}L${x - 3.6} ${y - 3.6}M${x + 3.6} ${y + 3.6}L${x + 5} ${y + 5}M${x + 5} ${y - 5}L${x + 3.6} ${y - 3.6}M${x - 3.6} ${y + 3.6}L${x - 5} ${y + 5}`, "#8a5a1c", 2.5) + circle(x, y, 4.5, "#d9a441", INK, 1.5) + circle(x, y, 1.6, "#5fc9c0", INK, 0.8);
const COG_AT: Record<string, [number, number]> = { hood: [32, 30], vest: [32, 38], boots: [24, 22] };
for (const slot of ["hood", "vest", "boots"]) ART[`clock-${slot}`] = tint(ART[`reinforced-${slot}`], CLOCK) + cog(...COG_AT[slot]);
for (const slot of ["hood", "vest", "boots"]) { ART[`maple-${slot}`] = tint(ART[`reinforced-${slot}`], MAPLE); ART[`frost-${slot}`] = tint(ART[`reinforced-${slot}`], FROST); }

export function armorSvg(id: string) { return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${ART[id] ?? ART["leather-hood"]}</svg>`; }
export function ArmorIcon({ id, size = 40, className = "" }: { id: string; size?: number; className?: string }) {
  return <span className={`armor-art ${id.startsWith("leather-") ? "leather" : id.split("-")[0]} ${className}`} style={{ width: size, height: size }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: armorSvg(id) }} />;
}
