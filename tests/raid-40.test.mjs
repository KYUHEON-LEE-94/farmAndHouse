// 31~40층 숨김 구현 회귀 테스트(RAID_FLOOR_40_EXPANSION_AUDIT 4·5·3.3·12.1절): +19~+22 강화·+18 안전선·성장 공식·재료 천장·비용 20만 회
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';

const out = buildSync({
  stdin: { contents: `export * from "./app/raid/forge"; export { raidWeaponStats, RAID_WEAPONS } from "./app/raid/weapons"; export { ENHANCE, ENHANCE_PITY, EMPTY_RAID, FLOOR_REWARDS, RAID_ITEMS, RAID_MAX_FLOOR } from "./app/raid/data";`, resolveDir: new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent',
});
const F = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
const step = to => F.ENHANCE.find(s => s.to === to);
const raidAt = enhancement => ({ ...F.EMPTY_RAID, stabilizers: 0, weapons: { 'raid-scythe': { enhancement, evolution: 'great-scythe' } } });

test('+19~+22 표: 성공률·하락률·골드·보정 천장이 문서 4절과 같다', () => {
  const want = { 19: [0.1, 0.06, 340000, 190000, 10, 0.015, 22], 20: [0.09, 0.07, 390000, 230000, 11, 0.014, 24], 21: [0.08, 0.06, 450000, 280000, 12, 0.013, 25], 22: [0.07, 0.07, 520000, 340000, 13, 0.012, 27] };
  for (const [to, [chance, drop, gold, open, start, inc, ceiling]] of Object.entries(want)) {
    const s = step(Number(to)), p = F.ENHANCE_PITY[to];
    assert.deepEqual([s.chance, s.drop, s.gold, s.open.gold], [chance, drop, gold, open], `+${to}`);
    assert.deepEqual([p.start, p.step, p.max, p.ceiling], [start, inc, 0.12, ceiling], `+${to} 보정`);
  }
  assert.equal(F.RAID_MAX_FLOOR, 30, '숨김 단계: 최대 층은 올리지 않는다');
});

test('+18 안전선: +18에서 실패는 하락 판정이 없고, +19 이상에서 하락해도 최저 +18', () => {
  const failDrop = () => { let i = 0; return () => (i++ === 0 ? 0.999 : 0); };
  assert.equal(F.rollEnhance(18, step(19), false, 0, failDrop()).dropped, false);
  assert.equal(F.rollEnhance(19, step(20), false, 0, failDrop()).dropped, true);
  assert.equal(F.applyEnhance(raidAt(19), 'raid-scythe', { success: false, dropped: true, saved: false }).weapons['raid-scythe'].enhancement, 18);
  assert.equal(F.applyEnhance(raidAt(21), 'raid-scythe', { success: false, dropped: true, saved: false }).weapons['raid-scythe'].enhancement, 20);
  assert.equal(F.applyEnhance(raidAt(17), 'raid-scythe', { success: false, dropped: true, saved: false }).weapons['raid-scythe'].enhancement, 16, '+18 전에는 기존 규칙');
});

test('+19~+22 성장: +18 대비 단계당 피해 ×1.06, 사거리 ×1.01, 간격 ×0.99', () => {
  for (const w of F.RAID_WEAPONS) for (const { id: evo } of w.evos) {
    const a = F.raidWeaponStats(w.id, 18, evo), b = F.raidWeaponStats(w.id, 22, evo), c = F.raidWeaponStats(w.id, 17, evo);
    assert.ok(Math.abs(b.damage / a.damage - Math.pow(1.06, 4)) < 0.01, `${evo} 피해 ${a.damage}→${b.damage}`);
    assert.ok(Math.abs(b.interval / a.interval - Math.pow(0.99, 4)) < 0.01, `${evo} 간격`);
    if (a.range > 20) assert.ok(Math.abs(b.range / a.range - Math.pow(1.01, 4)) < 0.02, `${evo} 사거리`);
    assert.ok(Math.abs(a.damage / c.damage - 1.08) < 0.01, `${evo}: +16~+18은 그대로 ×1.08`);
  }
});

test('재료 7종 등록, 31~40층 보상 골격, 일반·보스 재료 3회 연속 미획득 천장', () => {
  for (const id of ['sky-iron', 'cloud-crystal', 'storm-core', 'star-ash', 'void-crystal', 'throne-fragment', 'star-crown']) assert.ok(F.RAID_ITEMS[id], id);
  for (let f = 31; f <= 40; f++) { const r = F.FLOOR_REWARDS[f]; assert.ok(r && r.stabilizer <= 0.1, `${f}층`); }
  assert.ok(!F.FLOOR_REWARDS[40].repeat.some(([id]) => id === 'throne-fragment'), '왕좌 파편은 40층에서 대신 지급하지 않는다');
  const never = () => 0.999;
  for (const [floor, id] of [[33, 'cloud-crystal'], [38, 'void-crystal'], [35, 'storm-core'], [39, 'throne-fragment'], [40, 'star-crown']]) {
    let miss = {};
    for (let i = 0; i < 3; i++) { const r = F.rollDrops(F.FLOOR_REWARDS[floor].repeat, floor, true, miss, never); assert.equal(r.gain[id], undefined); miss = r.bossMiss; }
    const r = F.rollDrops(F.FLOOR_REWARDS[floor].repeat, floor, true, miss, never);
    assert.ok(r.gain[id] >= 1, `${floor}층 ${id} 4번째 확정`); assert.equal(r.bossMiss[id], 0); assert.ok(r.forced);
  }
});

test('강화 비용 20만 회(+18→+22, 개방비 포함, 하락·재승급·보정 유지): 평균 2,700~3,300만, 하위 10% 5,500만 이하', () => {
  let seed = 12345; const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  const N = 200000, costs = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    let raid = raidAt(18), gold = 0; const opened = new Set();
    while (raid.weapons['raid-scythe'].enhancement < 22) {
      const w = raid.weapons['raid-scythe'], s = step(w.enhancement + 1);
      if (!opened.has(s.to)) { opened.add(s.to); gold += s.open.gold; }
      gold += s.gold;
      raid = F.applyEnhance(raid, 'raid-scythe', F.rollEnhance(w.enhancement, s, false, 0, rnd, w.fails?.[s.to] ?? 0));
    }
    costs[i] = gold;
  }
  costs.sort(); const mean = costs.reduce((a, b) => a + b, 0) / N, p90 = costs[Math.floor(N * 0.9)];
  console.log(`+18→+22 평균 ${Math.round(mean / 1e4)}만 · 하위 10% ${Math.round(p90 / 1e4)}만 · 하위 1% ${Math.round(costs[Math.floor(N * 0.99)] / 1e4)}만`);
  // 2026-10-21 결정: 평균 2,700만~3,300만, 운 나쁜 상위 10%도 5,500만 이하
  assert.ok(mean >= 2.7e7 && mean <= 3.3e7, `평균 ${mean}`);
  assert.ok(p90 <= 5.5e7, `하위 10% ${p90}`);
});
