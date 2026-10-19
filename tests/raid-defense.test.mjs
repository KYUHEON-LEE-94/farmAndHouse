// 토벌 0단계(RAID_FLOOR_30_EXPANSION_AUDIT 7.3·11.4): 방어 공식(운영 flat / 숨김 ratio), 보스 재료 연속 미획득 천장
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';

const out = buildSync({
  stdin: { contents: `export { mitigate, setDefenseMode } from "./app/raid/engine"; export { rollDrops } from "./app/raid/forge"; export { FLOOR_REWARDS, BOSS_DROP_PITY } from "./app/raid/data";`, resolveDir: new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent',
});
const R = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);

test('운영 방어(flat)는 그대로: 피해 − 방어(방어형 +3), 최소 1', () => {
  R.setDefenseMode('flat');
  assert.equal(R.mitigate(150, 5), 145); assert.equal(R.mitigate(20, 5, 3), 12); assert.equal(R.mitigate(3, 8), 1);
});

test('비율식(ratio): 방어 0·4·8·12·15 감소율이 기준표와 같다', () => {
  R.setDefenseMode('ratio');
  const cut = def => 1 - R.mitigate(10000, def) / 10000;
  for (const [def, pct] of [[0, 0], [4, 19.4], [5, 23.1], [8, 32.4], [10, 37.5], [12, 41.9], [14, 45.7], [15, 47.4]]) assert.ok(Math.abs(cut(def) * 100 - pct) < 0.06, `방어 ${def}: ${(cut(def) * 100).toFixed(2)}%`);
  assert.equal(R.mitigate(20, 5, 3), Math.round(20 * 1000 / (100 + 8 * 6)) / 10, '방어형 추가 3은 유효 방어에 더한다');
  R.setDefenseMode('flat');
});

test('보스 재료 천장: 15·20층 반복 클리어에서 3번 연속 못 받으면 4번째는 확정, 받으면 초기화', () => {
  for (const floor of [15, 20]) {
    const { id } = R.BOSS_DROP_PITY[floor], drops = R.FLOOR_REWARDS[floor].repeat;
    let miss = {};
    for (let i = 0; i < 3; i++) { const box = R.rollDrops(drops, floor, true, miss, () => 0.999); assert.equal(box.gain[id], undefined); miss = box.bossMiss; }
    assert.equal(miss[id], 3);
    const fourth = R.rollDrops(drops, floor, true, miss, () => 0.999);
    assert.equal(fourth.gain[id], 1); assert.equal(fourth.forced, true); assert.equal(fourth.bossMiss[id], 0);
    const lucky = R.rollDrops(drops, floor, true, { [id]: 2 }, () => 0); assert.equal(lucky.bossMiss[id], 0);
  }
  const first = R.rollDrops(R.FLOOR_REWARDS[15].first, 15, false, { 'crimson-antler': 5 }, () => 0.999);
  assert.deepEqual(first.bossMiss, { 'crimson-antler': 5 }, '첫 클리어 상자는 천장 횟수를 건드리지 않는다');
});
