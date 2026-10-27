// 생활 2단계 온실(2026-10-27 결정): 재배칸 1/2/4칸, 비계절 작물 2종, 저장 복원, 비용 예산
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const out = buildSync({ stdin: { contents: `export * from "./app/village/greenhouse"; export * from "./app/village/data"; export * from "./app/village/types"; export { FORAGE } from "./app/explore/data";`, resolveDir: root, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent' });
const G = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);

test('재배칸 단계별 1/2/4칸, 비계절 작물만(계절 한정 제외), 1.25배 재배 시간', () => {
  assert.deepEqual([0, 1, 2, 3].map(G.slotsOf), [0, 1, 2, 4]);
  const summer = G.offSeasonCrops('여름');
  assert.ok(summer.length > 0 && summer.every(c => !c.seasons.includes('여름') && !c.seasonalLimit));
  const tomato = summer.find(c => c.id === 'strawberry');
  assert.equal(G.greenhouseSeconds(tomato), Math.round(tomato.seconds * 1.25));
});

test('저장 복원: 모르는 작물·잘못된 칸은 버리고, 고른 작물은 2종까지', () => {
  const g = G.restoreGreenhouse({ picks: ['strawberry', 'apple', 'apple', 'nope', 'peach'], slots: [{ cropId: 'apple', plantedAt: 10, growSeconds: 60 }, { cropId: 'x', plantedAt: 1, growSeconds: 5 }, null, { cropId: 'peach', plantedAt: 5, growSeconds: -1 }, { cropId: 'apple', plantedAt: 1, growSeconds: 1 }] });
  assert.deepEqual(g.picks, ['strawberry', 'apple']);
  assert.equal(g.slots.length, 4); assert.equal(g.slots[0].cropId, 'apple'); assert.equal(g.slots[1], null); assert.equal(g.slots[3], null);
  assert.equal(G.isReady(g.slots[0], 10 + 59_000), false); assert.equal(G.isReady(g.slots[0], 10 + 60_000), true);
  const v = G.restoreVillage({ unlocked: true, facilityLevels: { greenhouse: 2 }, greenhouse: { picks: ['apple'], slots: [] } });
  assert.deepEqual(v.greenhouse.picks, ['apple']); assert.equal(G.restoreVillage({ unlocked: true }).greenhouse, undefined);
});

test('온실 비용(5.3절 예산): 농사·여름 채집, 2단계 플래그 전에는 복구 불가', () => {
  const budget = [[8000, 15000, 20, 35, 0, 0], [35000, 70000, 60, 100, 1, 2], [120000, 250000, 140, 220, 3, 5]];
  const summer = new Set(G.FORAGE.filter(f => f.season === '여름').map(f => f.id)), kinds = new Set();
  G.STAGE2_COSTS.greenhouse.forEach((cost, i) => {
    const [glo, ghi, clo, chi, rlo, rhi] = budget[i];
    const rare = cost.needs.filter(n => n.id === 'blue-firefly').reduce((s, n) => s + n.count, 0), common = cost.needs.reduce((s, n) => s + n.count, 0) - rare;
    assert.ok(cost.gold >= glo && cost.gold <= ghi); assert.ok(common >= clo && common <= chi, `${i} ${common}`); assert.ok(rare >= rlo && rare <= rhi);
    for (const n of cost.needs) { kinds.add(n.category); if (n.category === 'forage') assert.ok(summer.has(n.id)); }
  });
  assert.ok(kinds.size <= 3); assert.equal(G.isOpenFacility('greenhouse'), false);
});
