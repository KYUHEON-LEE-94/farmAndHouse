// 41~45층 시계 정원 숨김 구현(RAID_FLOOR_50_IMPLEMENTATION_PLAN 2·3·4·5·6·8절): 층 데이터, +22 안전선, +23·+24 성장, 9단계 방어구,
// 재료·천장, 보스 큰 공격 1.2초·단계 정책(41~45층만 정리), 지형 3종, 원거리 상한, +22→+24 비용 20만 회
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';

const out = buildSync({
  stdin: { contents: `export * from "./app/raid/engine"; export * from "./app/raid/forge"; export { raidWeaponStats, RAID_WEAPONS } from "./app/raid/weapons"; export { FLOORS, MONSTERS, ARMORS, ENHANCE, ENHANCE_PITY, EMPTY_RAID, FLOOR_REWARDS, RAID_ITEMS, BOSS_DROP_PITY, MAT_DROP_PITY, RAID_MAX_FLOOR, RAID_DATA_FLOOR, BOSS_AT, armorTierLimit, enhanceLimit, gearOf, mobLift, weaponStats, zoneOf, zoneCommon } from "./app/raid/data"; export { recommendedEnh } from "./app/raid/progress"; export { hasArmorPrerequisite } from "./app/raid/armorRequirements"; export { CLOCK_GATE, CLOCK_FLOOR, SAND_POOL, clockGateState, pickClockCells, slowAt, makeTerrain } from "./app/raid/terrain"; export { auraLevel, auraSvg } from "./app/raid/weaponArt";`, resolveDir: new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), loader: 'tsx' },
  bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent', jsx: 'automatic',
});
const R = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
function seeded(seed) { let x = seed >>> 0; return () => { x = (x + 0x6D2B79F5) >>> 0; let t = x; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
Math.random = seeded(20261026);
const input = (s, o = {}) => ({ up: false, down: false, left: false, right: false, aimX: s.player.x - s.cam.x + 50, aimY: s.player.y - s.cam.y, attack: false, special: false, dash: false, food: [false, false, false], ...o });
const step = to => R.ENHANCE.find(s => s.to === to);
const raidAt = enhancement => ({ ...R.EMPTY_RAID, stabilizers: 0, weapons: { 'raid-scythe': { enhancement, evolution: 'great-scythe' } } });
const IDS = { 41: 'bronze-gatekeeper', 42: 'clock-bird', 43: 'hourglass-alchemist', 44: 'clockwork-knight', 45: 'garden-keeper' };

function arena(floorNo, id, dx = 200, dy = 0) {
  const s = R.createRaid(R.FLOORS[floorNo - 1], { ...R.weaponStats(0, null, 'raid-scythe'), damage: 0.0001, range: 1 }, null, [], undefined, null, floorNo);
  s.spawnAcc = -1e9; s.nextElite = 1e9; s.monsters = []; s.zones = []; s.projectiles = []; s.hazards = [];
  s.player.x = 900; s.player.y = 700; s.terrain.walls = []; s.terrain.gates = [];
  s.ext.clockStart = 1e9; s.ext.sandAt = 1e9;
  const m = id ? R.spawn(s, id, {}, { x: s.player.x + dx, y: s.player.y + dy }) : null;
  return { s, m };
}
function run(s, seconds, each = () => {}) {
  for (let i = 0; i < seconds * 60 && !s.over; i++) { s.player.hp = s.player.maxHp; s.choices = null; R.stepRaid(s, 1 / 60, input(s)); each(i); }
}

test('41~45층 데이터: 시계 정원 5개 층, 전용 보스, 데이터 상한 45·운영 상한 40, 숨김 강화·방어구 상한', () => {
  const f = R.FLOORS.filter(x => x.floor >= 41 && x.floor <= 45);
  assert.equal(f.length, 5);
  assert.deepEqual(f.map(x => x.boss.id), Object.values(IDS));
  for (const x of f) { assert.equal(x.zone, '시계 정원'); assert.equal(R.zoneOf(x.floor), 'clock'); assert.equal(R.zoneCommon(x.floor), 'clock-brass'); assert.ok(R.BOSS_SCRIPTS[x.boss.id]?.strict, x.boss.id); assert.ok(x.maxAlive <= 41, '실제 최대 78마리 이하'); }
  assert.equal(R.RAID_DATA_FLOOR, 45); assert.equal(R.RAID_MAX_FLOOR, 40, '운영 상한은 40 그대로');
  assert.equal(R.enhanceLimit(R.RAID_MAX_FLOOR), 22); assert.equal(R.enhanceLimit(R.RAID_DATA_FLOOR), 24);
  assert.equal(R.armorTierLimit(R.RAID_MAX_FLOOR), 8); assert.equal(R.armorTierLimit(41), 9);
  assert.equal(R.nextStep(22, R.enhanceLimit(R.RAID_MAX_FLOOR)), null, '운영에서는 +23 단계가 보이지 않는다');
  assert.equal(R.nextStep(22, R.enhanceLimit(R.RAID_DATA_FLOOR)).to, 23);
  assert.deepEqual([41, 42, 43, 44, 45].map(R.recommendedEnh), [22, 22, 23, 23, 24]);
  // 보스 방어는 40층(17) 대비 +0~2
  for (const x of f) assert.ok(x.boss.defense >= 17 && x.boss.defense <= 19, `${x.floor}층 방어 ${x.boss.defense}`);
});

test('41층 몬스터: 40층 동급 대비 HP +8~12%·피해 +3~6%·방어 +0~2, 층당 HP +3~5%·피해 +2~3%', () => {
  const pairs = { 'clock-rat': 'star-wraith', 'bronze-moth': 'prism-eye', 'sand-spirit': 'prism-eye', 'clock-shield': 'throne-guard', 'garden-executor': 'void-judge' };
  for (const [now, old] of Object.entries(pairs)) {
    const a = R.MONSTERS[now], b = R.MONSTERS[old], elite = a.kind === 'elite', lift = R.mobLift(40, elite);
    const hp = a.hp / (b.hp * lift.hp), dmg = a.damage / (b.damage * lift.damage);
    assert.ok(hp >= 1.08 && hp <= 1.12, `${now} HP ×${hp.toFixed(3)}`);
    assert.ok(dmg >= 1.03 && dmg <= 1.06, `${now} 피해 ×${dmg.toFixed(3)}`);
    assert.ok(a.defense - b.defense >= 0 && a.defense - b.defense <= 2, `${now} 방어`);
  }
  assert.ok(R.MONSTERS['clock-shield'].defense + 3 <= 16, '방어형 최대 16');
  for (const elite of [false, true]) { const a = R.mobLift(42, elite), b = R.mobLift(41, elite); assert.ok(a.hp / b.hp >= 1.03 && a.hp / b.hp <= 1.05); assert.ok(a.damage / b.damage >= 1.02 && a.damage / b.damage <= 1.03); }
  assert.deepEqual(R.mobLift(41, false), { hp: 1, damage: 1 });
});

test('+23·+24 표와 +22 안전선: +22→+23 실패는 하락 없음, +23 이상에서 연속 하락해도 최저 +22', () => {
  for (const to of [23, 24]) { const s = step(to); assert.ok(s && s.open && R.ENHANCE_PITY[to], `+${to}`); assert.ok(s.chance > 0 && s.drop <= 0.07); }
  assert.deepEqual(step(23).open.need, { 'clock-brass': 5, 'time-glass': 3 }, '시간 유리로 +23 개방');
  assert.deepEqual(step(24).open.need, { 'garden-heart': 1 }, '정원의 심장은 +24 최초 개방 전용');
  const failDrop = () => { let i = 0; return () => (i++ === 0 ? 0.999 : 0); };
  assert.equal(R.rollEnhance(22, step(23), false, 0, failDrop()).dropped, false);
  assert.equal(R.rollEnhance(23, step(24), false, 0, failDrop()).dropped, true);
  const drop = { success: false, dropped: true, saved: false };
  assert.equal(R.applyEnhance(raidAt(23), 'raid-scythe', drop).weapons['raid-scythe'].enhancement, 22);
  assert.equal(R.applyEnhance(R.applyEnhance(raidAt(24), 'raid-scythe', drop), 'raid-scythe', drop).weapons['raid-scythe'].enhancement, 22, '연속 하락도 +22에서 멈춤');
  assert.equal(R.applyEnhance(raidAt(21), 'raid-scythe', drop).weapons['raid-scythe'].enhancement, 20, '+21 이하 저장은 기존 +18 안전선 그대로');
});

test('+23·+24 성장: +22 대비 단계당 피해 ×1.05·간격 ×0.99, 사거리·반경·폭·속도는 +22 값 유지', () => {
  for (const w of R.RAID_WEAPONS) for (const { id: evo } of w.evos) {
    const a = R.raidWeaponStats(w.id, 22, evo), b = R.raidWeaponStats(w.id, 24, evo), c = R.raidWeaponStats(w.id, 18, evo);
    assert.ok(Math.abs(b.damage / a.damage - 1.05 ** 2) < 0.01, `${evo} 피해 ${a.damage}→${b.damage}`);
    assert.ok(Math.abs(b.interval / a.interval - 0.99 ** 2) < 0.01, `${evo} 간격`);
    for (const k of ['range', 'radius', 'width', 'speed', 'angle', 'pellets']) assert.equal(b[k], a[k], `${evo} ${k}`);
    assert.ok(Math.abs(a.damage / c.damage - 1.06 ** 4) < 0.01, `${evo}: +19~+22는 그대로`);
  }
});

test('+23·+24 외형: 가장 높은 단계 하나만, +24는 시간 고리', () => {
  assert.equal(R.auraLevel(22), null); assert.equal(R.auraLevel(23), 23); assert.equal(R.auraLevel(24), 24);
  assert.ok(!R.auraSvg(23).includes('time-ring') && R.auraSvg(24).includes('time-ring') && R.auraSvg(null) === '');
});

test('9단계 시계 정원 수호자 3종: 6.1절 시작표, 같은 부위 8단계 보유 필요(소모 안 함), 개방 전용 재료 미요구', () => {
  const want = {
    'clock-hood': ['star-hood', 72000, { 'clock-brass': 8, 'time-glass': 3 }, { crit: 0.23, xpGain: 0.12, bossDamage: 0.11 }],
    'clock-vest': ['star-vest', 90000, { 'clock-brass': 11, 'time-glass': 4 }, { hp: 150, defense: 18, startShield: 55, projectileCut: 0.16 }],
    'clock-boots': ['star-boots', 72000, { 'clock-brass': 8, 'time-glass': 3 }, { speed: 0.26, dashCd: 0.38, hazardCut: 0.45 }],
  };
  const t9 = R.ARMORS.filter(a => a.tier === 9);
  assert.deepEqual(t9.map(a => a.id).sort(), Object.keys(want).sort());
  for (const a of t9) {
    const [pre, gold, need, stats] = want[a.id];
    assert.equal(a.prerequisite, pre); assert.equal(a.gold, gold); assert.deepEqual(a.need, need); assert.deepEqual(a.stats, stats);
    const prev = R.ARMORS.find(x => x.id === pre); assert.equal(prev.slot, a.slot); assert.equal(prev.tier, 8);
    assert.equal(R.hasArmorPrerequisite(a, []), false); assert.equal(R.hasArmorPrerequisite(a, [pre]), true);
    assert.ok(!('garden-heart' in a.need));
  }
});

test('재료 3종·41~45층 보상·천장: 시간 유리(43·44층) 일반 천장, 정원의 심장(45층 반복) 보스 천장', () => {
  for (const id of ['clock-brass', 'time-glass', 'garden-heart']) assert.ok(R.RAID_ITEMS[id], id);
  for (let f = 41; f <= 45; f++) { const r = R.FLOOR_REWARDS[f]; assert.ok(r && r.stabilizer <= 0.1, `${f}층`); }
  assert.ok(!R.FLOOR_REWARDS[43].first.some(([id]) => id === 'garden-heart'));
  assert.ok(R.FLOOR_REWARDS[43].first.some(([id]) => id === 'time-glass'), '시간 유리 첫 획득 43층');
  assert.ok(![41, 42].some(f => [...R.FLOOR_REWARDS[f].first, ...R.FLOOR_REWARDS[f].repeat].some(([id]) => id === 'time-glass')));
  assert.equal(R.BOSS_DROP_PITY[45].id, 'garden-heart');
  const never = () => 0.999;
  for (const [floor, id] of [[43, 'time-glass'], [44, 'time-glass'], [45, 'garden-heart']]) {
    let miss = {};
    for (let i = 0; i < 3; i++) { const r = R.rollDrops(R.FLOOR_REWARDS[floor].repeat, floor, true, miss, never); assert.equal(r.gain[id], undefined); miss = r.bossMiss; }
    const r = R.rollDrops(R.FLOOR_REWARDS[floor].repeat, floor, true, miss, never);
    assert.ok(r.gain[id] >= 1, `${floor}층 ${id} 4번째 확정`); assert.equal(r.bossMiss[id], 0);
  }
});

test('일반 몬스터 5종: 들쥐 0.6초 방향 예고, 나방 느린 탄 3발, 정령 1.2초 고정 바닥 예고, 방패병 정면 방패, 집행자 1.2초 돌진·십자', () => {
  { const { s, m } = arena(41, 'clock-rat', 150); let tele = null; run(s, 4, () => { if (!tele && m.state === 'tele') tele = m.stateT + 1 / 60; }); assert.ok(tele && Math.abs(tele - 0.6) < 0.02, `들쥐 예고 ${tele}`); }
  { const { s } = arena(41, 'bronze-moth', 230); let most = 0; run(s, 6, () => { most = Math.max(most, s.projectiles.filter(p => !p.mine).length); }); assert.equal(most >= 3, true, `나방 탄 ${most}`); }
  {
    const { s } = arena(42, 'sand-spirit', 230); let z = null, at = null;
    run(s, 8, () => { if (!z) { z = s.zones.find(x => x.label === '모래 폭발') ?? null; if (z) at = { x: z.x, y: z.y, tele: z.tele + 1 / 60 }; } if (z) s.player.x += 2; });
    assert.ok(z, '정령 폭발'); assert.ok(at.tele >= 1.2 - 1e-9, `정령 예고 ${at.tele}`); assert.ok(z.x === at.x && z.y === at.y, '발사 뒤 추적 없음');
  }
  {
    const { s, m } = arena(43, 'clock-shield', 150); run(s, 0.05);
    m.dir = { x: -1, y: 0 }; m.state = 'move'; assert.ok(R.frontGuardUp(s, m), '정면 방패'); assert.equal(R.guardBonus(m), 3);
    m.state = 'stun'; assert.ok(!R.frontGuardUp(s, m), '공격 준비 중 방패 해제'); assert.equal(R.guardBonus(m), 0);
  }
  {
    const { s, m } = arena(41, 'garden-executor', 240); let tele = null, cross = [];
    run(s, 10, () => { if (!tele && m.state === 'tele') tele = m.stateT + 1 / 60; const c = s.hazards.filter(h => h.label === '십자 충격파'); if (c.length > cross.length) cross = c; });
    assert.ok(tele >= 1.2 - 0.02, `집행자 돌진 예고 ${tele}`); assert.equal(cross.length, 2); for (const h of cross) assert.ok(h.tele >= 1.2);
  }
});

test('원거리 동시 상한 4(나방·정령 합산)는 41~45층에서도 그대로', () => {
  assert.equal(R.RANGED_CAP, 4);
  const s = R.createRaid(R.FLOORS[41], R.weaponStats(0, null, 'raid-scythe'), null, [], undefined, null, 42);
  s.nextElite = 1e9; let most = 0;
  for (let i = 0; i < 60 * 60; i++) { s.player.hp = s.player.maxHp; s.choices = null; R.stepRaid(s, 1 / 60, input(s)); most = Math.max(most, s.monsters.filter(m => m.hp > 0 && !m.boss && (m.def.kind === 'ranged' || m.def.kind === 'frog')).length); }
  assert.ok(most <= 4, `원거리 ${most}`);
});

/** 보스를 바로 불러 단계별로 관찰(플레이어는 죽지 않게) */
function observe(floorNo, seconds = 40) {
  const keep = Math.random; Math.random = seeded(floorNo * 131);
  try {
    const s = R.createRaid(R.FLOORS[floorNo - 1], R.weaponStats(0, null, 'raid-scythe'), null, [], undefined, null, floorNo);
    s.spawnAcc = -1e9; s.nextElite = 1e9; s.t = R.BOSS_AT - 0.05;
    const seen = { hazards: [], zones: [], zoneRefs: new Set(), phases: new Set(), patterns: new Set(), maxHit: 0, invuln: [], repeats: 0 };
    for (let i = 0; i < 10 && !s.boss; i++) { s.choices = null; R.stepRaid(s, 1 / 60, input(s)); }
    let lastPhase = s.boss.phase ?? 0, lastPat = null;
    for (const ratio of [1, 0.6, 0.5, 0.3]) {
      s.boss.hp = s.boss.maxHp * ratio;
      for (let i = 0; i < seconds * 60 && !s.over; i++) {
        s.player.hp = s.player.maxHp; s.player.iframes = 0; s.choices = null;
        const before = { ...s.damageTaken };
        R.stepRaid(s, 1 / 60, input(s));
        for (const h of s.hazards) if (!h.mob && !seen.hazards.includes(h)) seen.hazards.push(h);
        for (const z of s.zones) if (z.label && !z.mob && !seen.zoneRefs.has(z)) { seen.zoneRefs.add(z); seen.zones.push({ label: z.label, damage: z.damage, tele: z.tele > 0 ? z.tele + 1 / 60 : 0 }); }
        for (const [k, v] of Object.entries(s.damageTaken)) seen.maxHit = Math.max(seen.maxHit, v - (before[k] ?? 0));
        if ((s.boss?.phase ?? 0) !== lastPhase) { assert.equal(s.boss.phase, lastPhase + 1, '한 번에 한 단계'); lastPhase = s.boss.phase; seen.invuln.push(Math.round((s.boss.invulnUntil - s.t) * 100) / 100); }
        seen.phases.add(s.boss?.phase ?? -1);
        if (s.boss?.lastPattern && s.boss.lastPattern !== lastPat) { if (lastPat !== null) seen.patterns.add(s.boss.lastPattern); lastPat = s.boss.lastPattern; }
      }
    }
    return { s, seen };
  } finally { Math.random = keep; }
}
for (const floorNo of [41, 42, 43, 44, 45]) {
  test(`${floorNo}층 보스(${IDS[floorNo]}): 단계 ${floorNo === 45 ? '70%·35%' : '55%'}, 큰 공격 1.2초·작은 공격 0.6초 예고, 전환 무적 0.8초, 피해 상한`, () => {
    const { s, seen } = observe(floorNo);
    const script = R.BOSS_SCRIPTS[IDS[floorNo]];
    assert.equal(s.floor.boss.id, IDS[floorNo]);
    assert.deepEqual(script.phases.map(p => p.at), floorNo === 45 ? [1, 0.7, 0.35] : [1, 0.55]);
    assert.ok(script.phases.every(p => p.combo <= 2), '3연계는 50층 마지막 단계만');
    assert.ok(seen.phases.has(script.phases.length - 1), `마지막 단계 도달: ${[...seen.phases]}`);
    assert.ok(seen.patterns.size >= 3, `패턴 ${[...seen.patterns]}`);
    const big = R.bossPct(s, 0.1);
    for (const h of seen.hazards) assert.ok(h.tele >= (h.damage >= big ? 1.2 : 0.6), `${h.label} 예고 ${h.tele}초(피해 ${h.damage})`);
    for (const z of seen.zones) assert.ok(z.tele === 0 || z.tele >= (z.damage >= big ? 1.2 - 1e-9 : 0.6), `${z.label} 예고 ${z.tele}초`);
    for (const h of [...seen.hazards, ...seen.zones]) assert.ok(h.damage <= R.bossPct(s, 0.21), `${h.label} 피해 ${h.damage}`);
    assert.equal(seen.invuln.length, script.phases.length - 1);
    for (const t of seen.invuln) assert.ok(t <= 0.8 + 1e-9 && t > 0.7, `단계 무적 ${t}초`);
    assert.ok(seen.maxHit < 450, `최대 단일 피해 ${seen.maxHit}`);
  });
}

function bossAt(floorNo) {
  const s = R.createRaid(R.FLOORS[floorNo - 1], R.weaponStats(0, null, 'raid-scythe'), null, [], undefined, null, floorNo);
  s.spawnAcc = -1e9; s.nextElite = 1e9; s.t = R.BOSS_AT - 0.05;
  for (let i = 0; i < 10 && !s.boss; i++) { s.choices = null; R.stepRaid(s, 1 / 60, input(s)); }
  s.monsters = [s.boss]; s.zones = []; s.hazards = []; s.projectiles = []; s.actions = [];
  return s;
}
function plant(s) {
  const p = s.player, b = s.boss;
  s.projectiles.push({ x: p.x + 300, y: p.y, vx: 0, vy: 0, r: 7, damage: 10, life: 5, mine: false, pierce: null, boss: true });
  s.projectiles.push({ x: p.x - 300, y: p.y, vx: 0, vy: 0, r: 7, damage: 10, life: 5, mine: true, pierce: new Set() });
  s.hazards.push({ kind: 'track', x: p.x + 200, y: p.y, angle: 0, len: 0, width: 0, r0: 50, r1: 0, band: 0, tele: 3, life: 0.2, age: 0, damage: 10, label: '테스트 위험' });
  s.zones.push({ kind: 'bolt', x: p.x + 200, y: p.y + 200, r: 50, t: 0.2, tele: 3, damage: 10, every: 0, slow: 0, tick: 0, label: '테스트 장판' });
  s.zones.push({ kind: 'net', x: p.x, y: p.y, r: 60, t: 3, tele: 0, damage: 0, every: 0, slow: 0.5, tick: 0 });
  s.actions.push({ at: s.t + 5, run: () => {}, tag: 'boss' }, { at: s.t + 5, run: () => {}, tag: 'cancel' });
  b.hp = b.maxHp * 0.5; b.gap = 99;
}
test('단계 전환 정리: 41~45층은 적 투사체·위험·장판·보스 지연 행동을 지우고, 40층 이하는 기존대로 둔다', () => {
  for (const floorNo of [41, 42, 43, 44, 45]) {
    const s = bossAt(floorNo); plant(s); s.choices = null; R.stepRaid(s, 1 / 60, input(s));
    assert.equal(s.boss.phase, 1, `${floorNo}층 단계`);
    assert.equal(s.projectiles.filter(p => !p.mine).length, 0, `${floorNo}층 적 투사체`); assert.equal(s.projectiles.filter(p => p.mine).length, 1, '내 투사체는 유지');
    assert.equal(s.hazards.length, 0); assert.equal(s.zones.filter(z => z.label === '테스트 장판').length, 0); assert.equal(s.zones.filter(z => z.kind === 'net').length, 1, '내 그물은 유지');
    assert.equal(s.actions.filter(a => a.tag === 'boss').length, 0); assert.equal(s.actions.filter(a => a.tag === 'cancel').length, 1, '내 특수 공격 예약은 유지');
    assert.ok(Math.abs(s.boss.invulnUntil - s.t - 0.8) < 1e-6); assert.ok(s.boss.gap >= 0.8 + 1.2 - 0.02, '무적 뒤 첫 공격까지 1.2초');
  }
  const s = bossAt(40); plant(s); s.choices = null; R.stepRaid(s, 1 / 60, input(s));
  assert.equal(s.boss.phase, 1); assert.equal(s.projectiles.filter(p => !p.mine).length, 1, '40층은 기존대로 남김'); assert.equal(s.hazards.length, 1);
});

test('45층: 한 프레임에 70%·35%를 함께 넘어도 한 단계씩, 다음 단계는 전환 종료 1초 뒤부터', () => {
  const s = bossAt(45); s.boss.hp = s.boss.maxHp * 0.1;
  s.choices = null; R.stepRaid(s, 1 / 60, input(s)); assert.equal(s.boss.phase, 1);
  const ready = s.boss.phaseReadyAt; assert.ok(Math.abs(ready - (s.boss.invulnUntil + 1)) < 1e-6);
  while (s.t < ready - 0.05) { s.player.hp = s.player.maxHp; s.choices = null; R.stepRaid(s, 1 / 60, input(s)); assert.equal(s.boss.phase, 1); }
  for (let i = 0; i < 10; i++) { s.player.hp = s.player.maxHp; s.choices = null; R.stepRaid(s, 1 / 60, input(s)); }
  assert.equal(s.boss.phase, 2);
});

test('같은 패턴 연속 금지(연계 안 포함)', () => {
  const s = bossAt(41); s.boss.hp = s.boss.maxHp * 0.4; const picks = [];
  const sc = R.BOSS_SCRIPTS['bronze-gatekeeper'], orig = { ...sc.patterns };
  for (const k of Object.keys(sc.patterns)) sc.patterns[k] = (st, m) => { picks.push(k); return orig[k](st, m); };
  try { for (let i = 0; i < 60 * 60; i++) { s.player.hp = s.player.maxHp; s.choices = null; R.stepRaid(s, 1 / 60, input(s)); } } finally { Object.assign(sc.patterns, orig); }
  assert.ok(picks.length > 10);
  for (let i = 1; i < picks.length; i++) assert.notEqual(picks[i], picks[i - 1], `${i}: ${picks[i]}`);
});

test('태엽 문: 9초마다 1.5초 예고 뒤 3초 닫힘, 길이 전장 18%, 주변 140px 우회로, 닫히면 이동·적 탄을 막는다', () => {
  assert.deepEqual(R.clockGateState(R.CLOCK_GATE.start + 0.5), { warn: true, closed: false });
  assert.deepEqual(R.clockGateState(R.CLOCK_GATE.start + 2), { warn: false, closed: true });
  assert.deepEqual(R.clockGateState(R.CLOCK_GATE.start + 5), { warn: false, closed: false });
  assert.deepEqual(R.clockGateState(R.CLOCK_GATE.start + 9 + 0.2), { warn: true, closed: false });
  for (let seed = 1; seed <= 20; seed++) {
    const t = R.makeTerrain(41, seed);
    assert.ok(t.gates.length >= 2, `시드 ${seed} 문 ${t.gates.length}`);
    const others = r => [...t.walls, ...t.gates.map(g => g.rect)].filter(o => o !== r);
    for (const { rect: g } of t.gates) {
      assert.equal(Math.max(g.w, g.h), Math.round(1680 * 0.18));
      assert.ok(g.x >= 140 && g.y >= 140 && g.x + g.w <= 1680 - 140 && g.y + g.h <= 960 - 140, '가장자리 140px');
      for (const o of others(g)) assert.ok(g.x + g.w + 140 <= o.x || o.x + o.w + 140 <= g.x || g.y + g.h + 140 <= o.y || o.y + o.h + 140 <= g.y, '다른 막힘과 140px');
    }
  }
  const s = R.createRaid(R.FLOORS[40], R.weaponStats(0, null, 'raid-scythe'), null, [], undefined, null, 41);
  s.spawnAcc = -1e9; s.nextElite = 1e9; s.monsters = []; s.terrain.walls = [];
  const g = s.terrain.gates[0].rect;
  s.t = R.CLOCK_GATE.start + 2; s.choices = null; R.stepRaid(s, 1 / 60, input(s));
  assert.ok(s.terrain.gates[0].closed);
  const vertical = g.h > g.w, cx = g.x + g.w / 2, cy = g.y + g.h / 2;
  s.projectiles.push({ x: vertical ? cx - 30 : cx, y: vertical ? cy : cy - 30, vx: vertical ? 300 : 0, vy: vertical ? 0 : 300, r: 6, damage: 10, life: 3, mine: false, pierce: null });
  for (let i = 0; i < 20; i++) { s.choices = null; s.player.x = 60; s.player.y = 60; R.stepRaid(s, 1 / 60, input(s)); }
  assert.equal(s.projectiles.filter(p => !p.mine).length, 0, '닫힌 문이 적 탄을 막음');
});

test('시계 바닥: 6칸 중 2칸, 직전 칸 금지, 1.2초 예고 뒤 2.5초 활성, 최대 체력 5%(활성당 1회), 장화 바닥 피해 감소 적용', () => {
  let prev = [];
  for (let i = 0; i < 200; i++) { const c = R.pickClockCells(prev, Math.random); assert.equal(c.length, 2); assert.ok(c.every(x => !prev.includes(x) && x >= 0 && x < 6)); prev = c; }
  const hit = hazardCut => {
    const { s } = arena(42, null);
    s.gear = { ...s.gear, hazardCut }; s.ext.clockStart = s.t + 0.01; s.ext.clockPrev = [];
    let telegraphHurt = false, total = 0, hits = 0;
    for (let i = 0; i < 60 * 4; i++) {
      s.choices = null; R.stepRaid(s, 1 / 60, input(s));
      if (i === 1) { const c = s.ext.clockCells[0]; s.player.x = (1680 / 6) * (c + 0.5); }
      const age = s.t - s.ext.clockStart, took = (s.damageTaken['시계 바닥'] ?? 0) - total;
      if (took > 0) { hits++; if (age < 1.2) telegraphHurt = true; total += took; }
      s.player.iframes = 0; s.player.hp = s.player.maxHp;
    }
    assert.ok(!telegraphHurt, '예고 중에는 피해 없음'); assert.equal(hits, 1, '활성 1회당 한 번');
    return total;
  };
  const free = hit(0), boots = hit(0.45);
  assert.ok(free > 0 && boots < free, `장화 ${free} → ${boots}`);
});

test('모래 웅덩이: 반경 90, 14초 중 8초, 플레이어·일반 적 이동 −22%, 피해 없음(43층부터)', () => {
  assert.equal(R.makeTerrain(42, 3).sand, undefined);
  const { s } = arena(43, null);
  s.ext.sandAt = undefined; s.terrain.sand = [];
  let onT = 0;
  for (let i = 0; i < 60 * 28; i++) { s.choices = null; R.stepRaid(s, 1 / 60, input(s)); if (s.terrain.sandOn) onT++; s.player.hp = s.player.maxHp; }
  assert.ok(Math.abs(onT / 60 - 16) < 0.2, `켜짐 ${onT / 60}초(4~12초·18~26초)`);
  const sp = s.terrain.sand[0]; assert.equal(sp.r, 90);
  s.terrain.sandOn = true;
  assert.ok(Math.abs(R.slowAt(s.terrain, sp.x, sp.y, true) - 0.78) < 1e-9); assert.ok(Math.abs(R.slowAt(s.terrain, sp.x, sp.y, false) - 0.78) < 1e-9);
  assert.equal(Object.keys(s.damageTaken).length, 0, '자체 피해 없음');
});

test('강화 비용 20만 회(+22→+24, 개방비 포함, 하락·재승급·보정 유지): 평균 1,150~1,400만, P90 평균 2배 이하', () => {
  let seed = 12345; const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  const N = 200000, costs = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    let raid = raidAt(22), gold = 0; const opened = new Set();
    while (raid.weapons['raid-scythe'].enhancement < 24) {
      const w = raid.weapons['raid-scythe'], s = step(w.enhancement + 1);
      if (!opened.has(s.to)) { opened.add(s.to); gold += s.open.gold; }
      gold += s.gold;
      raid = R.applyEnhance(raid, 'raid-scythe', R.rollEnhance(w.enhancement, s, false, 0, rnd, w.fails?.[s.to] ?? 0));
    }
    costs[i] = gold;
  }
  costs.sort(); const mean = costs.reduce((a, b) => a + b, 0) / N, p90 = costs[Math.floor(N * 0.9)];
  console.log(`+22→+24 평균 ${Math.round(mean / 1e4)}만 · 하위 10% ${Math.round(p90 / 1e4)}만 · 하위 1% ${Math.round(costs[Math.floor(N * 0.99)] / 1e4)}만`);
  assert.ok(mean >= 1.15e7 && mean <= 1.4e7, `평균 ${mean}`);
  assert.ok(p90 <= mean * 2, `하위 10% ${p90}`);
});
