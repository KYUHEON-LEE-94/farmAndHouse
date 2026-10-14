"use client";

import { useEffect, useRef, useState } from "react";
import { EffectBurst } from "./EquipmentPanel";
import { ANIMALS, GAP_MS, RESULT_MS, damageTo, pickAnimal, rollLoot, startMotion, stepMotion, type Animal, type HuntOutcome, type Motion, type Weapon } from "./hunting";

/**
 * 초단기 사냥터: 흔적(1초, 다음 동물 예고) → 동물이 움직이며 등장 → 클릭할 때마다 즉시 판정(즉발형) →
 * 체력 0이면 포획, 제한 시간이 지나면 도주 → 결과 1초 → 다음 흔적.
 * 판정은 지금 화면에 그려진 동물 위치(움직임 상태)로 한다. 좌표는 사냥터 크기 대비 %.
 */
type Phase = "idle" | "animal" | "result";
type Round = { animal: Animal; hp: number; misses: number; startAt: number };
type Result = { outcome: HuntOutcome; text: string; loot: Record<string, number>; x: number; y: number };
type Pop = { id: number; x: number; y: number; text: string; hit: boolean };

/** 시각·난수는 컴포넌트 밖 함수로 부른다(이벤트·타이머·애니메이션 안에서만 쓰임). */
const clock = () => Date.now();
const rnd = () => Math.random();

