import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = ts.transpileModule(readFileSync(new URL('../app/pets.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const pets = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
test('old max-level save resumes growth and retains care records', () => {
  const old = { ...pets.newCare(123), level: 3, affection: 100, walkAt: 45, playAt: 67 };
  const { care, leveled } = pets.addAffection(JSON.parse(JSON.stringify(old)), 3);
  assert.equal(leveled, 1); assert.equal(care.level, 4); assert.equal(care.affection, 3);
  assert.equal(care.fullAt, 123); assert.equal(care.walkAt, 45); assert.equal(care.playAt, 67);
});
test('growth carries affection and stops at level 100', () => {
  const care = pets.addAffection({ ...pets.newCare(), level: 98, affection: 90 }, 220).care;
  assert.equal(care.level, 100); assert.equal(care.affection, 100);
  assert.equal(pets.addAffection(care, 100).care.level, 100);
});
test('all 100 levels have small finite bonuses and nonnegative penalties', () => {
  assert.equal(pets.PET_MAX_LEVEL, 100);
  for (let level = 1; level <= 100; level++) {
    close(pets.PET_POWER[level - 1], 1 + (level - 1) * .001);
    close(pets.friendSaleBonus(level), (level - 1) * .0001);
    assert.ok(pets.tigerDebuff(level) > 0);
    assert.ok(1 - pets.whiteTigerBugReduction(level) > 0);
    for (const id of ['dog','cat','rabbit','duck','mole','weasel','tiger','dragon','phoenix','whitetiger','blacktortoise','gumiho']) {
      assert.doesNotMatch(pets.petAbility(id, level, true), /NaN|undefined/);
    }
  }
  close(pets.PET_POWER[99], 1.099);
  close(pets.tigerDebuff(100), .4505);
  close(pets.friendSaleBonus(100), .0099);
  close(pets.whiteTigerBugReduction(100), .099);
  assert.match(pets.petAbility('dog', 2, true), /25.025%/);
  assert.match(pets.petAbility('dog', 100, true), /27.475%/);
  assert.match(pets.petAbility('chick', 100, false), /0.99%/);
});
