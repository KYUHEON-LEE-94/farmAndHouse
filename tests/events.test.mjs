// 돌발 이벤트 1차 개선(RANDOM_EVENT_AUDIT 10절): 등장 조건, 최근 3개 제외, 수량제 판매가 효과, 남은 성장 시간 즉시 적용
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
const out = buildSync({ stdin: { contents: `export * from "./app/events"; export { scaleRemaining, CROPS } from "./app/farming";`, resolveDir: new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent', define: { 'import.meta.env': '{}' } });
const E = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
const ev = id => E.STORY_EVENTS.find(e => e.id === id);

test('등장 조건: 자라는 작물·빈 밭·창고 물고기가 없으면 효과 없는 이벤트는 빠진다', () => {
  const none = { growing: 0, empty: 0, fish: 0 };
  assert.equal(E.eventFits(ev('crows'), none), false, '까마귀(성장)');
  assert.equal(E.eventFits(ev('mole'), none), false, '두더지(성장)');
  assert.equal(E.eventFits(ev('thief-cat'), none), false, '생선 도둑');
  assert.equal(E.eventFits(ev('seed-sale'), { growing: 9, empty: 1, fish: 9 }), false, '빈 밭 없으면 씨앗 할인 제외');
  assert.equal(E.eventFits(ev('crows'), { growing: 4, empty: 0, fish: 0 }), true);
  for (const season of ['봄', '여름', '가을', '겨울']) for (let i = 0; i < 50; i++) {
    const e = E.pickEvent(season, none, [], Math.random);
    if (e) assert.ok(E.eventFits(e, none), `${season} ${e.id}`);
  }
});

test('최근 3개 이벤트는 다시 나오지 않는다', () => {
  const ctx = { growing: 99, empty: 99, fish: 99 };
  for (let i = 0; i < 200; i++) {
    const recent = ['grandma', 'lunch', 'wallet'], e = E.pickEvent('봄', ctx, recent, Math.random);
    assert.ok(e && !recent.includes(e.id));
  }
});

test('판매가 효과는 다음 40개만: 묶음이 남은 수보다 크면 남은 만큼만 보너스, 다 쓰면 사라진다', () => {
  let buffs = [{ id: 'p', kind: 'price', label: '축제 부스', multiplier: 1.25, expiresAt: Date.now() + 1e7, left: 40 }];
  assert.ok(Math.abs(E.priceBuffFactor(buffs, 10, Date.now()) - 1.25) < 1e-9);
  buffs = E.consumePriceBuffs(buffs, 30); assert.equal(buffs[0].left, 10);
  assert.ok(Math.abs(E.priceBuffFactor(buffs, 100, Date.now()) - (1 + 0.25 * 10 / 100)) < 1e-9, '100개 중 10개만 +25%');
  buffs = E.consumePriceBuffs(buffs, 100); assert.equal(buffs.length, 0);
  assert.equal(E.buffMultiplier([{ id: 'p', kind: 'price', label: 'x', multiplier: 1.25, expiresAt: Date.now() + 1e7, left: 5 }], 'price', Date.now()), 1, '수량제는 시간제 배율에 섞이지 않음');
});

test('성장 효과는 자라는 작물의 남은 시간에 바로 적용되고 다 자란 작물은 그대로', () => {
  const crop = E.CROPS[0], now = 1_000_000, plot = { cropId: crop.id, plantedAt: now - 10_000, growSeconds: 40, water: [now - 5000] };
  const fast = E.scaleRemaining(plot, crop, 0.75, now);
  assert.equal(fast.growSeconds, Math.round(10 + 30 * 0.75));
  const slow = E.scaleRemaining(plot, crop, 1.3, now); assert.equal(slow.growSeconds, Math.round(10 + 30 * 1.3));
  const done = { ...plot, plantedAt: now - 50_000 }; assert.equal(E.scaleRemaining(done, crop, 0.75, now), done);
});

test('문구 정합: 쌍무지개는 "희귀한 물고기", 낚시대회는 참가비·상금·순이익을 함께 적는다', () => {
  assert.ok(ev('rainbow').choices.some(c => c.label.includes('희귀한 물고기')));
  assert.ok(ev('fishing-contest').choices[0].label.includes('참가비'));
  assert.match(JSON.stringify(ev('fishing-contest').choices[0].outcome), /참가비를 빼면 \+600원/);
});
