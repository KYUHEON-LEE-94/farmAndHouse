"use client";
/**
 * 채집·탐험 한 판 화면(LIFE_CONTENT_EXPANSION_SPEC 3.1·3.2·3.1.1절).
 * 프레임별 위치·타이머는 엔진 상태(ref)에만 두고, page에는 10초 체크포인트와 확정 결과만 올린다(6.4절).
 * PC: WASD·방향키 이동, 클릭 또는 F 채집, Space 회피, R 1초 유지 귀환.
 * 모바일: 왼쪽 가상 스틱, 오른쪽 채집·회피 버튼, 위쪽 귀환 버튼 1초 유지.
 */
import { useEffect, useRef, useState } from "react";
import { hurtAvatarSrc } from "../avatar";
import { FORAGE } from "./data";
import {
  EVENT_INFO, MAX_HP, SPORE_TELE, BOAR_AIM, BOAR_CHARGE_SPEED, BOAR_CHARGE_TIME, GATHER_BIG, GATHER_RANGE, GATHER_SMALL, NO_INPUT, RETURN_HOLD, START, VIEW_H, VIEW_W, WORLD_H, WORLD_W,
  bagCount, canAccept, checkpointDue, checkpointOf, herbOf, nearestNode, regionItems, resolveEvent, resultOf, rngOf, sporePhase, step,
  type EventKind, type ExploreInput, type RunResult, type RunState,
} from "./engine";
import type { ExplorationCheckpoint } from "./types";

const EMOJI_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
const MINI_W = 144, MINI_H = 81;
const icon = (id: string) => FORAGE.find(item => item.id === id)?.icon ?? "🌿";
const isTouchDevice = () => typeof window !== "undefined" && Boolean(window.matchMedia?.("(pointer: coarse)").matches);

type Props = {
  run: RunState;
  /** 안내소 1단계 이상이면 미니맵에 미채집 일반 자원 위치를 표시(5.2.1절) */
  showResourcesOnMinimap: boolean;
  /** 이용자가 고른 아바타(없으면 🧑‍🌾) */
  avatar?: { src: string; pixelated: boolean };
  onCheckpoint: (checkpoint: ExplorationCheckpoint) => void;
  onFinish: (result: RunResult) => void;
};

/** 지역별 바탕색·장식(봄 숲길 / 여름 햇빛 습지). 미니맵 바탕도 같이 쓴다. */
const WORLD_LOOK: Record<string, { top: string; bottom: string; mini: string; path: string; big: string[]; small: string[] }> = {
  봄: { top: "#a9d18e", bottom: "#8fbf72", mini: "#9fca84", path: "rgba(196,166,112,.55)", big: ["🌳", "🌳", "🌲"], small: ["🌸", "🌱"] },
  여름: { top: "#9fd0a4", bottom: "#6fb59a", mini: "#86c3a2", path: "rgba(170,150,96,.5)", big: ["🌴", "🌿", "🌾"], small: ["🪷", "🌾", "🌼"] },
};
const lookOf = (regionId: string) => WORLD_LOOK[regionItems(regionId).region.season] ?? WORLD_LOOK.봄;

