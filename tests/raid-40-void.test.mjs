// 36~40층 공허 왕좌(RAID_FLOOR_40_EXPANSION_AUDIT 7.2·7.4·8.1): 몬스터 행동, 별빛 발판·암전·균열, 전장 수축, 8단계 방어구
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';

const out = buildSync({
  stdin: { contents: `export * from "./app/raid/engine"; export { FLOORS, weaponStats, MONSTERS, ARMORS, gearOf, EMPTY_RAID, armorTierLimit, RAID_MAX_FLOOR, RAID_DATA_FLOOR, BOSS_AT } from "./app/raid/data"; export { blockers, platformOn, PLATFORM_PERIOD } from "./app/raid/terrain";`, resolveDir: new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent',
});
const R = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
function seeded(seed) { let x = seed >>> 0; return () => { x = (x + 0x6D2B79F5) >>> 0; let t = x; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
Math.random = seeded(20261022);
const input = (s, o = {}) => ({ up: false, down: false, left: false, right: false, aimX: s.player.x - s.cam.x + 50, aimY: s.player.y - s.cam.y, attack: false, special: false, dash: false, food: [false, false, false], ...o });

function arena(floorNo, id, dx, dy, opts = {}) {
  const s = R.createRaid(R.FLOORS[floorNo - 1], { ...R.weaponStats(0, null, 'raid-scythe'), damage: 0.0001, range: 1 }, null, [], undefined, null, floorNo);
  s.spawnAcc = -1e9; s.nextElite = 1e9; s.monsters = []; s.zones = []; s.projectiles = []; s.hazards = [];
  s.player.x = 900; s.player.y = 700; s.terrain.walls = []; s.terrain.deep = []; s.terrain.platforms = []; s.terrain.platformOff = [];
  s.ext.blackoutAt = 1e9; s.ext.riftAt = 1e9;
  const m = id ? R.spawn(s, id, opts, { x: s.player.x + dx, y: s.player.y + dy }) : null;
  return { s, m };
}
function run(s, seconds, each = () => {}) {
  for (let i = 0; i < seconds * 60 && !s.over; i++) { s.player.hp = s.player.maxHp; s.choices = null; R.stepRaid(s, 1 / 60, input(s)); each(i); }
}

test('36~40층 데이터: 공허 왕좌 5개 층, 36층은 별빛 망령·공허 사냥개만, 보스 전용 id, 운영·데이터 상한 모두 40', () => {
  const f = R.FLOORS.filter(x => x.floor >= 36 && x.floor <= 40);
  assert.equal(f.length, 5);
  assert.deepEqual(f[0].monsters, ['star-wraith', 'void-hound']);
  assert.deepEqual(f.map(x => x.boss.id), ['star-shade', 'void-beast', 'prism-warden', 'throne-keeper', 'void-king']);
  assert.equal(R.RAID_DATA_FLOOR, 40); assert.equal(R.RAID_MAX_FLOOR, 40);
  for (const id of ['star-wraith', 'void-hound', 'prism-eye', 'throne-guard', 'void-judge']) assert.ok(R.MONSTERS[id], id);
  assert.ok(R.MONSTERS['throne-guard'].defense + 3 <= 16, '방어형 최대 16(16절)');
});

test('별빛 망령: 4초마다 0.6초 예고 뒤 플레이어 근처로 순간이동', () => {
  const { s, m } = arena(36, 'star-wraith', 260, 0);
  let warned = false, jumped = false, before = null;
  run(s, 5, () => { if (!warned && m.state === 'stun') { warned = true; before = { x: m.x, y: m.y }; } if (warned && !jumped && m.state !== 'stun') jumped = Math.hypot(m.x - before.x, m.y - before.y) > 60; });
  assert.ok(warned && jumped);
});

test('공허 사냥개: 두 번 도약한 뒤 세 번째에는 1.0초 예고 충격파 고리', () => {
  const { s, m } = arena(36, 'void-hound', 220, 0);
  let dashes = 0, prev = m.state, ring = null, dashesBefore = -1;
  run(s, 8, () => { if (m.state !== prev && m.state === 'dash') dashes++; prev = m.state; if (!ring) { ring = s.hazards.find(h => h.mob && h.kind === 'ring') ?? null; if (ring) dashesBefore = dashes; } });
  assert.ok(ring, '충격파'); assert.equal(ring.tele, 1.0); assert.equal(dashesBefore, 2);
});

test('프리즘 눈: 0.8초 예고 부채꼴 광선 3줄', () => {
  const { s } = arena(37, 'prism-eye', 240, 0);
  let beams = [];
  run(s, 6, () => { const b = s.hazards.filter(h => h.mob && h.label === '프리즘 광선'); if (b.length > beams.length) beams = b; });
  assert.equal(beams.length, 3); for (const b of beams) assert.equal(b.tele, 0.8);
});

test('왕좌 근위병: 방패 방향이 몸과 따로 회전하고, 정면에서만 막는다', () => {
  const { s, m } = arena(38, 'throne-guard', 150, 0);
  run(s, 0.1);
  const a0 = m.t3; run(s, 1); assert.ok(Math.abs(m.t3 - a0) > 0.5, '회전');
  m.state = 'move'; m.t3 = Math.atan2(s.player.y - m.y, s.player.x - m.x); assert.equal(R.frontGuardUp(s, m), true);
  m.t3 += Math.PI; assert.equal(R.frontGuardUp(s, m), false);
});

test('공허 심판관: 추적 장판 2개(1.4초 예고)와 근접 내려찍기(1.2초 예고)를 번갈아', () => {
  const { s } = arena(36, 'void-judge', 160, 0);
  let tracks = 0, slamTele = null;
  run(s, 12, () => { tracks = Math.max(tracks, s.hazards.filter(h => h.label === '심판 장판').length); const z = s.zones.find(x => x.label === '심판 내려찍기'); if (z && slamTele === null) slamTele = z.tele + 1 / 60; });
  assert.equal(tracks, 2); assert.ok(slamTele !== null && Math.abs(slamTele - 1.2) < 0.02, `내려찍기 예고 ${slamTele}`);
  for (const h of s.hazards.filter(x => x.label === '심판 장판')) assert.equal(h.tele, 1.4);
});

test('별빛 발판: 4개가 2초씩 어긋나 언제나 2개 이상 켜져 있고, 꺼진 발판은 지나갈 수 없다', () => {
  const s = R.createRaid(R.FLOORS[35], R.weaponStats(0, null, 'raid-scythe'), null, [], undefined, null, 36);
  assert.equal(s.terrain.platforms.length, 4);
  for (let t = 0; t < R.PLATFORM_PERIOD * 2; t += 0.05) assert.ok([0, 1, 2, 3].filter(i => R.platformOn(i, t)).length >= 2, `t=${t}`);
  s.terrain.platformOff = [true, false, false, false];
  assert.ok(R.blockers(s.terrain).includes(s.terrain.platforms[0]));
  assert.ok(!R.blockers(s.terrain).includes(s.terrain.platforms[1]));
});

test('순간 암전 3초, 끝난 뒤 최소 12초는 다시 오지 않는다', () => {
  const { s } = arena(36, null, 0, 0);
  s.ext.blackoutAt = undefined;
  const starts = [];
  let was = false;
  run(s, 80, () => { const now = (s.ext.blackoutUntil ?? 0) > s.t; if (now && !was) starts.push({ at: s.t, until: s.ext.blackoutUntil }); was = now; });
  assert.ok(starts.length >= 2, `암전 ${starts.length}회`);
  for (const b of starts) assert.ok(Math.abs(b.until - b.at - R.BLACKOUT_SECONDS) < 0.05);
  for (let i = 1; i < starts.length; i++) assert.ok(starts[i].at - starts[i - 1].until >= R.BLACKOUT_MIN_GAP - 0.05);
});

test('공허 균열(37층~): 1초 예고, 동시에 최대 3개, 0.5초마다 최대 체력 2%(초당 4%)', () => {
  const { s } = arena(37, null, 0, 0);
  s.ext.riftAt = 0;
  let most = 0, rift = null;
  run(s, 40, () => { const r = s.zones.filter(z => z.label === '공허 균열'); most = Math.max(most, r.length); rift ??= r[0]; });
  assert.ok(most >= 1 && most <= R.VOID_RIFT_MAX);
  assert.equal(rift.every, 0.5); assert.equal(rift.damage, Math.round(s.player.maxHp * 0.02));
  const n = arena(36, null, 0, 0); n.s.ext.riftAt = 0; run(n.s, 10); assert.equal(n.s.zones.filter(z => z.label === '공허 균열').length, 0, '36층에는 없음');
});

test('전장 수축: 3초에 걸쳐 목표까지, 최대 25%, 플레이어와 몬스터를 안쪽으로 밀어낸다(죽지 않음)', () => {
  const { s, m } = arena(40, 'star-wraith', 0, 0);
  s.player.x = 30; s.player.y = 30; m.x = 1890; m.y = 1050; s.ext.shrinkTo = 0.4;
  run(s, 1.5); assert.ok(s.ext.shrink > 0.1 && s.ext.shrink < 0.15, `1.5초 ${s.ext.shrink}`);
  run(s, 3);
  assert.equal(s.ext.shrinkTo, 0.4); assert.ok(s.ext.shrink <= 0.4);
  const b = R.arenaBounds(s);
  assert.ok(s.player.x >= b.x0 && s.player.y >= b.y0); assert.ok(m.x <= b.x1 && m.y <= b.y1);
  assert.ok(R.MAX_SHRINK === 0.25 && R.BOSS_SCRIPTS['void-king'] && R.BOSS_SCRIPTS['throne-keeper']);
});

test('40층 공허의 왕: 35% 아래에서 전장이 25% 수축하고 3연계', () => {
  const sc = R.BOSS_SCRIPTS['void-king'];
  assert.equal(sc.phases.length, 3); assert.equal(sc.phases[2].combo, 3);
  const s = R.createRaid(R.FLOORS[39], R.weaponStats(0, null, 'raid-scythe'), null, [], undefined, null, 40);
  const boss = { phase: 2, x: 900, y: 500, r: 38 }; s.pops = [];
  sc.tick(s, boss, 1 / 60);
  assert.equal(s.ext.shrinkTo, R.MAX_SHRINK);
});

test('8단계 성좌 수호자 3종: 같은 부위 7단계 보유 필요, 별의 재·공허 결정만, 36층이 열려야 보인다', () => {
  const star = R.ARMORS.filter(a => a.tier === 8);
  assert.deepEqual(star.map(a => a.id).sort(), ['star-boots', 'star-hood', 'star-vest']);
  for (const a of star) {
    const prev = R.ARMORS.find(x => x.id === a.prerequisite); assert.equal(prev.tier, 7); assert.equal(prev.slot, a.slot);
    assert.deepEqual(Object.keys(a.need).sort(), ['star-ash', 'void-crystal']);
  }
  const g = R.gearOf({ ...R.EMPTY_RAID, equipped: { ...R.EMPTY_RAID.equipped, head: 'star-hood', body: 'star-vest', legs: 'star-boots' } });
  assert.equal(g.hp, 130); assert.equal(g.defense, 16); assert.equal(g.projectileCut, 0.14); assert.equal(g.darkSight, 50); assert.equal(g.bossDamage, 0.09);
  assert.equal(R.armorTierLimit(35), 7); assert.equal(R.armorTierLimit(40), 8);
});
