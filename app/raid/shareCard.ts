/**
 * 토벌 결과 공유 카드(IMPLEMENTATION_GAP_AUDIT 10.5, 1차): 화면에서 1200×630 이미지를 그려
 * 모바일은 Web Share(이미지+문구), 안 되면 이미지 저장 + 문구 클립보드 복사.
 * 계정 ID·저장 키·보유 골드 같은 개인·경제 정보는 넣지 않는다. 서버 순위표·위변조 방지는 2차.
 */
import { zoneOf } from "./data";

export type ShareCardData = {
  highest: number;
  /** 이번 도전(없으면 탑 기록만) */
  run: { floor: number; cleared: boolean; bossTime: number | null; time: number | null; bossHpLeft: number; level: number } | null;
  weapon: string; armor: string[]; pet: string | null; version: number; at: number;
};

const ZONE_BG: Record<string, [string, string]> = { field: ["#5d8c3e", "#a7cf73"], canal: ["#2f5f6e", "#6aa0a8"], maple: ["#8a3a1c", "#dc8a43"], frost: ["#3f6a86", "#a6c9dc"], ancient: ["#3d5a2a", "#8fae5c"], core: ["#2a1f3d", "#7a4a8c"], sky: ["#3c6e9c", "#bcd8ef"], void: ["#1a1430", "#4b3b7a"], clock: ["#D9C79A", "#6F7654"] };
/** 밝은 배경 구역(시계 정원)은 흰 글자 대비(WCAG AA)를 위해 어두운 막을 한 겹 덮는다(RAID_FLOOR_50_IMPLEMENTATION_PLAN 6.2절) */
const ZONE_SCRIM: Record<string, string> = { clock: "rgba(30,24,10,.42)" };
const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const FONT = '"Gowun Dodum","Apple SD Gothic Neo","Malgun Gothic",sans-serif';

export function shareText(d: ShareCardData) {
  const run = d.run ? (d.run.cleared ? `${d.run.floor}층 돌파${d.run.bossTime !== null ? `(보스 ${d.run.bossTime}초)` : ""}` : `${d.run.floor}층 도전`) : null;
  return [`🏯 월루농가 월루탑 최고 ${d.highest}층${run ? ` · ${run}` : ""}`, `⚔️ ${d.weapon}${d.pet ? ` · 🐾 ${d.pet}` : ""}`, "#월루농가 #월루탑"].join("\n");
}

export function drawShareCard(d: ShareCardData): HTMLCanvasElement {
  const W = 1200, H = 630, c = document.createElement("canvas"); c.width = W; c.height = H;
  const zone = zoneOf(Math.max(1, d.run?.floor ?? d.highest)), g = c.getContext("2d")!, [c0, c1] = ZONE_BG[zone];
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, c0); bg.addColorStop(1, c1); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  if (ZONE_SCRIM[zone]) { g.fillStyle = ZONE_SCRIM[zone]; g.fillRect(0, 0, W, H); }
  // 탑 실루엣
  g.fillStyle = "rgba(0,0,0,.14)"; for (let i = 0; i < 6; i++) { const w = 90 + i * 26; g.fillRect(1010 - w / 2, 150 + i * 66, w, 60); } // 위가 좁은 탑
  g.fillStyle = "rgba(255,255,255,.1)"; g.beginPath(); g.arc(1040, 120, 180, 0, Math.PI * 2); g.fill();
  g.textBaseline = "alphabetic"; g.fillStyle = "#fff";
  g.font = `700 34px ${FONT}`; g.fillText("월루농가 · 월루탑 토벌 기록", 64, 92);
  g.font = `800 120px ${FONT}`; g.fillText(`최고 ${d.highest}층`, 60, 230);
  if (d.run) {
    const r = d.run, line = r.cleared ? `${r.floor}층 돌파!${r.bossTime !== null ? ` · 보스 처치 ${r.bossTime}초` : ""}` : `${r.floor}층 도전 · ${r.bossHpLeft < 1 ? `보스 체력 ${Math.round(r.bossHpLeft * 100)}% 남음` : `${r.time ?? 0}초 생존`}`;
    g.font = `700 44px ${FONT}`; g.fillStyle = r.cleared ? "#fff3b0" : "#ffe0d6"; g.fillText(`${r.cleared ? "🎉" : "💪"} ${line}`, 64, 310);
    g.font = `600 28px ${FONT}`; g.fillStyle = "rgba(255,255,255,.85)"; g.fillText(`각성 Lv.${r.level}`, 68, 352);
  }
  const rows: [string, string][] = [["⚔️", d.weapon], ["🛡️", d.armor.length ? d.armor.join(" · ") : "방어구 없음"], ["🐾", d.pet ?? "전투펫 없음"]];
  rows.forEach(([icon, text], i) => {
    const y = 430 + i * 54;
    g.font = `34px ${EMOJI}`; g.fillStyle = "#000"; g.fillText(icon, 64, y);
    g.font = `600 32px ${FONT}`; g.fillStyle = "#fff"; g.fillText(fit(g, text, 980), 120, y);
  });
  const date = new Date(d.at), stamp = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  g.font = `500 22px ${FONT}`; g.fillStyle = "rgba(255,255,255,.75)"; g.fillText(`밸런스 v${d.version} · ${stamp}`, 64, H - 34);
  g.textAlign = "right"; g.fillText("#월루농가 #월루탑", W - 48, H - 34);
  return c;
}
function fit(g: CanvasRenderingContext2D, text: string, max: number) {
  if (g.measureText(text).width <= max) return text;
  let t = text; while (t.length > 1 && g.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
}

/** 공유: Web Share(파일) → 실패하면 이미지 저장 + 문구 복사. 결과 안내 문구를 돌려준다. */
export async function shareRaidCard(d: ShareCardData): Promise<string> {
  const canvas = drawShareCard(d), text = shareText(d);
  const blob = await new Promise<Blob | null>(done => canvas.toBlob(done, "image/png"));
  if (!blob) return "이미지를 만들지 못했어요.";
  const file = new File([blob], `wolru-tower-${d.highest}F.png`, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], text }); return "공유했어요!"; } catch (error) { if ((error as Error).name === "AbortError") return "공유를 취소했어요."; }
  }
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  try { await navigator.clipboard.writeText(text); return "카드 이미지를 저장하고 결과 문구를 복사했어요."; } catch { return "카드 이미지를 저장했어요."; }
}