/** 월드 배경(풀밭·나무·꽃)을 한 번만 그려 둔다. 자원 근처에는 장식을 두지 않는다. */
function paintWorld(run: RunState) {
  const canvas = document.createElement("canvas"); canvas.width = WORLD_W; canvas.height = WORLD_H;
  const ctx = canvas.getContext("2d")!, rnd = rngOf(run.seed ^ 0x5eed), look = lookOf(run.regionId);
  const grad = ctx.createLinearGradient(0, 0, 0, WORLD_H); grad.addColorStop(0, look.top); grad.addColorStop(1, look.bottom);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  for (let i = 0; i < 900; i++) { ctx.fillStyle = rnd() < 0.5 ? "rgba(60,110,50,.18)" : "rgba(255,255,220,.18)"; ctx.fillRect(rnd() * WORLD_W, rnd() * WORLD_H, 3, 6); }
  // 흙길: 시작점에서 사방으로
  ctx.strokeStyle = look.path; ctx.lineWidth = 46; ctx.lineCap = "round";
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + rnd() * 0.6; ctx.beginPath(); ctx.moveTo(START.x, START.y); ctx.quadraticCurveTo(START.x + Math.cos(a + 0.5) * 380, START.y + Math.sin(a + 0.5) * 300, START.x + Math.cos(a) * 900, START.y + Math.sin(a) * 520); ctx.stroke(); }
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const clear = (x: number, y: number) => Math.hypot(x - START.x, y - START.y) > 190 && run.nodes.every(node => Math.hypot(node.x - x, node.y - y) > 90) && run.hazards.every(h => Math.hypot((h.kind === "bees" ? h.cx : h.x) - x, (h.kind === "bees" ? h.cy : h.y) - y) > 130);
  for (let i = 0; i < 70; i++) { const x = rnd() * WORLD_W, y = rnd() * WORLD_H; if (!clear(x, y)) continue; ctx.fillStyle = "#000"; ctx.font = `${30 + rnd() * 22}px ${EMOJI_FONT}`; ctx.fillText(look.big[Math.floor(rnd() * look.big.length)], x, y); }
  for (let i = 0; i < 60; i++) { const x = rnd() * WORLD_W, y = rnd() * WORLD_H; if (!clear(x, y)) continue; ctx.fillStyle = "#000"; ctx.font = `14px ${EMOJI_FONT}`; ctx.fillText(look.small[Math.floor(rnd() * look.small.length)], x, y); }
  // 진흙(봄) · 물웅덩이(여름)
  for (const h of run.hazards) if (h.kind === "mud") {
    const puddle = h.skin === "puddle";
    ctx.fillStyle = puddle ? "rgba(70,140,190,.5)" : "rgba(110,78,44,.55)"; ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r, h.r * 0.72, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = puddle ? "rgba(220,245,255,.35)" : "rgba(80,55,30,.35)"; ctx.beginPath(); ctx.ellipse(h.x - h.r * 0.2, h.y - h.r * 0.1, h.r * 0.45, h.r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  }
  // 귀환 지점
  ctx.fillStyle = "#000"; ctx.font = `40px ${EMOJI_FONT}`; ctx.fillText("🏕️", START.x, START.y - 40);
  return canvas;
}

