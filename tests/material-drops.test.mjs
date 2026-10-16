import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function initializer(file, names) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const declarations = ast.statements.filter(ts.isVariableStatement).flatMap(s => [...s.declarationList.declarations]);
  return names.map(name => {
    const found = declarations.find(d => d.name.getText(ast) === name);
    assert.ok(found?.initializer, `${file}: ${name} declaration missing`);
    return `export const ${name} = ${found.initializer.getText(ast)};`;
  }).join('\n');
}

async function loadLiteral(file, names) {
  const js = ts.transpileModule(initializer(file, names), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
}

const hunt = await loadLiteral('../app/hunting.ts', ['ANIMALS']);
const raid = await loadLiteral('../app/raid/data.ts', ['RAID_MAX_FLOOR', 'RAID_ITEMS', 'FLOOR_REWARDS', 'LIFE_MATS', 'HUNT_COMMON_LOOT', 'HUNT_RARE_LOOT', 'ENHANCE', 'UPPER_ITEMS', 'ARMORS']);

const huntBase = new Set(hunt.ANIMALS.map(a => a.loot.id));
const huntRare = new Set(hunt.ANIMALS.map(a => a.rare.id));
const huntAll = new Set(hunt.ANIMALS.flatMap(a => [a.loot.id, a.rare.id, ...(a.meat ? [a.meat.id] : [])]));
const floorDrops = new Set(Object.entries(raid.FLOOR_REWARDS).filter(([floor]) => Number(floor) <= raid.RAID_MAX_FLOOR)
  .flatMap(([, reward]) => [...reward.first, ...reward.repeat].map(([id]) => id)));
const virtualNeeds = new Set(['goods', 'rare-hunt', 'good-crop']);
/** 재료 id → 그 재료가 나오는 층 목록 */
const dropFloors = new Map();
for (const [floor, reward] of Object.entries(raid.FLOOR_REWARDS)) if (Number(floor) <= raid.RAID_MAX_FLOOR)
  for (const [id] of [...reward.first, ...reward.repeat]) dropFloors.set(id, [...(dropFloors.get(id) ?? []), Number(floor)]);

test('every current hunting material belongs to an actual animal drop', () => {
  raid.HUNT_COMMON_LOOT.forEach(id => assert.ok(huntBase.has(id), `common hunting material has no animal: ${id}`));
  raid.HUNT_RARE_LOOT.forEach(id => assert.ok(huntRare.has(id), `rare hunting material has no animal: ${id}`));
  assert.ok(hunt.ANIMALS.find(a => a.id === 'deer')?.loot.id === 'antler');
});

test('every armor ingredient has a current acquisition source', () => {
  for (const armor of raid.ARMORS) for (const id of Object.keys(armor.need)) {
    assert.ok(huntAll.has(id) || floorDrops.has(id) || id in raid.LIFE_MATS, `${armor.name}: no source for ${id}`);
  }
});

test('every enhancement ingredient through +14 has a current source', () => {
  for (const step of raid.ENHANCE.filter(step => step.to <= 14)) {
    const ids = [...Object.keys(step.need), ...Object.keys(step.open?.need ?? {})];
    for (const id of ids) assert.ok(id in raid.LIFE_MATS || floorDrops.has(id) || huntAll.has(id) || virtualNeeds.has(id), `+${step.to}: no source for ${id}`);
  }
});

test('every configured floor drop is a registered raid item', () => {
  for (const id of floorDrops) assert.ok(id in raid.RAID_ITEMS, `unregistered floor drop: ${id}`);
});

test('+13 materials drop on floors 11-15, +14 on floors 16-20, and +15 stays reserved for floors 21+', () => {
  const needsOf = to => { const step = raid.ENHANCE.find(s => s.to === to); return [...Object.keys(step.need), ...Object.keys(step.open?.need ?? {})]; };
  const upperNeeds = new Set([13, 14, 15].flatMap(needsOf));
  assert.deepEqual([...upperNeeds].sort(), Object.keys(raid.UPPER_ITEMS).sort());
  for (const id of needsOf(13)) { const floors = dropFloors.get(id) ?? []; assert.ok(floors.length && floors.every(f => f >= 11 && f <= 15), `+13 ${id}: ${floors}`); }
  for (const id of needsOf(14)) { const floors = dropFloors.get(id) ?? []; assert.ok(floors.length && floors.every(f => f >= 16 && f <= 20), `+14 ${id}: ${floors}`); }
  for (const id of needsOf(15)) assert.equal(floorDrops.has(id), false, `+15 ${id} unexpectedly drops in floors 1-${raid.RAID_MAX_FLOOR}`);
});
