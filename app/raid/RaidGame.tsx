"use client";

import { useEffect, useRef, useState } from "react";
import { ARENA_H, ARENA_W, AWAKENINGS, BOSS_AT, xpForLevel, PLAYER, type AwakenId, type Evolution, type FloorDef, type WeaponStats } from "./data";
import { WORLD_H, WORLD_W, segmentHits, type Terrain } from "./terrain";
import { SPECIALS } from "./weapons";
import { AUX_WEAPONS, AWAKEN_META, CATEGORY_LABEL } from "./awakenings";
import { weaponArtUrl } from "./weaponArt";
import { chooseAwakening, createRaid, derived, raidResult, stepRaid, type FoodSlot, type Gear, type Input, type RaidResult, type RaidState } from "./engine";

const STEP = 1 / 60;
/** 터치 기기(손가락이 주 입력)면 모바일 조작(가상 스틱·자동 공격·버튼)을 쓴다(HUNTING_RAID.md 65절). */
const isTouchDevice = () => {
  if (typeof window === "undefined") return false;
  // 강제 설정(터치 노트북·테스트용): localStorage "wolru-raid-touch" = "on" | "off"
  try { const force = localStorage.getItem("wolru-raid-touch"); if (force === "on") return true; if (force === "off") return false; } catch { /* 저장소 없음 */ }
  return Boolean(window.matchMedia?.("(pointer: coarse)").matches);
};
/** 모바일 조작 중이면 캔버스 아래 HUD(회피·특수·음식 칸)를 생략한다. */
let compactHud = false;
const STICK_R = 54, STICK_DEAD = 10, AIM_TURN = (12 * Math.PI) / 180, MANUAL_AIM_HOLD = 1.2, SPECIAL_SLOW = 0.35, SPECIAL_SLOW_MAX = 1.2;
type Touchy = {
  stick: { id: number; x0: number; y0: number; x: number; y: number } | null;
  aim: { id: number } | null; manualUntil: number; aimAngle: number;
  special: { id: number; x0: number; y0: number; x: number; y: number; at: number } | null; fire: boolean;
};
/** 매 프레임: 자동 공격 조준(한 프레임 최대 12°씩 돌기), 수동 조준 우선 1.2초, 특수 공격 조준 중 감속. 반환값은 시간 배율. */
function mobileFrame(s: RaidState, nowSec: number, t: Touchy, input: Input, btn: HTMLButtonElement | null, dashBtn: HTMLButtonElement | null) {
  const p = s.player, px = p.x - s.cam.x, py = p.y - s.cam.y;
  let want: number | null = null;
  if (t.special && Math.hypot(t.special.x - t.special.x0, t.special.y - t.special.y0) > 20) want = Math.atan2(t.special.y - t.special.y0, t.special.x - t.special.x0);
  else if (t.aim || nowSec < t.manualUntil) want = Math.atan2(input.aimY - py, input.aimX - px);
  const target = autoTarget(s);
  if (want === null && target) want = Math.atan2(target.y - p.y, target.x - p.x);
  if (want !== null) { let d = want - t.aimAngle; d = Math.atan2(Math.sin(d), Math.cos(d)); t.aimAngle += Math.max(-AIM_TURN, Math.min(AIM_TURN, d)); }
  const far = target && !t.aim && !t.special ? Math.hypot(target.x - p.x, target.y - p.y) : 200;
  if (!t.aim || t.special) { input.aimX = px + Math.cos(t.aimAngle) * far; input.aimY = py + Math.sin(t.aimAngle) * far; }
  input.attack = Boolean(t.aim) || nowSec < t.manualUntil || Boolean(target);
  // 특수 공격 버튼 재사용 표시(리렌더 없이)
  if (btn) { const left = Math.max(0, s.special.readyAt - s.t), cd = s.evolution ? SPECIALS[s.evolution]?.cooldown ?? 1 : 1; btn.style.setProperty("--cd", String(s.evolution ? left / cd : 1)); btn.dataset.left = left > 0 ? String(Math.ceil(left)) : ""; btn.disabled = !s.evolution; }
  if (dashBtn) dashBtn.style.setProperty("--cd", String(p.dashCd / Math.max(0.1, PLAYER.dashCooldown)));
  return t.special && nowSec - t.special.at < SPECIAL_SLOW_MAX ? SPECIAL_SLOW : 1;
}
/** 자동 조준: 사거리 안·화면 안·벽에 안 막힌 적 중 가까운 적 우선(정예·보스·막타 가능은 조금 더 우선). */
function autoTarget(s: RaidState) {
  const p = s.player, reach = s.weapon.range + 30;
  let best: RaidState["monsters"][number] | null = null, score = Infinity;
  for (const m of s.monsters) {
    if (m.hp <= 0) continue;
    const sx = m.x - s.cam.x, sy = m.y - s.cam.y; if (sx < -20 || sy < -20 || sx > ARENA_W + 20 || sy > ARENA_H + 20) continue;
    const d = Math.hypot(m.x - p.x, m.y - p.y); if (d > reach + m.r) continue;
    if (segmentHits(s.terrain.walls, p.x, p.y, m.x, m.y)) continue;
    const sc = d - (m.boss || m.elite ? 40 : 0) - (m.hp <= s.weapon.damage ? 30 : 0);
    if (sc < score) { score = sc; best = m; }
  }
  return best;
}
const END_FX_MS = 2400;

