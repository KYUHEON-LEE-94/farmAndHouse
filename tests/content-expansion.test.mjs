import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
async function load(name) {
  const source = ts.transpileModule(readFileSync(new URL(`../app/${name}.ts`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const farm = await load('farming'), fish = await load('fishing');
const seasons = ['봄', '여름', '가을', '겨울'];
test('catalogs have unique IDs, seventeen seasonal fish and exactly one limited crop per season', () => {
  assert.equal(farm.CROPS.length, 37);
  assert.equal(new Set(farm.CROPS.map(x => x.id)).size, 37);
  assert.equal(new Set(fish.ALL_FISH.map(x => x.id)).size, fish.ALL_FISH.length);
  for (const season of seasons) {
    assert.equal(fish.FISH.filter(x => x.season === season).length, 17);
    assert.equal(fish.FISH.filter(x => x.season === season && x.rarity === '전설').length, 2);
    const limited = farm.CROPS.filter(x => x.seasons.includes(season) && x.seasonalLimit);
    assert.equal(limited.length, 1); assert.equal(limited[0].seasonalLimit, 30);
  }
});
test('special crops remain long-growing and expensive across market cycles', () => {
  for (const crop of farm.CROPS) for (let bucket = 0; bucket < 100; bucket++) {
    const quote = farm.cycleCrop(crop, bucket);
    if (crop.seasonalLimit) {
      assert.ok(quote.seconds >= 180 && quote.seconds <= 300);
      assert.equal(quote.seconds, crop.seconds); assert.equal(quote.seed, crop.seed);
      assert.ok(quote.price >= Math.round(crop.sell * .9) && quote.price <= Math.round(crop.sell * 1.1));
    } else assert.ok(quote.seconds >= 20 && quote.seconds <= 65);
  }
});
test('batch planting caps at 30, persists through reload, and does not reset when switching seasons', () => {
  const [spring, summer] = farm.CROPS.filter(x => x.seasonalLimit);
  let ledger = farm.restorePlantingLedger(undefined);
  for (let i = 0; i < 2; i++) ledger = farm.reservePlanting(spring, ledger, 'day1', 12).ledger;
  const last = farm.reservePlanting(spring, ledger, 'day1', 12);
  assert.equal(last.count, 6);
  ledger = farm.restorePlantingLedger(JSON.parse(JSON.stringify(last.ledger)));
  assert.equal(farm.reservePlanting(spring, ledger, 'day1', 1).count, 0);
  ledger = farm.reservePlanting(summer, ledger, 'day1', 5).ledger;
  assert.equal(farm.plantingAllowance(spring, ledger, 'day1'), 0);
  assert.equal(farm.plantingAllowance(summer, ledger, 'day1'), 25);
  assert.equal(farm.plantingAllowance(spring, ledger, 'day2'), 30);
  assert.equal(farm.reservePlanting(spring, ledger, 'day2', 0).count, 0);
});
test('paid tickets are five minutes at sixty percent of the former prices', () => {
  assert.deepEqual(fish.SPOTS.filter(x => x.price).map(x => [x.id, x.minutes, x.price]), [['sea', 5, 900], ['valley', 5, 1800], ['reservoir', 5, 4800]]);
  assert.equal(fish.SPOTS.filter(x => !x.price).length, 2);
});
test('every new fish can be rolled; bare-hand mode still excludes rare fish', () => {
  for (const season of seasons) {
    const caught = new Set();
    for (let i = 0; i < 1000; i++) {
      let calls = 0;
      const result = fish.rollFish(season, {}, () => ++calls <= 2 ? .5 : (i + .5) / 1000);
      caught.add(result.id);
      assert.ok(['흔함', '보통'].includes(fish.rollFish(season, {legend:0, rare:0}, () => (i + .5) / 1000).rarity));
    }
    assert.equal(caught.size, 15);
  }
});
