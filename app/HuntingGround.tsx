"use client";

import { useEffect, useRef, useState } from "react";
import { EffectBurst } from "./EquipmentPanel";
import { ANIMALS, GAP_MS, HITSTOP_MS, INPUT_BUFFER_MS, RESULT_MS, TRACE_MS, animalFontCqw, damageTo, hitRadius, pickAnimal, rollLoot, startMotion, stepMotion, type Animal, type HuntOutcome, type Motion, type Weapon } from "./hunting";

/**
 * 초단기 사냥터: 흔적 예고(0.35초, 진입 방향·크기만) → 동물이 움직이며 등장 → 클릭할 때마다 즉시 판정(즉발형) →
 * 체력 0이면 0.18초 멈춤 후 포획, 제한 시간이 지나면 도주 → 결과 0.5초 → 바로 다음 흔적.
 * 판정은 지금 화면에 그려진 동물 위치(움직임 상태)로 한다. 좌표는 사냥터 크기 대비 %.
 * 2026-10-16 조작감 1단계(HUNTING_GROUND_REDESIGN): 조준점·재사용 원, 대기 중 클릭 반응(철컥)과 0.15초 입력 버퍼,
 * 명중 점멸·사냥터 흔들림·소리 구분, 그림 크기와 판정을 사냥터 폭 기준으로 통일. 피해·보상은 그대로.
 */
type Phase = "idle" | "trace" | "animal" | "result";
type Round = { animal: Animal; hp: number; misses: number; startAt: number };
type Result = { outcome: HuntOutcome; text: string; loot: Record<string, number>; x: number; y: number };
type Pop = { id: number; x: number; y: number; text: string; kind: "hit" | "miss" | "block" | "wait" };

/** 시각·난수는 컴포넌트 밖 함수로 부른다(이벤트·타이머·애니메이션 안에서만 쓰임). */
const clock = () => Date.now();
const rnd = () => Math.random();

let audio: AudioContext | null = null;
/** 짧은 효과음: 명중(퍽)·약한 명중·튕김(쇠)·빗나감(휙)·대기(철컥)·포획(딩) */
function huntSfx(kind: "hit" | "heavy" | "block" | "miss" | "wait" | "catch") {
  const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  audio ??= new Ctx();
  const ctx = audio, t = ctx.currentTime, out = ctx.createGain(); out.connect(ctx.destination);
  const tone = (type: OscillatorType, f0: number, f1: number, len: number, vol: number, at = 0) => {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t + at); o.frequency.exponentialRampToValueAtTime(f1, t + at + len);
    g.gain.setValueAtTime(vol, t + at); g.gain.exponentialRampToValueAtTime(0.0001, t + at + len); o.connect(g); g.connect(out); o.start(t + at); o.stop(t + at + len + 0.02);
  };
  if (kind === "hit") tone("triangle", 220, 90, 0.09, 0.16);
  else if (kind === "heavy") { tone("triangle", 160, 60, 0.14, 0.22); tone("sine", 90, 50, 0.16, 0.18); }
  else if (kind === "block") { tone("square", 1500, 1100, 0.07, 0.05); tone("square", 2300, 1800, 0.05, 0.03, 0.02); }
  else if (kind === "miss") tone("sine", 700, 300, 0.08, 0.05);
  else if (kind === "wait") tone("square", 420, 380, 0.04, 0.035);
  else { tone("sine", 880, 880, 0.12, 0.1); tone("sine", 1320, 1320, 0.16, 0.09, 0.08); }
}