// ---------- 타격 효과음(WebAudio로 짧게 합성, 파일 없음) ----------
const SFX_KEY = "wolru-raid-sfx";
let audio: AudioContext | null = null, lastHitSfx = 0, lastXpSfx = 0;
function readSfxOn() { try { return localStorage.getItem(SFX_KEY) !== "off"; } catch { return true; } }
function sfx(kind: "hit" | "crit" | "kill" | "big" | "xp") {
  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  audio ??= new AudioCtx();
  const ctx = audio, now = ctx.currentTime;
  if (kind === "hit" || kind === "crit") { if (now - lastHitSfx < 0.045) return; lastHitSfx = now; }
  if (kind === "xp") { if (now - lastXpSfx < 0.05) return; lastXpSfx = now; const o = ctx.createOscillator(), gn = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(1300 + Math.random() * 500, now); o.frequency.exponentialRampToValueAtTime(2100, now + 0.05); gn.gain.setValueAtTime(0.025, now); gn.gain.exponentialRampToValueAtTime(0.0001, now + 0.07); o.connect(gn); gn.connect(ctx.destination); o.start(now); o.stop(now + 0.08); return; }
  const out = ctx.createGain(); out.connect(ctx.destination);
  const vol = { hit: 0.05, crit: 0.08, kill: 0.06, big: 0.12 }[kind], len = { hit: 0.06, crit: 0.09, kill: 0.1, big: 0.28 }[kind];
  out.gain.setValueAtTime(vol, now); out.gain.exponentialRampToValueAtTime(0.0001, now + len);
  // 퍽: 짧은 잡음(필터) + 낮게 떨어지는 음
  const noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate), data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter();
  src.buffer = noise; filter.type = "lowpass"; filter.frequency.value = kind === "crit" ? 3200 : kind === "big" ? 900 : 1800;
  src.connect(filter); filter.connect(out); src.start(now);
  const osc = ctx.createOscillator(); osc.type = kind === "crit" ? "triangle" : "sine";
  const f0 = { hit: 220, crit: 520, kill: 300, big: 140 }[kind], f1 = { hit: 90, crit: 180, kill: 90, big: 40 }[kind];
  osc.frequency.setValueAtTime(f0, now); osc.frequency.exponentialRampToValueAtTime(f1, now + len);
  osc.connect(out); osc.start(now); osc.stop(now + len + 0.02);
}
const fmt = (sec: number) => { const s = Math.max(0, Math.ceil(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const EMOJI_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
const UI_FONT = '"Gowun Dodum", "Pretendard", sans-serif';

type Ui = { choices: AwakenId[] | null; paused: boolean; over: RaidState["over"]; level: number; picks: Partial<Record<AwakenId, number>> };
type Avatar = { src: string; pixelated: boolean };
type Art = { bg: HTMLCanvasElement; avatar: HTMLImageElement | null; pixelated: boolean; weapon?: HTMLImageElement };

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
  const holdRef = useRef(hold), speedRef = useRef(speed), finishRef = useRef(onFinish), doneRef = useRef(false), overAtRef = useRef(0);
  const [sfxOn, setSfxOn] = useState(readSfxOn), sfxOnRef = useRef(sfxOn);
  useEffect(() => { sfxOnRef.current = sfxOn; try { localStorage.setItem(SFX_KEY, sfxOn ? "on" : "off"); } catch { /* 저장 불가 */ } }, [sfxOn]);
  const [ui, setUi] = useState<Ui>({ choices: null, paused: false, over: null, level: 1, picks: {} });
  // 모바일 조작 상태(렌더와 상관없는 값은 ref로)
  const [touchMode] = useState(isTouchDevice), [portraitOk, setPortraitOk] = useState(false);
  const touchRef = useRef<Touchy>({ stick: null, aim: null, manualUntil: 0, aimAngle: 0, special: null, fire: false });
  const [stickView, setStickView] = useState<{ x0: number; y0: number; x: number; y: number } | null>(null);
  const specialBtnRef = useRef<HTMLButtonElement>(null), dashBtnRef = useRef<HTMLButtonElement>(null), overlayRef = useRef<HTMLDivElement>(null);
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
    const art: Art = { bg: paintWorld(stateRef.current.terrain), avatar: null, pixelated: avatar.pixelated };
    const img = new Image(); img.onload = () => { art.avatar = img; }; img.src = avatar.src;
    // 들고 있는 무기 그림(진화했으면 진화 그림)
    const wimg = new Image(); wimg.onload = () => { art.weapon = wimg; }; wimg.src = weaponArtUrl(stateRef.current.weapon.art ?? "raid-scythe");
    let raf = 0, last = performance.now(), acc = 0, uiKey = "";
    const heard = { ...stateRef.current.sfx };
    const frame = (now: number) => {
      const s = stateRef.current!;
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      s.paused = s.paused || holdRef.current;
      let slow = 1;
      if (touchMode) slow = mobileFrame(s, now / 1000, touchRef.current, inputRef.current, specialBtnRef.current, dashBtnRef.current);
      if (!s.over && !s.paused && !s.choices) {
        acc += dt * speedRef.current * slow;
        while (acc >= STEP) { stepRaid(s, STEP, inputRef.current); acc -= STEP; if (touchRef.current.fire) { touchRef.current.fire = false; inputRef.current.special = false; } if (s.over || s.choices) { acc = 0; break; } }
      } else { acc = 0; stepRaid(s, 0, inputRef.current); }
      // 이번 프레임에 생긴 타격만큼 소리(가장 센 것 하나)
      if (sfxOnRef.current && !holdRef.current) { const f = s.sfx; const kind = f.big > heard.big ? "big" : f.crit > heard.crit ? "crit" : f.kill > heard.kill ? "kill" : f.hit > heard.hit ? "hit" : null; if (kind) sfx(kind); if (f.xp > heard.xp) sfx("xp"); }
      Object.assign(heard, s.sfx);
      draw(ctx, s, art, now / 1000, petIcon);
      if (s.over && overAtRef.current) drawEnd(ctx, s, art, Math.min(1, (now - overAtRef.current) / END_FX_MS), now / 1000);
      const key = `${s.choices?.join(",") ?? ""}|${s.paused}|${s.over ?? ""}`;
      if (key !== uiKey) { uiKey = key; setUi({ choices: s.choices ? [...s.choices] : null, paused: s.paused, over: s.over, level: s.level, picks: { ...s.picks } }); }
      // 끝나면 바로 넘기지 않고 쓰러짐·성공 연출을 2.4초 보여 준다(결과 보기로 건너뛸 수 있음).
      if (s.over && !doneRef.current) {
        if (!overAtRef.current) overAtRef.current = now;
        if (now - overAtRef.current >= END_FX_MS) { doneRef.current = true; finishRef.current(raidResult(s)); }
      }
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

  // ---------- 모바일 조작 ----------
  const capture = (event: React.PointerEvent) => { try { (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); } catch { /* 이미 끝난 포인터 */ } };
  const overlayPoint = (event: React.PointerEvent) => { const r = overlayRef.current!.getBoundingClientRect(); return { x: event.clientX - r.left, y: event.clientY - r.top, w: r.width, h: r.height }; };
  const canvasLogical = (clientX: number, clientY: number) => { const r = canvasRef.current!.getBoundingClientRect(); return { x: ((clientX - r.left) / r.width) * ARENA_W, y: ((clientY - r.top) / r.height) * ARENA_H }; };
  const releaseAll = () => { const t = touchRef.current; t.stick = null; t.aim = null; t.special = null; setStickView(null); const input = inputRef.current; input.moveX = 0; input.moveY = 0; input.attack = false; input.dash = false; };
  const onTouchDown = (event: React.PointerEvent) => {
    const t = touchRef.current, pt = overlayPoint(event); capture(event);
    if (pt.x < pt.w * 0.45 && !t.stick) { t.stick = { id: event.pointerId, x0: pt.x, y0: pt.y, x: pt.x, y: pt.y }; setStickView({ ...t.stick }); return; }
    if (!t.aim) { t.aim = { id: event.pointerId }; const l = canvasLogical(event.clientX, event.clientY); inputRef.current.aimX = l.x; inputRef.current.aimY = l.y; }
  };
  const onTouchMove = (event: React.PointerEvent) => {
    const t = touchRef.current, pt = overlayPoint(event), input = inputRef.current;
    if (t.stick?.id === event.pointerId) {
      let dx = pt.x - t.stick.x0, dy = pt.y - t.stick.y0; const d = Math.hypot(dx, dy);
      if (d > STICK_R) { dx *= STICK_R / d; dy *= STICK_R / d; }
      t.stick.x = t.stick.x0 + dx; t.stick.y = t.stick.y0 + dy; setStickView({ ...t.stick });
      const mag = d < STICK_DEAD ? 0 : Math.min(1, (Math.min(d, STICK_R) - STICK_DEAD) / (STICK_R - STICK_DEAD));
      input.moveX = d ? (dx / Math.min(d, STICK_R)) * mag : 0; input.moveY = d ? (dy / Math.min(d, STICK_R)) * mag : 0;
    } else if (t.aim?.id === event.pointerId) { const l = canvasLogical(event.clientX, event.clientY); input.aimX = l.x; input.aimY = l.y; }
  };
  const onTouchUp = (event: React.PointerEvent) => {
    const t = touchRef.current;
    if (t.stick?.id === event.pointerId) { t.stick = null; setStickView(null); inputRef.current.moveX = 0; inputRef.current.moveY = 0; }
    if (t.aim?.id === event.pointerId) { t.aim = null; t.manualUntil = performance.now() / 1000 + MANUAL_AIM_HOLD; }
  };
  const onSpecialDown = (event: React.PointerEvent) => { event.stopPropagation(); capture(event); touchRef.current.special = { id: event.pointerId, x0: event.clientX, y0: event.clientY, x: event.clientX, y: event.clientY, at: performance.now() / 1000 }; };
  const onSpecialMove = (event: React.PointerEvent) => { const sp = touchRef.current.special; if (sp?.id === event.pointerId) { sp.x = event.clientX; sp.y = event.clientY; } };
  const onSpecialUp = (event: React.PointerEvent) => {
    const t = touchRef.current, sp = t.special; if (!sp || sp.id !== event.pointerId) return;
    t.special = null;
    if (sp.y - sp.y0 > 100) return; // 아래로 100px 이상 끌고 놓으면 취소
    const s = stateRef.current; if (!s) return;
    // 끌었으면 그 방향, 아니면 자동 조준 대상 쪽으로
    const p = s.player, px = p.x - s.cam.x, py = p.y - s.cam.y, dragged = Math.hypot(sp.x - sp.x0, sp.y - sp.y0) > 20;
    const tg = dragged ? null : autoTarget(s), ang = dragged ? Math.atan2(sp.y - sp.y0, sp.x - sp.x0) : tg ? Math.atan2(tg.y - p.y, tg.x - p.x) : t.aimAngle;
    const reach = tg ? Math.hypot(tg.x - p.x, tg.y - p.y) : 220;
    t.aimAngle = ang; inputRef.current.aimX = px + Math.cos(ang) * reach; inputRef.current.aimY = py + Math.sin(ang) * reach;
    inputRef.current.special = true; t.fire = true; t.manualUntil = performance.now() / 1000 + 0.3;
  };
  const tapFood = (i: number) => { const input = inputRef.current, next = [...input.food] as Input["food"]; next[i] = true; input.food = next; window.setTimeout(() => { const off = [...inputRef.current.food] as Input["food"]; off[i] = false; inputRef.current.food = off; }, 120); };
  useEffect(() => {
    compactHud = touchMode;
    if (!touchMode) return;
    // 전투 중에는 뒤 페이지가 스크롤·확대되지 않게
    const prevOverflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    const off = () => releaseAll();
    window.addEventListener("blur", off); window.addEventListener("orientationchange", off); document.addEventListener("visibilitychange", off);
    return () => { document.body.style.overflow = prevOverflow; window.removeEventListener("blur", off); window.removeEventListener("orientationchange", off); document.removeEventListener("visibilitychange", off); };
  }, [touchMode]);

  const toLogical = (event: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    inputRef.current.aimX = ((event.clientX - r.left) / r.width) * ARENA_W;
    inputRef.current.aimY = ((event.clientY - r.top) / r.height) * ARENA_H;
  };
  const resume = () => { const s = stateRef.current; if (s && !holdRef.current) s.paused = false; };
  const choose = (id: AwakenId) => { const s = stateRef.current; if (s) chooseAwakening(s, id); };
  const quit = () => { const s = stateRef.current; if (!s || doneRef.current) return; doneRef.current = true; onQuit({ ...raidResult(s), abandoned: true }); };

  return <div className={`raid-game ${touchMode ? "touch" : ""}`}>
    <canvas ref={canvasRef} className="raid-canvas" style={{ aspectRatio: `${ARENA_W} / ${ARENA_H}` }}
      onPointerMove={toLogical}
      onPointerDown={event => { if (touchMode) return; toLogical(event); if (event.button === 0) { inputRef.current.attack = true; (event.target as HTMLElement).setPointerCapture(event.pointerId); } else if (event.button === 2) inputRef.current.special = true; }}
      onPointerUp={event => { if (event.button === 2) inputRef.current.special = false; else inputRef.current.attack = false; }}
      onPointerLeave={() => { inputRef.current.attack = false; }}
      onContextMenu={event => event.preventDefault()} />
    {touchMode && !ui.over && <div className="raid-touch" ref={overlayRef} onPointerDown={onTouchDown} onPointerMove={onTouchMove} onPointerUp={onTouchUp} onPointerCancel={releaseAll}>
      {stickView ? <span className="raid-stick" style={{ left: stickView.x0, top: stickView.y0 }}><i style={{ transform: `translate(${stickView.x - stickView.x0}px, ${stickView.y - stickView.y0}px)` }} /></span> : <span className="raid-stick idle"><i /></span>}
      <div className="raid-touch-foods">{foods.map((f, i) => f && <button key={i} onPointerDown={event => { event.stopPropagation(); tapFood(i); }} aria-label={`${f.name} 먹기`}>{f.icon}</button>)}
        <button className="raid-touch-pause" onPointerDown={event => { event.stopPropagation(); const s = stateRef.current; if (s && !s.over) s.paused = true; }} aria-label="일시정지">⏸</button></div>
      <button ref={dashBtnRef} className="raid-touch-dash" onPointerDown={event => { event.stopPropagation(); inputRef.current.dash = true; }} onPointerUp={() => { inputRef.current.dash = false; }} onPointerCancel={() => { inputRef.current.dash = false; }} aria-label="회피">💨</button>
      <button ref={specialBtnRef} className="raid-touch-special" onPointerDown={onSpecialDown} onPointerMove={onSpecialMove} onPointerUp={onSpecialUp} onPointerCancel={() => { touchRef.current.special = null; }} aria-label="특수 공격">{evolution ? SPECIALS[evolution]?.icon ?? "✨" : "🔒"}</button>
    </div>}
    {touchMode && !portraitOk && !ui.over && <div className="raid-rotate"><b>📱↻ 가로로 돌려 주세요</b><small>토벌탑은 가로 화면에서 가장 잘 보여요. 돌리는 동안 전투가 멈춰요.</small><button onClick={() => setPortraitOk(true)}>세로로 그냥 할게요</button></div>}
    {ui.choices && <div className="raid-overlay"><div className="raid-choices">
      <span className="raid-ov-eyebrow">AWAKENING</span><b>⚔️ 전투 각성 Lv.{ui.level}</b><small>하나를 고르세요 · 고르는 동안 전투가 멈춰요</small>
      <div>{ui.choices.map((id, i) => { const meta = AWAKEN_META[id], cat = meta ? CATEGORY_LABEL[meta.cat] : null;
        return <button key={id} onClick={() => choose(id)} className={`${AWAKENINGS[id].final ? "final" : ""} ${meta ? `tier-${meta.tier} cat-${meta.cat}` : ""}`} style={{ animationDelay: `${i * 0.06}s` }}>
        <i>{AWAKENINGS[id].final ? "✨" : cat?.icon ?? "♾️"}</i>{cat && <small className="aw-cat">{cat.name}{meta!.tier === "advanced" ? " · 고급" : meta!.tier === "rare" ? " · 희귀" : ""}</small>}<strong>{AWAKENINGS[id].name}</strong>{(ui.picks[id] ?? 0) > 0 && <em>{AWAKENINGS[id].max >= 999 ? `×${(ui.picks[id] ?? 0) + 1}` : `${(ui.picks[id] ?? 0) + 1}단계`}</em>}<span>{AWAKENINGS[id].text}</span>
      </button>; })}</div>
    </div></div>}
    {!ui.over && <button className="raid-sfx" onClick={() => setSfxOn(on => !on)} title="타격 효과음">{sfxOn ? "🔊" : "🔇"}</button>}
    {!touchMode && !ui.over && !ui.choices && !ui.paused && <button className="raid-giveup" onClick={() => { if (window.confirm("도전을 포기할까요? 사용한 음식만 사라져요.")) quit(); }}>🏳 포기</button>}
    {ui.over && <div className="raid-end-skip"><button onClick={() => { const s = stateRef.current; if (s && !doneRef.current) { doneRef.current = true; finishRef.current(raidResult(s)); } }}>결과 보기 ▶</button></div>}
    {ui.paused && !ui.over && !ui.choices && <div className="raid-overlay"><div className="raid-pause"><span className="raid-ov-eyebrow">PAUSED</span><b>⏸ 일시정지</b><small>P 또는 계속하기를 누르면 이어서 싸워요</small><button className="save-button" onClick={resume}>▶ 계속하기</button><button className="ghost-button" onClick={quit}>🏳 도전 포기 (사용한 음식만 소모)</button></div></div>}
  </div>;
}

// ---------- 월드 배경(지형 포함, 한 번만 그려 둔다) ----------
function paintWorld(T: Terrain) {
  const c = document.createElement("canvas"); c.width = WORLD_W; c.height = WORLD_H;
  const g = c.getContext("2d")!, canal = T.zone === "canal";
  let seed = (T.seed % 9973) + 3; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const base = g.createRadialGradient(WORLD_W / 2, WORLD_H / 2, 100, WORLD_W / 2, WORLD_H / 2, 1000);
  if (canal) { base.addColorStop(0, "#94b9ad"); base.addColorStop(1, "#5b7f78"); } else { base.addColorStop(0, "#b8dc8f"); base.addColorStop(1, "#86b562"); }
  g.fillStyle = base; g.fillRect(0, 0, WORLD_W, WORLD_H);
  if (canal) {
    for (let i = 0; i < 220; i++) { g.fillStyle = `rgba(40,60,60,${0.1 + r() * 0.12})`; g.beginPath(); g.ellipse(r() * WORLD_W, r() * WORLD_H, 6 + r() * 14, 4 + r() * 8, r() * 3, 0, Math.PI * 2); g.fill(); }
    for (let i = 0; i < 120; i++) { g.fillStyle = "rgba(120,170,110,.35)"; g.fillRect(r() * WORLD_W, r() * WORLD_H, 2, 6 + r() * 6); }
  } else {
    for (let i = 0; i < 900; i++) { const x = r() * WORLD_W, y = r() * WORLD_H; g.strokeStyle = `rgba(60,110,40,${0.22 + r() * 0.25})`; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y - 7); g.moveTo(x, y); g.lineTo(x + 2, y - 6); g.stroke(); }
    const petals = ["#fff6d0", "#ffd84a", "#f7a8c8", "#ffffff"];
    for (let i = 0; i < 220; i++) { const x = r() * WORLD_W, y = r() * WORLD_H; g.fillStyle = petals[i % petals.length]; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + Math.cos(k * 1.57) * 2.5, y + Math.sin(k * 1.57) * 2.5, 2, 0, Math.PI * 2); g.fill(); } }
  }
  // 긴 풀: 진한 풀 무더기
  for (const a of T.grass) { g.fillStyle = "rgba(70,130,50,.45)"; roundRect(g, a.x, a.y, a.w, a.h, 26); g.fill(); g.strokeStyle = "rgba(40,90,30,.55)"; g.lineWidth = 2; for (let i = 0; i < a.w * a.h / 260; i++) { const x = a.x + r() * a.w, y = a.y + r() * a.h; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y - 12); g.moveTo(x, y); g.lineTo(x + 3, y - 11); g.stroke(); } }
  // 진흙
  for (const a of T.mud) { g.fillStyle = "rgba(120,85,50,.55)"; roundRect(g, a.x, a.y, a.w, a.h, 30); g.fill(); g.fillStyle = "rgba(90,60,35,.5)"; for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(a.x + r() * a.w, a.y + r() * a.h, 8, 4, 0, 0, Math.PI * 2); g.fill(); } }
  // 바람길: 옅은 띠와 화살표
  for (const a of T.wind) { g.fillStyle = "rgba(255,255,255,.12)"; roundRect(g, a.x, a.y, a.w, a.h, 20); g.fill(); g.strokeStyle = "rgba(255,255,255,.5)"; g.lineWidth = 2; for (let i = 0; i < 5; i++) { const x = a.x + 30 + i * (a.w - 60) / 4, y = a.y + a.h / 2; g.beginPath(); g.moveTo(x - a.dx * 14 - a.dy * 8, y - a.dy * 14 + a.dx * 8); g.lineTo(x + a.dx * 10, y + a.dy * 10); g.lineTo(x - a.dx * 14 + a.dy * 8, y - a.dy * 14 - a.dx * 8); g.stroke(); } }
  // 얕은 물
  for (const a of T.shallow) { g.fillStyle = "rgba(110,170,210,.35)"; roundRect(g, a.x, a.y, a.w, a.h, 34); g.fill(); g.strokeStyle = "rgba(220,240,255,.4)"; g.lineWidth = 1.5; for (let i = 0; i < 6; i++) { const x = a.x + 20 + r() * (a.w - 40), y = a.y + 15 + r() * (a.h - 30); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - 4, x + 20, y); g.stroke(); } }
  // 깊은 물(진입 불가)과 돌다리
  for (const a of T.deep) { const w = g.createLinearGradient(0, a.y, 0, a.y + a.h); w.addColorStop(0, "#3d7aa6"); w.addColorStop(0.5, "#2b5f88"); w.addColorStop(1, "#3d7aa6"); g.fillStyle = w; g.fillRect(a.x, a.y, a.w, a.h); g.strokeStyle = "rgba(255,255,255,.22)"; g.lineWidth = 2; for (let i = 0; i < a.w / 40; i++) { const x = a.x + r() * a.w, y = a.y + 10 + r() * (a.h - 20); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 14, y - 5, x + 28, y); g.stroke(); } }
  for (const b of T.bridges) { g.fillStyle = "#a89a84"; g.fillRect(b.x, b.y, b.w, b.h); g.strokeStyle = "#7d705c"; g.lineWidth = 2; for (let y = b.y + 8; y < b.y + b.h; y += 16) { g.beginPath(); g.moveTo(b.x, y); g.lineTo(b.x + b.w, y); g.stroke(); } g.strokeStyle = "#5c5140"; g.lineWidth = 4; g.strokeRect(b.x, b.y, b.w, b.h); }
  // 전도성 웅덩이
  for (const u of T.puddles) { g.fillStyle = "rgba(90,150,210,.45)"; g.beginPath(); g.arc(u.x, u.y, u.r, 0, Math.PI * 2); g.fill(); g.strokeStyle = "rgba(255,240,120,.7)"; g.setLineDash([6, 5]); g.lineWidth = 2; g.stroke(); g.setLineDash([]); g.font = "18px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#ffe36a"; g.fillText("⚡", u.x, u.y); }
  // 돌담
  for (const a of T.walls) { g.fillStyle = "#8a8578"; roundRect(g, a.x, a.y, a.w, a.h, 6); g.fill(); g.fillStyle = "#a8a294"; for (let x = a.x + 2; x < a.x + a.w - 4; x += 18) for (let y = a.y + 2; y < a.y + a.h - 4; y += 11) g.fillRect(x + ((y - a.y) % 22 ? 9 : 0) % 18, y, 15, 8); g.strokeStyle = "#5e594e"; g.lineWidth = 2; roundRect(g, a.x, a.y, a.w, a.h, 6); g.stroke(); }
  // 월드 가장자리
  g.strokeStyle = "rgba(40,30,20,.6)"; g.lineWidth = 10; g.strokeRect(0, 0, WORLD_W, WORLD_H);
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

