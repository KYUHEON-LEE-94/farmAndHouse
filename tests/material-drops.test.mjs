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

test('every enhancement ingredient through +18 has a current source', () => {
  for (const step of raid.ENHANCE.filter(step => step.to <= 18)) {
    const ids = [...Object.keys(step.need), ...Object.keys(step.open?.need ?? {})];
    for (const id of ids) assert.ok(id in raid.LIFE_MATS || floorDrops.has(id) || huntAll.has(id) || virtualNeeds.has(id), `+${step.to}: no source for ${id}`);
  }
});

test('every configured floor drop is a registered raid item', () => {
  for (const id of floorDrops) assert.ok(id in raid.RAID_ITEMS, `unregistered floor drop: ${id}`);
});

test('강화 재료는 해당 구간에서만: +13은 11~15층, +14는 16~20층, +15·+16은 21~25층, +17·+18은 26~30층', () => {
  const needsOf = to => { const step = raid.ENHANCE.find(s => s.to === to); return [...Object.keys(step.need), ...Object.keys(step.open?.need ?? {})]; };
  const range = { 13: [11, 15], 14: [16, 20], 15: [21, 25], 16: [21, 25], 17: [26, 30], 18: [26, 30] };
  for (const [to, [lo, hi]] of Object.entries(range)) for (const id of needsOf(Number(to))) {
    const floors = dropFloors.get(id) ?? [];
    assert.ok(floors.length && floors.every(f => f >= lo && f <= hi), `+${to} ${id}: ${floors}`);
  }
});