export function HuntingGround({ effectId, weapon, paused, petCatch, petName, lootName, onLoot, quiet = false }: { effectId: string | null; weapon: Weapon; paused: boolean; petCatch: number; petName: string; lootName: (id: string) => string; onLoot: (loot: Record<string, number>, outcome: HuntOutcome, animal: Animal) => void; quiet?: boolean }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [round, setRound] = useState<Round | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [pops, setPops] = useState<Pop[]>([]);
  const [stats, setStats] = useState({ great: 0, success: 0, escape: 0 });
  /** 최근 전리품(결과 팝업 대신 아래 줄에 쌓인다) */
  const [recent, setRecent] = useState<{ at: number; outcome: HuntOutcome; loot: Record<string, number> }[]>([]);
  const arena = useRef<HTMLDivElement>(null), animalEl = useRef<HTMLSpanElement>(null), hpEl = useRef<HTMLSpanElement>(null), aimEl = useRef<HTMLSpanElement>(null);
  const roundRef = useRef<Round | null>(null), phaseRef = useRef<Phase>("idle"), motion = useRef<Motion | null>(null), timer = useRef(0), lastShot = useRef(0);
  /** 처치 멈춤 중(움직임·입력 정지), 저장된 한 발 */
  const killing = useRef(false), buffered = useRef(0);
  const [spawn, setSpawn] = useState({ x: 50, y: 60 });
  const [trace, setTrace] = useState<{ x: number; y: number; big: boolean } | null>(null);
  useEffect(() => { roundRef.current = round; phaseRef.current = phase; });
  const sound = (kind: Parameters<typeof huntSfx>[0]) => { if (!quiet) try { huntSfx(kind); } catch { /* 소리 없음 */ } };

  function stop() { window.clearTimeout(timer.current); window.clearTimeout(buffered.current); buffered.current = 0; killing.current = false; motion.current = null; setPhase("idle"); setRound(null); setResult(null); setTrace(null); }
  /** 흔적 예고: 들어올 쪽 풀이 흔들리고 눈빛만 보인다(종류는 숨기고 크기만). 이 동안은 공격할 수 없다. */
  function nextRound() {
    window.clearTimeout(timer.current);
    const animal = pickAnimal(), first = startMotion(animal, clock());
    motion.current = first; setSpawn({ x: first.x, y: first.y }); setTrace({ x: first.x, y: first.y, big: animal.size >= 5.2 });
    const pending: Round = { animal, hp: animal.hp, misses: 0, startAt: clock() + TRACE_MS };
    setRound(pending); roundRef.current = pending; setResult(null); setPops([]); setPhase("trace"); phaseRef.current = "trace";
    timer.current = window.setTimeout(() => {
      if (phaseRef.current !== "trace") return;
      const started = { ...pending, startAt: clock() }; motion.current = { ...first, turnAt: clock() + 300 };
      setTrace(null); setRound(started); roundRef.current = started; setPhase("animal"); phaseRef.current = "animal";
      timer.current = window.setTimeout(() => finish("escape", "놓쳤어요… 도망갔어요"), animal.window * 1000);
    }, TRACE_MS);
  }
  function finish(outcome: HuntOutcome, text: string) {
    const r = roundRef.current;
    if (!r || phaseRef.current !== "animal") return;
    window.clearTimeout(timer.current); window.clearTimeout(buffered.current); buffered.current = 0; killing.current = false;
    let final = outcome, line = text;
    if (outcome === "escape" && petCatch > 0 && rnd() < petCatch) { final = "success"; line = `${petName}이(가) 쫓아가 붙잡았어요!`; }
    const loot = rollLoot(r.animal, final);
    onLoot(loot, final, r.animal);
    if (final !== "escape") sound("catch");
    setRecent(list => [{ at: Date.now(), outcome: final, loot }, ...list].slice(0, 6));
    setStats(s => ({ ...s, [final]: s[final] + 1 }));
    const m = motion.current;
    setResult({ outcome: final, text: line, loot, x: m?.x ?? 50, y: m?.y ?? 60 }); setPhase("result"); phaseRef.current = "result";
    timer.current = window.setTimeout(() => { setResult(null); setRound(null); timer.current = window.setTimeout(() => { if (phaseRef.current !== "idle") nextRound(); }, GAP_MS); }, RESULT_MS);
  }
  function start() { setStats({ great: 0, success: 0, escape: 0 }); nextRound(); }

  useEffect(() => () => { window.clearTimeout(timer.current); window.clearTimeout(buffered.current); }, []);
  useEffect(() => { if (paused && phaseRef.current !== "idle") stop(); });

  // 움직임: 화면 갱신 없이 DOM만 옮긴다. 처치 멈춤 중에는 멈춰 있는다.
  useEffect(() => {
    if (phase !== "animal" || !round) return;
    let frame = 0, last = clock();
    const tick = () => {
      const now = clock(), dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (motion.current && !killing.current) {
        motion.current = stepMotion(motion.current, round.animal, now, dt);
        if (animalEl.current) { animalEl.current.style.left = `${motion.current.x}%`; animalEl.current.style.top = `${motion.current.y}%`; animalEl.current.dataset.dir = motion.current.vx < 0 ? "left" : "right"; }
        if (hpEl.current) { hpEl.current.style.left = `${motion.current.x}%`; hpEl.current.style.top = `${motion.current.y}%`; }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, round]);

  // 조준점 재사용 원: 남은 대기 비율을 CSS 변수로(React 렌더 없이)
  useEffect(() => {
    if (phase === "idle") return;
    let frame = 0;
    const tick = () => { if (aimEl.current) aimEl.current.style.setProperty("--cd", String(Math.max(0, 1 - (clock() - lastShot.current) / (weapon.cooldown * 1000)))); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, weapon.cooldown]);

  function pop(x: number, y: number, text: string, kind: Pop["kind"]) {
    const id = clock() + rnd();
    setPops(list => [...list.slice(-5), { id, x, y, text, kind }]);
    window.setTimeout(() => setPops(list => list.filter(item => item.id !== id)), 600);
  }
  /** 사냥터만 짧게 흔들기(감소된 모션 설정이면 CSS에서 끈다) */
  function shake(cls: "shake-s" | "shake-l") { const el = arena.current; if (!el) return; el.classList.remove("shake-s", "shake-l"); void el.offsetWidth; el.classList.add(cls); }
  function flash(cls: "flash" | "flash-block") { const el = animalEl.current; if (!el) return; el.classList.remove("flash", "flash-block"); void el.offsetWidth; el.classList.add(cls); }

  function moveAim(event: React.PointerEvent) {
    const rect = arena.current?.getBoundingClientRect(), el = aimEl.current; if (!rect || !el) return;
    el.style.left = `${event.clientX - rect.left}px`; el.style.top = `${event.clientY - rect.top}px`; el.style.opacity = "1";
  }
  /** 입력: 대기 중이면 철컥(남은 0.15초 이하면 한 발 저장), 아니면 바로 쏜다. */
  function press(event: React.PointerEvent) {
    moveAim(event);
    const p = phaseRef.current; if (p !== "animal" || killing.current) return;
    const rect = arena.current!.getBoundingClientRect(), px = ((event.clientX - rect.left) / rect.width) * 100, py = ((event.clientY - rect.top) / rect.height) * 100, touch = event.pointerType === "touch";
    const left = weapon.cooldown * 1000 - (clock() - lastShot.current);
    if (left > 0) {
      if (left <= INPUT_BUFFER_MS && !buffered.current) { buffered.current = window.setTimeout(() => { buffered.current = 0; fire(px, py, touch); }, left); return; }
      pop(px, py, "철컥", "wait"); sound("wait"); return;
    }
    fire(px, py, touch);
  }
  /** 즉발형: 쏘는 순간의 동물 위치로 명중을 판정한다. */
  function fire(px: number, py: number, touch: boolean) {
    const r = roundRef.current, m = motion.current;
    if (!r || !m || phaseRef.current !== "animal" || killing.current) return;
    const now = clock(); lastShot.current = now;
    const rect = arena.current!.getBoundingClientRect(), ratio = rect.height / rect.width;
    const hit = Math.hypot(px - m.x, (py - m.y) * ratio) <= hitRadius(r.animal, touch), damage = damageTo(weapon, r.animal);
    if (!hit) { pop(px, py, "빗나감", "miss"); sound("miss"); const missed = { ...r, misses: r.misses + 1 }; setRound(missed); roundRef.current = missed; return; }
    if (damage <= 0) { pop(px, py, `🛡️ 튕겨냄! (방어 ${r.animal.defense})`, "block"); sound("block"); flash("flash-block"); return; } // 방어력에 막혀 튕겨 나감(빗나감으로 치지는 않음)
    pop(px, py, `-${damage}`, "hit"); flash("flash"); sound(damage >= 3 ? "heavy" : "hit"); if (weapon.damage >= 4) shake(damage >= 4 ? "shake-l" : "shake-s");
    const hp = r.hp - damage, updated = { ...r, hp };
    setRound(updated); roundRef.current = updated;
    if (hp <= 0) {
      // 처치: 탈출 타이머를 먼저 끊고 0.18초 멈춘 뒤 포획(표현만, 판정은 이미 끝)
      window.clearTimeout(timer.current); killing.current = true; animalEl.current?.classList.add("caught");
      const quick = now - r.startAt < r.animal.window * 500;
      timer.current = window.setTimeout(() => { killing.current = false; finish(r.misses === 0 || quick ? "great" : "success", r.misses === 0 ? "백발백중!" : quick ? "재빨리 잡았어요!" : "잡았어요!"); }, HITSTOP_MS);
    }
  }

  return <div className="hunt-ground">
    <p className="hunt-hud">{weapon.icon} <b>{weapon.name}</b> · 피해 {weapon.damage} · {weapon.cooldown}초마다 · 동물을 클릭하면 바로 맞아요{petCatch > 0 ? ` · 🐕 ${petName} 붙잡기 ${Math.round(petCatch * 100)}%` : ""}</p>
    <details className="hunt-help"><summary>도움말</summary>실제 피해는 무기 피해 − 동물 방어력이에요(0이면 튕겨 나감). 풀이 흔들리는 쪽에서 동물이 나와요. 체력을 0으로 만들면 포획, 시간 안에 못 잡으면 도망가요. 빗나가지 않거나 빨리 잡으면 대성공! 조준점 바깥 원이 다시 쏠 수 있을 때까지 남은 시간이에요.</details>
    <div ref={arena} className={`hunt-arena phase-${phase}`} onPointerDown={press} onPointerMove={moveAim} onPointerLeave={() => { if (aimEl.current) aimEl.current.style.opacity = "0"; }} role="application" aria-label="사냥터">
      <span className="hunt-grass" aria-hidden="true" />
      {phase === "idle" && <button className="save-button hunt-start" onClick={start} onPointerDown={event => event.stopPropagation()}>🏹 사냥 시작</button>}
      {trace && phase === "trace" && <span className={`hunt-rustle ${trace.big ? "big" : ""}`} style={{ left: `${trace.x}%`, top: `${trace.y}%` }} aria-hidden="true"><i>🌿</i><b>👀</b></span>}
      {round && phase === "animal" && <>
        <span ref={animalEl} className={`hunt-animal move-${round.animal.move}`} style={{ left: `${spawn.x}%`, top: `${spawn.y}%`, fontSize: `${animalFontCqw(round.animal)}cqw` }}>{round.animal.icon}</span>
        <span ref={hpEl} className="hunt-hp" style={{ left: `${spawn.x}%`, top: `${spawn.y}%` }} aria-label={`체력 ${round.hp}/${round.animal.hp}`}><i style={{ width: `${Math.max(0, round.hp / round.animal.hp) * 100}%` }} /></span>
        <span key={round.startAt} className="hunt-timer" style={{ animationDuration: `${round.animal.window}s` }} aria-hidden="true" />
      </>}
      {pops.map(item => <span key={item.id} className={`hunt-pop ${item.kind}`} style={{ left: `${item.x}%`, top: `${item.y}%` }}>{item.kind === "hit" && <EffectBurst id={effectId} />}{item.text}</span>)}
      {result && <div className={`hunt-result ${result.outcome}`} style={{ left: `${Math.min(86, Math.max(14, result.x))}%`, top: `${Math.max(34, result.y)}%` }}><b>{result.outcome === "great" ? "대성공!" : result.outcome === "success" ? "성공!" : "도주…"}</b><small>{result.text}</small>{Object.entries(result.loot).map(([id, n]) => <em key={id}>+{lootName(id)} ×{n}</em>)}</div>}
      {phase !== "idle" && <span ref={aimEl} className="hunt-crosshair" aria-hidden="true" />}
      {phase !== "idle" && <button className="hunt-stop" onClick={stop} onPointerDown={event => event.stopPropagation()}>멈추기</button>}
    </div>
    {recent.length > 0 && <div className="hunt-recent"><b>🎒 최근 전리품</b>{recent.map(r => <span key={r.at} className={r.outcome}>{Object.keys(r.loot).length ? Object.entries(r.loot).map(([id, n]) => `${lootName(id)} ×${n}`).join(" · ") : "도주…"}</span>)}</div>}
    <p className="hunt-stats">대성공 {stats.great} · 성공 {stats.success} · 도주 {stats.escape}</p>
    <ul className="hunt-animals">{ANIMALS.map(animal => <li key={animal.id}><span>{animal.icon}</span><b>{animal.name}</b><small>체력 {animal.hp} · 방어 {animal.defense}</small></li>)}</ul>
  </div>;
}