/** Evolution specials deliberately use different silhouettes, colors and motion. */
function drawSpecialCast(ctx: CanvasRenderingContext2D, s: RaidState, clock: number) {
  const evo = s.evolution, age = s.t - s.special.castAt;
  if (!evo || age < 0 || age > 2.2) return;
  const p = s.player, tx = s.special.castX, ty = s.special.castY, aim = s.special.castAim;
  const fade = Math.max(0, 1 - age / 2.2), pulse = 0.5 + Math.sin(clock * 18) * 0.5;
  const ring = (x: number, y: number, r: number, color: string, width = 5) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); };
  const ray = (x: number, y: number, len: number, width: number, color: string) => { ctx.save(); ctx.translate(x, y); ctx.rotate(aim); const g = ctx.createLinearGradient(0, 0, len, 0); g.addColorStop(0, "rgba(255,255,255,.9)"); g.addColorStop(1, color); ctx.fillStyle = g; roundRect(ctx, 0, -width / 2, len, width, width / 2); ctx.fill(); ctx.restore(); };
  const arrow = (x: number, y: number, angle: number, length: number, color: string, glow = 0) => { ctx.save(); ctx.translate(x, y); ctx.rotate(angle); if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; } ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = Math.max(2, length / 22); ctx.beginPath(); ctx.moveTo(-length * .65, 0); ctx.lineTo(length * .45, 0); ctx.stroke(); ctx.beginPath(); ctx.moveTo(length * .65, 0); ctx.lineTo(length * .35, -length * .16); ctx.lineTo(length * .35, length * .16); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(-length * .5, 0); ctx.lineTo(-length * .72, -length * .18); ctx.moveTo(-length * .5, 0); ctx.lineTo(-length * .72, length * .18); ctx.stroke(); ctx.restore(); };
  ctx.save(); ctx.globalAlpha = Math.min(1, age * 8) * fade;
  switch (evo) {
    case "great-scythe": ray(p.x, p.y, 440, 18 + pulse * 18, "rgba(210,55,70,0)"); break;
    case "harvest-blade": for (let i = 0; i < 3; i++) ring(p.x, p.y, 65 + i * 34 + (age * 95) % 34, `rgba(125,220,95,${.8 - i * .18})`, 7); break;
    case "quake-hammer": { const impact = .45, slam = Math.min(1, age / impact), ix = p.x + Math.cos(aim) * 58, iy = p.y + Math.sin(aim) * 58; ctx.save(); ctx.translate(ix, iy - (1 - slam) * 85); ctx.rotate(aim + Math.PI / 2); ctx.fillStyle = "#504238"; ctx.strokeStyle = "#f0a54a"; ctx.lineWidth = 5; roundRect(ctx, -27, -18, 54, 36, 7); ctx.fill(); ctx.stroke(); ctx.restore(); if (age >= impact) { const wave = Math.min(1, (age - impact) * 2.2); ring(ix, iy, 35 + wave * 180, `rgba(255,165,65,${1 - wave})`, 12 - wave * 7); for (let i = -2; i <= 2; i++) { const a = aim + i * .18, len = 90 + wave * 260; ctx.strokeStyle = `rgba(255,190,90,${1 - wave * .8})`; ctx.lineWidth = 7 - Math.abs(i); ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ix + Math.cos(a) * len * .45, iy + Math.sin(a) * len * .45); ctx.lineTo(ix + Math.cos(a + i * .08) * len, iy + Math.sin(a + i * .08) * len); ctx.stroke(); } } break; }
    case "rock-crusher": { for (let i = 0; i < 5; i++) { const a = i * 2.4, delay = i * .12, fall = Math.max(0, Math.min(1, (age - delay) / .48)), bx = tx + Math.cos(a) * (28 + i * 10), groundY = ty + Math.sin(a) * (28 + i * 8), by = groundY - (1 - fall) * 230; ctx.save(); ctx.globalAlpha *= Math.min(1, fall * 5); ctx.fillStyle = "rgba(30,20,12,.35)"; ctx.beginPath(); ctx.ellipse(bx, groundY + 7, 24 - fall * 7, 9 - fall * 2, 0, 0, Math.PI * 2); ctx.fill(); const rg = ctx.createRadialGradient(bx - 7, by - 8, 2, bx, by, 24); rg.addColorStop(0, "#dec28c"); rg.addColorStop(1, "#58483b"); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(bx, by, 16 + i * 1.5, 0, Math.PI * 2); ctx.fill(); ctx.restore(); if (fall >= 1) ring(bx, groundY, 18 + ((age - delay - .48) * 90) % 52, "rgba(225,180,105,.72)", 5); } break; }
    case "water-cannon": ray(p.x, p.y, 510, 26 + pulse * 16, "rgba(60,175,255,0)"); break;
    case "frost-sprayer": ring(tx, ty, 145 + pulse * 8, "#d9f7ff", 7); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + age; ray(tx + Math.cos(a) * 80, ty + Math.sin(a) * 80, 24, 3, "rgba(210,250,255,0)"); } break;
    case "toxic-sprayer": ring(tx, ty, 115 + pulse * 10, "#91e34c", 8); ring(tx, ty, 60 + pulse * 18, "#b46ce0", 5); break;
    case "seed-launcher": for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2; ring(tx + Math.cos(a) * 55, ty + Math.sin(a) * 55, 20 + pulse * 14, "#f2b83f", 6); } break;
    case "trident": { for (let i = -1; i <= 1; i++) { ctx.save(); ctx.translate(-Math.sin(aim) * i * 16, Math.cos(aim) * i * 16); ray(p.x, p.y, 530, 5, "rgba(70,225,235,0)"); ctx.restore(); } break; }
    case "chain-harpoon": { ctx.strokeStyle = "#d7d3c5"; ctx.lineWidth = 5; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]); ring(tx, ty, 24 + pulse * 8, "#e7c36a", 5); break; }
    case "thunder-rod": { ctx.strokeStyle = "#fff16a"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(tx - 20, ty - 180); for (let i = 1; i <= 6; i++) ctx.lineTo(tx + (i % 2 ? 22 : -18), ty - 180 + i * 30); ctx.stroke(); ring(tx, ty, 45 + pulse * 25, "#8be8ff", 4); break; }
    case "net-launcher": ring(tx, ty, 165, "#eee1bf", 3); for (let i = -4; i <= 4; i++) { ctx.strokeStyle = "rgba(238,225,191,.65)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx - 130, ty + i * 25); ctx.lineTo(tx + 130, ty + i * 25); ctx.stroke(); } break;
    case "longbow": { const charge = Math.min(1, age / .55); ring(p.x, p.y, 48 - charge * 20, `rgba(255,226,90,${.35 + charge * .65})`, 3 + charge * 4); if (age < .55) { for (let i = 0; i < 7; i++) { const a = i * Math.PI * 2 / 7 + clock; ring(p.x + Math.cos(a) * (64 - charge * 44), p.y + Math.sin(a) * (64 - charge * 44), 2 + pulse * 2, "#fff3a6", 3); } } else { const travel = Math.min(1, (age - .55) * 2.3), ax = p.x + Math.cos(aim) * 650 * travel, ay = p.y + Math.sin(aim) * 650 * travel; ctx.strokeStyle = "rgba(255,235,120,.55)"; ctx.lineWidth = 14 * (1 - travel * .55); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(ax, ay); ctx.stroke(); arrow(ax, ay, aim, 72, "#fff7c2", 22); for (let i = 0; i < 3; i++) arrow(ax - Math.cos(aim) * (35 + i * 24), ay - Math.sin(aim) * (35 + i * 24), aim, 24 - i * 4, `rgba(255,220,80,${.75 - i * .18})`); } break; }
    case "rapid-bow": { for (let i = 0; i < 10; i++) { const delay = i * .1, travel = Math.max(0, Math.min(1, (age - delay) * 2.6)); if (travel <= 0 || travel >= 1) continue; const spread = (i - 4.5) * .045, a = aim + spread + Math.sin(i * 7) * .018, side = (i % 2 ? 1 : -1) * (6 + (i % 3) * 5), ax = p.x - Math.sin(aim) * side + Math.cos(a) * 560 * travel, ay = p.y + Math.cos(aim) * side + Math.sin(a) * 560 * travel; arrow(ax, ay, a, 34, i % 3 === 0 ? "#fff5ad" : "#b9ef72", 8); } if (age < 1.15) { ctx.strokeStyle = `rgba(185,239,114,${.45 * fade})`; ctx.lineWidth = 2; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(p.x - Math.sin(aim) * i * 7, p.y + Math.cos(aim) * i * 7); ctx.lineTo(p.x + Math.cos(aim) * 110, p.y + Math.sin(aim) * 110); ctx.stroke(); } } break; }
    case "rifle": ray(p.x, p.y, 740, 4 + pulse * 3, "rgba(255,90,45,0)"); ring(p.x, p.y, 20 + pulse * 18, "#ffb14a", 4); break;
    case "siege-crossbow": { const travel = Math.min(1, age * 2.5), x = p.x + Math.cos(aim) * 420 * travel, y = p.y + Math.sin(aim) * 420 * travel; ring(x, y, 24 + pulse * 12, "#ff8345", 7); break; }
    case "twin-blades": for (let i = 0; i < 4; i++) { const a = aim + i * Math.PI / 2 + age * 8; ctx.strokeStyle = i % 2 ? "#69e4ff" : "#ffffff"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(p.x, p.y, 45 + i * 14, a, a + 1.2); ctx.stroke(); } break;
    case "greatsword": ring(p.x, p.y, 38 + pulse * 16, "#8fb8ff", 8); ring(p.x, p.y, 65 + pulse * 8, "rgba(255,255,255,.7)", 3); break;
  }
  ctx.restore();
}

