// 보스 전투 요소(RAID_FLOOR_30_EXPANSION_AUDIT 5.2): 예고 중 무피해, 발동 1회 판정, 고리 틈, 추적 고정, 회전 광선 주기 피해, 안전 위치
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';

const out = buildSync({
  stdin: { contents: `export * from "./app/raid/bossKit";`, resolveDir: new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent',
});
const K = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
const run = (h, px, py, secs, owner) => { let total = 0; for (let t = 0; t < secs; t += 1 / 60) total += K.stepHazard(h, 1 / 60, px, py, 14, owner); return total; };

test('각도 광선: 예고 중에는 피해가 없고 발동 순간 한 번만 맞는다', () => {
  const h = K.hazard({ kind: 'beam', x: 0, y: 0, angle: Math.PI / 4, len: 400, width: 40, tele: 1, damage: 30, label: '광선' });
  assert.equal(run(h, 100, 100, 0.95), 0, '예고 중 피해');
  assert.equal(run(h, 100, 100, 0.5), 30, '발동 1회');
  const miss = K.hazard({ kind: 'beam', x: 0, y: 0, angle: 0, len: 400, width: 40, tele: 1, damage: 30, label: '광선' });
  assert.equal(run(miss, 100, 60, 2), 0, '선에서 60px 떨어지면 안 맞음(폭 40 + 반지름 14)');
});

test('확장 고리: 띠가 지나갈 때 한 번만, 틈 방향에서는 안 맞는다', () => {
  const ring = () => K.hazard({ kind: 'ring', x: 0, y: 0, r0: 20, r1: 320, band: 30, tele: 0.8, life: 1.5, damage: 24, gapAt: 0, gapArc: 0.8, label: '고리' });
  assert.equal(run(ring(), 0, 200, 3), 24, '틈이 아닌 방향은 1회');
  assert.equal(run(ring(), 200, 0, 3), 0, '틈 방향은 안전');
  assert.ok(K.hasSafeSpot([ring()], 0, 0, 300), '틈이 있으면 안전 위치 존재');
  assert.equal(K.hasSafeSpot([K.hazard({ kind: 'ring', x: 0, y: 0, r0: 0, r1: 400, band: 40, tele: 0.8, life: 1.5, damage: 24, label: '틈 없는 고리' })], 0, 0, 300), false, '틈 없는 고리는 가만히 있으면 반드시 맞는다(회피 필요)');
});

test('추적 장판: 따라오다가 멈춘 뒤 터지므로, 멈춘 뒤 피하면 안 맞는다', () => {
  const h = K.hazard({ kind: 'track', x: 0, y: 0, r0: 60, tele: 1.7, followFor: 1.2, followSpeed: 400, damage: 28, label: '추적' });
  let total = 0;
  for (let t = 0; t < 1.2; t += 1 / 60) total += K.stepHazard(h, 1 / 60, 200, 0);
  assert.ok(Math.hypot(h.x - 200, h.y) < 5, '추적 끝에 플레이어 위치까지 따라옴');
  for (let t = 0; t < 1.5; t += 1 / 60) total += K.stepHazard(h, 1 / 60, 300, 0);
  assert.equal(total, 0, '고정 뒤 100px 벗어나면 무피해');
});

test('회전 광선: 주인을 따라가며 every초마다 피해, 계속 서 있으면 여러 번 맞는다', () => {
  const owner = { x: 0, y: 0 };
  const h = K.hazard({ kind: 'spin', x: 0, y: 0, angle: 0, len: 300, width: 30, tele: 0.8, life: 6, spin: Math.PI / 3, every: 0.5, damage: 10, label: '회전' });
  const hits = run(h, 150, 0, 7, owner) / 10;
  assert.ok(hits >= 1 && hits <= 3, `회전하며 지나갈 때만 맞음: ${hits}회`);
  assert.ok(K.hasSafeSpot([K.hazard({ kind: 'spin', x: 0, y: 0, angle: 0, len: 300, width: 30, tele: 0.8, life: 6, spin: Math.PI / 3, every: 0.5, damage: 10, label: '회전' })], 0, 0, 380, owner), '광선 길이 밖은 안전');
});

test('교차 광선 2개(X자)도 피할 자리가 있다', () => {
  const x = [Math.PI / 4, -Math.PI / 4].map(angle => K.hazard({ kind: 'beam', x: -300 * Math.cos(angle), y: -300 * Math.sin(angle), angle, len: 600, width: 44, tele: 1, damage: 34, label: '균열' }));
  assert.ok(K.hasSafeSpot(x, 0, 0, 250));
});
