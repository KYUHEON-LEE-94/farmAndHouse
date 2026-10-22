// 31~35층 보스 대본·7단계 방어구(RAID_FLOOR_40_EXPANSION_AUDIT 7.3·8·14.2·16·17절)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';

const out = buildSync({
  stdin: { contents: `export * from "./app/raid/engine"; export { FLOORS, weaponStats, BOSS_AT, ARMORS, gearOf, EMPTY_RAID, armorTierLimit, RAID_MAX_FLOOR, RAID_DATA_FLOOR } from "./app/raid/data"; export { hasArmorPrerequisite } from "./app/raid/armorRequirements";`, resolveDir: new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent',
});
const R = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
function seeded(seed) { let x = seed >>> 0; return () => { x = (x + 0x6D2B79F5) >>> 0; let t = x; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const idle = s => ({ up: false, down: false, left: false, right: false, aimX: s.player.x - s.cam.x + 50, aimY: s.player.y - s.cam.y, attack: false, special: false, dash: false, food: [false, false, false] });

/** 보스를 바로 불러 단계별로 seconds초씩 관찰(플레이어는 죽지 않게) */
function observe(floorNo, seconds = 40) {
  const keep = Math.random; Math.random = seeded(floorNo * 131);
  try {
    const s = R.createRaid(R.FLOORS[floorNo - 1], R.weaponStats(0, null, 'raid-scythe'), null, [], undefined, null, floorNo);
    s.spawnAcc = -1e9; s.nextElite = 1e9; s.t = R.BOSS_AT - 0.05;
    const seen = { hazards: [], zones: [], zoneRefs: new Set(), phases: new Set(), patterns: new Set(), maxHit: 0, bullets: 0, invuln: [] };
    for (let i = 0; i < 10 && !s.boss; i++) { s.choices = null; R.stepRaid(s, 1 / 60, idle(s)); }
    assert.ok(s.boss, `${floorNo}층 보스 미등장`);
    let lastPhase = s.boss.phase ?? 0;
    for (const ratio of [1, 0.6, 0.3]) {
      s.boss.hp = s.boss.maxHp * ratio;
      for (let i = 0; i < seconds * 60 && !s.over; i++) {
        s.player.hp = s.player.maxHp; s.player.iframes = 0; s.choices = null;
        const before = { ...s.damageTaken };
        R.stepRaid(s, 1 / 60, idle(s));
        for (const h of s.hazards) if (!seen.hazards.includes(h)) seen.hazards.push(h);
        // 장판 예고는 줄어드는 값이라 처음 본 순간 값을 남긴다(생성 프레임에 한 번 줄어든 만큼 더해 원래 예고로)
        for (const z of s.zones) if (z.label && !z.mob && !seen.zoneRefs.has(z)) { seen.zoneRefs.add(z); seen.zones.push({ label: z.label, damage: z.damage, tele: z.tele > 0 ? z.tele + 1 / 60 : 0 }); }
        for (const [k, v] of Object.entries(s.damageTaken)) seen.maxHit = Math.max(seen.maxHit, v - (before[k] ?? 0));
        if ((s.boss?.phase ?? 0) !== lastPhase) { lastPhase = s.boss.phase; seen.invuln.push(Math.round((s.boss.invulnUntil - s.t) * 100) / 100); }
        seen.phases.add(s.boss?.phase ?? -1); if (s.boss?.lastPattern) seen.patterns.add(s.boss.lastPattern);
        seen.bullets = Math.max(seen.bullets, s.projectiles.filter(p => !p.mine).length);
      }
    }
    return { s, seen };
  } finally { Math.random = keep; }
}

const IDS = { 31: 'sky-golem', 32: 'gale-roc', 33: 'cloud-sage', 34: 'ruin-colossus', 35: 'storm-executor', 36: 'star-shade', 37: 'void-beast', 38: 'prism-warden', 39: 'throne-keeper', 40: 'void-king' };
for (const floorNo of [31, 32, 33, 34, 35, 36, 37, 38, 39, 40]) {
  test(`${floorNo}층 보스(${IDS[floorNo]}): 전용 대본, 모든 단계·패턴 사용, 큰 공격 예고 1.2초, 단계 무적 0.8초, 피해 상한`, () => {
    const { s, seen } = observe(floorNo);
    assert.equal(s.floor.boss.id, IDS[floorNo]);
    const script = R.BOSS_SCRIPTS[IDS[floorNo]];
    assert.ok(script && s.boss.script === IDS[floorNo], '스크립트 보스');
    const last = script.phases.length - 1;
    const zoneBoss = floorNo % 5 === 0;
    assert.equal(script.phases.length, zoneBoss ? 3 : 2);
    assert.ok(seen.phases.has(last), `마지막 단계 도달: ${[...seen.phases]}`);
    const minPatterns = zoneBoss ? 5 : 3;
    assert.ok(seen.patterns.size >= minPatterns, `패턴 ${seen.patterns.size}종 사용(${[...seen.patterns]})`);
    // 큰 공격(표준 체력 10% 이상)은 1.2초, 작은 공격은 0.6초 이상 예고(14.2절)
    const big = R.bossPct(s, 0.1);
    for (const h of seen.hazards) assert.ok(h.tele >= (h.damage >= big ? 1.2 : 0.6), `${h.label} 예고 ${h.tele}초(피해 ${h.damage})`);
    for (const z of seen.zones) assert.ok(z.tele === 0 || z.tele >= (z.damage >= big ? 1.2 - 1e-9 : 0.6), `${z.label} 예고 ${z.tele}초`);
    for (const h of [...seen.hazards, ...seen.zones]) assert.ok(h.damage <= R.bossPct(s, 0.21), `${h.label} 피해 ${h.damage} > 상한`);
    for (const t of seen.invuln) assert.ok(t <= 0.8 + 1e-9 && t > 0.7, `단계 무적 ${t}초`);
    assert.ok(seen.maxHit < 450, `최대 단일 피해 ${seen.maxHit}`);
    assert.ok(seen.bullets < 120, `탄막 누적 ${seen.bullets}`);
  });
}

test('35층 폭풍의 집행자: 35% 아래(3단계)에서는 폭풍의 핵을 더 부르지 않는다', () => {
  const sc = R.BOSS_SCRIPTS['storm-executor'];
  assert.ok(sc.phases[0].patterns.includes('cores') && sc.phases[1].patterns.includes('cores'));
  assert.ok(!sc.phases[2].patterns.includes('cores'));
  assert.ok(sc.phases[2].patterns.includes('tempest') && sc.phases[1].patterns.includes('gridDash'));
});

test('32층 횡풍: 회피 중이 아니면 밀리고, 천공 장화 강풍 저항 60%만큼 덜 밀린다', () => {
  const push = (windResist) => {
    const s = R.createRaid(R.FLOORS[31], R.weaponStats(0, null, 'raid-scythe'), null, [], { ...R.NO_GEAR, windResist }, null, 32);
    s.spawnAcc = -1e9; s.nextElite = 1e9; s.monsters = []; s.terrain.wind = [];
    s.player.x = 900; s.player.y = 700; s.ext.gustUntil = 1e9; s.ext.gustX = 1; s.ext.gustY = 0;
    const x0 = s.player.x; for (let i = 0; i < 60; i++) { s.choices = null; s.player.hp = s.player.maxHp; R.stepRaid(s, 1 / 60, idle(s)); }
    return s.player.x - x0;
  };
  const free = push(0), resist = push(0.6);
  assert.ok(free > R.GUST_SPEED * 0.8, `횡풍 ${free.toFixed(0)}px/s`);
  assert.ok(Math.abs(resist - free * 0.4) < 6, `저항 ${resist.toFixed(0)} vs ${free.toFixed(0)}`);
});

test('7단계 천공 파수꾼 3종: 같은 부위 6단계 보유 필요, 천공철·구름 결정만, 문서 시작값', () => {
  const sky = R.ARMORS.filter(a => a.tier === 7);
  assert.deepEqual(sky.map(a => a.id).sort(), ['sky-boots', 'sky-hood', 'sky-vest']);
  const want = { 'sky-hood': ['core-hood', 30000, { 'sky-iron': 6, 'cloud-crystal': 2 }], 'sky-vest': ['core-vest', 38000, { 'sky-iron': 8, 'cloud-crystal': 3 }], 'sky-boots': ['core-boots', 30000, { 'sky-iron': 6, 'cloud-crystal': 2 }] };
  for (const a of sky) {
    const [pre, gold, need] = want[a.id];
    assert.equal(a.prerequisite, pre); assert.equal(a.gold, gold); assert.deepEqual(a.need, need);
    assert.ok(!('storm-core' in a.need) && !('throne-fragment' in a.need), '무기 개방 재료와 경쟁하지 않음');
    const prev = R.ARMORS.find(x => x.id === pre);
    assert.equal(prev.slot, a.slot); assert.equal(prev.tier, 6);
    assert.equal(R.hasArmorPrerequisite(a, []), false);
    assert.equal(R.hasArmorPrerequisite(a, [pre]), true);
  }
  const g = R.gearOf({ ...R.EMPTY_RAID, equipped: { ...R.EMPTY_RAID.equipped, head: 'sky-hood', body: 'sky-vest', legs: 'sky-boots' } });
  assert.equal(g.hp, 110); assert.equal(g.defense, 15); assert.equal(g.startShield, 40); assert.equal(g.projectileCut, 0.1); assert.equal(g.windResist, 0.6);
  assert.equal(g.bossDamage, 0.07); assert.ok(Math.abs(g.crit - 0.19) < 1e-9); assert.ok(Math.abs(g.speed - 0.22) < 1e-9); assert.equal(g.hazardCut, 0.35);
});

test('방어구 단계 표시: 30층까지는 6단계, 31층이 열리면 7단계, 36층이 열리면 8단계(운영 40층 공개 후 8단계까지 보임)', () => {
  assert.equal(R.RAID_MAX_FLOOR, 40);
  assert.equal(R.armorTierLimit(30), 6); assert.equal(R.armorTierLimit(R.RAID_MAX_FLOOR), 8);
  assert.equal(R.armorTierLimit(31), 7); assert.equal(R.armorTierLimit(35), 7); assert.equal(R.armorTierLimit(36), 8); assert.equal(R.armorTierLimit(R.RAID_DATA_FLOOR), 8);
});

test('천공 파수꾼 갑옷: 투사체 피해 −10%(바닥·보스 광선에는 적용하지 않음)', () => {
  const hit = (projectileCut, label) => {
    const s = R.createRaid(R.FLOORS[30], R.weaponStats(0, null, 'raid-scythe'), null, [], { ...R.NO_GEAR, projectileCut }, null, 31);
    s.spawnAcc = -1e9; s.nextElite = 1e9; s.monsters = []; s.player.iframes = 0; s.player.shield = 0;
    const hp = s.player.hp;
    if (label === '투사체') s.projectiles.push({ x: s.player.x, y: s.player.y, vx: 0, vy: 0, r: 7, damage: 100, life: 1, mine: false, pierce: null });
    else s.zones.push({ kind: 'bolt', x: s.player.x, y: s.player.y, r: 60, t: 0.1, tele: 0.01, damage: 100, every: 0, slow: 0, tick: 0, label });
    s.choices = null; R.stepRaid(s, 1 / 60, idle(s));
    return hp - s.player.hp;
  };
  const a = hit(0, '투사체'), b = hit(0.1, '투사체');
  assert.ok(a > 0 && b < a, `투사체 ${a} → ${b}`);
  assert.equal(hit(0.1, '번개 표식'), hit(0, '번개 표식'));
});