// ---------- 그리기 ----------
function draw(ctx: CanvasRenderingContext2D, s: RaidState, art: Art, clock: number, petIcon = "") {
  const W = ARENA_W, H = ARENA_H, p = s.player, d = derived(s), cam = s.cam, T = s.terrain;
  ctx.fillStyle = "#2a2418"; ctx.fillRect(0, 0, W, H);
  const sh = s.shake > 0 ? s.shake : 0;
  ctx.save(); ctx.translate(-Math.round(cam.x) + (sh ? (Math.random() - 0.5) * sh * 2 : 0), -Math.round(cam.y) + (sh ? (Math.random() - 0.5) * sh * 2 : 0));
  ctx.drawImage(art.bg, 0, 0);
  // 수문(닫힘·곧 바뀜 예고)
  const gateSoon = T.gates.some(g => g.moving) && 45 - (s.t % 45) < 2;
  for (const g of T.gates) {
    if (g.closed) { ctx.fillStyle = "#6b4a2a"; ctx.fillRect(g.rect.x, g.rect.y, g.rect.w, g.rect.h); ctx.strokeStyle = "#3a2614"; ctx.lineWidth = 3; ctx.strokeRect(g.rect.x, g.rect.y, g.rect.w, g.rect.h); }
    if (gateSoon) { ctx.strokeStyle = `rgba(255,200,60,${0.5 + 0.5 * Math.sin(clock * 12)})`; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.strokeRect(g.rect.x - 4, g.rect.y - 4, g.rect.w + 8, g.rect.h + 8); ctx.setLineDash([]); }
  }
  // 꽃가루 꽃(폭발 전)과 기회 지형
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const f of T.flowers) if (!f.exploded) { ctx.fillStyle = "#000"; ctx.font = `${22 + f.hits * 3}px ${EMOJI_FONT}`; ctx.fillText("🌼", f.x, f.y + Math.sin(clock * 3 + f.x) * 1.5); }
  if (T.chance && !T.chance.used) {
    const ch = T.chance, glow = 0.5 + 0.5 * Math.sin(clock * 4);
    ctx.beginPath(); ctx.arc(ch.x, ch.y, ch.r + 6 + glow * 4, 0, Math.PI * 2); ctx.fillStyle = T.zone === "field" ? `rgba(255,216,74,${0.18 + glow * 0.15})` : `rgba(150,230,255,${0.2 + glow * 0.12})`; ctx.fill();
    ctx.fillStyle = "#000"; ctx.font = `${T.zone === "field" ? 30 : 34}px ${EMOJI_FONT}`; ctx.fillText(T.zone === "field" ? "🌻" : "⛲", ch.x, ch.y);
  }
  // 정예 예고(바닥 표시)
  for (const w of s.warns) { const left = w.at - s.t; ctx.beginPath(); ctx.arc(w.x, w.y, 30, 0, Math.PI * 2); ctx.strokeStyle = `rgba(240,150,40,${0.5 + 0.5 * Math.sin(clock * 10)})`; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = "#f0a030"; ctx.font = "800 16px sans-serif"; ctx.fillText(`! ${Math.ceil(left)}`, w.x, w.y); }

  // 장판·예고(색 + 점선/실선 모양으로 구분)
  const pulse = 0.5 + 0.5 * Math.sin(clock * 10);
  for (const z of s.zones) {
    ctx.save();
    if (z.kind === "line") {
      ctx.fillStyle = z.tele > 0 ? `rgba(220,60,40,${0.12 + pulse * 0.12})` : "rgba(255,120,60,.55)"; ctx.fillRect(z.x, z.y - z.r, z.len ?? W, z.r * 2);
      ctx.setLineDash([12, 8]); ctx.strokeStyle = "#ff6b4a"; ctx.lineWidth = 2; ctx.strokeRect(z.x, z.y - z.r, z.len ?? W, z.r * 2);
    } else {
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
      if (z.tele > 0) { ctx.fillStyle = `rgba(220,60,40,${0.1 + pulse * 0.14})`; ctx.fill(); ctx.setLineDash([9, 6]); ctx.strokeStyle = "#ff6b4a"; ctx.lineWidth = 2.5; ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = "#c0392b"; ctx.font = `bold 16px ${EMOJI_FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(z.kind === "bolt" ? "⚡" : "!", z.x, z.y); }
      else if (z.kind === "pollen") { const g = ctx.createRadialGradient(z.x, z.y, 4, z.x, z.y, z.r); g.addColorStop(0, "rgba(255,230,90,.55)"); g.addColorStop(1, "rgba(240,200,60,.2)"); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = "rgba(200,160,30,.8)"; ctx.lineWidth = 2; ctx.stroke(); }
      else if (z.kind === "puddle") { const g = ctx.createRadialGradient(z.x, z.y, 4, z.x, z.y, z.r); g.addColorStop(0, "rgba(90,160,220,.45)"); g.addColorStop(1, "rgba(60,120,190,.22)"); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = "rgba(200,235,255,.5)"; ctx.lineWidth = 2; ctx.stroke(); }
      else if (z.kind === "pbomb") { ctx.strokeStyle = "#e0a030"; ctx.setLineDash([5, 4]); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = "#000"; ctx.font = `16px ${EMOJI_FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("🧴", z.x, z.y); }
      else if (z.kind === "frost") { ctx.fillStyle = `rgba(190,235,255,${0.25 + pulse * 0.1})`; ctx.fill(); ctx.strokeStyle = "rgba(230,250,255,.9)"; ctx.lineWidth = 2; ctx.stroke(); }
      else if (z.kind === "poison") { ctx.fillStyle = `rgba(120,200,60,${0.25 + pulse * 0.1})`; ctx.fill(); ctx.strokeStyle = "rgba(80,160,40,.8)"; ctx.lineWidth = 2; ctx.stroke(); }
      else if (z.kind === "net") { ctx.strokeStyle = "rgba(240,230,200,.8)"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.save(); ctx.clip(); for (let k = -z.r; k <= z.r; k += 14) { ctx.beginPath(); ctx.moveTo(z.x + k, z.y - z.r); ctx.lineTo(z.x + k, z.y + z.r); ctx.moveTo(z.x - z.r, z.y + k); ctx.lineTo(z.x + z.r, z.y + k); ctx.stroke(); } ctx.restore(); }
      else if (z.kind === "rain" || z.kind === "blast") { ctx.fillStyle = "rgba(255,230,150,.45)"; ctx.fill(); }
      else if (z.kind === "spray") { ctx.fillStyle = `rgba(120,200,255,${0.12 + pulse * 0.08})`; ctx.fill(); ctx.setLineDash([3, 6]); ctx.strokeStyle = "rgba(170,225,255,.8)"; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); }
      else if (z.kind === "shock") { ctx.fillStyle = `rgba(140,230,255,${0.35 + pulse * 0.3})`; ctx.fill(); ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3; ctx.stroke(); }
      else { ctx.fillStyle = "rgba(255,245,150,.85)"; ctx.fill(); }
    }
    ctx.restore();
  }
  // 경험치 구슬
  for (const o of s.orbs) if (o.heal) { ctx.fillStyle = "#000"; ctx.font = `18px ${EMOJI_FONT}`; ctx.textAlign = "center"; ctx.fillText("🍖", o.x, o.y); ctx.textAlign = "left"; }
  // 경험치 보석: 크기·색은 값에 따라(초록 → 파랑 → 보라), 빛나는 테두리 + 날아오는 흔적
  for (const o of s.orbs) {
    if (o.heal) continue;
    const r = 4.5 + Math.min(4, o.xp * 0.9), col = o.xp >= 4 ? "#c38bff" : o.xp >= 2 ? "#58b8ff" : "#3fd47a";
    if (o.px !== undefined && o.py !== undefined && (o.px !== o.x || o.py !== o.y)) { const tx = o.x + (o.px - o.x) * 3.5, ty = o.y + (o.py - o.y) * 3.5; const tg = ctx.createLinearGradient(o.x, o.y, tx, ty); tg.addColorStop(0, col); tg.addColorStop(1, "rgba(255,255,255,0)"); ctx.strokeStyle = tg; ctx.lineWidth = r * 1.3; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.lineCap = "butt"; }
    ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(clock * 3 + o.x * 0.01);
    ctx.shadowColor = col; ctx.shadowBlur = 10; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, -r * 1.25); ctx.lineTo(r, 0); ctx.lineTo(0, r * 1.25); ctx.lineTo(-r, 0); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.beginPath(); ctx.moveTo(0, -r * 0.7); ctx.lineTo(r * 0.4, -r * 0.1); ctx.lineTo(0, r * 0.2); ctx.lineTo(-r * 0.4, -r * 0.1); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

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
    if (m.flash > 0) { ctx.filter = "brightness(2.4)"; const k = m.flash / 0.12; ctx.scale(1 + 0.18 * k, 1 - 0.14 * k); }
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
    if (pr.debris) { ctx.fillStyle = "rgba(255,250,220,.9)"; ctx.fill(); }
    else if (pr.mine) { ctx.fillStyle = "rgba(255,226,120,.75)"; ctx.fill(); }
    else { const g = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, pr.r + 2); g.addColorStop(0, "#fbe9ff"); g.addColorStop(1, "#8e44ad"); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 1.5; ctx.stroke(); }
  }

  // 낫 휘두르기: 초승달 모양 잔상
  for (const sw of s.swings) {
    const a = Math.min(1, sw.t / 0.18);
    if (sw.kind === "circle") { ctx.save(); ctx.globalAlpha = a * 0.6; const g = ctx.createRadialGradient(sw.x!, sw.y!, 0, sw.x!, sw.y!, sw.range); g.addColorStop(0, "rgba(255,240,200,.2)"); g.addColorStop(0.7, "rgba(255,210,120,.6)"); g.addColorStop(1, "rgba(255,255,255,.9)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sw.x!, sw.y!, sw.range, 0, Math.PI * 2); ctx.fill(); ctx.restore(); continue; }
    if (sw.kind === "line") { ctx.save(); ctx.globalAlpha = a * 0.75; ctx.translate(sw.x ?? p.x, sw.y ?? p.y); ctx.rotate(sw.angle); const wd = sw.width ?? 20; const g = ctx.createLinearGradient(0, 0, sw.range, 0); g.addColorStop(0, "rgba(255,255,255,.3)"); g.addColorStop(1, "rgba(200,240,255,.95)"); ctx.fillStyle = g; roundRect(ctx, 0, -wd / 2, sw.range, wd, Math.min(wd / 2, 10)); ctx.fill(); ctx.restore(); continue; }
    if (sw.kind === "cone") { ctx.save(); ctx.globalAlpha = 0.35; const h = (sw.arc / 2) * Math.PI / 180, g = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, sw.range); g.addColorStop(0, "rgba(160,220,255,.8)"); g.addColorStop(1, "rgba(160,220,255,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.arc(p.x, p.y, sw.range, sw.angle - h, sw.angle + h); ctx.closePath(); ctx.fill(); ctx.restore(); continue; }
    ctx.save(); ctx.globalAlpha = a * 0.55;
    const g = ctx.createRadialGradient(p.x, p.y, sw.range * 0.35, p.x, p.y, sw.range);
    g.addColorStop(0, "rgba(255,250,230,0)"); g.addColorStop(0.75, "rgba(255,246,208,.9)"); g.addColorStop(1, "rgba(255,255,255,1)");
    ctx.fillStyle = g; ctx.beginPath();
    if (sw.arc >= 360) { ctx.arc(p.x, p.y, sw.range, 0, Math.PI * 2); ctx.arc(p.x, p.y, sw.range * 0.55, 0, Math.PI * 2, true); }
    else { const h = (sw.arc / 2) * Math.PI / 180; ctx.arc(p.x, p.y, sw.range, sw.angle - h, sw.angle + h); ctx.arc(p.x, p.y, sw.range * 0.55, sw.angle + h, sw.angle - h, true); }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  drawSpecialCast(ctx, s, clock);

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
  // 들고 있는 무기(조준 방향)
  ctx.translate(p.x, p.y); ctx.rotate(p.aim);
  if (art.weapon) { ctx.rotate(Math.PI / 4); ctx.drawImage(art.weapon, size / 2 - 6, -size / 2 - 10, 30, 30); } else { ctx.fillStyle = "#000"; ctx.font = `22px ${EMOJI_FONT}`; ctx.fillText(s.weapon.icon ?? "🌙", size / 2 + 6, 0); }
  ctx.restore();
  // 조준 범위(아주 옅게)
  ctx.save(); ctx.globalAlpha = 0.16; ctx.strokeStyle = "#fffbe8"; ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
  const ha = (Math.min(359.9, d.arc) / 2) * Math.PI / 180; ctx.beginPath(); ctx.arc(p.x, p.y, d.range, p.aim - ha, p.aim + ha); ctx.stroke(); ctx.restore();

  // 맞은 자리 불꽃
  for (const sp of s.sparks) { ctx.globalAlpha = Math.min(1, sp.t / sp.life * 1.6); ctx.strokeStyle = sp.color; ctx.lineWidth = sp.size; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(sp.x - sp.vx * 0.03, sp.y - sp.vy * 0.03); ctx.stroke(); }
  ctx.globalAlpha = 1; ctx.lineCap = "butt";
  // 피해 숫자(나올 때 톡 튀어나온다, 치명타는 더 크게)
  ctx.textAlign = "center";
  for (const pop of s.pops) {
    ctx.globalAlpha = Math.min(1, pop.t * 2);
    const life = pop.kind === "crit" ? 0.75 : 0.6, age = life - pop.t, punch = (pop.kind === "hit" || pop.kind === "crit") && age < 0.12 ? 1 + (pop.kind === "crit" ? 0.7 : 0.35) * (1 - age / 0.12) : 1;
    ctx.font = pop.kind === "info" ? `700 20px ${UI_FONT}` : pop.kind === "crit" ? "900 21px sans-serif" : pop.kind === "aux" ? "800 11px sans-serif" : "800 14px sans-serif";
    ctx.fillStyle = { hit: "#ffffff", crit: "#ffd84a", hurt: "#ff6b5a", heal: "#7df0a0", info: "#fff6d0", aux: "#e6c38a" }[pop.kind];
    ctx.save(); ctx.translate(pop.x, pop.y); ctx.scale(punch, punch);
    ctx.strokeStyle = "rgba(30,20,10,.75)"; ctx.lineWidth = 4; ctx.strokeText(pop.text, 0, 0); ctx.fillText(pop.text, 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  ctx.restore();

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
  const nextXp = xpForLevel(s.level + 1), prevXp = xpForLevel(s.level);
  bar(ctx, 84, 60, 186, 8, (s.xp - prevXp) / Math.max(1, nextXp - prevXp), s.xpFlash > 0 ? "#b8ffd0" : "#4fd27e");
  if (s.xpFlash > 0) { ctx.save(); ctx.globalAlpha = s.xpFlash / 0.18; ctx.strokeStyle = "#b8ffd0"; ctx.lineWidth = 2; ctx.shadowColor = "#7dffa8"; ctx.shadowBlur = 10; ctx.strokeRect(83, 59, 188, 10); ctx.restore(); }
  ctx.font = `700 11px ${UI_FONT}`; ctx.fillStyle = "#c9f7d6"; ctx.fillText(`각성 Lv.${s.level}`, 84, 75);
  s.auxes.forEach((aux, i) => {
    const def = AUX_WEAPONS[aux.id], cx = 258 - i * 24, cy = 72, left = Math.max(0, aux.readyAt - s.t), ratio = 1 - Math.min(1, left / def.cd);
    ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio); ctx.strokeStyle = ratio >= 1 ? "#e6c38a" : "rgba(230,195,138,.55)"; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = "#000"; ctx.font = `12px ${EMOJI_FONT}`; ctx.textAlign = "center"; ctx.fillText(def.icon, cx, cy + 1); ctx.textAlign = "left";
  });

  // 가운데 위: 남은 시간 / 보스 체력
  const left = s.floor.training ? (s.floor.duration ?? 60) - s.t : BOSS_AT - s.t, bossTime = !s.floor.training && s.t >= BOSS_AT;
  if (s.boss && s.boss.hp > 0) {
    const bw = 400, bx = (W - bw) / 2;
    panel(ctx, bx - 10, 12, bw + 20, 46);
    ctx.textAlign = "center"; ctx.font = `700 13px ${UI_FONT}`; ctx.fillStyle = "#ffe19a"; ctx.fillText(`${s.boss.icon} ${s.boss.name}`, W / 2 - 40, 26);
    ctx.font = "800 13px sans-serif"; ctx.fillStyle = "#fff"; ctx.fillText(`보스전 ${fmt(s.t - BOSS_AT)}`, W / 2 + 140, 26);
    bar(ctx, bx, 38, bw, 10, s.boss.hp / s.boss.maxHp, "#d8432f");
    ctx.textAlign = "left";
  } else {
    panel(ctx, W / 2 - 70, 12, 140, 40);
    ctx.textAlign = "center"; ctx.font = "800 20px sans-serif"; ctx.fillStyle = bossTime ? "#ff7a6a" : "#fff"; ctx.fillText(bossTime ? `보스전 ${fmt(s.t - BOSS_AT)}` : fmt(left), W / 2, 30);
    ctx.font = `700 9px ${UI_FONT}`; ctx.fillStyle = "#d9cfae"; ctx.fillText(s.floor.training ? "진화 체험 중" : s.t < BOSS_AT ? `보스까지 ${fmt(BOSS_AT - s.t)}` : "보스 등장!", W / 2, 45);
    ctx.textAlign = "left";
  }
  // 오른쪽 위: 처치 수 · 미니맵(플레이어·정예·보스·주요 지형만)
  panel(ctx, W - 112, 12, 100, 32); ctx.font = `700 13px ${UI_FONT}`; ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText(`💀 ${s.kills}`, W - 62, 28); ctx.textAlign = "left";
  { const mw = 168, mh = 96, mx0 = W - mw - 12, my0 = 50, k = mw / WORLD_W;
    panel(ctx, mx0 - 4, my0 - 4, mw + 8, mh + 8);
    ctx.save(); roundRect(ctx, mx0, my0, mw, mh, 6); ctx.clip();
    ctx.fillStyle = T.zone === "canal" ? "rgba(140,180,170,.35)" : "rgba(150,200,120,.3)"; ctx.fillRect(mx0, my0, mw, mh);
    ctx.fillStyle = "rgba(50,110,170,.9)"; for (const a of T.deep) ctx.fillRect(mx0 + a.x * k, my0 + a.y * k, a.w * k, a.h * k);
    ctx.fillStyle = "#ccc"; for (const a of T.walls) ctx.fillRect(mx0 + a.x * k, my0 + a.y * k, Math.max(2, a.w * k), Math.max(2, a.h * k));
    ctx.fillStyle = "#6b4a2a"; for (const gt of T.gates) if (gt.closed) ctx.fillRect(mx0 + gt.rect.x * k, my0 + gt.rect.y * k, gt.rect.w * k, Math.max(2, gt.rect.h * k));
    if (T.chance && !T.chance.used) { ctx.fillStyle = "#ffd84a"; ctx.beginPath(); ctx.arc(mx0 + T.chance.x * k, my0 + T.chance.y * k, 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 1; ctx.strokeRect(mx0 + cam.x * k, my0 + cam.y * k, W * k, H * k);
    for (const m of s.monsters) if (m.hp > 0 && (m.elite || m.boss)) { ctx.fillStyle = m.boss ? "#ff4a3a" : "#f0a030"; ctx.beginPath(); ctx.arc(mx0 + m.x * k, my0 + m.y * k, m.boss ? 4 : 3, 0, Math.PI * 2); ctx.fill(); }
    for (const w of s.warns) { ctx.strokeStyle = "#f0a030"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(mx0 + w.x * k, my0 + w.y * k, 4 + Math.sin(clock * 10) * 1.5, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(mx0 + p.x * k, my0 + p.y * k, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (s.pressure.stage > 0) { ctx.font = `700 11px ${UI_FONT}`; ctx.fillStyle = "#ff9a6a"; ctx.textAlign = "right"; ctx.fillText(`⚠ 탑의 압박 ${s.pressure.stage}단계 · 자리를 옮기세요`, W - 12, my0 + mh + 16); ctx.textAlign = "left"; }
  }
  // 화면 밖 정예·보스·예고 방향 표시
  const pointers = [...s.monsters.filter(m => m.hp > 0 && (m.elite || m.boss)).map(m => ({ x: m.x, y: m.y, color: m.boss ? "#ff4a3a" : "#f0a030", icon: m.icon })), ...s.warns.map(w => ({ x: w.x, y: w.y, color: "#f0a030", icon: "!" }))];
  for (const t of pointers) {
    const sx = t.x - cam.x, sy = t.y - cam.y;
    if (sx > 0 && sx < W && sy > 0 && sy < H) continue;
    const a = Math.atan2(sy - H / 2, sx - W / 2), ex = Math.max(28, Math.min(W - 28, W / 2 + Math.cos(a) * (W / 2))), ey = Math.max(98, Math.min(H - 76, H / 2 + Math.sin(a) * (H / 2)));
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); ctx.fillStyle = t.color; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-6, -9); ctx.lineTo(-6, 9); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.fillStyle = "#000"; ctx.font = `14px ${EMOJI_FONT}`; ctx.textAlign = "center"; ctx.fillText(t.icon, ex - Math.cos(a) * 16, ey - Math.sin(a) * 16); ctx.textAlign = "left";
  }

  // 아래: 회피 · 음식 칸 · 버프
  const by = H - 62;
  // 모바일은 회피·특수·음식이 화면 버튼으로 있으니 캔버스 아래 칸은 그리지 않는다.
  if (!compactHud) {
  panel(ctx, 12, by, 64, 50);
  const ready = p.dashCd <= 0, cdRatio = ready ? 1 : 1 - p.dashCd / d.dashCd;
  ctx.beginPath(); ctx.arc(44, by + 21, 15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cdRatio); ctx.strokeStyle = ready ? "#9fe8ff" : "rgba(160,200,220,.6)"; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = "#000"; ctx.font = `16px ${EMOJI_FONT}`; ctx.textAlign = "center"; ctx.fillText("💨", 44, by + 21);
  ctx.font = "700 9px sans-serif"; ctx.fillStyle = ready ? "#fff" : "#aaa"; ctx.fillText(ready ? "SPACE" : p.dashCd.toFixed(1), 44, by + 43);
  // 우클릭 특수 공격(진화 무기만)
  const spec = s.evolution ? SPECIALS[s.evolution] : null;
  if (spec) {
    const sx0 = 266, left = Math.max(0, s.special.readyAt - s.t), ready = left <= 0, shake = s.t - s.special.bump < 0.2 ? Math.sin(clock * 80) * 2 : 0;
    panel(ctx, sx0 + shake, by, 58, 50);
    ctx.beginPath(); ctx.arc(sx0 + 29 + shake, by + 21, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (ready ? 1 : 1 - left / spec.cooldown)); ctx.strokeStyle = ready ? "#ffd84a" : "rgba(255,216,74,.45)"; ctx.lineWidth = 3; ctx.stroke();
    if (ready) { ctx.beginPath(); ctx.arc(sx0 + 29, by + 21, 19 + Math.sin(clock * 6) * 1.5, 0, Math.PI * 2); ctx.strokeStyle = "rgba(255,216,74,.35)"; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.fillStyle = "#000"; ctx.font = `17px ${EMOJI_FONT}`; ctx.textAlign = "center"; ctx.globalAlpha = ready ? 1 : 0.5; ctx.fillText(spec.icon, sx0 + 29 + shake, by + 21); ctx.globalAlpha = 1;
    ctx.font = "700 9px sans-serif"; ctx.fillStyle = ready ? "#ffe19a" : "#aaa"; ctx.fillText(ready ? "우클릭" : left.toFixed(1), sx0 + 29 + shake, by + 43); ctx.textAlign = "left";
  }
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
  }
  ctx.textAlign = "left";
  const buffs = s.buffs.filter(b => b.until > s.t);
  if (buffs.length) {
    const text = buffs.map(b => `${{ attack: "⚔ 공격", speed: "👟 이속", haste: "⚡ 공속", all: "🌟 전체", heal: "", shield: "", regen: "", crit: "🎯 치명", armor: "🛡 경감" }[b.kind]} +${b.value}% · ${Math.ceil(b.until - s.t)}s`).join("   ");
    ctx.font = `700 12px ${UI_FONT}`; const w = ctx.measureText(text).width + 24;
    panel(ctx, 332, by + 10, w, 30); ctx.fillStyle = "#ffe19a"; ctx.fillText(text, 344, by + 26);
  }
}

/** 끝 연출: 쓰러짐(회색·붉은 테두리·쓰러지는 캐릭터)·시간 초과·토벌 성공(빛·색종이). k는 0→1 진행도. */
function drawEnd(ctx: CanvasRenderingContext2D, s: RaidState, art: Art, k: number, clock: number) {
  const W = ARENA_W, H = ARENA_H, p = s.player, sx = p.x - s.cam.x, sy = p.y - s.cam.y;
  ctx.save();
  if (s.over === "clear") {
    ctx.fillStyle = `rgba(255,236,170,${0.25 * k})`; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 46; i++) { const x = (i * 211) % W, y = ((i * 97) % H) * 0.3 + k * H * (0.6 + (i % 5) * 0.12); ctx.fillStyle = ["#ffd84a", "#ff8a8a", "#8ad1ff", "#9fe8a6", "#ffffff"][i % 5]; ctx.save(); ctx.translate(x, y % H); ctx.rotate(clock * 4 + i); ctx.fillRect(-4, -2, 8, 4); ctx.restore(); }
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = `800 ${40 + 12 * Math.min(1, k * 3)}px "Gowun Batang", serif`; ctx.lineWidth = 8; ctx.strokeStyle = "rgba(60,40,10,.8)"; ctx.fillStyle = "#ffd84a";
    ctx.strokeText("🎉 토벌 성공!", W / 2, H / 2 - 20); ctx.fillText("🎉 토벌 성공!", W / 2, H / 2 - 20);
    ctx.font = `700 16px ${UI_FONT}`; ctx.lineWidth = 4; ctx.strokeText(`${s.floor.floor}층 돌파 · 처치 ${s.kills}`, W / 2, H / 2 + 24); ctx.fillStyle = "#fff"; ctx.fillText(`${s.floor.floor}층 돌파 · 처치 ${s.kills}`, W / 2, H / 2 + 24);
  } else {
    // 화면이 잿빛으로 가라앉고 붉은 테두리, 캐릭터가 쓰러진다.
    ctx.fillStyle = `rgba(30,20,20,${0.55 * k})`; ctx.fillRect(0, 0, W, H);
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, W * 0.65); v.addColorStop(0, "rgba(120,0,0,0)"); v.addColorStop(1, `rgba(150,10,10,${0.6 * k})`); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    if (s.over === "dead") {
      ctx.save(); ctx.translate(sx, sy + 10 * k); ctx.rotate(-Math.PI / 2 * Math.min(1, k * 2)); ctx.globalAlpha = 1 - k * 0.4; drawAvatar(ctx, art, 0, 0, 44, false); ctx.restore();
      ctx.fillStyle = "#000"; ctx.font = `${28 + 10 * k}px ${EMOJI_FONT}`; ctx.textAlign = "center"; ctx.fillText("💫", sx, sy - 40 - 10 * k);
    }
    ctx.globalAlpha = Math.min(1, k * 2.5); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = `800 44px "Gowun Batang", serif`; ctx.lineWidth = 8; ctx.strokeStyle = "rgba(0,0,0,.75)"; ctx.fillStyle = "#ff8a7a";
    const title = s.floor.training ? "🎯 체험 끝" : s.over === "dead" ? "쓰러졌다…" : "시간 초과…";
    ctx.strokeText(title, W / 2, H / 2 - 20); ctx.fillText(title, W / 2, H / 2 - 20);
    ctx.font = `700 15px ${UI_FONT}`; ctx.lineWidth = 4; const sub = s.floor.training ? `처치 ${s.kills}` : s.over === "dead" ? "체력이 다 떨어졌어요" : s.boss && s.boss.hp > 0 ? `보스 체력 ${Math.round((s.boss.hp / s.boss.maxHp) * 100)}% 남음` : "5분 안에 보스를 쓰러뜨리지 못했어요";
    ctx.strokeText(sub, W / 2, H / 2 + 22); ctx.fillStyle = "#fff"; ctx.fillText(sub, W / 2, H / 2 + 22);
  }
  ctx.restore();
}

function drawAvatar(ctx: CanvasRenderingContext2D, art: Art, x: number, y: number, size: number, flip: boolean) {
  ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
  if (art.avatar) { ctx.imageSmoothingEnabled = !art.pixelated; ctx.drawImage(art.avatar, -size / 2, -size / 2, size, size); }
  else { ctx.beginPath(); ctx.arc(0, 0, PLAYER.radius, 0, Math.PI * 2); ctx.fillStyle = "#fff3d6"; ctx.fill(); ctx.fillStyle = "#000"; ctx.font = `20px ${EMOJI_FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("🧑‍🌾", 0, 1); }
  ctx.restore();
}
