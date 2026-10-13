"use client";

import { useEffect, useRef } from "react";
import type { Fish, Rod } from "./fishing";

export type FishingResult = { caught: boolean; perfect: boolean; treasure: boolean };
type Behavior = "smooth" | "mixed" | "dart" | "sinker" | "floater";

const FISH_SIZE = 0.07;
const BEHAVIORS: Behavior[] = ["smooth", "mixed", "sinker", "floater", "dart"];

/** 등급별 난이도(0~100). 같은 등급 안에서도 물고기마다 조금씩 다르다. */
export function fishDifficulty(fish: Fish) {
  const base = { 흔함: 15, 보통: 40, 희귀: 72, 전설: 100 }[fish.rarity];
  const jitter = ([...fish.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 17) - 8;
  return Math.max(10, Math.min(100, base + jitter));
}

/** 물고기 움직임 성향. 전설은 항상 이리저리 튀는 "dart". */
export function fishBehavior(fish: Fish): Behavior {
  if (fish.rarity === "전설") return "dart";
  const hash = [...fish.id].reduce((sum, char) => sum + char.charCodeAt(0) * 7, 0);
  return fish.rarity === "흔함" ? (hash % 2 ? "smooth" : "floater") : BEHAVIORS[hash % BEHAVIORS.length];
}

export const BEHAVIOR_NAME: Record<Behavior, string> = { smooth: "느긋함", mixed: "변덕", dart: "날쌤", sinker: "가라앉음", floater: "떠오름" };

/**
 * 스타듀밸리식 낚시 미니게임.
 * 누르고 있으면 초록 막대가 올라가고 떼면 떨어진다. 물고기가 막대 안에 있으면 게이지가 차고, 벗어나면 줄어든다.
 */
export default function FishingGame({ fish, rod, barBonus, onFinish }: { fish: Fish; rod: Rod; barBonus: number; onFinish: (result: FishingResult) => void }) {
  const barRef = useRef<HTMLDivElement>(null), fishRef = useRef<HTMLSpanElement>(null), progressRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null), chestRef = useRef<HTMLSpanElement>(null), chestFillRef = useRef<HTMLElement>(null);
  const finishRef = useRef(onFinish);
  useEffect(() => { finishRef.current = onFinish; });

  useEffect(() => {
    const difficulty = fishDifficulty(fish), behavior = fishBehavior(fish), barSize = Math.min(0.6, rod.bar + barBonus);
    // 물고기는 초록 막대 안에서 출발해 첫 반응 시간을 준다.
    let holding = false, barY = 0, barV = 0, fishY = Math.max(0, barSize / 2 - FISH_SIZE / 2), target = 0.45, progress = 0.35, perfect = true, done = false;
    const chest = Math.random() < rod.treasure ? { y: 0.1 + Math.random() * 0.7, appearAt: 1 + Math.random() * 2.5, fill: 0, got: false } : null;
    let elapsed = 0, last = performance.now(), frame = 0;

    const press = (on: boolean) => { holding = on; };
    const down = (event: PointerEvent) => { if (event.button === 0) press(true); };
    const up = () => press(false);
    const key = (event: KeyboardEvent) => { if (event.code === "Space") { event.preventDefault(); press(event.type === "keydown"); } };
    window.addEventListener("pointerdown", down); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
    window.addEventListener("keydown", key); window.addEventListener("keyup", key);

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; elapsed += dt;
      // 초록 막대: 누르면 위로 가속, 떼면 중력. 바닥에서는 살짝 튕긴다.
      barV += (holding ? 3.4 : -2.8) * dt;
      barV = Math.max(-1.7, Math.min(1.7, barV));
      barY += barV * dt;
      if (barY < 0) { barY = 0; barV = barV < -0.35 ? -barV * 0.35 : 0; }
      if (barY > 1 - barSize) { barY = 1 - barSize; barV = 0; }
      // 물고기: 성향과 난이도에 따라 목표 지점을 바꾸며 따라간다.
      // 등급이 높을수록 목표를 자주 바꾸고, 멀리, 빠르게 움직인다.
      const rate = 0.35 + difficulty / 26 + (behavior === "dart" ? 1.4 : 0);
      if (Math.random() < rate * dt) {
        const range = 0.16 + difficulty / 140;
        let next = fishY + (Math.random() * 2 - 1) * range;
        if (behavior === "sinker") next -= 0.12;
        if (behavior === "floater") next += 0.12;
        target = Math.max(0, Math.min(1 - FISH_SIZE, next));
      }
      const follow = { smooth: 1.2, floater: 1.5, sinker: 1.5, mixed: 2.4, dart: 5 }[behavior] * (0.45 + difficulty / 55);
      fishY += (target - fishY) * Math.min(1, follow * dt);
      if (behavior === "dart" && Math.random() < (0.5 + difficulty / 80) * dt) fishY = Math.max(0, Math.min(1 - FISH_SIZE, fishY + (Math.random() * 2 - 1) * 0.08));
      // 게이지
      const center = fishY + FISH_SIZE / 2, inside = center >= barY && center <= barY + barSize;
      // 게이지: 등급이 높을수록 느리게 차고 빨리 줄어든다. 낚싯대가 이를 완화한다.
      if (inside) progress += 0.26 * (1 - difficulty / 300) * rod.gain * dt;
      else { progress -= (0.06 + difficulty / 600) * rod.drain * dt; perfect = false; }
      // 보물상자: 막대 안에 두면 열린다.
      if (chest && !chest.got && elapsed >= chest.appearAt) {
        const chestInside = chest.y + 0.03 >= barY && chest.y + 0.03 <= barY + barSize;
        chest.fill = Math.max(0, chest.fill + (chestInside ? 0.5 : -0.15) * dt);
        if (chest.fill >= 1) chest.got = true;
      }
      // 화면 반영
      const h = trackRef.current?.clientHeight ?? 300;
      if (barRef.current) { barRef.current.style.height = `${barSize * 100}%`; barRef.current.style.transform = `translateY(${-barY * h}px)`; barRef.current.classList.toggle("off", !inside); }
      if (fishRef.current) fishRef.current.style.transform = `translateY(${-fishY * h}px)`;
      if (progressRef.current) { progressRef.current.style.height = `${Math.max(0, Math.min(1, progress)) * 100}%`; progressRef.current.style.background = progress < 0.3 ? "#e0533a" : progress < 0.65 ? "#f0b23a" : "#5ec44f"; }
      if (chestRef.current && chest) {
        chestRef.current.style.display = elapsed >= chest.appearAt && !chest.got ? "grid" : "none";
        chestRef.current.style.transform = `translateY(${-chest.y * h}px)`;
        if (chestFillRef.current) chestFillRef.current.style.width = `${chest.fill * 100}%`;
      }
      if (!done && (progress >= 1 || progress <= 0)) {
        done = true;
        finishRef.current({ caught: progress >= 1, perfect: progress >= 1 && perfect, treasure: Boolean(chest?.got) });
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointerdown", down); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up);
      window.removeEventListener("keydown", key); window.removeEventListener("keyup", key);
    };
  }, [fish, rod, barBonus]);

  return (
    <div className="fishing-game" role="application" aria-label="낚시 미니게임: 마우스 버튼이나 스페이스바를 누르고 있으면 초록 막대가 올라가요">
      <div className="fg-rod" />
      <div className="fg-track" ref={trackRef}>
        <div className="fg-bar" ref={barRef} />
        <span className={`fg-fish fg-${fish.rarity}`} ref={fishRef}>{fish.rarity === "전설" ? "✨" : fish.rarity === "희귀" ? "🐠" : "🐟"}</span>
        <span className="fg-chest" ref={chestRef}>🎁<i><b ref={chestFillRef} /></i></span>
      </div>
      <div className="fg-meter"><div ref={progressRef} style={{ height: "35%" }} /></div>
      <p className="fg-help">누르고 있기 ⬆ · 떼기 ⬇<br /><small>마우스 / 스페이스바</small></p>
    </div>
  );
}
