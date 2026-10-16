// 21~30층 보스 대본(RAID_FLOOR_30_EXPANSION_AUDIT 5.1·5.3·5.4): 단계 전환·패턴 실행·예고 시간·단일 피해 상한
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';

const out = buildSync({
  stdin: { contents: `export * from "./app/raid/engine"; export { FLOORS, weaponStats, BOSS_AT } from "./app/raid/data"; export { RAID_WEAPONS } from "./app/raid/weapons";`, resolveDir: new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent',
});
const R = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
function seeded(seed) { let x = seed >>> 0; return () => { x = (x + 0x6D2B79F5) >>> 0; let t = x; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const idle = s => ({ up: false, down: false, left: false, right: false, aimX: s.player.x - s.cam.x + 50, aimY: s.player.y - s.cam.y, attack: false, special: false, dash: false, food: [false, false, false] });

/** 보스를 바로 불러 단계별로 seconds초씩 관찰(플레이어는 죽지 않게) */
function observe(floorNo, seconds = 30) {
  const keep = Math.random; Math.random = seeded(floorNo * 97);
  try {
    const s = R.createRaid(R.FLOORS[floorNo - 1], R.weaponStats(0, null, 'raid-scythe'), null, [], undefined, null, floorNo);
    s.spawnAcc = -1e9; s.nextElite = 1e9; s.t = R.BOSS_AT - 0.05;
    const seen = { hazards: [], phases: new Set(), patterns: new Set(), maxHit: 0, bullets: 0 };
    for (let i = 0; i < 10 && !s.boss; i++) { s.choices = null; R.stepRaid(s, 1 / 60, idle(s)); }
    assert.ok(s.boss, `${floorNo}층 보스 미등장`);
    for (const ratio of [1, 0.6, 0.3]) {
      s.boss.hp = s.boss.maxHp * ratio;
      for (let i = 0; i < seconds * 60 && !s.over; i++) {
        s.player.hp = s.player.maxHp; s.player.iframes = 0; s.choices = null;
        const before = { ...s.damageTaken }, n = s.hazards.length;
        R.stepRaid(s, 1 / 60, idle(s));
        for (const h of s.hazards.slice(Math.max(0, n - 4))) if (!seen.hazards.includes(h)) seen.hazards.push(h);
        for (const [k, v] of Object.entries(s.damageTaken)) seen.maxHit = Math.max(seen.maxHit, v - (before[k] ?? 0));
        seen.phases.add(s.boss?.phase ?? -1); if (s.boss?.lastPattern) seen.patterns.add(s.boss.lastPattern);
        seen.bullets = Math.max(seen.bullets, s.projectiles.filter(p => !p.mine).length);
      }
    }
    return { s, seen };
  } finally { Math.random = keep; }
}

for (const floorNo of [21, 22, 23, 24, 25, 26, 27, 28, 29, 30]) {
  test(`${floorNo}층 보스: 모든 단계에서 패턴을 쓰고, 예고·피해 상한을 지킨다`, () => {
    const { s, seen } = observe(floorNo);
    const script = R.BOSS_SCRIPTS[s.floor.boss.id];
    assert.ok(script, '스크립트 보스');
    const last = script.phases.length - 1;
    assert.ok(seen.phases.has(last), `마지막 단계 도달: ${[...seen.phases]}`);
    const minPatterns = floorNo % 5 === 0 ? 5 : 3;
    assert.ok(seen.patterns.size >= minPatterns, `패턴 ${seen.patterns.size}종 사용(${[...seen.patterns]})`);
    for (const h of seen.hazards) assert.ok(h.tele >= 0.6, `${h.label} 예고 ${h.tele}초`);
    const cap = floorNo === 30 ? 0.41 : 0.21;
    for (const h of seen.hazards) assert.ok(h.damage <= R.bossPct(s, cap), `${h.label} 피해 ${h.damage} > 상한`);
    // 실제로 한 번에 받은 피해(방어 적용 후)는 표준 체력의 35%(30층 과부하 45%)를 넘지 않는다(기본 장비라 표준보다 약해 여유를 둔다)
    assert.ok(seen.maxHit < 400, `최대 단일 피해 ${seen.maxHit}`);
    assert.ok(seen.bullets < 120, `탄막 누적 ${seen.bullets}`);
  });
}
