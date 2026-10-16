// 토벌 강화 회귀 테스트(IMPLEMENTATION_GAP_AUDIT 5.1·10.1·10.2): 천장·누적 보정, +10 안전선, 안정화석, 개방 유지
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';

const out = buildSync({
  stdin: { contents: `export * from "./app/raid/forge"; export { ENHANCE, ENHANCE_PITY, EMPTY_RAID } from "./app/raid/data";`, resolveDir: new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent',
});
const F = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
const step = to => F.ENHANCE.find(s => s.to === to);
const raidAt = (enhancement, extra = {}) => ({ ...F.EMPTY_RAID, stabilizers: 3, weapons: { 'raid-scythe': { enhancement, evolution: 'great-scythe', unlockedEnhancements: [11, 12, 13, 14, 15], ...extra } } });
const always = v => () => v;

test('천장: +11~+15는 계속 실패해도 정해진 번째 시도에 반드시 성공한다', () => {
  for (const [to, p] of Object.entries(F.ENHANCE_PITY).map(([k, v]) => [Number(k), v])) {
    let raid = raidAt(to - 1), tries = 0;
    while (raid.weapons['raid-scythe'].enhancement < to) {
      const w = raid.weapons['raid-scythe'], roll = F.rollEnhance(w.enhancement, step(to), false, 0, always(0.999), w.fails?.[to] ?? 0);
      raid = F.applyEnhance(raid, 'raid-scythe', roll); tries++;
      assert.ok(tries <= p.ceiling, `+${to}: ${tries}번째에도 실패`);
    }
    assert.equal(tries, p.ceiling, `+${to}`);
    assert.equal(raid.weapons['raid-scythe'].fails?.[to], undefined, '성공하면 그 단계 실패 횟수 초기화');
  }
});

test('누적 보정: start번 실패 뒤부터 step씩, 최대 max까지 오른다', () => {
  const s = step(13), p = F.ENHANCE_PITY[13];
  assert.equal(F.pityChance(s, p.start - 1).bonus, 0);
  assert.ok(Math.abs(F.pityChance(s, p.start).bonus - p.step) < 1e-9);
  assert.ok(Math.abs(F.pityChance(s, p.ceiling - 2).bonus - Math.min(p.max, (p.ceiling - 1 - p.start) * p.step)) < 1e-9);
  assert.equal(F.pityChance(s, p.ceiling - 1).chance, 1);
  assert.equal(F.pityChance(step(10), 50).chance, step(10).chance, '+10 이하는 보정 없음');
});

test('하락해도 그 목표 단계 실패 횟수는 유지되고, 개방한 단계도 그대로다', () => {
  const raid = F.applyEnhance(raidAt(12, { fails: { 13: 4 } }), 'raid-scythe', { success: false, dropped: true, saved: false });
  const w = raid.weapons['raid-scythe'];
  assert.equal(w.enhancement, 11); assert.equal(w.fails[13], 5);
  assert.deepEqual(w.unlockedEnhancements, [11, 12, 13, 14, 15]);
});

test('+10 안전선: +10에서 실패는 하락 판정이 없고, +11에서 하락해도 최저 +10', () => {
  assert.deepEqual(F.rollEnhance(10, step(11), false, 0, always(0)).success, true);
  const fail10 = F.rollEnhance(10, step(11), false, 0, (() => { let i = 0; return () => (i++ === 0 ? 0.999 : 0); })());
  assert.equal(fail10.dropped, false);
  const raid = F.applyEnhance(raidAt(11), 'raid-scythe', { success: false, dropped: true, saved: false });
  assert.equal(raid.weapons['raid-scythe'].enhancement, 10);
});

test('안정화석은 실제로 하락할 때만 1개 소모된다', () => {
  const failNoDrop = (() => { let i = 0; return () => (i++ === 0 ? 0.999 : 0.999); })();
  const r1 = F.rollEnhance(12, step(13), true, 3, failNoDrop); assert.equal(r1.saved, false);
  assert.equal(F.applyEnhance(raidAt(12), 'raid-scythe', r1).stabilizers, 3);
  const failDrop = (() => { let i = 0; return () => (i++ === 0 ? 0.999 : 0); })();
  const r2 = F.rollEnhance(12, step(13), true, 3, failDrop); assert.equal(r2.saved, true);
  const after = F.applyEnhance(raidAt(12), 'raid-scythe', r2);
  assert.equal(after.stabilizers, 2); assert.equal(after.weapons['raid-scythe'].enhancement, 12);
});
