// 성장 돌파(RAID_FLOOR_30_EXPANSION_AUDIT 3.4): 기록 갱신, 장비가 같으면 돌파 연출 없음, 패배 진단
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
const out = buildSync({ stdin: { contents: `export * from "./app/raid/progress";`, resolveDir: new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent' });
const P = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
const gear = (enh, body = 'frost-vest') => ({ weaponId: 'raid-scythe', evo: 'great-scythe', enh, armor: ['frost-hood', body, 'frost-boots'] });
const res = (o) => ({ floor: 29, cleared: false, kills: 100, usedFoods: [], bossHpLeft: 1, hpLeft: 0, level: 15, reason: [], log: { floor: 29, cleared: false, level: 15, picks: [], auxes: [], dmg: {}, taken: { '투사체': 50 }, waveEndHp: null, bossTime: null, kills: 100, dodges: 3, time: 90, input: 'pc', bossHits: 0 }, ...o });

test('실패 기록은 더 좋은 기록만 최고로 남고, 첫 클리어는 한 번만', () => {
  let pg = P.updateProgress(undefined, P.recordOf(res({ bossHpLeft: 0.4, log: { ...res().log, time: 140, bossTime: 20 } }), gear(16)));
  pg = P.updateProgress(pg, P.recordOf(res({ bossHpLeft: 0.7 }), gear(16)));
  assert.equal(pg.best.bossHpRatio, 0.4); assert.equal(pg.lastFail.bossHpRatio, 0.7);
  const clear = P.recordOf(res({ cleared: true, bossHpLeft: 0, log: { ...res().log, bossTime: 41 } }), gear(17));
  assert.ok(P.breakthrough(pg, clear), '장비가 바뀐 뒤 첫 클리어 = 성장 돌파');
  assert.equal(P.breakthrough(pg, P.recordOf(res({ cleared: true, bossHpLeft: 0 }), gear(16))), null, '장비가 같으면 일반 클리어');
  pg = P.updateProgress(pg, clear);
  assert.equal(P.breakthrough(pg, clear), null, '이미 깬 층은 돌파 아님');
  assert.deepEqual(P.gearChanges(pg.lastFail, P.recordOf(res(), gear(17, 'ancient-vest')), id => id, id => id), ['무기 +16 → +17', 'ancient-vest 착용']);
});

test('패배 진단: 보스 25% 이하면 재도전 우선, 원인은 최대 두 가지', () => {
  const near = P.diagnose(res({ bossHpLeft: 0.2, log: { ...res().log, bossTime: 30 } }), 17, 40, ['탑의 그림자']);
  assert.equal(near.retryFirst, true); assert.equal(near.lines[0].title, '거의 다 왔어요');
  const ranged = P.diagnose(res({ bossHpLeft: 1 }), 15, 40, ['탑의 그림자']);
  assert.equal(ranged.lines.length, 2); assert.match(ranged.lines[0].title, /화력/); assert.match(ranged.lines[1].title, /원거리/);
  assert.match(ranged.lines[0].hint, /\+17/, '권장 강화 미달이면 강화 안내');
  const atRec = P.diagnose(res({ bossHpLeft: 1 }), 17, 40, []);
  assert.doesNotMatch(atRec.lines[0].hint, /강화하면/, '권장 강화에 이미 도달하면 강화를 강요하지 않음');
  assert.deepEqual(P.diagnose(res({ cleared: true }), 17, 40, []).lines, []);
});
