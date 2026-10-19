// 특수공격 숙련 ★(RAID_FLOOR_30_EXPANSION_AUDIT 11.6): 효과 누적, 비용 총합, 실제 특수 피해 증가
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
const out = buildSync({ stdin: { contents: `export * from "./app/raid/engine"; export { SPECIAL_MASTERY, gearOf, EMPTY_RAID, FLOORS, weaponStats } from "./app/raid/data";`, resolveDir: new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent' });
const R = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
const raidWith = star => ({ ...R.EMPTY_RAID, weapons: { 'raid-hoe': { enhancement: 13, evolution: 'quake-hammer', unlockedEnhancements: [] } }, equipped: { ...R.EMPTY_RAID.equipped, weapon: 'raid-hoe' }, mastery: { 'quake-hammer': star } });

test('별 효과: ★당 특수 피해 +4%, ★5 +20%·재사용 −4%, ★3부터 잔향. 총비용 480만 + 인장 83', () => {
  assert.deepEqual(R.SPECIAL_MASTERY.map(m => m.dmg), [0.04, 0.08, 0.12, 0.16, 0.2]);
  assert.equal(R.SPECIAL_MASTERY.reduce((t, m) => t + m.gold, 0), 4800000);
  assert.equal(R.SPECIAL_MASTERY.reduce((t, m) => t + m.seals, 0), 83);
  assert.equal(R.gearOf(raidWith(0)).specialDmg, 0); assert.equal(R.gearOf(raidWith(2)).specialEcho, 0);
  const g5 = R.gearOf(raidWith(5)); assert.equal(g5.specialDmg, 0.2); assert.equal(g5.specialCd, 0.04); assert.equal(g5.specialEcho, 1);
});

test('실전: ★5 대지 균열이 같은 시드에서 ★0보다 특수 피해가 크다(잔향 포함)', () => {
  const special = star => {
    const keep = Math.random; let x = 7; Math.random = () => { x = (x * 16807) % 2147483647; return x / 2147483647; };
    try {
      const s = R.createRaid(R.FLOORS[9], R.weaponStats(13, 'quake-hammer', 'raid-hoe'), 'quake-hammer', [], R.gearOf(raidWith(star)), null, 3);
      s.spawnAcc = -1e9; s.nextElite = 1e9; s.monsters = []; s.special.readyAt = 0;
      const p = s.player, def = { id: 'dummy', name: '허수아비', icon: '🎯', kind: 'chase', hp: 1e6, damage: 0, defense: 0, speed: 0, radius: 16, xp: 0 };
      for (let i = 0; i < 6; i++) s.monsters.push({ uid: 900 + i, def, name: def.name, icon: def.icon, x: p.x + 80 + i * 40, y: p.y, r: 16, hp: 1e6, maxHp: 1e6, damage: 0, defense: 0, speed: 0, elite: true, boss: null, xp: 0, timer: 99, state: 'move', stateT: 0, dir: { x: -1, y: 0 }, tele: null, rate: 1, split: true, summoned: false, flash: 0, shots: 0, kvx: 0, kvy: 0, t2: 99, t3: 99, t4: 99, markUntil: 0, slowUntil: 0, slowMul: 1, expose: 0, frozenUntil: 0, takenUntil: 0, takenBonus: 0, combo: 0, inNet: false });
      for (let i = 0; i < 120; i++) { s.choices = null; R.stepRaid(s, 1 / 60, { up: false, down: false, left: false, right: false, aimX: p.x + 180 - s.cam.x, aimY: p.y - s.cam.y, attack: false, special: i === 1, dash: false, food: [false, false, false] }); }
      return s.dmgBy.special;
    } finally { Math.random = keep; }
  };
  const base = special(0), top = special(5);
  assert.ok(top > base * 1.2, `★0 ${Math.round(base)} → ★5 ${Math.round(top)}`);
});
