// 생활 가공 개편 자동 검증(WORKSHOP_PROCESSING_REDESIGN.md 14절)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';

const out = buildSync({
  stdin: { contents: `export * from "./app/workshop"; export { CROPS, cycleCrop, cropReferencePrice, CROP_REFERENCE_PRICE } from "./app/farming"; export { dailyOrders } from "./app/orders";`, resolveDir: new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent',
});
const W = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
const normal = W.CROPS.filter(c => !c.seasonalLimit);
const stockOf = (crops, n = 20, extra = {}) => crops.map(c => ({ cropId: c.id, quality: 0, golden: false, n, ...extra }));

test('난이도별 기준가 상수가 현재 5분 시세 공식의 기댓값과 ±3% 안이다(공식이 바뀌면 상수 재산정)', () => {
  const by = {};
  for (const c of normal) for (let b = 0; b < 4096; b++) (by[c.difficulty] ??= []).push(W.cycleCrop(c, b).price);
  for (const [d, list] of Object.entries(by)) {
    const mean = list.reduce((a, b) => a + b, 0) / list.length;
    assert.ok(Math.abs(W.CROP_REFERENCE_PRICE[d] / mean - 1) <= 0.03, `${d}: 상수 ${W.CROP_REFERENCE_PRICE[d]} / 기댓값 ${mean.toFixed(1)}`);
  }
});

test('모든 일반 작물에 분류가 있고 자유 가공 하나 이상에 쓸 수 있다', () => {
  const free = W.PROC_RECIPES.filter(r => r.kind === 'free');
  for (const c of normal) {
    assert.ok(W.CROP_TAGS[c.id], `${c.name} 분류 없음`);
    assert.ok(free.some(r => W.cropFits(r, c)), `${c.name}: 쓸 수 있는 자유 가공 없음`);
  }
});

test('계절마다 그 계절 작물만 있어도 자유 가공을 2종 이상 쓸 수 있다', () => {
  for (const season of ['봄', '여름', '가을', '겨울']) {
    const stock = stockOf(normal.filter(c => c.seasons.includes(season)));
    const usable = W.PROC_RECIPES.filter(r => r.kind === 'free' && W.autoFill(r, stock));
    assert.ok(usable.length >= 2, `${season}: ${usable.map(r => r.name)}`);
  }
});

test('자동 채우기는 황금·계절 한정 작물을 고르지 않는다(황금 포함을 켜면 고를 수 있다)', () => {
  const golden = stockOf(normal.filter(c => W.CROP_TAGS[c.id] === 'fruit'), 20, { golden: true });
  const royal = stockOf(W.CROPS.filter(c => c.seasonalLimit));
  for (const r of W.PROC_RECIPES.filter(x => x.kind !== 'special')) {
    assert.equal(W.autoFill(r, [...golden, ...royal]), null, `${r.name}가 황금/한정 작물로 채워짐`);
  }
  assert.ok(W.autoFill(W.procRecipe('juice'), golden, true));
  for (const r of W.PROC_RECIPES) assert.equal(W.maxBatches(r, royal, true), 0, `${r.name}: 계절 한정 작물 사용`);
});

test('완성품 값은 재료 기준가 합보다 항상 크고, 좋은 품질을 넣으면 정확히 오른다', () => {
  for (const r of W.PROC_RECIPES) {
    const fill = W.autoFill(r, stockOf(normal)); assert.ok(fill, `${r.name} 채우기 실패`);
    assert.equal(W.checkInputs(r, fill), null);
    const p = W.processResult(r, fill);
    assert.ok(p.price > p.raw, `${r.name}: ${p.price} <= ${p.raw}`);
    const best = W.processResult(r, fill.map(i => ({ ...i, quality: 2 })));
    assert.equal(best.raw, Math.round(W.inputValue(fill) * 1.3));
    assert.ok(best.price > p.price);
  }
});

test('가공품 키: 같은 재료·가격은 합쳐지고 가격이 다르면 다른 묶음, 예전 키도 이름·가격이 나온다', () => {
  const pickle = W.procRecipe('pickle');
  const a = W.processResult(pickle, [{ cropId: 'cucumber', quality: 0, golden: false, count: 4 }]);
  const b = W.processResult(pickle, [{ cropId: 'cucumber', quality: 0, golden: false, count: 4 }]);
  const c = W.processResult(pickle, [{ cropId: 'cucumber', quality: 1, golden: false, count: 4 }]);
  assert.equal(a.key, b.key); assert.notEqual(a.key, c.key);
  assert.equal(a.name, '오이피클'); assert.ok(!a.key.includes(':'), '통합 인벤토리 구분자(:)가 키에 들어가면 안 됨');
  assert.deepEqual(W.goodsInfo(a.key), { name: a.name, icon: a.icon, price: a.price });
  const mixed = W.processResult(pickle, [{ cropId: 'cucumber', quality: 0, golden: false, count: 2 }, { cropId: 'radish', quality: 0, golden: false, count: 2 }]);
  assert.equal(mixed.name, '모둠 채소 절임');
  for (const old of W.RECIPES) { const info = W.goodsInfo(old.id); assert.equal(info.name, old.name); assert.equal(info.price, W.goodsPrice(old)); }
  const oldJob = W.jobInfo({ recipeId: 'kimjang', doneAt: 0 }); assert.equal(oldJob.key, 'kimjang');
});

test('혼합 가공 조건: 종류 수·종류당 개수를 지킨다', () => {
  const box = W.procRecipe('veggiebox');
  assert.match(W.checkInputs(box, [{ cropId: 'radish', quality: 0, golden: false, count: 6 }]), /3종/);
  assert.match(W.checkInputs(box, [{ cropId: 'radish', quality: 0, golden: false, count: 4 }, { cropId: 'garlic', quality: 0, golden: false, count: 1 }, { cropId: 'spinach', quality: 0, golden: false, count: 1 }]), /2개씩/);
  assert.equal(W.checkInputs(box, [{ cropId: 'radish', quality: 0, golden: false, count: 2 }, { cropId: 'garlic', quality: 0, golden: false, count: 2 }, { cropId: 'spinach', quality: 0, golden: false, count: 2 }]), null);
  assert.equal(W.maxBatches(box, stockOf(normal.filter(c => ['radish', 'garlic'].includes(c.id)))), 0);
});

test('빈 항아리 전부 채우기 = min(빈 칸, 재료로 만들 수 있는 횟수)', () => {
  const pickle = W.procRecipe('pickle'), stock = [{ cropId: 'cucumber', quality: 0, golden: false, n: 10 }];
  assert.equal(W.maxBatches(pickle, stock), 2);
  let left = stock, made = 0; for (let i = 0; i < 5; i++) { const f = W.autoFill(pickle, left); if (!f) break; left = W.subtractStock(left, f); made++; }
  assert.equal(made, 2); assert.equal(left[0].n, 2);
});

test('미션 365일: 기준가로 바꿔도 일일 골드 보상 평균·중앙값 ±5%, 유형별 평균 ±10%', () => {
  const days = Array.from({ length: 365 }, (_, i) => new Date(Date.UTC(2026, 0, 1) + i * 864e5).toISOString().slice(0, 10));
  const stat = v2 => { const tot = [], per = {}; for (const d of days) { const o = W.dailyOrders(d, v2); tot.push(o.reduce((s, x) => s + x.reward, 0)); for (const x of o) (per[x.id.split('-').pop()] ??= []).push(x.reward); } return { tot, per }; };
  const mean = a => a.reduce((s, x) => s + x, 0) / a.length, med = a => [...a].sort((x, y) => x - y)[a.length >> 1];
  const a = stat(false), b = stat(true);
  assert.ok(Math.abs(mean(b.tot) / mean(a.tot) - 1) <= 0.05); assert.ok(Math.abs(med(b.tot) / med(a.tot) - 1) <= 0.05);
  for (const k of Object.keys(a.per)) assert.ok(Math.abs(mean(b.per[k]) / mean(a.per[k]) - 1) <= 0.1, k);
});
