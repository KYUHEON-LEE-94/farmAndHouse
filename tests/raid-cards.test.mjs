// 토벌 각성 카드 자동 검증(WEAPON_CARD_UI_DESIGN_SPEC.md 1절 "자동 검증 규칙").
// - 제시형: 레벨·공격 방식별로 항상 중복 없는 3장, Lv.3 이상은 공격 방식 전용 카드 1장 보장
// - 효과형: 제시될 수 있는 공격 카드는, 같은 시드로 카드만 더해 돌렸을 때 전투 결과가 반드시 달라진다
// - 분사형: 빙결은 빠른 손잡이·틱 속도와 상관없이 실제 2초 연속 적중에 발동한다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';

const out = buildSync({
  stdin: { contents: `export * from "./app/raid/engine"; export * from "./app/raid/awakenings"; export { FLOORS, weaponStats, AWAKENINGS } from "./app/raid/data"; export { RAID_WEAPONS } from "./app/raid/weapons";`, resolveDir: new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent',
});
const R = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);

/** 시드를 고정한 Math.random(엔진 rnd가 Math.random을 매번 부른다) */
function seeded(seed) { let x = seed >>> 0; return () => { x = (x + 0x6D2B79F5) >>> 0; let t = x; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function withSeed(seed, run) { const keep = Math.random; Math.random = seeded(seed); try { return run(); } finally { Math.random = keep; } }

const WEAPONS = R.RAID_WEAPONS.map(w => w.id);
const evoOf = (id, k = 0) => R.RAID_WEAPONS.find(w => w.id === id).evos[k].id;
function makeRaid(weaponId, picks = {}, floorNo = 4, evolved = false, evoIndex = 0) {
  const evo = evolved ? evoOf(weaponId, evoIndex) : null;
  const s = R.createRaid(R.FLOORS[floorNo - 1], R.weaponStats(10, evo, weaponId), evo, [], undefined, null, 12345);
  s.picks = { ...picks }; s.level = 6;
  return s;
}
/** 가까운 적을 조준하고 자동 공격하며 seconds초 진행. 각성 선택은 건너뛴다. */
function simulate(s, seconds) {
  for (let i = 0; i < seconds * 60 && !s.over; i++) {
    if (s.choices) { s.choices = null; }
    const p = s.player; let t = null, best = 1e9;
    for (const m of s.monsters) { if (m.hp <= 0) continue; const d = Math.hypot(m.x - p.x, m.y - p.y); if (d < best) { best = d; t = m; } }
    R.stepRaid(s, 1 / 60, { up: false, down: false, left: false, right: false, aimX: (t?.x ?? p.x + 60) - s.cam.x, aimY: (t?.y ?? p.y) - s.cam.y, attack: true, dash: false, food: [false, false, false] });
  }
  return s;
}
const signature = s => JSON.stringify([Math.round(s.dmgBy.basic), s.kills, Math.round(s.player.hp), Math.round(s.player.x), Math.round(s.player.y), Math.round(s.xp)]);

test('제시형: 레벨·무기별로 항상 중복 없는 유효 카드 3장, Lv.3 이상은 공격 방식 전용 카드 1장 보장', () => {
  for (const weaponId of WEAPONS) for (const level of [2, 3, 4, 6, 7, 9]) for (let seed = 1; seed <= 40; seed++) {
    withSeed(seed, () => {
      const s = makeRaid(weaponId); s.level = level;
      const ctx = R.choiceContext(s), valid = R.validCards(ctx), cards = R.rollChoices(ctx, 3);
      assert.equal(cards.length, 3, `${weaponId} Lv${level}`);
      assert.equal(new Set(cards).size, 3);
      for (const id of cards) assert.ok(valid.includes(id), `${id} not valid for ${weaponId}`);
      for (const id of cards) { const modes = R.AWAKEN_META[id].modes; if (modes) assert.ok(modes.includes(s.weapon.mode), `${id} offered to ${s.weapon.mode}`); }
      if (level >= 3 && level !== 5 && valid.some(R.isModeCard)) assert.ok(cards.some(R.isModeCard), `${weaponId} Lv${level} has no mode card: ${cards}`);
    });
  }
});

test('효과형: 제시될 수 있는 공격·기동 카드는 수치나 전투 결과가 달라진다', () => {
  // 조건부(정예·보스·펫·음식·지형·특수·보조무기 등)는 별도 조건이 있어야 해서 제외하고, 항상 작동해야 하는 카드만 본다.
  // 묵직한 휘두르기·집중 공격은 한두 대에 죽는 잡몹이 아니라 정예·보스 상대에서 작동하는 조건형이라 여기서 뺀다.
  const ALWAYS = new Set(['keen-edge', 'quick-grip', 'critical-eye', 'critical-force', 'first-strike', 'close-instinct', 'keep-distance', 'battle-tempo', 'armor-crack', 'wind-step']);
  // 경직(stun-slam)도 한 방에 죽지 않는 적(정예·후반 몹)에서 작동하는 조건형이다.
  // 집중 피해(focus-spray)는 같은 적을 1초 이상 맞혀야 해서, 비율식 방어(raid-30)에서 일반 몹이 1초 안에 쓰러지면 정예·보스 전용 조건형이 된다.
  const CONDITIONAL = new Set(['stun-slam', 'focus-spray']);
  const failures = [];
  for (const weaponId of WEAPONS) {
    const base = makeRaid(weaponId);
    const offered = R.validCards({ ...R.choiceContext(base), level: 9 }).filter(id => (R.isModeCard(id) || ALWAYS.has(id)) && !CONDITIONAL.has(id));
    const ref = withSeed(7, () => signature(simulate(makeRaid(weaponId), 25)));
    for (const id of offered) {
      // 수치형: 지금 무기 기준 미리보기 수치가 바뀌면 통과, 아니면 행동형: 같은 시드 전투 결과가 달라야 한다
      if (R.previewCard(makeRaid(weaponId), id)) continue;
      const sig = withSeed(7, () => signature(simulate(makeRaid(weaponId, { [id]: 1 }), 25)));
      if (sig === ref) failures.push(`${weaponId}: ${id}`);
    }
  }
  assert.deepEqual(failures, [], `효과가 없는 카드: ${failures.join(', ')}`);
});

test('분사형: 빙결은 빠른 손잡이와 상관없이 실제 2초 연속 적중에 발동한다', () => {
  const freezeAt = picks => withSeed(3, () => {
    const s = makeRaid('raid-can', picks, 1, true, 1); // 빙결 분사기(진화 B)
    s.monsters = []; s.spawnAcc = -1e9;
    const m = s.monsters[0] ?? null; void m;
    // 플레이어 바로 앞에 움직이지 않는 허수아비 1마리
    const def = { ...R.FLOORS[0].boss, id: 'dummy', name: '허수아비', icon: '🎯', kind: 'chase', hp: 1e9, damage: 0, defense: 0, speed: 0, radius: 14, xp: 0 };
    s.monsters.push({ uid: 999, def, name: def.name, icon: def.icon, x: s.player.x + 60, y: s.player.y, r: 14, hp: 1e9, maxHp: 1e9, damage: 0, defense: 0, speed: 0, elite: true, boss: null, xp: 0, timer: 99, state: 'move', stateT: 0, dir: { x: -1, y: 0 }, tele: null, rate: 1, split: false, summoned: false, flash: 0, shots: 0, kvx: 0, kvy: 0, slowUntil: 0, slowMul: 1, expose: 0, frozenUntil: 0, takenUntil: 0, takenBonus: 0, combo: 0, inNet: false, t2: 99, t3: 99, t4: 99, markUntil: 0 });
    const dummy = s.monsters[0];
    for (let i = 0; i < 6 * 60; i++) {
      const before = dummy.expose;
      R.stepRaid(s, 1 / 60, { up: false, down: false, left: false, right: false, aimX: dummy.x - s.cam.x, aimY: dummy.y - s.cam.y, attack: true, dash: false, food: [false, false, false] });
      dummy.x = s.player.x + 60; dummy.y = s.player.y; dummy.hp = 1e9;
      if (dummy.expose < before && before > 1) return s.t; // 누적치가 2초를 넘어 초기화된 순간 = 빙결 판정
    }
    return null;
  });
  const t0 = freezeAt({}), t1 = freezeAt({ 'quick-grip': 1 }), t2 = freezeAt({ 'quick-grip': 2, 'spray-tick': 2 });
  for (const t of [t0, t1, t2]) { assert.ok(t !== null, 'freeze never happened'); }
  // 정예에게는 빙결 효과가 걸리지 않지만 누적·초기화는 같다. 2초 ± 2틱
  for (const t of [t0, t1, t2]) assert.ok(Math.abs(t - 2) <= 0.35, `freeze at ${t}s`);
});
