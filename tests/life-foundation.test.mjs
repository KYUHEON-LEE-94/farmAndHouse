// 신규 생활 콘텐츠 1단계 기반(LIFE_CONTENT_EXPANSION_SPEC 6·8절): 채집물 분류, 공용 잠금·소비, 저장 필드 복원, 가구 판매 정책
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const out = buildSync({ stdin: { contents: `
  export * from "./app/items"; export * from "./app/stock"; export * from "./app/explore/data"; export * from "./app/explore/types";
  export * from "./app/cooking/lunch"; export * from "./app/cooking/batch"; export * from "./app/village/types"; export { FACILITIES } from "./app/village/data";
  export { FURNITURE, isSellable } from "./app/house"; export { DISHES } from "./app/kitchen";`, resolveDir: root, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent' });
const L = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);

test('채집물 16종: 계절마다 일반 3·희귀 1, id 중복 없음, forage: 키는 등급 없이 저장', () => {
  assert.equal(L.FORAGE.length, 16);
  assert.equal(new Set(L.FORAGE.map(item => item.id)).size, 16);
  for (const season of ['봄', '여름', '가을', '겨울']) {
    const items = L.FORAGE.filter(item => item.season === season);
    assert.deepEqual([items.filter(item => !item.rare).length, items.filter(item => item.rare).length], [3, 1], season);
  }
  assert.equal(L.itemKey({ category: 'forage', id: 'young-herb', quality: 2, golden: true }), 'forage:young-herb');
  assert.deepEqual(L.parseItemKey('forage:young-herb'), { category: 'forage', id: 'young-herb', quality: 0, golden: false });
  // 꽃꿀·숲 견과는 기존 야생 꿀(honey)·땅콩과 별개 id(4.3절)
  assert.ok(L.forageInfo('flower-nectar') && !L.forageInfo('honey'));
});

test('구버전 잠금(produceLocks·fishLocks)은 itemLocks로 합치고, itemLocks가 있으면 그것만 쓴다', () => {
  const merged = L.restoreItemLocks({ produceLocks: { 'tomato|1|0': true, 'corn|0|1': false }, fishLocks: { dace: true } });
  assert.deepEqual(merged, { 'crop:tomato:1:0': true, 'fish:dace': true });
  assert.deepEqual(L.restoreItemLocks({ itemLocks: { 'forage:wildflower': true, 'fish:x': false }, produceLocks: { 'tomato|1|0': true } }), { 'forage:wildflower': true });
  // 기존 화면 코드용 분류별 보기와 되돌리기
  assert.deepEqual(L.categoryLocks(merged, 'crop'), { 'tomato|1|0': true });
  assert.deepEqual(L.categoryLocks(merged, 'fish'), { dace: true });
  const next = L.replaceCategoryLocks(merged, 'crop', { 'tomato|1|0': false, 'potato|0|0': true });
  assert.deepEqual(next, { 'fish:dace': true, 'crop:potato:0:0': true });
});

test('공용 소비 순서(6.3절): 잠금·예약 제외 → 낮은 품질·비황금 → 낮은 가치, 모자라면 실패하고 창고는 그대로', () => {
  const inv = { 'crop:potato:2:0': 5, 'crop:potato:0:1': 5, 'crop:potato:0:0': 2, 'crop:potato:1:0': 4, 'fish:dace': 3, 'forage:young-herb': 4 };
  const locks = { 'crop:potato:1:0': true };
  const reserved = L.mergeReserved(L.reservedToItemKeys('crop', { 'potato|0|0': 1 }), L.reservedToItemKeys('fish', { dace: 2 }), {});
  assert.deepEqual(L.consumeOrder(inv, 'crop', 'potato', { locks, reserved }), ['crop:potato:0:0', 'crop:potato:2:0', 'crop:potato:0:1']);
  const plan = L.planConsume(inv, [{ category: 'crop', id: 'potato', count: 4 }, { category: 'fish', id: 'dace', count: 1 }, { category: 'forage', id: 'young-herb', count: 2 }], { locks, reserved });
  assert.equal(plan.ok, true);
  assert.deepEqual(plan.take, { 'crop:potato:0:0': 1, 'crop:potato:2:0': 3, 'fish:dace': 1, 'forage:young-herb': 2 });
  const after = L.applyTake(inv, plan.take);
  assert.equal(after['crop:potato:0:0'], 1); assert.equal(after['crop:potato:1:0'], 4); assert.equal(after['forage:young-herb'], 2);
  // 예약 2마리를 빼면 물고기는 1마리만 쓸 수 있다
  const short = L.planConsume(inv, [{ category: 'fish', id: 'dace', count: 2 }], { locks, reserved });
  assert.equal(short.ok, false); assert.deepEqual(short.missing, [{ category: 'fish', id: 'dace', count: 1 }]);
  // 황금 제외 옵션, 같은 품질이면 가치 낮은 묶음부터
  assert.ok(!L.consumeOrder(inv, 'crop', 'potato', { locks: {}, allowGolden: false }).includes('crop:potato:0:1'));
  const value = key => (key.endsWith(':2:0') ? 1 : 9);
  assert.deepEqual(L.consumeOrder({ 'goods:a': 1, 'goods:b': 1 }, 'goods', 'a', { locks: {}, value }), ['goods:a']);
  // 같은 품목을 두 번 요구하면 앞 요구량을 뺀다
  assert.equal(L.planConsume({ 'forage:wildflower': 3 }, [{ category: 'forage', id: 'wildflower', count: 2 }, { category: 'forage', id: 'wildflower', count: 2 }], { locks: {} }).ok, false);
});

test('탐험 저장 복원·해금: 잘못된 값은 기본값, 밭 12칸 또는 첫 물고기, 마을은 탐험 3회', () => {
  assert.deepEqual(L.restoreExploration(undefined), L.EMPTY_EXPLORATION);
  const r = L.restoreExploration({ unlocked: true, totalRuns: '4', rareMissesByRegion: { 'sprout-trail': 2, bad: -1 }, ownedTools: ['glove', 3], equippedTool: 'boots', checkpoint: { runId: 'r1', regionId: 'nowhere', seed: 1, startedAt: 1 } });
  assert.equal(r.totalRuns, 4); assert.deepEqual(r.rareMissesByRegion, { 'sprout-trail': 2 }); assert.deepEqual(r.ownedTools, ['glove']);
  assert.equal(r.equippedTool, null); assert.equal(r.checkpoint, undefined);
  assert.ok(L.restoreExploration({ checkpoint: { runId: 'r1', regionId: 'sprout-trail', seed: 7, startedAt: 1, bag: { 'young-herb': 3 }, gathered: ['n1'] } }).checkpoint);
  assert.equal(L.explorationUnlockMet(8, {}), false);
  assert.equal(L.explorationUnlockMet(12, {}), true);
  assert.equal(L.explorationUnlockMet(8, { dace: 1 }), true);
  assert.equal(L.villageUnlockMet({ totalRuns: 2 }), false); assert.equal(L.villageUnlockMet({ totalRuns: 3 }), true);
});

test('탐험 지역: 공개 지역이 4곳 미만이면 계절과 무관하게 열리고, 4곳 모두 공개되면 현재 계절과 시설 해금만', () => {
  assert.deepEqual(L.openRegions('겨울').map(region => region.id), ['sprout-trail']);
  const all = L.REGIONS.map(region => ({ ...region, released: true }));
  assert.deepEqual(L.openRegions('겨울', [], all).map(region => region.id), ['frost-cave']);
  assert.deepEqual(L.openRegions('여름', ['frost-cave'], all).map(region => region.id), ['sun-marsh', 'frost-cave']);
});

test('요리 이력: 구버전은 남은 전투 음식만 1회 인정, 필드가 있으면(빈 배열도) 재고로 보충하지 않음', () => {
  const ids = L.DISHES.map(dish => dish.id);
  const inv = { [`dish:${ids[0]}:0:0`]: 1, [`dish:${ids[0]}:2:0`]: 2, [`dish:${ids[1]}:1:0`]: 1, 'dish:unknown-lunch:0:0': 1, 'crop:potato:0:0': 3 };
  assert.deepEqual(L.restoreCookedDishIds(undefined, inv, ids), [ids[0], ids[1]]);
  assert.deepEqual(L.restoreCookedDishIds([], inv, ids), []);
  assert.deepEqual(L.restoreCookedDishIds([ids[2], ids[2], 5], inv, ids), [ids[2]]);
  assert.deepEqual(L.addCookedDish([ids[0]], ids[0]), [ids[0]]);
  assert.equal(L.lunchUnlocked([ids[0], ids[1]], ids), false);
  assert.equal(L.lunchUnlocked([ids[0], ids[1], 'some-lunch'], ids), false);
  assert.equal(L.lunchUnlocked(ids.slice(0, 3), ids), true);
});

test('진행 중 일괄 조리 검증: 점수 0~2·최대 3단계, 시설 단계별 1·3·5개 상한', () => {
  const ids = L.DISHES.map(dish => dish.id);
  const ok = { batchId: 'b1', dishId: ids[0], quantity: 3, consumed: { 'crop:potato:0:0': 6 }, seed: 42, results: [2, 1], facilityLevelAtStart: 2 };
  assert.deepEqual(L.restoreCookingBatch(ok, ids), ok);
  assert.equal(L.restoreCookingBatch({ ...ok, quantity: 4 }, ids), null);
  assert.equal(L.restoreCookingBatch({ ...ok, results: [2, 1, 0, 1] }, ids), null);
  assert.equal(L.restoreCookingBatch({ ...ok, results: [3] }, ids), null);
  assert.equal(L.restoreCookingBatch({ ...ok, dishId: 'nope' }, ids), null);
  assert.deepEqual([0, 1, 2, 3].map(L.batchLimit), [1, 1, 3, 5]);
});

test('도시락 버프: 끝났거나 잘못된 버프는 버리고, 남은 버프는 그대로', () => {
  const now = 1_000_000;
  assert.equal(L.restoreLunchBuff({ dishId: 'a', grade: 1, expiresAt: now - 1, actionsLeft: 3 }, now), null);
  assert.equal(L.restoreLunchBuff({ dishId: 'a', grade: 1, expiresAt: now + 1, actionsLeft: 0 }, now), null);
  assert.equal(L.restoreLunchBuff({ dishId: 'a', grade: 3, expiresAt: now + 1, actionsLeft: 1 }, now), null);
  assert.deepEqual(L.restoreLunchBuff({ dishId: 'a', grade: 2, expiresAt: now + 5, actionsLeft: 2 }, now), { dishId: 'a', grade: 2, expiresAt: now + 5, actionsLeft: 2 });
});

test('마을 복원: 모르는 시설·0 이하 납품은 버리고 단계는 3으로 제한', () => {
  const v = L.restoreVillage({ unlocked: true, facilityLevels: { 'guide-office': 5, plaza: 0, ghost: 2 }, contributions: { 'craft-street': { 'forage:soft-twig': 4, 'crop:potato:0:0': 0 }, ghost: { x: 1 } }, claimedCosmetics: ['a', 'a', 1] });
  assert.deepEqual(v, { unlocked: true, facilityLevels: { 'guide-office': 3 }, contributions: { 'craft-street': { 'forage:soft-twig': 4 } }, claimedCosmetics: ['a'] });
  assert.equal(L.FACILITIES.filter(facility => facility.firstRelease).length, 3);
});

test('기념 가구 판매 불가(6.5절): 최신 카탈로그 기준, 상점에 나오지 않음, 기존 가구는 그대로 판매 가능', () => {
  const box = L.FURNITURE.find(item => item.id === 'restore-flowerbox');
  assert.ok(box && box.reward && box.sellable === false);
  assert.equal(L.isSellable({ id: 'restore-flowerbox', sellable: true }), false); // 저장 인스턴스 값이 아니라 카탈로그로 판단
  assert.ok(L.FURNITURE.filter(item => item.id !== 'restore-flowerbox').every(item => L.isSellable(item)));
});
