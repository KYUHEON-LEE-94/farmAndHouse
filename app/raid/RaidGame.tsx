"use client";

import { useEffect, useRef, useState } from "react";
import { ARENA_H, ARENA_W, AWAKENINGS, AWAKEN_XP, FLOOR_SECONDS, PLAYER, type AwakenId, type Evolution, type FloorDef, type WeaponStats } from "./data";
import { chooseAwakening, createRaid, derived, raidResult, stepRaid, type FoodSlot, type Gear, type Input, type RaidResult, type RaidState } from "./engine";

const STEP = 1 / 60;
const fmt = (sec: number) => { const s = Math.max(0, Math.ceil(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const EMOJI_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
const UI_FONT = '"Gowun Dodum", "Pretendard", sans-serif';

type Ui = { choices: AwakenId[] | null; paused: boolean; over: RaidState["over"]; level: number; picks: Partial<Record<AwakenId, number>> };
type Avatar = { src: string; pixelated: boolean };
type Art = { bg: HTMLCanvasElement; avatar: HTMLImageElement | null; pixelated: boolean };

/**
 * 탑 토벌 전투 화면. canvas + requestAnimationFrame 고정 스텝 루프로 그리고,
 * React 상태는 각성 선택·일시정지·결과처럼 바뀔 때만 갱신한다. 캐릭터는 유저가 고른 아바타로 그린다.
 */
export default function RaidGame({ floor, weapon, evolution, foods, gear, pet = null, avatar, hold, speed = 1, autoPause = true, onFinish, onQuit }: {
  floor: FloorDef; weapon: WeaponStats; evolution: Evolution | null; foods: FoodSlot[]; gear?: Gear; pet?: { id: string; mult: number; icon: string } | null; avatar: Avatar;
  /** 보스키·다른 탭 등 바깥에서 멈춰야 할 때 true. */
  hold: boolean; speed?: number; autoPause?: boolean;
  onFinish: (result: RaidResult) => void; onQuit: (result: RaidResult) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<RaidState | null>(null);
  const inputRef = useRef<Input>({ up: false, down: false, left: false, right: false, aimX: ARENA_W / 2, aimY: 0, attack: false, dash: false, food: [false, false, false] });
  const holdRef = useRef(hold), speedRef = useRef(speed), finishRef = useRef(onFinish), doneRef = useRef(false);
  const [ui, setUi] = useState<Ui>({ choices: null, paused: false, over: null, level: 1, picks: {} });
  useEffect(() => { holdRef.current = hold; speedRef.current = speed; finishRef.current = onFinish; });

  // 전투 시작(한 번)
  useEffect(() => {
    stateRef.current = createRaid(floor, weapon, evolution, foods, gear, pet ? { id: pet.id, mult: pet.mult } : null);
    const petIcon = pet?.icon ?? "";
    doneRef.current = false;
    const canvas = canvasRef.current!, ctx = canvas.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = ARENA_W * dpr; canvas.height = ARENA_H * dpr;
    ctx.scale(dpr, dpr);
    const art: Art = { bg: paintBackground(floor.floor > 5), avatar: null, pixelated: avatar.pixelated };
    const img = new Image(); img.onload = () => { art.avatar = img; }; img.src = avatar.src;
    let raf = 0, last = performance.now(), acc = 0, uiKey = "";
    const frame = (now: number) => {
      const s = stateRef.current!;
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      s.paused = s.paused || holdRef.current;
      if (!s.over && !s.paused && !s.choices) {
        acc += dt * speedRef.current;
        while (acc >= STEP) { stepRaid(s, STEP, inputRef.current); acc -= STEP; if (s.over || s.choices) { acc = 0; break; } }
      } else { acc = 0; stepRaid(s, 0, inputRef.current); }
      draw(ctx, s, art, now / 1000, petIcon);
      const key = `${s.choices?.join(",") ?? ""}|${s.paused}|${s.over ?? ""}`;
      if (key !== uiKey) { uiKey = key; setUi({ choices: s.choices ? [...s.choices] : null, paused: s.paused, over: s.over, level: s.level, picks: { ...s.picks } }); }
      if (s.over && !doneRef.current) { doneRef.current = true; finishRef.current(raidResult(s)); }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 입력
  useEffect(() => {
    const keyMap: Record<string, keyof Input | "food0" | "food1" | "food2" | "pause"> = { KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right", ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", Space: "dash", Digit1: "food0", Digit2: "food1", Digit3: "food2", KeyP: "pause" };
    const set = (event: KeyboardEvent, on: boolean) => {
      // 전투 중에는 창고(E)·미션(M) 단축키가 열리지 않게 막는다.
      if (["KeyE", "KeyM", "KeyQ"].includes(event.code)) { event.stopPropagation(); return; }
      const k = keyMap[event.code]; if (!k) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      event.preventDefault(); event.stopPropagation();
      const input = inputRef.current, s = stateRef.current;
      if (k === "pause") { if (on && s && !s.over) { s.paused = !s.paused; } return; }
      if (k.startsWith("food")) { const i = Number(k.slice(4)); const next = [...input.food] as Input["food"]; next[i] = on; input.food = next; return; }
      (input as unknown as Record<string, boolean>)[k] = on;
    };
    const down = (e: KeyboardEvent) => set(e, true), up = (e: KeyboardEvent) => set(e, false);
    const blur = () => { const s = stateRef.current; inputRef.current = { ...inputRef.current, up: false, down: false, left: false, right: false, attack: false }; if (autoPause && s && !s.over) s.paused = true; };
    const vis = () => { if (document.visibilityState === "hidden") blur(); };
    window.addEventListener("keydown", down, true); window.addEventListener("keyup", up, true);
    window.addEventListener("blur", blur); document.addEventListener("visibilitychange", vis);
    return () => { window.removeEventListener("keydown", down, true); window.removeEventListener("keyup", up, true); window.removeEventListener("blur", blur); document.removeEventListener("visibilitychange", vis); };
  }, [autoPause]);

  const toLogical = (event: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    inputRef.current.aimX = ((event.clientX - r.left) / r.width) * ARENA_W;
    inputRef.current.aimY = ((event.clientY - r.top) / r.height) * ARENA_H;
  };
  const resume = () => { const s = stateRef.current; if (s && !holdRef.current) s.paused = false; };
  const choose = (id: AwakenId) => { const s = stateRef.current; if (s) chooseAwakening(s, id); };
  const quit = () => { const s = stateRef.current; if (!s || doneRef.current) return; doneRef.current = true; onQuit({ ...raidResult(s), abandoned: true }); };

  return <div className="raid-game">
    <canvas ref={canvasRef} className="raid-canvas" style={{ aspectRatio: `${ARENA_W} / ${ARENA_H}` }}
      onPointerMove={toLogical}
      onPointerDown={event => { toLogical(event); if (event.button === 0) { inputRef.current.attack = true; (event.target as HTMLElement).setPointerCapture(event.pointerId); } }}
      onPointerUp={() => { inputRef.current.attack = false; }}
      onPointerLeave={() => { inputRef.current.attack = false; }}
      onContextMenu={event => event.preventDefault()} />
    {ui.choices && <div className="raid-overlay"><div className="raid-choices">
      <span className="raid-ov-eyebrow">AWAKENING</span><b>⚔️ 전투 각성 Lv.{ui.level}</b><small>하나를 고르세요 · 고르는 동안 전투가 멈춰요</small>
      <div>{ui.choices.map((id, i) => <button key={id} onClick={() => choose(id)} className={AWAKENINGS[id].final ? "final" : ""} style={{ animationDelay: `${i * 0.06}s` }}>
        <i>{AWAKENINGS[id].final ? "🌙" : ["🗡️", "🛡️", "💨"][i % 3]}</i><strong>{AWAKENINGS[id].name}</strong>{(ui.picks[id] ?? 0) > 0 && <em>{(ui.picks[id] ?? 0) + 1}단계</em>}<span>{AWAKENINGS[id].text}</span>
      </button>)}</div>
    </div></div>}
    {ui.paused && !ui.over && !ui.choices && <div className="raid-overlay"><div className="raid-pause"><span className="raid-ov-eyebrow">PAUSED</span><b>⏸ 일시정지</b><small>P 또는 계속하기를 누르면 이어서 싸워요</small><button className="save-button" onClick={resume}>▶ 계속하기</button><button className="ghost-button" onClick={quit}>🏳 도전 포기 (사용한 음식만 소모)</button></div></div>}
  </div>;
}

// ---------- 배경(한 번만 그려 둔다) ----------
function paintBackground(canal: boolean) {
  const c = document.createElement("canvas"); c.width = ARENA_W; c.height = ARENA_H;
  const g = c.getContext("2d")!;
  let seed = canal ? 7 : 3; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const base = g.createRadialGradient(ARENA_W / 2, ARENA_H / 2, 80, ARENA_W / 2, ARENA_H / 2, 620);
  if (canal) { base.addColorStop(0, "#8fb5ad"); base.addColorStop(1, "#4d6f6c"); } else { base.addColorStop(0, "#b8dc8f"); base.addColorStop(1, "#78a856"); }
  g.fillStyle = base; g.fillRect(0, 0, ARENA_W, ARENA_H);
  if (canal) {
    // 수로: 물길 띠와 돌바닥
    g.fillStyle = "rgba(60,110,150,.35)"; g.fillRect(0, ARENA_H * 0.42, ARENA_W, 70);
    g.strokeStyle = "rgba(255,255,255,.18)"; g.lineWidth = 2;
    for (let i = 0; i < 18; i++) { const y = ARENA_H * 0.42 + 10 + r() * 50, x = r() * ARENA_W; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 20, y - 4, x + 40, y); g.stroke(); }
    for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(40,60,60,${0.12 + r() * 0.12})`; g.beginPath(); g.ellipse(r() * ARENA_W, r() * ARENA_H, 6 + r() * 14, 4 + r() * 8, r() * 3, 0, Math.PI * 2); g.fill(); }
    for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(120,170,110,.35)"; g.fillRect(r() * ARENA_W, r() * ARENA_H, 2, 6 + r() * 6); }
  } else {
    // 들판: 풀포기와 꽃
    for (let i = 0; i < 260; i++) { const x = r() * ARENA_W, y = r() * ARENA_H; g.strokeStyle = `rgba(60,110,40,${0.25 + r() * 0.25})`; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y - 7); g.moveTo(x, y); g.lineTo(x + 2, y - 6); g.stroke(); }
    const petals = ["#fff6d0", "#ffd84a", "#f7a8c8", "#ffffff"];
    for (let i = 0; i < 70; i++) { const x = r() * ARENA_W, y = r() * ARENA_H; g.fillStyle = petals[i % petals.length]; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + Math.cos(k * 1.57) * 2.5, y + Math.sin(k * 1.57) * 2.5, 2, 0, Math.PI * 2); g.fill(); } g.fillStyle = "#e0a020"; g.beginPath(); g.arc(x, y, 1.5, 0, Math.PI * 2); g.fill(); }
  }
  // 가장자리 비네트
  const v = g.createRadialGradient(ARENA_W / 2, ARENA_H / 2, ARENA_H * 0.45, ARENA_W / 2, ARENA_H / 2, ARENA_W * 0.62);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(20,30,10,.38)");
  g.fillStyle = v; g.fillRect(0, 0, ARENA_W, ARENA_H);
  return c;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, ratio: number, color: string, back = "rgba(0,0,0,.35)") {
  roundRect(ctx, x, y, w, h, h / 2); ctx.fillStyle = back; ctx.fill();
  if (ratio > 0) { roundRect(ctx, x, y, Math.max(h, w * Math.min(1, ratio)), h, h / 2); ctx.fillStyle = color; ctx.fill(); }
}
function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  roundRect(ctx, x, y, w, h, 12); ctx.fillStyle = "rgba(24,28,20,.62)"; ctx.fill(); ctx.strokeStyle = "rgba(255,240,200,.18)"; ctx.lineWidth = 1; ctx.stroke();
}
function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) { ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.beginPath(); ctx.ellipse(x, y + r * 0.85, r * 0.9, r * 0.32, 0, 0, Math.PI * 2); ctx.fill(); }

// ---------- 그리기 ----------
function draw(ctx: CanvasRenderingContext2D, s: RaidState, art: Art, clock: number, petIcon = "") {
  const W = ARENA_W, H = ARENA_H, p = s.player, d = derived(s);
  ctx.drawImage(art.bg, 0, 0);

  // 장판·예고(색 + 점선/실선 모양으로 구분)
  const pulse = 0.5 + 0.5 * Math.sin(clock * 10);
  for (const z of s.zones) {
    ctx.save();
    if (z.kind === "line") {
      ctx.fillStyle = z.tele > 0 ? `rgba(220,60,40,${0.12 + pulse * 0.12})` : "rgba(255,120,60,.55)"; ctx.fillRect(0, z.y - z.r, W, z.r * 2);
      ctx.setLineDash([12, 8]); ctx.strokeStyle = "#ff6b4a"; ctx.lineWidth = 2; ctx.strokeRect(-2, z.y - z.r, W + 4, z.r * 2);
    } else {
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
      if (z.tele > 0) { ctx.fillStyle = `rgba(220,60,40,${0.1 + pulse * 0.14})`; ctx.fill(); ctx.setLineDash([9, 6]); ctx.strokeStyle = "#ff6b4a"; ctx.lineWidth = 2.5; ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = "#c0392b"; ctx.font = `bold 16px ${EMOJI_FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(z.kind === "bolt" ? "⚡" : "!", z.x, z.y); }
      else if (z.kind === "pollen") { const g = ctx.createRadialGradient(z.x, z.y, 4, z.x, z.y, z.r); g.addColorStop(0, "rgba(255,230,90,.55)"); g.addColorStop(1, "rgba(240,200,60,.2)"); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = "rgba(200,160,30,.8)"; ctx.lineWidth = 2; ctx.stroke(); }
      else if (z.kind === "puddle") { const g = ctx.createRadialGradient(z.x, z.y, 4, z.x, z.y, z.r); g.addColorStop(0, "rgba(90,160,220,.45)"); g.addColorStop(1, "rgba(60,120,190,.22)"); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = "rgba(200,235,255,.5)"; ctx.lineWidth = 2; ctx.stroke(); }
      else if (z.kind === "shock") { ctx.fillStyle = `rgba(140,230,255,${0.35 + pulse * 0.3})`; ctx.fill(); ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3; ctx.stroke(); }
      else { ctx.fillStyle = "rgba(255,245,150,.85)"; ctx.fill(); }
    }
    ctx.restore();
  }
  // 경험치 구슬
  for (const o of s.orbs) { const r = 3.5 + Math.min(4, o.xp); const g = ctx.createRadialGradient(o.x - 1, o.y - 1, 0, o.x, o.y, r + 2); g.addColorStop(0, "#e9fff0"); g.addColorStop(1, "#38c46a"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, Math.PI * 2); ctx.fill(); }

  // 돌진 예고
  for (const m of s.monsters) if (m.tele && m.tele.kind === "line") {
    ctx.save(); ctx.translate(m.tele.x, m.tele.y); ctx.rotate(Math.atan2(m.tele.dy, m.tele.dx));
    ctx.fillStyle = `rgba(220,60,40,${0.14 + pulse * 0.14})`; ctx.fillRect(0, -m.tele.width / 2, m.tele.len, m.tele.width);
    ctx.setLineDash([10, 7]); ctx.strokeStyle = "#ff6b4a"; ctx.lineWidth = 2; ctx.strokeRect(0, -m.tele.width / 2, m.tele.len, m.tele.width);
    ctx.fillStyle = "#ff6b4a"; ctx.beginPath(); ctx.moveTo(m.tele.len, 0); ctx.lineTo(m.tele.len - 14, -9); ctx.lineTo(m.tele.len - 14, 9); ctx.fill(); ctx.restore();
  }

  // 몬스터(그림자 · 살짝 통통 · 정예/보스 테두리)
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const m of s.monsters) {
    shadow(ctx, m.x, m.y, m.r);
    if (m.elite || m.boss) { ctx.beginPath(); ctx.arc(m.x, m.y, m.r + 4, 0, Math.PI * 2); ctx.fillStyle = m.boss ? "rgba(255,216,74,.18)" : "rgba(231,163,62,.15)"; ctx.fill(); ctx.strokeStyle = m.boss ? "#ffd84a" : "#e7a33e"; ctx.lineWidth = 2.5; ctx.stroke(); }
    const bob = m.state === "move" ? Math.sin(clock * 9 + m.uid) * 1.5 : 0;
    ctx.save(); ctx.translate(m.x, m.y + bob);
    if (m.dir.x > 0.1 && m.def.kind !== "slime") ctx.scale(-1, 1);
    if (m.flash > 0) ctx.filter = "brightness(2.2)";
    // 컬러 이모지도 fillStyle의 투명도를 따라가므로 불투명색으로 그린다.
    ctx.fillStyle = "#000"; ctx.font = `${Math.round(m.r * 1.9)}px ${EMOJI_FONT}`; ctx.fillText(m.icon, 0, 1);
    ctx.restore();
    if (m.markUntil > s.t) { ctx.save(); ctx.strokeStyle = "#ff9a3a"; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(m.x, m.y, m.r + 8, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); ctx.fillStyle = "#000"; ctx.font = `12px ${EMOJI_FONT}`; ctx.fillText("🔥", m.x + m.r, m.y - m.r); }
    if (m.state === "stun") { ctx.fillStyle = "#000"; ctx.font = `16px ${EMOJI_FONT}`; ctx.fillText("💫", m.x, m.y - m.r - 12); }
    if (!m.boss && (m.elite || m.hp < m.maxHp)) bar(ctx, m.x - m.r, m.y - m.r - 10, m.r * 2, 4, m.hp / m.maxHp, m.elite ? "#f0a030" : "#ef5a43");
  }
  // 투사체
  for (const pr of s.projectiles) {
    ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2);
    if (pr.mine) { ctx.fillStyle = "rgba(255,226,120,.75)"; ctx.fill(); }
    else { const g = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, pr.r + 2); g.addColorStop(0, "#fbe9ff"); g.addColorStop(1, "#8e44ad"); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 1.5; ctx.stroke(); }
  }

  // 낫 휘두르기: 초승달 모양 잔상
  for (const sw of s.swings) {
    const a = Math.min(1, sw.t / 0.18);
    ctx.save(); ctx.globalAlpha = a * 0.55;
    const g = ctx.createRadialGradient(p.x, p.y, sw.range * 0.35, p.x, p.y, sw.range);
    g.addColorStop(0, "rgba(255,250,230,0)"); g.addColorStop(0.75, "rgba(255,246,208,.9)"); g.addColorStop(1, "rgba(255,255,255,1)");
    ctx.fillStyle = g; ctx.beginPath();
    if (sw.arc >= 360) { ctx.arc(p.x, p.y, sw.range, 0, Math.PI * 2); ctx.arc(p.x, p.y, sw.range * 0.55, 0, Math.PI * 2, true); }
    else { const h = (sw.arc / 2) * Math.PI / 180; ctx.arc(p.x, p.y, sw.range, sw.angle - h, sw.angle + h); ctx.arc(p.x, p.y, sw.range * 0.55, sw.angle + h, sw.angle - h, true); }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  // 전투펫
  if (s.pet && petIcon) { const pt = s.pet; shadow(ctx, pt.x, pt.y, 10); ctx.save(); ctx.translate(pt.x, pt.y + Math.sin(clock * 6) * 2); if (pt.flash > 0) ctx.scale(1.2, 1.2); ctx.fillStyle = "#000"; ctx.font = `22px ${EMOJI_FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(petIcon, 0, 0); ctx.restore(); }
  // 플레이어(내 아바타)
  const size = 44, flip = Math.cos(p.aim) < 0;
  ctx.save();
  shadow(ctx, p.x, p.y + 4, 16);
  ctx.globalAlpha = p.iframes > 0 && Math.floor(clock * 20) % 2 ? 0.45 : 1;
  if (p.dashT > 0) { ctx.globalAlpha = 0.35; for (let k = 1; k <= 3; k++) drawAvatar(ctx, art, p.x - p.dashDir.x * k * 12, p.y - p.dashDir.y * k * 12, size, flip); ctx.globalAlpha = 1; }
  drawAvatar(ctx, art, p.x, p.y, size, flip);
  ctx.globalAlpha = 1;
  if (p.shield > 0) { ctx.beginPath(); ctx.arc(p.x, p.y, size / 2 + 6, 0, Math.PI * 2); ctx.strokeStyle = `rgba(120,200,255,${0.6 + pulse * 0.3})`; ctx.lineWidth = 3; ctx.stroke(); }
  // 낫(조준 방향)
  ctx.translate(p.x, p.y); ctx.rotate(p.aim);
  ctx.fillStyle = "#000"; ctx.font = `22px ${EMOJI_FONT}`; ctx.fillText("🌙", size / 2 + 6, 0);
  ctx.restore();
  // 조준 범위(아주 옅게)
  ctx.save(); ctx.globalAlpha = 0.16; ctx.strokeStyle = "#fffbe8"; ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
  const ha = (Math.min(359.9, d.arc) / 2) * Math.PI / 180; ctx.beginPath(); ctx.arc(p.x, p.y, d.range, p.aim - ha, p.aim + ha); ctx.stroke(); ctx.restore();

  // 피해 숫자
  ctx.textAlign = "center";
  for (const pop of s.pops) {
    ctx.globalAlpha = Math.min(1, pop.t * 2);
    ctx.font = pop.kind === "info" ? `700 20px ${UI_FONT}` : pop.kind === "crit" ? "900 19px sans-serif" : "800 14px sans-serif";
    ctx.fillStyle = { hit: "#ffffff", crit: "#ffd84a", hurt: "#ff6b5a", heal: "#7df0a0", info: "#fff6d0" }[pop.kind];
    ctx.strokeStyle = "rgba(30,20,10,.75)"; ctx.lineWidth = 4; ctx.strokeText(pop.text, pop.x, pop.y); ctx.fillText(pop.text, pop.x, pop.y);
  }
  ctx.globalAlpha = 1;

  // 체력이 낮으면 붉은 테두리
  if (p.hp / p.maxHp < 0.3) { const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.6); v.addColorStop(0, "rgba(200,0,0,0)"); v.addColorStop(1, `rgba(200,20,20,${0.25 + pulse * 0.15})`); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H); }

  // ---------- HUD ----------
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  // 왼쪽 위: 내 카드(아바타 · 체력 · 각성)
  panel(ctx, 12, 12, 270, 70);
  ctx.save(); roundRect(ctx, 20, 20, 54, 54, 10); ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fill(); ctx.clip(); drawAvatar(ctx, art, 47, 47, 50, false); ctx.restore();
  ctx.font = `700 13px ${UI_FONT}`; ctx.fillStyle = "#fff6d0"; ctx.fillText(s.floor.training ? `🎯 ${s.floor.zone}` : `${s.floor.floor}층 · ${s.floor.zone}`, 84, 28);
  bar(ctx, 84, 40, 186, 13, p.hp / p.maxHp, p.hp / p.maxHp < 0.3 ? "#ff5040" : "#ef5a43");
  if (p.shield > 0) bar(ctx, 84, 40, 186, 5, p.shield / p.maxHp, "rgba(140,210,255,.95)", "rgba(0,0,0,0)");
  ctx.font = "700 10px sans-serif"; ctx.fillStyle = "#fff"; ctx.fillText(`♥ ${Math.ceil(p.hp)} / ${p.maxHp}${p.shield > 0 ? `  🛡 ${Math.ceil(p.shield)}` : ""}`, 90, 47);
  const nextXp = AWAKEN_XP[Math.min(4, s.level)], prevXp = AWAKEN_XP[s.level - 1];
  bar(ctx, 84, 60, 186, 8, s.level >= 5 ? 1 : (s.xp - prevXp) / Math.max(1, nextXp - prevXp), "#4fd27e");
  ctx.font = `700 11px ${UI_FONT}`; ctx.fillStyle = "#c9f7d6"; ctx.fillText(`각성 Lv.${s.level}${s.level >= 5 ? " MAX" : ""}`, 84, 75);

  // 가운데 위: 남은 시간 / 보스 체력
  const left = (s.floor.duration ?? FLOOR_SECONDS) - s.t, bossTime = !s.floor.training && s.t >= 240;
  if (s.boss && s.boss.hp > 0) {
    const bw = 400, bx = (W - bw) / 2;
    panel(ctx, bx - 10, 12, bw + 20, 46);
    ctx.textAlign = "center"; ctx.font = `700 13px ${UI_FONT}`; ctx.fillStyle = "#ffe19a"; ctx.fillText(`${s.boss.icon} ${s.boss.name}`, W / 2 - 40, 26);
    ctx.font = "800 13px sans-serif"; ctx.fillStyle = left < 15 ? "#ff7a6a" : "#fff"; ctx.fillText(`⏱ ${fmt(left)}`, W / 2 + 150, 26);
    bar(ctx, bx, 38, bw, 10, s.boss.hp / s.boss.maxHp, "#d8432f");
    ctx.textAlign = "left";
  } else {
    panel(ctx, W / 2 - 70, 12, 140, 40);
    ctx.textAlign = "center"; ctx.font = "800 20px sans-serif"; ctx.fillStyle = bossTime ? "#ff7a6a" : "#fff"; ctx.fillText(fmt(left), W / 2, 30);
    ctx.font = `700 9px ${UI_FONT}`; ctx.fillStyle = "#d9cfae"; ctx.fillText(s.floor.training ? "진화 체험 중" : s.t < 240 ? `보스까지 ${fmt(240 - s.t)}` : "보스 등장!", W / 2, 45);
    ctx.textAlign = "left";
  }
  // 오른쪽 위: 처치 수
  panel(ctx, W - 112, 12, 100, 32); ctx.font = `700 13px ${UI_FONT}`; ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText(`💀 ${s.kills}`, W - 62, 28); ctx.textAlign = "left";

  // 아래: 회피 · 음식 칸 · 버프
  const by = H - 62;
  panel(ctx, 12, by, 64, 50);
  const ready = p.dashCd <= 0, cdRatio = ready ? 1 : 1 - p.dashCd / d.dashCd;
  ctx.beginPath(); ctx.arc(44, by + 21, 15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cdRatio); ctx.strokeStyle = ready ? "#9fe8ff" : "rgba(160,200,220,.6)"; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = "#000"; ctx.font = `16px ${EMOJI_FONT}`; ctx.textAlign = "center"; ctx.fillText("💨", 44, by + 21);
  ctx.font = "700 9px sans-serif"; ctx.fillStyle = ready ? "#fff" : "#aaa"; ctx.fillText(ready ? "SPACE" : p.dashCd.toFixed(1), 44, by + 43);
  s.foods.forEach((f, i) => {
    const x = 84 + i * 58, used = !f || s.foodUsed[i];
    panel(ctx, x, by, 50, 50);
    ctx.globalAlpha = used ? 0.3 : 1;
    ctx.fillStyle = f ? "#000" : "#ccc"; ctx.font = `24px ${EMOJI_FONT}`; ctx.fillText(f ? f.icon : "·", x + 25, by + 24);
    ctx.globalAlpha = 1;
    roundRect(ctx, x + 34, by + 34, 14, 14, 4); ctx.fillStyle = used ? "rgba(255,255,255,.2)" : "#ffd84a"; ctx.fill();
    ctx.font = "800 10px sans-serif"; ctx.fillStyle = "#2a2010"; ctx.fillText(String(i + 1), x + 41, by + 42);
    if (f && s.foodUsed[i]) { ctx.font = "700 9px sans-serif"; ctx.fillStyle = "#ddd"; ctx.fillText("사용", x + 25, by + 43); }
  });
  ctx.textAlign = "left";
  const buffs = s.buffs.filter(b => b.until > s.t);
  if (buffs.length) {
    const text = buffs.map(b => `${{ attack: "⚔ 공격", speed: "👟 이속", haste: "⚡ 공속", all: "🌟 전체", heal: "", shield: "", regen: "" }[b.kind]} +${b.value}% · ${Math.ceil(b.until - s.t)}s`).join("   ");
    ctx.font = `700 12px ${UI_FONT}`; const w = ctx.measureText(text).width + 24;
    panel(ctx, 262, by + 10, w, 30); ctx.fillStyle = "#ffe19a"; ctx.fillText(text, 274, by + 26);
  }
}

function drawAvatar(ctx: CanvasRenderingContext2D, art: Art, x: number, y: number, size: number, flip: boolean) {
  ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
  if (art.avatar) { ctx.imageSmoothingEnabled = !art.pixelated; ctx.drawImage(art.avatar, -size / 2, -size / 2, size, size); }
  else { ctx.beginPath(); ctx.arc(0, 0, PLAYER.radius, 0, Math.PI * 2); ctx.fillStyle = "#fff3d6"; ctx.fill(); ctx.fillStyle = "#000"; ctx.font = `20px ${EMOJI_FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("🧑‍🌾", 0, 1); }
  ctx.restore();
}
