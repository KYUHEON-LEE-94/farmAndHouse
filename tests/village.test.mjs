// 마을 복구 4단계(LIFE_CONTENT_EXPANSION_SPEC 5·9절): 비용 예산, 부분 납품, 잠금·예약 제외, 취소 반환, 완공, 광장 보상 1회, 추천
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const out = buildSync({ stdin: { contents: `export * from "./app/village/logic"; export * from "./app/village/data"; export * from "./app/village/types"; export { FORAGE } from "./app/explore/data"; export { ALL_FISH } from "./app/fishing"; export { FURNITURE } from "./app/house";`, resolveDir: root, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent' });
const V = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
const fresh = () => ({ ...V.EMPTY_VILLAGE, unlocked: true });
const opts = (locks = {}, reserved = {}) => ({ locks, reserved });
const fish = V.ALL_FISH.filter(f => f.rarity !== '전설' && f.rarity !== '신화').sort((a, b) => a.price - b.price);
const legend = V.ALL_FISH.find(f => f.rarity === '전설');

test('첫 공개 시설 3종 비용(5.3·5.2.1절): 단계별 골드·일반 재료·희귀 예산, 봄 채집물과 기존 생활 재료만, 시설당 최대 3개 콘텐츠', () => {
  const budget = [[8000, 15000, 20, 35, 0, 0], [35000, 70000, 60, 100, 1, 2], [120000, 250000, 140, 220, 3, 5]];
  const spring = new Set(V.FORAGE.filter(f => f.season === '봄').map(f => f.id));
  for (const id of ['guide-office', 'craft-street', 'plaza']) {
    assert.equal(V.FACILITIES.find(f => f.id === id).firstRelease, true);
    const kinds = new Set();
    V.STAGE_COSTS[id].forEach((cost, i) => {
      const [glo, ghi, clo, chi, rlo, rhi] = budget[i];
      const rare = cost.needs.filter(n => n.id === 'four-leaf-flower').reduce((s, n) => s + n.count, 0), common = cost.needs.reduce((s, n) => s + n.count, 0) - rare;
      assert.ok(cost.gold >= glo && cost.gold <= ghi, `${id} ${i + 1} gold`);
      assert.ok(common >= clo && common <= chi, `${id} ${i + 1} common ${common}`);
      assert.ok(rare >= rlo && rare <= rhi, `${id} ${i + 1} rare ${rare}`);
      for (const n of cost.needs) { kinds.add(n.category); if (n.category === 'forage') assert.ok(spring.has(n.id), n.id); }
    });
    assert.ok(kinds.size <= 3, id);
  }
  for (const id of ['greenhouse', 'pier', 'mine-station']) assert.equal(V.isOpenFacility(id), false);
});

test('부분 납품: 잠금·미션 예약은 빼고, 황금 작물·전설 물고기는 쓰지 않으며, 창고에서 빠진 만큼만 기록된다', () => {
  const inv = { 'forage:soft-twig': 5, 'forage:young-herb': 20, 'crop:potato:0:0': 4, 'crop:potato:2:0': 6, 'crop:potato:0:1': 9, [`fish:${legend.id}`]: 3 };
  const v0 = fresh();
  const take = V.planDelivery(inv, v0, 'guide-office', opts({ 'crop:potato:2:0': true }, { 'crop:potato:0:0': 1 }));
  assert.deepEqual(take, { 'forage:soft-twig': 5, 'forage:young-herb': 8, 'crop:potato:0:0': 3 });
  const r = V.applyDelivery(inv, v0, 'guide-office', take);
  assert.equal(r.inventory['forage:soft-twig'], undefined); assert.equal(r.inventory['forage:young-herb'], 12); assert.equal(r.inventory['crop:potato:0:0'], 1);
  assert.equal(r.inventory['crop:potato:0:1'], 9, '황금은 그대로');
  const p = V.progressOf(r.village, 'guide-office');
  assert.deepEqual(p.rows.map(row => row.left), [7, 0, 7]); assert.equal(p.itemsDone, false);
  // 같은 계획을 다시 반영해도 창고에 없는 만큼은 납품되지 않는다(중복 방지)
  const again = V.applyDelivery(r.inventory, r.village, 'guide-office', take);
  assert.equal(V.progressOf(again.village, 'guide-office').rows[0].have, 5);
  // 전설 물고기는 "아무 물고기"에 쓰지 않는다
  const cs = { ...fresh(), facilityLevels: {} };
  assert.deepEqual(V.planDelivery({ [`fish:${legend.id}`]: 9, [`fish:${fish[1].id}`]: 2, [`fish:${fish[0].id}`]: 1 }, cs, 'craft-street', opts(), 2), { [`fish:${fish[0].id}`]: 1, [`fish:${fish[1].id}`]: 2 });
});

test('취소하면 이 단계 납품분을 전부 돌려주고, 창고 용량과 무관하게 잃지 않는다', () => {
  const inv = { 'forage:wildflower': 15, 'crop:strawberry:1:0': 4 };
  const d = V.applyDelivery(inv, fresh(), 'plaza', V.planDelivery(inv, fresh(), 'plaza', opts()));
  assert.deepEqual(d.inventory, {});
  const c = V.cancelDelivery({ 'forage:wildflower': 9999 }, d.village, 'plaza');
  assert.equal(c.refunded, 19); assert.equal(c.inventory['forage:wildflower'], 9999 + 15); assert.equal(c.inventory['crop:strawberry:1:0'], 4);
  assert.equal(c.village.contributions.plaza, undefined);
});

test('완공: 재료·골드가 모두 있어야 하고, 단계 +1·납품 기록 정리·광장 꽃상자는 단계당 한 번만', () => {
  const inv = { 'forage:wildflower': 20, 'crop:strawberry:0:0': 10 };
  const d = V.applyDelivery(inv, fresh(), 'plaza', V.planDelivery(inv, fresh(), 'plaza', opts()));
  assert.equal(V.canComplete(d.village, 'plaza', 7999), false);
  assert.equal(V.completeStage(d.inventory, d.village, 'plaza', 7999), null);
  const done = V.completeStage(d.inventory, d.village, 'plaza', 8000);
  assert.equal(done.gold, 8000); assert.equal(done.level, 1); assert.equal(done.village.facilityLevels.plaza, 1);
  assert.equal(done.reward.furniture, 'restore-flowerbox'); assert.deepEqual(done.village.claimedCosmetics, ['plaza-1-flowerbox']);
  assert.equal(done.inventory['forage:wildflower'], 5); assert.equal(done.village.contributions.plaza, undefined);
  assert.ok(V.FURNITURE.find(f => f.id === 'restore-flowerbox'));
  // 저장을 다시 불러와 같은 단계를 또 완공 처리해도 보상은 다시 나오지 않는다
  const replay = { ...d.village, claimedCosmetics: ['plaza-1-flowerbox'] };
  assert.equal(V.completeStage(d.inventory, replay, 'plaza', 8000).reward, null);
  // 다음 단계는 새 요구량으로 시작
  assert.equal(V.progressOf(done.village, 'plaza').gold, 40000);
  assert.equal(V.completable(done.village, 1e9).length, 0);
  // 3단계 완공 뒤에는 더 올릴 수 없다
  const max = { ...fresh(), facilityLevels: { plaza: 3 } };
  assert.equal(V.progressOf(max, 'plaza'), null); assert.equal(V.completeStage({}, max, 'plaza', 1e9), null);
  assert.equal(V.restoreVillage({ facilityLevels: { plaza: 9 } }).facilityLevels.plaza, 3);
});

test('추천 복구는 가장 많이 채워지는 시설을 고르고 창고를 바꾸지 않는다', () => {
  const inv = { 'forage:wildflower': 15, 'crop:strawberry:0:0': 10 };
  const before = JSON.stringify(inv);
  assert.equal(V.recommendFacility(inv, fresh(), opts()), 'plaza');
  assert.equal(JSON.stringify(inv), before);
  assert.equal(V.recommendFacility({}, fresh(), opts()), 'guide-office');
});

test('생활 2단계 선착장 비용(5.3절 예산): 여름 채집물·낚시·농사, 시설당 최대 3개 콘텐츠, 2단계 플래그 전에는 복구 불가', () => {
  const budget = [[8000, 15000, 20, 35, 0, 0], [35000, 70000, 60, 100, 1, 2], [120000, 250000, 140, 220, 3, 5]];
  const summer = new Set(V.FORAGE.filter(f => f.season === '여름').map(f => f.id));
  const kinds = new Set();
  V.STAGE2_COSTS.pier.forEach((cost, i) => {
    const [glo, ghi, clo, chi, rlo, rhi] = budget[i];
    const rare = cost.needs.filter(n => n.id === 'blue-firefly').reduce((s, n) => s + n.count, 0), common = cost.needs.reduce((s, n) => s + n.count, 0) - rare;
    assert.ok(cost.gold >= glo && cost.gold <= ghi, `pier ${i + 1} gold`);
    assert.ok(common >= clo && common <= chi, `pier ${i + 1} common ${common}`);
    assert.ok(rare >= rlo && rare <= rhi, `pier ${i + 1} rare ${rare}`);
    for (const n of cost.needs) { kinds.add(n.category); if (n.category === 'forage') assert.ok(summer.has(n.id), n.id); }
  });
  assert.ok(kinds.size <= 3);
  assert.equal(V.isOpenFacility('pier'), false);
});

test('생활 3단계 광차 정거장 비용(5.3절 예산): 가을·겨울 채집물과 농사, 플래그 전에는 복구 불가', () => {
  const budget = [[8000, 15000, 20, 35, 0, 0], [35000, 70000, 60, 100, 1, 2], [120000, 250000, 140, 220, 3, 5]];
  const okSeason = new Set(V.FORAGE.filter(f => f.season === '가을' || f.season === '겨울').map(f => f.id)), kinds = new Set();
  V.STAGE3_COSTS['mine-station'].forEach((cost, i) => {
    const [glo, ghi, clo, chi, rlo, rhi] = budget[i];
    const rare = cost.needs.filter(n => n.id === 'starlight-ice').reduce((s, n) => s + n.count, 0), common = cost.needs.reduce((s, n) => s + n.count, 0) - rare;
    assert.ok(cost.gold >= glo && cost.gold <= ghi); assert.ok(common >= clo && common <= chi, `${i} ${common}`); assert.ok(rare >= rlo && rare <= rhi);
    for (const n of cost.needs) { kinds.add(n.category); if (n.category === 'forage') assert.ok(okSeason.has(n.id), n.id); }
  });
  assert.ok(kinds.size <= 3); assert.equal(V.isOpenFacility('mine-station'), false);
});
