// 21~30층 일반 몬스터 고유 행동(RAID_FLOOR_30_EXPANSION_AUDIT 4.1·4.2): 1~20층과 같은 움직임을 쓰지 않는다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';

const out = buildSync({
  stdin: { contents: `export * from "./app/raid/engine"; export { FLOORS, weaponStats, MONSTERS, mobLift } from "./app/raid/data";`, resolveDir: new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent',
});
const R = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
function seeded(seed) { let x = seed >>> 0; return () => { x = (x + 0x6D2B79F5) >>> 0; let t = x; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// 이 파일의 모든 전투는 고정 난수로(치명타·생성 위치 등에 따라 결과가 흔들리지 않게)
Math.random = seeded(20261021);
const input = (s, o = {}) => ({ up: false, down: false, left: false, right: false, aimX: s.player.x - s.cam.x + 50, aimY: s.player.y - s.cam.y, attack: false, special: false, dash: false, food: [false, false, false], ...o });

/** 웨이브 생성 없이 지정 몬스터 하나만 둔 전투(플레이어는 공격하지 않게 아주 약한 무기) */
function arena(floorNo, id, dx, dy, opts = {}) {
  const keep = Math.random; Math.random = seeded(floorNo * 31 + dx);
  const s = R.createRaid(R.FLOORS[floorNo - 1], { ...R.weaponStats(0, null, 'raid-scythe'), damage: 0.0001, range: 1 }, null, [], undefined, null, floorNo);
  Math.random = keep;
  s.spawnAcc = -1e9; s.nextElite = 1e9; s.monsters = []; s.zones = []; s.projectiles = []; s.hazards = [];
  // 지형에 막히지 않게 열린 자리로
  s.player.x = 900; s.player.y = 700; s.terrain.walls = []; s.terrain.deep = []; s.terrain.bridges = [];
  const m = R.spawn(s, id, opts, { x: s.player.x + dx, y: s.player.y + dy });
  return { s, m };
}
function run(s, seconds, each = () => {}, o = {}) {
  for (let i = 0; i < seconds * 60 && !s.over; i++) { s.player.hp = s.player.maxHp; s.choices = null; R.stepRaid(s, 1 / 60, input(s, o)); each(i); }
}

test('수호목·암흑 갑주: 평소 방어형 +3, 공격 준비·돌진 중에는 수호목 10→7, 암흑 갑주 12→4(다른 방어형은 그대로)', () => {
  const mk = (id, state) => ({ def: R.MONSTERS[id], boss: null, defense: R.MONSTERS[id].defense, state });
  assert.equal(R.MONSTERS['guardian-tree'].defense + R.guardBonus(mk('guardian-tree', 'move')), 10);
  assert.equal(R.MONSTERS['guardian-tree'].defense + R.guardBonus(mk('guardian-tree', 'tele')), 7);
  assert.equal(R.MONSTERS['dark-armor'].defense + R.guardBonus(mk('dark-armor', 'move')), 12);
  assert.equal(R.MONSTERS['dark-armor'].defense + R.guardBonus(mk('dark-armor', 'tele')), 4);
  assert.equal(R.MONSTERS['dark-armor'].defense + R.guardBonus(mk('dark-armor', 'dash')), 4);
  assert.equal(R.guardBonus(mk('shell-crab', 'move')), 3); assert.equal(R.guardBonus(mk('shell-crab', 'tele')), 3); assert.equal(R.guardBonus(mk('shell-crab', 'dash')), 0);
});

test('암흑 갑주 정면 방패: 정면(±60°)에서만, 공격 준비 중에는 내려간다', () => {
  const { s, m } = arena(29, 'dark-armor', 150, 0);
  m.dir = { x: -1, y: 0 }; m.state = 'move';
  assert.equal(R.frontGuardUp(s, m), true);
  m.dir = { x: 1, y: 0 }; assert.equal(R.frontGuardUp(s, m), false, '등 뒤');
  m.dir = { x: -1, y: 0 }; m.state = 'tele'; assert.equal(R.frontGuardUp(s, m), false, '공격 준비');
  assert.ok(R.DARK_ARMOR_FRONT < 1);
});

test('고대 묘목: 쓰러진 자리에 1초 뿌리 장판(감속·소량 피해), 피해 없는 회복 묘목 소환물은 남기지 않는다', () => {
  const a = arena(22, 'ancient-sapling', 300, 0);
  a.m.hp = 1; a.m.x = a.s.player.x + 30; a.m.y = a.s.player.y; a.m.speed = 0;
  a.s.weapon.damage = 999; a.s.weapon.range = 120;
  let root = null;
  run(a.s, 2, () => { root ??= a.s.zones.find(z => z.label === '뿌리 장판'); });
  assert.ok(a.m.hp <= 0, '처치'); assert.ok(root && root.mob && root.slow > 0 && root.t <= 1 && root.damage > 0);
  const b = arena(22, 'ancient-sapling', 30, 0, { damage: 0, speed: 0, name: '회복 묘목' });
  b.m.hp = 1; b.s.weapon.damage = 999; b.s.weapon.range = 120;
  let any = false;
  run(b.s, 2, () => { any ||= b.s.zones.some(z => z.label === '뿌리 장판'); });
  assert.ok(b.m.hp <= 0); assert.equal(any, false);
});

test('뿌리 사냥개: 1.6초마다 0.35초 예고 후 긴 도약(220px)', () => {
  const { s, m } = arena(21, 'root-hound', 260, 0);
  let tele = null;
  run(s, 3, () => { if (!tele && m.state === 'tele') tele = { len: m.tele.len, left: m.stateT }; });
  assert.ok(tele, '도약 예고'); assert.equal(tele.len, 220); assert.ok(tele.left <= 0.35 + 1e-9 && tele.left > 0.3);
});

test('포자 주술사: 플레이어 자리에 0.9초 착탄 예고 원 → 포자탄(보스 피격 집계 제외)', () => {
  const { s } = arena(23, 'spore-shaman', 200, 0);
  let bomb = null;
  run(s, 6, () => { bomb ??= s.zones.find(z => z.label === '포자탄'); });
  assert.ok(bomb && bomb.kind === 'pbomb' && bomb.mob);
  assert.ok(Math.abs(bomb.x - s.player.x) < 5 && Math.abs(bomb.y - s.player.y) < 5);
  run(s, 2);
  assert.ok((s.damageTaken['포자탄'] ?? 0) > 0, '그 자리에 서 있으면 맞는다'); assert.equal(s.bossHits ?? 0, 0);
});

test('숲의 집행자: 도약(돌진)이 끝나면 포자 3방향', () => {
  // 결정적으로: 난수를 고정하고, 돌진 예고가 시작되면 플레이어를 멀리 옮겨 포자가 같은 프레임에 플레이어에 맞아 사라지지 않게 한다
  const keep = Math.random; Math.random = seeded(2525);
  try {
    const { s, m } = arena(25, 'forest-executor', 220, 0);
    let fired = 0, wasDash = false, moved = false;
    run(s, 8, () => {
      if (!moved && m.state === 'tele') { moved = true; s.player.x = m.x - 420; s.player.y = m.y + 260; }
      if (wasDash && m.state === 'move' && !fired) fired = s.projectiles.filter(p => !p.mine).length;
      wasDash = m.state === 'dash';
    });
    assert.ok(moved, '돌진 예고'); assert.equal(fired, 3);
  } finally { Math.random = keep; }
});

test('탑의 그림자: 플레이어가 움직이는 방향을 앞질러 추적, 분신은 곧장 추적', () => {
  const { s, m } = arena(26, 'tower-shadow', 0, 260);
  run(s, 0.6, () => {}, { right: true });
  assert.ok(m.dir.x > 0.25, `예측 추적 dir.x=${m.dir.x.toFixed(2)}`);
  const c = arena(26, 'tower-shadow', 0, 260, { clone: true });
  run(c.s, 0.6, () => {}, { right: true });
  assert.ok(c.m.dir.x < m.dir.x, '분신은 예측하지 않음');
});

test('균열 추적자: 두 번 연속 돌진한 뒤 1초 휴식', () => {
  const { s, m } = arena(27, 'rift-stalker', 220, 0);
  const seq = []; let prev = m.state;
  run(s, 6, () => { if (m.state !== prev) { seq.push(m.state); prev = m.state; } });
  const i = seq.indexOf('dash');
  assert.ok(i >= 0, '돌진');
  assert.deepEqual(seq.slice(i, i + 5), ['dash', 'tele', 'dash', 'stun', 'move']);
});

test('핵 파수꾼: 0.8초 예고 직선 광선(일반 몬스터 광선은 보스 피격으로 세지 않음), 쓰러지면 예고 중 광선도 사라진다', () => {
  const { s, m } = arena(28, 'core-sentry', 240, 0);
  let beam = null;
  run(s, 5, () => { beam ??= s.hazards.find(h => h.mob && h.kind === 'beam'); });
  assert.ok(beam, '광선'); assert.equal(beam.tele, 0.8); assert.equal(beam.owner, m.uid);
  run(s, 1.2);
  assert.ok((s.damageTaken[`${m.name} 광선`] ?? 0) > 0, '광선 정면에 서 있으면 맞는다'); assert.equal(s.bossHits ?? 0, 0);
  // 다음 광선 예고 중에 처치 → 광선 취소
  let next = null; run(s, 5, () => { next ??= s.hazards.find(h => h.mob && h.age < h.tele); });
  assert.ok(next); m.hp = 0; const before = s.damageTaken[`${m.name} 광선`];
  run(s, 1.5);
  assert.equal(s.hazards.filter(h => h.owner === m.uid).length, 0); assert.equal(s.damageTaken[`${m.name} 광선`], before);
});

test('심장부 감시자: 2연속 돌진과 광선(예고 0.8초 이상)을 번갈아', () => {
  const { s, m } = arena(30, 'heart-warden', 260, 0);
  const events = []; let prev = m.state, beams = 0;
  run(s, 16, () => {
    if (m.state !== prev) { if (m.state === 'dash') events.push('dash'); prev = m.state; }
    const n = s.hazards.filter(h => h.owner === m.uid && h.mob).length; if (n > beams) { events.push('beam'); const h = s.hazards.find(x => x.owner === m.uid); assert.ok(h.tele >= 0.8); } beams = n;
  });
  const joined = events.join(' ');
  assert.match(joined, /dash dash beam/); assert.match(joined, /beam dash dash/);
});

test('1~20층 몬스터는 기존 행동 그대로(고유 행동은 21~30층 10종만)', () => {
  const ids = ['ancient-sapling', 'root-hound', 'spore-shaman', 'guardian-tree', 'forest-executor', 'tower-shadow', 'rift-stalker', 'core-sentry', 'dark-armor', 'heart-warden'];
  for (const id of ids) assert.ok(R.MONSTERS[id], id);
  const { s, m } = arena(16, 'ice-bat', 200, 0);
  const seq = []; let prev = m.state;
  run(s, 6, () => { if (m.state !== prev) { seq.push(m.state); prev = m.state; } });
  assert.ok(!seq.includes('stun'), '얼음 박쥐는 연속 돌진·휴식 없음');
});

// ---------- 2026-10-21 보통 구간 패턴 강화: 몬스터마다 예고가 보이는 공격 ----------
test('고대 묘목: 가까우면 플레이어 발밑에 뿌리 가시(0.9초 예고·속박, 보스 피격 제외)', () => {
  const { s } = arena(21, 'ancient-sapling', 180, 0);
  let spike = null;
  run(s, 4, () => { spike ??= s.hazards.find(h => h.label === '뿌리 가시'); });
  assert.ok(spike && spike.kind === 'track' && spike.mob && spike.root > 0 && spike.tele >= 0.9);
});
test('뿌리 사냥개: 멀리서는 옆으로 돌아 들어온다(정면 직진이 아님)', () => {
  const { s, m } = arena(21, 'root-hound', 300, 0);
  const y0 = m.y; run(s, 0.5);
  assert.ok(Math.abs(m.y - y0) > 10, `옆으로 이동 ${m.y - y0}`);
});
test('포자 주술사: 플레이어 자리와 양옆 두 곳, 세 곳에 동시에 착탄', () => {
  const { s } = arena(23, 'spore-shaman', 200, 0);
  let n = 0; run(s, 6, () => { n = Math.max(n, s.zones.filter(z => z.label === '포자탄').length); });
  assert.equal(n, 3);
});
test('수호목: 멈춰 서서 1초 예고 덩굴 채찍(속박), 준비 중 방어 감소', () => {
  const { s, m } = arena(24, 'guardian-tree', 200, 0);
  let vine = null, still = null;
  run(s, 6, () => { if (!vine) { vine = s.hazards.find(h => h.label === '덩굴 채찍'); if (vine) still = { state: m.state, bonus: R.guardBonus(m) }; } });
  assert.ok(vine && vine.kind === 'beam' && vine.tele >= 1 && vine.root > 0 && vine.mob);
  assert.equal(still.state, 'stun'); assert.equal(still.bonus, 0);
});
test('탑의 그림자: 착지 지점을 0.7초 예고한 뒤 플레이어 근처로 순간이동', () => {
  const { s, m } = arena(26, 'tower-shadow', 300, 0);
  let mark = null, tele0 = 0, jumped = false;
  run(s, 8, () => { if (!mark) { mark = s.zones.find(z => z.label === '그림자 착지') ?? null; if (mark) tele0 = mark.tele; } if (mark && Math.hypot(m.x - mark.x, m.y - mark.y) < 1) jumped = true; });
  assert.ok(mark && tele0 >= 0.65 && mark.mob, `예고 ${tele0}`); assert.ok(jumped, '예고 자리로 이동');
});
test('균열 추적자: 2연속 돌진이 끝난 자리에 균열 장판', () => {
  const { s } = arena(27, 'rift-stalker', 200, 0);
  let crack = null; run(s, 8, () => { crack ??= s.zones.find(z => z.label === '균열'); });
  assert.ok(crack && crack.mob && crack.damage > 0);
});
test('핵 파수꾼: 가까이 붙으면 뒤로 물러나 거리를 벌린다', () => {
  const { s, m } = arena(27, 'core-sentry', 100, 0);
  const d0 = Math.hypot(m.x - s.player.x, m.y - s.player.y); run(s, 0.6);
  assert.ok(Math.hypot(m.x - s.player.x, m.y - s.player.y) > d0 + 20);
});
test('암흑 갑주: 0.8초 예고 뒤 긴 방패 돌진', () => {
  const { s, m } = arena(29, 'dark-armor', 200, 0);
  let tele = null; run(s, 5, () => { if (!tele && m.state === 'tele') tele = { len: m.tele.len, left: m.stateT }; });
  assert.ok(tele && tele.len === 160 && tele.left > 0.75);
});

// ---------- 31~35층 천공 유적(RAID_FLOOR_40_EXPANSION_AUDIT 7.2·7.4, 숨김 데이터) ----------
test('31~35층 데이터: 몬스터 5종·층 5개, 32~35층은 층마다 HP +3%·피해 +2%(정예 HP +4%)', () => {
  for (let f = 31; f <= 35; f++) assert.equal(R.FLOORS[f - 1].floor, f);
  const lift = (f, e) => R.mobLift(f, e);
  assert.deepEqual(lift(31, false), { hp: 1, damage: 1 });
  assert.ok(Math.abs(lift(35, false).hp - Math.pow(1.03, 4)) < 1e-9 && Math.abs(lift(35, true).hp - Math.pow(1.04, 4)) < 1e-9 && Math.abs(lift(35, false).damage - Math.pow(1.02, 4)) < 1e-9);
  assert.deepEqual(lift(30, false), { hp: 1, damage: 1 }, '30층 이하는 그대로');
  const { m } = arena(35, 'sky-remnant', 200, 0);
  assert.equal(m.maxHp, Math.round(195 * 0.5 * Math.pow(1.03, 4)));
});
test('천공 잔영: 3.5초마다 0.5초 예고 잔상 돌진(220px)', () => {
  const { s, m } = arena(31, 'sky-remnant', 200, 0);
  let tele = null; run(s, 4, () => { if (!tele && m.state === 'tele') tele = { len: m.tele.len, left: m.stateT }; });
  assert.ok(tele && tele.len === 220 && tele.left > 0.45);
});
test('질풍 맹금: 맴돌다 0.6초 예고 급강하(300px)', () => {
  const { s, m } = arena(31, 'wind-raptor', 250, 0);
  let tele = null; run(s, 4, () => { if (!tele && m.state === 'tele') tele = { len: m.tele.len, left: m.stateT }; });
  assert.ok(tele && tele.len === 300 && tele.left > 0.55);
});
test('구름 술사: 느린 구름탄 3발', () => {
  const { s } = arena(32, 'cloud-mage', 200, 0);
  let n = 0; run(s, 5, () => { n = Math.max(n, s.projectiles.filter(p => !p.mine).length); });
  assert.ok(n >= 3);
});
test('유적 수호병: 정면 −35%(공격 준비 중 해제), 1초 예고 지면 강타', () => {
  const { s, m } = arena(33, 'ruin-guardian', 150, 0);
  run(s, 0.1); assert.equal(R.frontGuardUp(s, m), true); assert.equal(R.RUIN_GUARD_FRONT, 0.65);
  let slam = null, guardDown = null; run(s, 6, () => { if (!slam) { slam = s.zones.find(z => z.label === '지면 강타') ?? null; if (slam) guardDown = { up: R.frontGuardUp(s, m), bonus: R.guardBonus(m) }; } });
  assert.ok(slam && slam.mob && slam.r === 95); assert.deepEqual(guardDown, { up: false, bonus: 0 });
});
test('폭풍 집행관: 돌진이 끝나면 양옆으로 번개선 2줄(0.6초 예고)', () => {
  const { s } = arena(31, 'storm-enforcer', 200, 0);
  let lines = []; run(s, 8, () => { const now = s.hazards.filter(h => h.label === '번개선'); if (now.length > lines.length) lines = now.map(h => ({ ...h })); });
  assert.equal(lines.length, 2); assert.ok(lines.every(h => h.tele >= 0.55 && h.mob));
});
test('천공 유적 지형: 끊어진 다리(틈 + 다리 3개)와 강풍(플레이어를 밀고 대시 중에는 무시)', () => {
  const s = R.createRaid(R.FLOORS[32], { ...R.weaponStats(0, null, 'raid-scythe'), damage: 0.0001, range: 1 }, null, [], undefined, null, 33);
  assert.equal(s.terrain.zone, 'sky'); assert.equal(s.terrain.bridges.length, 3); assert.ok(s.terrain.deep.length >= 3); assert.ok(s.terrain.wind.length >= 2);
  s.spawnAcc = -1e9; s.nextElite = 1e9; s.monsters = []; s.terrain.walls = [];
  const w = s.terrain.wind[0]; s.player.x = w.x + w.w / 2; s.player.y = w.y + w.h / 2; const x0 = s.player.x, y0 = s.player.y;
  R.stepRaid(s, 0.5, input(s, { aimX: s.player.x - s.cam.x, aimY: s.player.y - s.cam.y }));
  const pushed = (s.player.x - x0) * w.dx + (s.player.y - y0) * w.dy;
  assert.ok(pushed > 20, `밀린 거리 ${pushed}`);
});
