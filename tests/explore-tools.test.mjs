// 생활 콘텐츠 2단계 탐험 장비(3.5절): 제작 재료 계획, 장착 효과(가방 +4·일반 채집 시간 −20%)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const out = buildSync({ stdin: { contents: `export * from "./app/explore/tools"; export * from "./app/explore/engine";`, resolveDir: root, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent' });
const T = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);

test('장비 제작 계획: 채집물 + 아무 농산물(황금·잠금 제외, 낮은 품질·싼 작물부터)', () => {
  const gloves = T.toolInfo('gather-gloves');
  const inv = { 'forage:soft-twig': 6, 'crop:potato:0:0': 4, 'crop:potato:2:0': 3, 'crop:strawberry:0:0': 5, 'crop:apple:0:1': 9 };
  const plan = T.toolPlan(inv, gloves, { locks: { 'crop:strawberry:0:0': true } });
  assert.equal(plan.ok, false); assert.deepEqual(plan.missing, [{ category: 'crop', id: 'any', count: 3 }]);
  const ok = T.toolPlan({ ...inv, 'crop:corn:0:0': 10 }, gloves, { locks: {} });
  assert.equal(ok.ok, true); assert.equal(ok.take['forage:soft-twig'], 5);
  assert.equal(Object.entries(ok.take).filter(([k]) => k.startsWith('crop:')).reduce((s, [, n]) => s + n, 0), 10);
  assert.equal(ok.take['crop:apple:0:1'], undefined);
});

test('장착 효과: 바구니 가방 +4, 장갑은 일반 자원만 −20%', () => {
  assert.deepEqual(T.toolBonus('sturdy-basket'), { bag: 4, gather: 0, move: false });
  const s = T.createRun({ seed: 3, runId: 'g', startedAt: 0, regionId: 'sprout-trail', inSeason: false, ...{ bagBonus: 4, gatherBonus: 0.2 } });
  assert.equal(s.bagCap, T.BAG_BASE + 4);
  s.phase = 'play';
  const small = s.nodes.find(n => n.size === 'small'); s.player.x = small.x; s.player.y = small.y;
  for (const h of s.hazards) if (h.kind !== 'mud') { h.x = h.cx = 20; h.y = h.cy = 20; }
  T.step(s, { ...T.NO_INPUT, gather: true, gatherTarget: small.id }, 0.001);
  assert.ok(Math.abs(s.gather.need - T.GATHER_SMALL * 0.8) < 1e-9);
});

test('채집 중 움직이면 취소, 바람결 채집망은 범위 안에서 계속 캔다', () => {
  const mk = moveGather => { const s = T.createRun({ seed: 5, runId: 'm', startedAt: 0, regionId: 'sprout-trail', inSeason: false, moveGather }); s.phase = 'play';
    for (const h of s.hazards) if (h.kind !== 'mud') { h.x = h.cx = 20; h.y = h.cy = 20; }
    const node = s.nodes.find(n => n.size === 'small'); s.player.x = node.x; s.player.y = node.y; T.step(s, { ...T.NO_INPUT, gather: true, gatherTarget: node.id }, 0.01); return s; };
  const a = mk(false); assert.ok(a.gather); T.step(a, { ...T.NO_INPUT, mx: 1 }, 0.01); assert.equal(a.gather, null);
  const b = mk(true); T.step(b, { ...T.NO_INPUT, mx: 1 }, 0.01); assert.ok(b.gather);
  assert.equal(T.toolBonus('breeze-net').move, true);
});
