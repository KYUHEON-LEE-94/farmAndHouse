import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../app/raid/data.ts', import.meta.url), 'utf8');
const ast = ts.createSourceFile('data.ts', source, ts.ScriptTarget.Latest, true);
const declaration = ast.statements.filter(ts.isVariableStatement).flatMap(s => [...s.declarationList.declarations]).find(d => d.name.getText(ast) === 'ARMORS');
const helper = readFileSync(new URL('../app/raid/armorRequirements.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(`${helper}\nexport const ARMORS = ${declaration.initializer.getText(ast)};`, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { ARMORS, hasArmorPrerequisite } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
test('every reinforced armor requires its own previous tier, not another slot', () => {
  for (const armor of ARMORS.filter(a => a.tier === 2)) {
    const previous = ARMORS.find(a => a.id === armor.prerequisite);
    assert.ok(previous); assert.equal(previous.slot, armor.slot); assert.equal(previous.tier, armor.tier - 1);
    assert.equal(hasArmorPrerequisite(armor, []), false);
    assert.equal(hasArmorPrerequisite(armor, ARMORS.filter(a => a.id !== previous.id).map(a => a.id)), false);
    const owned = [previous.id];
    assert.equal(hasArmorPrerequisite(armor, owned), true);
    assert.deepEqual(owned, [previous.id]);
  }
});
test('base armor can be crafted without previous gear', () => {
  for (const armor of ARMORS.filter(a => a.tier === 1)) assert.equal(hasArmorPrerequisite(armor, []), true);
});