export function HuntingGround({ effectId, weapon, paused, petCatch, petName, lootName, onLoot }: { effectId: string | null; weapon: Weapon; paused: boolean; petCatch: number; petName: string; lootName: (id: string) => string; onLoot: (loot: Record<string, number>, outcome: HuntOutcome, animal: Animal) => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [round, setRound] = useState<Round | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [pops, setPops] = useState<Pop[]>([]);
  const [stats, setStats] = useState({ great: 0, success: 0, escape: 0 });
  const arena = useRef<HTMLDivElement>(null), animalEl = useRef<HTMLSpanElement>(null), hpEl = useRef<HTMLSpanElement>(null);
  const roundRef = useRef<Round | null>(null), phaseRef = useRef<Phase>("idle"), motion = useRef<Motion | null>(null), timer = useRef(0), lastShot = useRef(0);
  const [spawn, setSpawn] = useState({ x: 50, y: 60 });
  useEffect(() => { roundRef.current = round; phaseRef.current = phase; });

  function stop() { window.clearTimeout(timer.current); motion.current = null; setPhase("idle"); setRound(null); setResult(null); }
  function nextRound() {
    window.clearTimeout(timer.current);
    const animal = pickAnimal(), first = startMotion(animal, clock());
    // 흔적 예고 없이 바로 동물이 나타난다.
    const started: Round = { animal, hp: animal.hp, misses: 0, startAt: clock() };
    motion.current = first; setSpawn({ x: first.x, y: first.y });
    setRound(started); setResult(null); setPops([]); setPhase("animal"); roundRef.current = started; phaseRef.current = "animal";
    timer.current = window.setTimeout(() => finish("escape", "놓쳤어요… 도망갔어요"), animal.window * 1000);
  }
  function finish(outcome: HuntOutcome, text: string) {
    const r = roundRef.current;
    if (!r || phaseRef.current !== "animal") return;
    window.clearTimeout(timer.current);
    let final = outcome, line = text;
    if (outcome === "escape" && petCatch > 0 && rnd() < petCatch) { final = "success"; line = `${petName}이(가) 쫓아가 붙잡았어요!`; }
    const loot = rollLoot(r.animal, final);
    if (Object.keys(loot).length) onLoot(loot, final, r.animal);
    setStats(s => ({ ...s, [final]: s[final] + 1 }));
    const m = motion.current;
    setResult({ outcome: final, text: line, loot, x: m?.x ?? 50, y: m?.y ?? 60 }); setPhase("result"); phaseRef.current = "result";
    timer.current = window.setTimeout(() => { setResult(null); setRound(null); timer.current = window.setTimeout(() => { if (phaseRef.current !== "idle") nextRound(); }, GAP_MS); }, RESULT_MS);
  }
  function start() { setStats({ great: 0, success: 0, escape: 0 }); nextRound(); }

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => { if (paused && phaseRef.current !== "idle") stop(); });

  // 움직임: 화면 갱신 없이 DOM만 옮긴다.
  useEffect(() => {
    if (phase !== "animal" || !round) return;
    let frame = 0, last = clock();
    const tick = () => {
      const now = clock(), dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (motion.current) {
        motion.current = stepMotion(motion.current, round.animal, now, dt);
        if (animalEl.current) { animalEl.current.style.left = `${motion.current.x}%`; animalEl.current.style.top = `${motion.current.y}%`; animalEl.current.dataset.dir = motion.current.vx < 0 ? "left" : "right"; }
        if (hpEl.current) { hpEl.current.style.left = `${motion.current.x}%`; hpEl.current.style.top = `${motion.current.y}%`; }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, round]);

  /** 즉발형: 클릭한 순간의 동물 위치로 명중을 판정한다. */
  function shoot(event: React.PointerEvent) {
    const r = roundRef.current, m = motion.current;
    if (!r || !m || phaseRef.current !== "animal") return;
    const now = clock();
    if (now - lastShot.current < weapon.cooldown * 1000) return;
    lastShot.current = now;
    const rect = arena.current!.getBoundingClientRect(), ratio = rect.height / rect.width;
    const px = ((event.clientX - rect.left) / rect.width) * 100, py = ((event.clientY - rect.top) / rect.height) * 100;
    const hit = Math.hypot(px - m.x, (py - m.y) * ratio) <= r.animal.size, damage = damageTo(weapon, r.animal);
    const id = now + rnd();
    setPops(list => [...list.slice(-5), { id, x: px, y: py, text: !hit ? "빗나감" : damage > 0 ? `-${damage}` : "튕겨냄!", hit: hit && damage > 0 }]);
    window.setTimeout(() => setPops(list => list.filter(pop => pop.id !== id)), 600);
    if (!hit) { const missed = { ...r, misses: r.misses + 1 }; setRound(missed); roundRef.current = missed; return; }
    if (damage <= 0) return; // 방어력에 막혀 튕겨 나감(빗나감으로 치지는 않음)
    const hp = r.hp - damage, updated = { ...r, hp };
    setRound(updated); roundRef.current = updated;
    if (hp <= 0) {
      const quick = now - r.startAt < r.animal.window * 500;
      finish(r.misses === 0 || quick ? "great" : "success", r.misses === 0 ? "백발백중!" : quick ? "재빨리 잡았어요!" : "잡았어요!");
    }
  }

  return <div className="hunt-ground">
    <p className="hint">{weapon.icon} <b>{weapon.name}</b> · 데미지 {weapon.damage} · 다음 발까지 {weapon.cooldown}초. 실제 데미지는 무기 데미지 − 동물 방어력이에요(0이면 튕겨 나감). 움직이는 동물을 클릭하면 바로 맞아요(즉발형). 체력을 0으로 만들면 포획, 시간 안에 못 잡으면 도망가요. 빗나가지 않거나 빨리 잡으면 대성공!{petCatch > 0 ? ` 🐕 ${petName}이(가) 도망치는 동물을 ${Math.round(petCatch * 100)}% 확률로 붙잡아요.` : ""}</p>
    <div ref={arena} className={`hunt-arena phase-${phase}`} onPointerDown={shoot} role="application" aria-label="사냥터">
      <span className="hunt-grass" aria-hidden="true" />
      {phase === "idle" && <button className="save-button hunt-start" onClick={start} onPointerDown={event => event.stopPropagation()}>🏹 사냥 시작</button>}
      {round && phase === "animal" && <>
        <span ref={animalEl} className={`hunt-animal move-${round.animal.move}`} style={{ left: `${spawn.x}%`, top: `${spawn.y}%`, fontSize: `${round.animal.size * 0.62}vw` }}>{round.animal.icon}</span>
        <span ref={hpEl} className="hunt-hp" style={{ left: `${spawn.x}%`, top: `${spawn.y}%` }} aria-label={`체력 ${round.hp}/${round.animal.hp}`}><i style={{ width: `${Math.max(0, round.hp / round.animal.hp) * 100}%` }} /></span>
        <span key={round.startAt} className="hunt-timer" style={{ animationDuration: `${round.animal.window}s` }} aria-hidden="true" />
      </>}
      {pops.map(pop => <span key={pop.id} className={`hunt-pop ${pop.hit ? "hit" : "miss"}`} style={{ left: `${pop.x}%`, top: `${pop.y}%` }}>{pop.hit && <EffectBurst id={effectId} />}{pop.text}</span>)}
      {result && <div className={`hunt-result ${result.outcome}`} style={{ left: `${Math.max(12, Math.min(88, result.x))}%`, top: `${Math.max(30, result.y)}%` }}><b>{result.outcome === "great" ? "대성공!" : result.outcome === "success" ? "성공!" : "도주…"}</b><small>{result.text}</small>{Object.entries(result.loot).map(([id, n]) => <em key={id}>+{lootName(id)} ×{n}</em>)}</div>}
      {phase !== "idle" && <button className="hunt-stop" onClick={stop} onPointerDown={event => event.stopPropagation()}>멈추기</button>}
    </div>
    <p className="hunt-stats">대성공 {stats.great} · 성공 {stats.success} · 도주 {stats.escape}</p>
    <ul className="hunt-animals">{ANIMALS.map(animal => <li key={animal.id}><span>{animal.icon}</span><b>{animal.name}</b><small>체력 {animal.hp} · 방어 {animal.defense}</small></li>)}</ul>
  </div>;
}