export default function ExploreGame({ run, showResourcesOnMinimap, avatar, onCheckpoint, onFinish }: Props) {
  // 아바타 이미지는 한 번만 불러 두고 캔버스에 그린다(불러오기 전·실패 시 이모지)
  const avatarImg = useRef<{ img: HTMLImageElement; hurt?: HTMLImageElement; pixelated: boolean } | null>(null);
  useEffect(() => {
    if (!avatar?.src) { avatarImg.current = null; return; }
    const img = new Image(); img.decoding = "async"; img.src = avatar.src;
    const hurtSrc = hurtAvatarSrc(avatar.src), hurt = hurtSrc ? new Image() : undefined;
    if (hurt && hurtSrc) { hurt.decoding = "async"; hurt.src = hurtSrc; }
    avatarImg.current = { img, hurt, pixelated: avatar.pixelated };
  }, [avatar?.src, avatar?.pixelated]);
  const canvasRef = useRef<HTMLCanvasElement>(null), miniRef = useRef<HTMLCanvasElement>(null);
  const state = useRef(run);
  const keys = useRef(new Set<string>());
  const pending = useRef({ gather: false, target: null as string | null, dodge: false, returnBtn: false });
  const stick = useRef<{ id: number; ox: number; oy: number; x: number; y: number } | null>(null);
  const cam = useRef({ x: Math.max(0, Math.min(WORLD_W - VIEW_W, START.x - VIEW_W / 2)), y: Math.max(0, Math.min(WORLD_H - VIEW_H, START.y - VIEW_H / 2)) });
  const finished = useRef(false);
  /** 마우스 커서(화면 논리 좌표, 마지막으로 움직인 시각). 매 프레임 카메라 위치로 월드 좌표를 구해 커서 쪽을 보고, 2초 넘게 안 움직이면 이동 방향을 따른다 */
  const cursor = useRef<{ x: number; y: number; at: number } | null>(null);
  /** 아바타 좌우(-1 왼쪽 ~ 1 오른쪽). 방향이 바뀌면 약 0.1초 동안 납작해졌다 펴지며 돌아선다 */
  const face = useRef(1);
  const callbacks = useRef({ onCheckpoint, onFinish });
  useEffect(() => { callbacks.current = { onCheckpoint, onFinish }; });
  const [touch] = useState(isTouchDevice);
  // HUD는 초당 10번 정도만 갱신한다(매 프레임 React 렌더를 하지 않게).
  const [hud, setHud] = useState(() => ({ phase: run.phase, ready: run.readyLeft, time: run.timeLeft, bag: 0, cap: run.bagCap, items: {} as Record<string, number>, hp: run.hp, ret: 0, toast: "", canGather: false, event: null as EventKind | null, accept: false }));

  useEffect(() => {
    const canvas = canvasRef.current!, ctx = canvas.getContext("2d")!, mini = miniRef.current!, mctx = mini.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = VIEW_W * dpr; canvas.height = VIEW_H * dpr; mini.width = MINI_W * dpr; mini.height = MINI_H * dpr;
    const world = paintWorld(state.current);
    let raf = 0, last = performance.now(), hudAt = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const s = state.current, p = s.player, k = keys.current, pend = pending.current;
      // 입력 모으기
      let mx = (k.has("d") || k.has("arrowright") ? 1 : 0) - (k.has("a") || k.has("arrowleft") ? 1 : 0);
      let my = (k.has("s") || k.has("arrowdown") ? 1 : 0) - (k.has("w") || k.has("arrowup") ? 1 : 0);
      if (stick.current) { const st = stick.current, dx = st.x - st.ox, dy = st.y - st.oy, l = Math.hypot(dx, dy); if (l > 8) { mx = dx / Math.max(l, 50); my = dy / Math.max(l, 50); } }
      const input: ExploreInput = { mx, my, gather: pend.gather, gatherTarget: pend.target, dodge: pend.dodge, returnHeld: k.has("r") || pend.returnBtn };
      pend.gather = false; pend.target = null; pend.dodge = false;
      step(s, s.phase === "play" ? input : NO_INPUT, dt);
      if (checkpointDue(s)) callbacks.current.onCheckpoint(checkpointOf(s));
      if (s.phase === "done" && !finished.current) { finished.current = true; callbacks.current.onFinish(resultOf(s)); }
      // 카메라(약 0.15초 보간)
      const c = cam.current, tx = Math.max(0, Math.min(WORLD_W - VIEW_W, p.x - VIEW_W / 2)), ty = Math.max(0, Math.min(WORLD_H - VIEW_H, p.y - VIEW_H / 2)), f = 1 - Math.exp(-dt / 0.15);
      c.x += (tx - c.x) * f; c.y += (ty - c.y) * f;
      // 그리기
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.drawImage(world, c.x, c.y, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);
      ctx.save(); ctx.translate(-c.x, -c.y); ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const near = s.phase === "play" ? nearestNode(s) : null, clock = now / 1000;
      for (const node of s.nodes) {
        if (node.left <= 0) { ctx.globalAlpha = 0.35; ctx.fillStyle = "#000"; ctx.font = `18px ${EMOJI_FONT}`; ctx.fillText("🍂", node.x, node.y + 6); ctx.globalAlpha = 1; continue; }
        const big = node.size !== "small", pulse = 0.5 + 0.5 * Math.sin(clock * 3 + node.x);
        ctx.fillStyle = node.size === "rare" ? `rgba(255,215,90,${0.35 + pulse * 0.3})` : `rgba(255,255,230,${0.18 + pulse * 0.22})`;
        ctx.beginPath(); ctx.arc(node.x, node.y, big ? 30 : 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#000"; ctx.font = `${node.size === "rare" ? 34 : big ? 36 : 26}px ${EMOJI_FONT}`; ctx.fillText(icon(node.item), node.x, node.y);
        if (big && node.size === "big") { ctx.font = "800 11px sans-serif"; ctx.fillStyle = "#3d2a10"; ctx.fillText(`×${node.left}`, node.x + 20, node.y + 18); }
        // 반짝임
        ctx.fillStyle = `rgba(255,255,255,${pulse})`; ctx.font = `12px ${EMOJI_FONT}`; ctx.fillText("✦", node.x + 16, node.y - 16);
        if (near && near.id === node.id) {
          ctx.strokeStyle = "#fff8c8"; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.arc(node.x, node.y, big ? 36 : 28, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
          ctx.font = "800 12px sans-serif"; ctx.fillStyle = "#24372b"; ctx.fillText(`${node.size === "small" ? GATHER_SMALL : GATHER_BIG.toFixed(1)}초 · ${touch ? "채집" : "F"}`, node.x, node.y - (big ? 46 : 38));
        }
      }
      for (const h of s.hazards) if (h.kind === "spores") {
        // 독버섯: 예고는 보라 점선 고리가 차오르고, 구름일 때는 보라 안개
        const ph = sporePhase(h, s.t);
        if (ph?.kind === "tele") { ctx.strokeStyle = `rgba(150,80,190,${0.35 + ph.k * 0.5})`; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = `rgba(160,90,200,${0.08 + ph.k * 0.14})`; ctx.beginPath(); ctx.arc(h.x, h.y, h.r * ph.k, 0, Math.PI * 2); ctx.fill(); }
        else if (ph?.kind === "cloud") { ctx.fillStyle = "rgba(150,80,190,.38)"; ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#000"; ctx.font = `18px ${EMOJI_FONT}`; ctx.fillText("💨", h.x + 30, h.y - 26); }
        ctx.fillStyle = "#000"; ctx.font = `30px ${EMOJI_FONT}`; ctx.fillText("🍄", h.x, h.y);
        if (ph?.kind === "tele") { ctx.font = "900 15px sans-serif"; ctx.fillStyle = "#8a3fb0"; ctx.fillText(`${Math.max(0.1, (1 - ph.k) * SPORE_TELE).toFixed(1)}`, h.x, h.y - 30); }
      } else if (h.kind === "bees") {
        // 둥지(순찰 궤도)는 늘 보이고, 추적 중이면 빨간 느낌표
        ctx.strokeStyle = "rgba(240,170,40,.35)"; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.ellipse(h.cx, h.cy, h.orbit, h.orbit * 0.7, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = "#000"; ctx.font = `26px ${EMOJI_FONT}`; ctx.fillText("🐝", h.x, h.y); ctx.font = `14px ${EMOJI_FONT}`; ctx.fillText("🐝", h.x + 14, h.y + 10);
        if (h.mode === "chase") { ctx.font = "900 16px sans-serif"; ctx.fillStyle = "#e2557f"; ctx.fillText("!", h.x, h.y - 26); }
      } else if (h.kind === "boar") {
        if (h.mode === "aim") {
          // 돌진 예고선: 실제 돌진 거리와 폭 그대로, 남은 시간에 따라 점점 진해진다
          const k = 1 - Math.max(0, h.until - s.t) / BOAR_AIM, len = BOAR_CHARGE_SPEED * BOAR_CHARGE_TIME;
          ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(Math.atan2(h.dy, h.dx));
          ctx.fillStyle = `rgba(220,60,40,${0.12 + k * 0.25})`; ctx.fillRect(0, -h.r, len, h.r * 2);
          ctx.setLineDash([10, 7]); ctx.strokeStyle = "#ff6b4a"; ctx.lineWidth = 2; ctx.strokeRect(0, -h.r, len, h.r * 2); ctx.setLineDash([]); ctx.restore();
          ctx.font = "900 18px sans-serif"; ctx.fillStyle = "#e2557f"; ctx.fillText("!!", h.x, h.y - 32);
        }
        ctx.save(); ctx.translate(h.x, h.y); if (h.dx < 0 || (h.mode === "roam" && h.wx < h.x)) ctx.scale(-1, 1);
        ctx.fillStyle = "#000"; ctx.font = `${h.mode === "charge" ? 36 : 32}px ${EMOJI_FONT}`; ctx.fillText(h.skin === "snake" ? "🐍" : "🐗", 0, 0); ctx.restore();
        if (h.mode === "rest") { ctx.font = `14px ${EMOJI_FONT}`; ctx.fillText("💤", h.x + 18, h.y - 20); }
      }
      const ev = s.event;
      if (ev?.state === "active" && ev.zone) {
        const left = Math.max(0, (ev.until ?? 0) - s.t);
        ctx.fillStyle = "rgba(120,190,255,.25)"; ctx.beginPath(); ctx.arc(ev.zone.x, ev.zone.y, ev.zone.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#4a90d9"; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = "#000"; ctx.font = `28px ${EMOJI_FONT}`; ctx.fillText("☂️", ev.zone.x, ev.zone.y); ctx.font = "800 14px sans-serif"; ctx.fillStyle = "#1d4f86"; ctx.fillText(`${left.toFixed(1)}초`, ev.zone.x, ev.zone.y + ev.zone.r + 14);
      }
      // 플레이어: 커서(최근 2초 안에 움직였을 때) 또는 이동 방향을 바라본다
      const cur = cursor.current, curX = cur ? c.x + cur.x : 0, wantRight = cur && now - cur.at < 2000 && Math.abs(curX - p.x) > 4 ? curX > p.x : p.faceX >= 0;
      face.current += ((wantRight ? 1 : -1) - face.current) * Math.min(1, dt * 18);
      const stunned = s.t < p.stunUntil, dodging = s.t < p.dodgeUntil;
      ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(p.x, p.y + 18, 18, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = dodging ? 0.55 : 1;
      const hurtImg = avatarImg.current?.hurt;
      const faceImg = stunned && hurtImg?.complete && hurtImg.naturalWidth > 0 ? hurtImg : avatarImg.current?.img;
      if (faceImg && faceImg.complete && faceImg.naturalWidth > 0) {
        ctx.save(); ctx.beginPath(); ctx.arc(p.x, p.y, 22, 0, Math.PI * 2); ctx.closePath(); ctx.fillStyle = "#fffdf5"; ctx.fill(); ctx.clip();
        ctx.translate(p.x, p.y); ctx.scale(face.current >= 0 ? Math.max(0.15, face.current) : Math.min(-0.15, face.current), 1);
        ctx.imageSmoothingEnabled = !avatarImg.current?.pixelated; ctx.drawImage(faceImg, -22, -22, 44, 44); ctx.restore();
        ctx.strokeStyle = stunned ? "#e2557f" : "#fffdf5"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, 23, 0, Math.PI * 2); ctx.stroke();
      } else { ctx.save(); ctx.translate(p.x, p.y); ctx.scale(face.current >= 0 ? Math.max(0.15, face.current) : Math.min(-0.15, face.current), 1); ctx.fillStyle = "#000"; ctx.font = `34px ${EMOJI_FONT}`; ctx.fillText("🧑‍🌾", 0, 0); ctx.restore(); }
      ctx.globalAlpha = 1;
      if (stunned) { ctx.font = `18px ${EMOJI_FONT}`; ctx.fillText("💫", p.x, p.y - 28); }
      if (s.gather) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(p.x, p.y, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, s.gather.progress / s.gather.need)); ctx.stroke(); }
      if (s.returnHold > 0) { ctx.strokeStyle = "#ffd36a"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(p.x, p.y, 32, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, s.returnHold / RETURN_HOLD)); ctx.stroke(); }
      ctx.restore();
      // 미니맵: 전체 지형·플레이어·귀환 지점(자원 위치는 안내소 1단계부터)
      mctx.setTransform(dpr * MINI_W / WORLD_W, 0, 0, dpr * MINI_H / WORLD_H, 0, 0);
      mctx.fillStyle = lookOf(s.regionId).mini; mctx.fillRect(0, 0, WORLD_W, WORLD_H);
      for (const h of s.hazards) {
        if (h.kind === "mud") { mctx.fillStyle = h.skin === "puddle" ? "#4a8cc0" : "#7a5530"; mctx.beginPath(); mctx.arc(h.x, h.y, h.r, 0, Math.PI * 2); mctx.fill(); }
        else if (h.kind === "spores") { mctx.fillStyle = sporePhase(h, s.t) ? "#9a4fc0" : "rgba(150,80,190,.45)"; mctx.beginPath(); mctx.arc(h.x, h.y, h.r, 0, Math.PI * 2); mctx.fill(); }
        else if (h.kind === "bees") { mctx.fillStyle = "rgba(230,160,30,.45)"; mctx.beginPath(); mctx.arc(h.cx, h.cy, h.orbit, 0, Math.PI * 2); mctx.fill(); mctx.fillStyle = h.mode === "chase" ? "#e2557f" : "#e6a01e"; mctx.beginPath(); mctx.arc(h.x, h.y, 30, 0, Math.PI * 2); mctx.fill(); }
        else { mctx.fillStyle = h.mode === "aim" || h.mode === "charge" ? "#e2557f" : "#8a5a3a"; mctx.beginPath(); mctx.arc(h.x, h.y, 34, 0, Math.PI * 2); mctx.fill(); }
      }
      if (showResourcesOnMinimap) { mctx.fillStyle = "#fff6c0"; for (const node of s.nodes) if (node.left > 0 && node.size !== "rare") { mctx.beginPath(); mctx.arc(node.x, node.y, 22, 0, Math.PI * 2); mctx.fill(); } }
      mctx.strokeStyle = "rgba(255,255,255,.9)"; mctx.lineWidth = 14; mctx.strokeRect(c.x, c.y, VIEW_W, VIEW_H);
      mctx.fillStyle = "#3b6cb5"; mctx.fillRect(START.x - 30, START.y - 30, 60, 60);
      mctx.fillStyle = "#c0392b"; mctx.beginPath(); mctx.arc(p.x, p.y, 36, 0, Math.PI * 2); mctx.fill();
      if (now - hudAt > 100) {
        hudAt = now;
        setHud({ phase: s.phase, ready: s.readyLeft, time: s.timeLeft, bag: bagCount(s), cap: s.bagCap, items: { ...s.bag }, hp: s.hp, ret: s.returnHold / RETURN_HOLD, toast: s.toast && s.toast.until > s.t ? s.toast.text : "", canGather: Boolean(near) && !s.gather, event: s.phase === "event" && s.event ? s.event.kind : null, accept: s.phase === "event" && canAccept(s) });
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [showResourcesOnMinimap, touch]);

  // 키보드: 게임 화면이 떠 있는 동안만. 입력 칸에 쓰는 중이면 무시.
  useEffect(() => {
    const typing = (event: KeyboardEvent) => event.target instanceof Element && Boolean(event.target.closest("input, textarea, select"));
    const down = (event: KeyboardEvent) => {
      if (typing(event)) return;
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d", "r", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) { keys.current.add(key); event.preventDefault(); }
      if (key === "f" && !event.repeat) { pending.current.gather = true; event.preventDefault(); }
      if (key === " " && !event.repeat) { pending.current.dodge = true; event.preventDefault(); }
    };
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    const blur = () => keys.current.clear();
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); };
  }, []);

  /** 캔버스 클릭: 범위 안 자원을 누르면 채집, 범위 밖이면 안내. */
  /** 마우스가 움직이면 커서 위치를 월드 좌표로 기억한다(터치는 이동 방향을 따른다). */
  const moveCursor = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    cursor.current = { x: (event.clientX - rect.left) / rect.width * VIEW_W, y: (event.clientY - rect.top) / rect.height * VIEW_H, at: performance.now() };
  };
  const clickCanvas = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect(), s = state.current;
    const wx = cam.current.x + (event.clientX - rect.left) / rect.width * VIEW_W, wy = cam.current.y + (event.clientY - rect.top) / rect.height * VIEW_H;
    const node = s.nodes.filter(entry => entry.left > 0 && Math.hypot(entry.x - wx, entry.y - wy) < 34)[0];
    if (!node) return;
    if (Math.hypot(node.x - s.player.x, node.y - s.player.y) > GATHER_RANGE) { s.toast = { text: "조금 더 가까이 가야 캘 수 있어요", until: s.t + 1.2 }; return; }
    pending.current.gather = true; pending.current.target = node.id;
  };
  // 모바일 가상 스틱(화면 왼쪽 절반)
  const stickDown = (event: React.PointerEvent<HTMLDivElement>) => { event.currentTarget.setPointerCapture(event.pointerId); stick.current = { id: event.pointerId, ox: event.clientX, oy: event.clientY, x: event.clientX, y: event.clientY }; };
  const stickMove = (event: React.PointerEvent<HTMLDivElement>) => { if (stick.current?.id === event.pointerId) { stick.current.x = event.clientX; stick.current.y = event.clientY; } };
  const stickUp = (event: React.PointerEvent<HTMLDivElement>) => { if (stick.current?.id === event.pointerId) stick.current = null; };
  const holdReturn = (on: boolean) => { pending.current.returnBtn = on; };
  const returnButton = <button className="explore-return" onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); holdReturn(true); }} onPointerUp={() => holdReturn(false)} onPointerCancel={() => holdReturn(false)} onLostPointerCapture={() => holdReturn(false)}>
    <i style={{ width: `${Math.min(100, hud.ret * 100)}%` }} />🏕️ 귀환 {touch ? "(1초 누르기)" : "(R 1초)"}
  </button>;
  const herb = herbOf(run.regionId), base = hud.event ? EVENT_INFO[hud.event] : null;
  const info = base && hud.event === "injured" ? { ...base, text: `다친 동물이 있어요. ${herb.name} 1개로 치료해 줄까요?`, accept: `${herb.name} 1개 사용 → 재료 2개` } : base;
  const choose = (accept: boolean) => { resolveEvent(state.current, accept); setHud(prev => ({ ...prev, event: null })); };
  const minutes = Math.max(0, Math.ceil(hud.time));
  return <div className={`explore-game ${touch ? "touch" : ""}`}>
    <div className="explore-stage">
      <canvas ref={canvasRef} className="explore-canvas" onPointerDown={clickCanvas} onPointerMove={moveCursor} aria-label="탐험 지도" />
      <div className="explore-hud">
        <span className={`explore-time ${hud.time <= 10 ? "low" : ""}`}>⏱ {minutes}초</span>
        <span className={`explore-hp ${hud.hp <= 1 ? "low" : ""}`} aria-label={`체력 ${hud.hp}/${MAX_HP}`}>{Array.from({ length: MAX_HP }, (_, i) => i < hud.hp ? "❤️" : "🤍").join("")}</span>
        <span className={`explore-bag ${hud.bag >= hud.cap ? "full" : ""}`}>🎒 {hud.bag}/{hud.cap}</span>
        <span className="explore-bag-items">{Object.entries(hud.items).map(([id, n]) => <i key={id}>{icon(id)}{n}</i>)}</span>
      </div>
      <canvas ref={miniRef} className="explore-mini" style={{ width: touch ? 112 : MINI_W, height: touch ? 63 : MINI_H }} aria-label="미니맵" />
      {hud.toast && <div className="explore-toast">{hud.toast}</div>}
      {hud.phase === "ready" && <div className="explore-ready"><b>{Math.max(1, Math.ceil(hud.ready))}</b><small>{touch ? "왼쪽 스틱 이동 · 채집 버튼 · 귀환 버튼 1초 · 위험에 3번 맞으면 쓰러져요" : "WASD 이동 · F/클릭 채집 · Space 회피 · R 1초 귀환 · ❤️ 3칸, 쓰러지면 채집물 일부를 잃어요"}</small></div>}
      {info && <div className="explore-event" role="dialog" aria-label={info.name}>
        <b>{info.icon} {info.name}</b><p>{info.text}</p>
        <div><button className="save-button" disabled={!hud.accept} onClick={() => choose(true)}>{info.accept}</button>{info.decline && <button className="ghost-button" onClick={() => choose(false)}>{info.decline}</button>}</div>
        {!hud.accept && <small>{hud.event === "injured" ? `가방에 ${herb.name}가 있어야 해요.` : hud.event === "merchant" ? "가방에 채집 재료 2개가 있어야 해요." : "남은 시간이 부족해요."}</small>}
      </div>}
    </div>
    {touch ? <div className="explore-controls">
      <div className="explore-stick-zone" onPointerDown={stickDown} onPointerMove={stickMove} onPointerUp={stickUp} onPointerCancel={stickUp}><span>누른 채 끌어서 이동</span></div>
      <div className="explore-touch-buttons">
        {returnButton}
        <button className={`explore-btn gather ${hud.canGather ? "ready" : ""}`} onPointerDown={() => { pending.current.gather = true; }}>🧺<small>채집</small></button>
        <button className="explore-btn dodge" onPointerDown={() => { pending.current.dodge = true; }}>💨<small>회피</small></button>
      </div>
    </div> : returnButton}
  </div>;
}
