import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = ts.transpileModule(readFileSync(new URL('../app/equipment.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { EFFECTS, EFFECT_SLOTS, EFFECT_CHANCE, rollEffectReward, drawEffect, emptyEquipment, equipEffect, restoreEquipment } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
test('each draw stays in category, never repeats, and stops at completion', () => {
  for (const slot of EFFECT_SLOTS) {
    const owned = [];
    for (let i = 0; i < EFFECTS.filter(item => item.slot === slot).length; i++) {
      const item = drawEffect(owned, slot, () => .99);
      assert.equal(item.slot, slot); assert.ok(!owned.includes(item.id)); owned.push(item.id);
    }
    assert.equal(drawEffect(owned, slot), null);
  }
});
test('unowned and wrong-category effects cannot be equipped; unequip preserves other slots', () => {
  const owned = EFFECTS.map(item => item.id);
  const first = equipEffect(emptyEquipment(), owned, 'farm', 'farm-petal');
  assert.equal(equipEffect(first, [], 'fish', 'fish-bubble'), first);
  assert.equal(equipEffect(first, owned, 'fish', 'farm-petal'), first);
  const second = equipEffect(first, owned, 'fish', 'fish-bubble');
  assert.equal(equipEffect(second, owned, 'farm', null).fish, 'fish-bubble');
});
test('old saves default safely; invalid collection and equipment cannot unlock items', () => {
  assert.deepEqual(restoreEquipment(undefined, undefined), { owned: [], equipment: emptyEquipment() });
  assert.deepEqual(restoreEquipment(['farm-petal', 'farm-petal', 'invalid'], { farm: 'farm-petal', fish: 'fish-bubble', weapon: 'shotgun' }), { owned: ['farm-petal'], equipment: { ...emptyEquipment(), farm: 'farm-petal' } });
  const state = { owned: ['fish-bubble'], equipment: { ...emptyEquipment(), fish: 'fish-bubble' } };
  const saved = JSON.parse(JSON.stringify(state));
  assert.deepEqual(restoreEquipment(saved.owned, saved.equipment), state);
});

test('reward boundaries enforce 25% effects and 37.5% each supply', () => {
  assert.equal(EFFECT_CHANCE, .25);
  for (const [roll, kind] of [[0, 'effect'], [.249999, 'effect'], [.25, 'bait'], [.624999, 'bait'], [.625, 'fert'], [.999999, 'fert']]) {
    const reward = rollEffectReward([], 'farm', () => roll);
    assert.equal(reward.kind, kind);
    if (kind === 'effect') assert.equal(reward.effect.slot, 'farm');
    else { assert.equal(reward.count, 10); assert.equal(reward.id, kind === 'bait' ? 'worm' : 'compost'); }
  }
  const counts = { effect: 0, bait: 0, fert: 0 };
  for (let i = 0; i < 800; i++) counts[rollEffectReward([], 'fish', () => i / 800).kind]++;
  assert.deepEqual(counts, { effect: 200, bait: 300, fert: 300 });
});
test('old complete collections can earn new effects; fully complete categories cannot draw', () => {
  const owned = ['farm-petal', 'farm-leaf', 'farm-star'];
  assert.equal(rollEffectReward(owned, 'farm', () => 0).effect.id, 'farm-butterfly');
  assert.equal(rollEffectReward(EFFECTS.map(item => item.id), 'farm', () => .9), null);
});
