"use client";

import { useEffect, useRef, useState } from "react";
import { COOK_MAX_SCORE, COOK_STEPS, gradeChances } from "./kitchen";

/**
 * 요리 타이밍 미니게임: 막대 위를 왕복하는 표시가 가운데(정확)·주변(좋음) 구역에 있을 때 누른다.
 * 3단계(재료 넣기·불 조절·마무리). 단계가 오를수록 조금 빨라진다. 스페이스·엔터·버튼으로 누른다.
 * 끝나면 점수(0~6)를 넘긴다. 등급은 점수에 따른 확률로 정해진다(확정 아님).
 */
const PERFECT = 0.06, GOOD = 0.16;

export function CookingGame({ title, icon, onFinish }: { title: string; icon: string; onFinish: (score: number) => void }) {
  const [step, setStep] = useState(0);
  const [results, setResults] = useState<number[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const pos = useRef(0.5), dir = useRef(1), marker = useRef<HTMLSpanElement>(null), waiting = useRef(false);
  const done = results.length >= COOK_STEPS.length;

  // 표시 움직이기(화면 갱신 없이 DOM만 옮긴다). 창이 가려지면 브라우저가 알아서 멈춘다.
  useEffect(() => {
    if (done) return;
    let frame = 0, last = performance.now();
    const speed = 0.9 + step * 0.35;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!waiting.current) {
        pos.current += dir.current * speed * dt;
        if (pos.current > 1) { pos.current = 1; dir.current = -1; }
        if (pos.current < 0) { pos.current = 0; dir.current = 1; }
        if (marker.current) marker.current.style.left = `${pos.current * 100}%`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [step, done]);

  function hit() {
    if (done || waiting.current) return;
    const off = Math.abs(pos.current - 0.5), points = off <= PERFECT ? 2 : off <= GOOD ? 1 : 0;
    waiting.current = true;
    setFlash(points === 2 ? "정확해요! ✨" : points === 1 ? "좋아요!" : "아쉬워요…");
    window.setTimeout(() => {
      waiting.current = false; setFlash(null);
      setResults(list => [...list, points]); setStep(value => value + 1);
      pos.current = Math.random() < 0.5 ? 0.05 : 0.95; dir.current = pos.current < 0.5 ? 1 : -1;
    }, 650);
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); hit(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const score = results.reduce((sum, value) => sum + value, 0), [normal, good, best] = gradeChances(score);
  return <div className="cook-game">
    <div className="cook-title"><span className="cook-pot">{icon}</span><b>{title}</b></div>
    <ol className="cook-steps">{COOK_STEPS.map((name, i) => <li key={name} className={i === step && !done ? "now" : i < results.length ? (results[i] === 2 ? "perfect" : results[i] === 1 ? "good" : "miss") : ""}>{name}{i < results.length && <em>{results[i] === 2 ? " ✨" : results[i] === 1 ? " ○" : " ✕"}</em>}</li>)}</ol>
    {!done ? <>
      <div className="cook-bar" aria-hidden="true"><i className="zone good" style={{ left: `${(0.5 - GOOD) * 100}%`, width: `${GOOD * 200}%` }} /><i className="zone perfect" style={{ left: `${(0.5 - PERFECT) * 100}%`, width: `${PERFECT * 200}%` }} /><span ref={marker} className="cook-marker" /></div>
      <p className="cook-flash" aria-live="polite">{flash ?? `${COOK_STEPS[step]}: 표시가 가운데 노란 칸에 오면 눌러요 (스페이스)`}</p>
      <button className="save-button cook-hit" onClick={hit}>🍳 지금!</button>
    </> : <>
      <p className="cook-score">점수 {score}/{COOK_MAX_SCORE}</p>
      <p className="cook-chance">등급 확률 · 일품★★ {Math.round(best * 100)}% · 맛있음★ {Math.round(good * 100)}% · 보통 {Math.round(normal * 100)}%</p>
      <button className="save-button cook-hit" onClick={() => onFinish(score)}>🍽️ 접시에 담기</button>
    </>}
    {!done && <p className="cook-chance small">지금까지 점수 {score} · 일품 확률 {Math.round(best * 100)}%</p>}
  </div>;
}
