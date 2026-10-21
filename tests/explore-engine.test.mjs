// 채집·탐험 2단계(봄 숲길 MVP) 엔진: 지도 배치 규칙, 채집·가방·위험, 돌발 상황, 희귀 천장, 체크포인트, 1,000판 시뮬레이션
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const out = buildSync({ stdin: { contents: `export * from "./app/explore/engine"; export * from "./app/explore/data";`, resolveDir: root, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent' });
const E = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
const REGION = 'sprout-trail';
const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const run = (seed, extra = {}) => E.createRun({ seed, runId: `r${seed}`, startedAt: 0, regionId: REGION, inSeason: false, ...extra });

/**
 * 사람 대신 쓰는 단순 봇: 자원으로 가서 채집, 벌떼는 피하지 않는다. reaction은 채집 사이 머뭇거림(초).
 * vision=true면 화면(960×540) 안에 들어온 자원만 알고, 안 보이면 아직 안 본 쪽으로 걸어가며 찾는다(미니맵 자원 표시 없는 기본 상태).
 */
function playBot(s, { reaction = 0, dt = 1 / 30, vision = false } = {}) {
  let wait = 0; const seen = new Set(); let roam = null; const rnd = E.rngOf(s.seed + 99);
  while (s.phase !== 'done') {
    if (s.phase === 'event') { E.resolveEvent(s, E.canAccept(s)); continue; }
    const p = s.player, input = { ...E.NO_INPUT };
    const full = E.bagCount(s) >= s.bagCap;
    if (full) input.returnHeld = true;
    else if (s.event?.state === 'active' && s.event.zone) { const z = s.event.zone, l = Math.hypot(z.x - p.x, z.y - p.y) || 1; input.mx = (z.x - p.x) / l; input.my = (z.y - p.y) / l; }
    else if (!s.gather) {
      if (vision) for (const n of s.nodes) if (Math.abs(n.x - p.x) <= E.VIEW_W / 2 && Math.abs(n.y - p.y) <= E.VIEW_H / 2) seen.add(n.id);
      const known = s.nodes.filter(n => n.left > 0 && (!vision || seen.has(n.id)));
      // 보이는 희귀 자원은 먼저 노린다(반짝이는 금빛 자원을 우선하는 실제 플레이와 같게)
      const target = known.sort((a, b) => Number(b.size === 'rare') - Number(a.size === 'rare') || d(a, p) - d(b, p))[0];
      if (!target && vision) { if (!roam || d(roam, p) < 60) roam = { x: 200 + rnd() * (E.WORLD_W - 400), y: 150 + rnd() * (E.WORLD_H - 300) }; const l = d(roam, p) || 1; input.mx = (roam.x - p.x) / l; input.my = (roam.y - p.y) / l; }
      else if (!target) input.returnHeld = true;
      else if (d(target, p) <= E.GATHER_RANGE - 5) { if (wait <= 0) { input.gather = true; wait = reaction; } else wait -= dt; }
      else { const l = d(target, p); input.mx = (target.x - p.x) / l; input.my = (target.y - p.y) / l; }
    }
    E.step(s, input, dt);
  }
  return E.resultOf(s);
}

test('지도 배치(3.1.1): 기본 12~14곳, 재료별 최소 3곳, 큰 자원 2곳, 간격 120px, 시작 240px 안 2곳·600px 안 6곳', () => {
  const counts = new Set();
  for (let seed = 1; seed <= 300; seed++) {
    const m = E.generateMap(seed, { regionId: REGION, inSeason: false });
    const commons = m.nodes.filter(n => n.size !== 'rare');
    counts.add(commons.length);
    assert.ok(commons.length >= 12 && commons.length <= 14, `seed ${seed}`);
    assert.equal(commons.filter(n => n.size === 'big').length, 2);
    for (const id of ['young-herb', 'wildflower', 'soft-twig']) assert.ok(commons.filter(n => n.item === id).length >= 3, `${seed} ${id}`);
    for (let i = 0; i < m.nodes.length; i++) for (let j = i + 1; j < m.nodes.length; j++) assert.ok(d(m.nodes[i], m.nodes[j]) >= E.NODE_GAP - 0.001, `gap ${seed}`);
    assert.ok(m.nodes.filter(n => d(n, E.START) <= 240).length >= 2, `240 ${seed}`);
    assert.ok(m.nodes.filter(n => d(n, E.START) <= 600).length >= 6, `600 ${seed}`);
    assert.ok(m.nodes.filter(n => n.size === 'rare').length <= 1);
    // 위험은 시작 영역 밖, 자원과 떨어져 있다(위험을 밟지 않고 모든 자원에 갈 수 있음)
    for (const h of m.hazards) {
      const c = h.kind === 'bees' ? { x: h.cx, y: h.cy } : h, reach = h.kind === 'bees' ? h.orbit + h.r : h.r;
      assert.ok(d(c, E.START) > E.START_SAFE_R + reach, `start ${seed}`);
      for (const n of m.nodes) assert.ok(d(c, n) > reach + 50, `node ${seed}`);
    }
    assert.deepEqual([...new Set(m.hazards.map(h => h.kind))].sort(), ['bees', 'mud']);
  }
  assert.deepEqual([...counts].sort(), [12, 13, 14]);
});

test('계절 보너스 +2곳, 집중 탐색 30% 교체, 안내소 3단계 큰 자원 1곳 추가(총 노드 수 그대로)', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const base = E.generateMap(seed, { regionId: REGION, inSeason: false }), bonus = E.generateMap(seed, { regionId: REGION, inSeason: true });
    const nb = base.nodes.filter(n => n.size !== 'rare').length, ns = bonus.nodes.filter(n => n.size !== 'rare').length;
    assert.equal(ns - nb, Math.floor(base.baseNodes * 0.2));
    const focus = E.generateMap(seed, { regionId: REGION, inSeason: true, focusItem: 'soft-twig' }), plain = bonus;
    const commonsF = focus.nodes.filter(n => n.size !== 'rare'), commonsP = plain.nodes.filter(n => n.size !== 'rare');
    assert.equal(commonsF.length, commonsP.length);
    assert.equal(commonsF.filter(n => n.item === 'soft-twig').length - commonsP.filter(n => n.item === 'soft-twig').length, Math.floor(commonsP.length * 0.3));
    const g3 = E.generateMap(seed, { regionId: REGION, inSeason: false, guideLevel: 3 });
    assert.equal(g3.nodes.filter(n => n.size === 'big').length, 3);
    assert.equal(g3.nodes.filter(n => n.size !== 'rare').length, nb);
  }
});

test('돌발 상황: 없음 75%·각 6.25%, 샛길 보너스는 샛길만 +5%p', () => {
  const tally = (bonus) => { const t = { none: 0 }; for (let i = 0; i < 100000; i++) { const k = E.rollEvent((i + 0.5) / 100000, bonus) ?? 'none'; t[k] = (t[k] ?? 0) + 1; } return t; };
  const a = tally(false), b = tally(true);
  assert.equal(a.none, 75000); for (const k of ['merchant', 'sidepath', 'injured', 'weather']) assert.equal(a[k], 6250);
  assert.equal(b.sidepath, 11250); assert.equal(b.none, 70000); assert.equal(b.merchant, 6250);
});

test('채집: 일반 0.6초·큰 자원 1.0초에 2개, 가방 16칸에서 막히고 큰 자원은 남은 1칸만 담아 노드에 남긴다', () => {
  assert.deepEqual([E.RUN_SECONDS, E.GATHER_SMALL, E.GATHER_BIG], [30, 0.6, 1.0]);
  const s = run(7); s.phase = 'play';
  const node = s.nodes.find(n => n.size === 'big'); s.player.x = node.x; s.player.y = node.y;
  s.bag = { 'young-herb': 15 };
  E.step(s, { ...E.NO_INPUT, gather: true, gatherTarget: node.id }, 0.01);
  for (let i = 0; i < Math.ceil(E.GATHER_BIG / 0.01) + 5; i++) E.step(s, E.NO_INPUT, 0.01);
  assert.equal(E.bagCount(s), 16); assert.equal(node.left, 1);
  E.step(s, { ...E.NO_INPUT, gather: true, gatherTarget: node.id }, 0.01);
  assert.equal(s.gather, null); assert.match(s.toast.text, /가방이 가득/);
  // 일반 자원: 0.6초 전에는 들어오지 않고 지나면 1개
  const t = run(8); t.phase = 'play'; const small = t.nodes.find(n => n.size === 'small'); t.player.x = small.x; t.player.y = small.y;
  E.step(t, { ...E.NO_INPUT, gather: true }, 0.01);
  for (let i = 0; i < Math.floor(E.GATHER_SMALL / 0.01) - 5; i++) E.step(t, E.NO_INPUT, 0.01);
  assert.equal(E.bagCount(t), 0);
  for (let i = 0; i < 10; i++) E.step(t, E.NO_INPUT, 0.01);
  assert.equal(E.bagCount(t), 1);
});

test('위험: 벌떼에 맞으면 1.5초 경직·시간 −2초·채집 취소, 회피 중에는 맞지 않음', () => {
  const s = run(11); s.phase = 'play';
  const bees = s.hazards.find(h => h.kind === 'bees');
  E.step(s, E.NO_INPUT, 0.001); s.player.x = bees.x; s.player.y = bees.y; s.gather = { nodeId: 'x', progress: 0, need: 1 };
  const before = s.timeLeft; E.step(s, E.NO_INPUT, 0.001);
  assert.equal(s.stuns, 1); assert.ok(before - s.timeLeft > 1.9); assert.equal(s.gather, null);
  const x = s.player.x; E.step(s, { ...E.NO_INPUT, mx: 1 }, 0.5); assert.equal(s.player.x, x, '경직 중 이동 불가');
  const t = run(11); t.phase = 'play'; E.step(t, { ...E.NO_INPUT, mx: 1, dodge: true }, 0.001);
  const b2 = t.hazards.find(h => h.kind === 'bees'); t.player.x = b2.x; t.player.y = b2.y; E.step(t, E.NO_INPUT, 0.001);
  assert.equal(t.stuns, 0);
});

test('귀환 R 1초 유지·시간 종료 모두 성공 귀환이며 결과는 한 번만 확정된다', () => {
  const s = run(3); s.phase = 'play'; s.bag = { wildflower: 2 };
  for (let i = 0; i < 9; i++) E.step(s, { ...E.NO_INPUT, returnHeld: true }, 0.1);
  assert.equal(s.phase, 'play');
  E.step(s, { ...E.NO_INPUT, returnHeld: true }, 0.11);
  assert.equal(s.phase, 'done'); assert.equal(s.endReason, 'return');
  const t = s.t; E.step(s, E.NO_INPUT, 1); assert.equal(s.t, t, '끝난 판은 더 진행하지 않음');
  assert.deepEqual(E.resultOf(s).bag, { wildflower: 2 });
});

test('돌발 상황 처리: 상인(재료 2→미끼 2), 다친 동물(약초 1→재료 2), 샛길(−8초·희귀 최대 2개), 날씨(안전지대 진입 시 +2)', () => {
  const at = (kind) => { const s = run(5); s.phase = 'event'; s.event = { kind, at: 0, state: 'open' }; return s; };
  const m = at('merchant'); m.bag = { 'young-herb': 1 }; assert.equal(E.canAccept(m), false);
  m.bag = { 'young-herb': 3, wildflower: 1 }; E.resolveEvent(m, true); assert.equal(m.rewards.bait, 2); assert.equal(E.bagCount(m), 2); assert.equal(m.phase, 'play');
  const inj = at('injured'); inj.bag = { 'young-herb': 1 }; E.resolveEvent(inj, true); assert.equal(inj.bag['young-herb'] ?? 0, E.bagCount(inj) - (inj.bag.wildflower ?? 0) - (inj.bag['soft-twig'] ?? 0)); assert.equal(E.bagCount(inj), 2);
  const side = at('sidepath'); const tl = side.timeLeft; E.resolveEvent(side, true); assert.equal(tl - side.timeLeft, 8); assert.ok(side.nodes.filter(n => n.size === 'rare').length <= 2 && side.nodes.some(n => n.id === 'r1'));
  const no = at('sidepath'); E.resolveEvent(no, false); assert.equal(no.timeLeft, E.RUN_SECONDS); assert.ok(!no.nodes.some(n => n.id === 'r1'));
  const w = at('weather'); E.resolveEvent(w, true); assert.equal(w.event.state, 'active'); w.player.x = w.event.zone.x; w.player.y = w.event.zone.y; E.step(w, E.NO_INPUT, 0.01); assert.equal(E.bagCount(w), 2); assert.equal(w.event.success, true);
});

test('희귀 천장: 5회 연속 미획득이면 6번째 판에 시작 화면 안에 확정 등장, 얻으면 0으로', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const m = E.generateMap(seed, { regionId: REGION, inSeason: false, rareMisses: 5 });
    const rare = m.nodes.find(n => n.size === 'rare');
    assert.ok(rare && d(rare, E.START) <= 270, `seed ${seed}`);
  }
  assert.equal(E.nextRareMisses(4, false), 5); assert.equal(E.nextRareMisses(5, true), 0);
});

test('체크포인트: 판 시작·피격·채집 직후 바로, 그 밖에는 10초마다 저장한다', () => {
  const s = run(21);
  assert.equal(E.checkpointDue(s), true, '시작하자마자 한 번 저장');
  E.checkpointOf(s); assert.equal(E.checkpointDue(s), false);
  s.phase = 'play';
  while (s.t < 10.05) { E.step(s, E.NO_INPUT, 0.05); if (s.phase === 'event') E.resolveEvent(s, false); }
  assert.equal(E.checkpointDue(s), true, '10초');
  E.checkpointOf(s);
  // 채집 직후 즉시
  const small = s.nodes.find(n => n.size === 'small' && n.left > 0); s.player.x = small.x; s.player.y = small.y;
  E.step(s, { ...E.NO_INPUT, gather: true, gatherTarget: small.id }, 0.01);
  for (let i = 0; i < 80 && s.gather; i++) E.step(s, E.NO_INPUT, 0.01);
  assert.equal(E.checkpointDue(s), true, '채집 직후');
});

test('이어 하기: 같은 지도·체력·위치·남은 시간·노드 잔량·이벤트·샛길 노드로 되살리고, 다시 캘 수 없다', () => {
  const s = run(33, { inSeason: true, focusItem: 'soft-twig', guideLevel: 3, rareMisses: 2 }); s.phase = 'play';
  for (let i = 0; i < 60; i++) { E.step(s, { ...E.NO_INPUT, mx: 0.6, my: 0.3 }, 0.05); if (s.phase === 'event') E.resolveEvent(s, false); }
  const big = s.nodes.find(n => n.size === 'big'); big.left = 1;
  s.bag = { 'soft-twig': 1 }; s.hp = 2; s.stuns = 1; s.rewards.bait = 2;
  s.nodes.push({ id: 'r1', item: 'four-leaf-flower', x: 300, y: 300, size: 'rare', left: 1 });
  s.event = { kind: 'weather', at: 2, state: 'active', until: s.t + 3, zone: { x: 500, y: 400, r: 70 } };
  const cp = JSON.parse(JSON.stringify(E.checkpointOf(s)));
  const r = E.resumeRun(cp);
  assert.equal(r.phase, 'ready', '이어 할 때도 3초 준비');
  assert.equal(r.runId, s.runId); assert.equal(r.t, s.t); assert.equal(r.timeLeft, s.timeLeft); assert.equal(r.hp, 2); assert.equal(r.stuns, 1); assert.equal(r.rewards.bait, 2);
  assert.deepEqual([r.player.x, r.player.y], [s.player.x, s.player.y]);
  assert.deepEqual(r.bag, { 'soft-twig': 1 });
  assert.deepEqual(r.nodes.map(n => [n.id, n.item, n.size, n.left]), s.nodes.map(n => [n.id, n.item, n.size, n.left]), '같은 지도(집중 탐색·큰 자원 포함)와 잔량');
  assert.equal(r.event.state, 'active'); assert.deepEqual(r.event.zone, s.event.zone);
  // 위험물(벌떼) 위치도 같은 시간 기준으로 이어진다
  r.phase = 'play'; const s2 = s; E.step(r, E.NO_INPUT, 0.05); E.step(s2, E.NO_INPUT, 0.05);
  const bees = r.hazards.filter(h => h.kind === 'bees').map(h => [Math.round(h.x), Math.round(h.y)]), bees2 = s2.hazards.filter(h => h.kind === 'bees').map(h => [Math.round(h.x), Math.round(h.y)]);
  assert.deepEqual(bees, bees2);
  // 열려 있던 이벤트 창은 이어 할 때 다시 열린다(선택 전 상태로 되돌려 보상 중복 없음)
  const t = run(5); t.phase = 'play'; t.event = { kind: 'merchant', at: 0, state: 'open' };
  const rt = E.resumeRun(JSON.parse(JSON.stringify(E.checkpointOf(t)))); rt.phase = 'play'; E.step(rt, E.NO_INPUT, 0.01);
  assert.equal(rt.phase, 'event');
});

function simulate(opts) {
  const totals = [], rares = []; let misses = 0, worstStreak = 0, streak = 0;
  for (let seed = 1; seed <= 1000; seed++) {
    const s = run(seed * 7919, { rareMisses: misses });
    const r = playBot(s, opts);
    const total = Object.values(r.bag).reduce((a, b) => a + b, 0), rare = r.bag['four-leaf-flower'] ?? 0;
    assert.ok(total - rare <= 16 + 4, `seed ${seed}`); // 이벤트 보상(최대 +2)은 가방 상한과 별개
    assert.ok(rare <= 2);
    totals.push(total - rare); rares.push(rare);
    misses = E.nextRareMisses(misses, r.rareFound); streak = r.rareFound ? 0 : streak + 1; worstStreak = Math.max(worstStreak, streak);
  }
  totals.sort((a, b) => a - b);
  return { p20: totals[200], median: totals[500], p80: totals[800], rarePct: rares.filter(Boolean).length / 10, worstStreak };
}

test('1,000판 시뮬레이션: 가방 상한·희귀 최대 2개를 지키고, 천장 덕분에 희귀가 6판 이상 연속 안 나오지 않는다', () => {
  const omni = simulate({ reaction: 0.6 }), sight = simulate({ reaction: 0.6, vision: true });
  const line = (name, r) => console.log(`  ${name}: 일반 재료 하위20% ${r.p20} · 중앙 ${r.median} · 상위20% ${r.p80}, 희귀 판 ${r.rarePct.toFixed(1)}%, 최장 연속 미획득 ${r.worstStreak}`);
  line('봇(지도 전체를 앎 = 안내소 1단계 상한)', omni); line('봇(화면 시야만, 기본)', sight);
  assert.ok(omni.worstStreak <= 5 && sight.worstStreak <= 5);
});

test('일품 도시락: 동일 시드 1,000판에서 채집물 기준 수익 증가 12% 이내', () => {
  let plain = 0, buffed = 0;
  const value = bag => Object.entries(bag).reduce((sum, [id, n]) => sum + n * (E.FORAGE.find(f => f.id === id)?.price ?? 0), 0);
  for (let seed = 1; seed <= 1000; seed++) {
    const options = { reaction: 0.6, vision: true };
    plain += value(playBot(run(seed * 7919), options).bag);
    buffed += value(playBot(run(seed * 7919, { lunch: { dishId: 'forest-potato-wrap', grade: 2, expiresAt: Date.now() + 3600000, actionsLeft: 9 } }), options).bag);
  }
  const increase = buffed / plain - 1;
  console.log(`  일품 도시락 채집물 가치 증가 ${(increase * 100).toFixed(2)}% (같은 시드·조작, 제작 비용 제외)`);
  assert.ok(increase >= 0 && increase <= .12);
});

test('쓰러짐(2026-10-21): 벌떼 3번이면 판이 끝나고 가방의 40%(내림, 최소 1개)를 무작위로 잃는다', () => {
  const s = run(11); s.phase = 'play'; s.bag = { 'young-herb': 6, wildflower: 4 };
  const hitOnce = () => { s.player.stunUntil = 0; const b = s.hazards.find(h => h.kind === 'bees'); s.hitCd = {}; E.step(s, E.NO_INPUT, 0.001); s.player.x = b.x; s.player.y = b.y; E.step(s, E.NO_INPUT, 0.001); };
  hitOnce(); assert.equal(s.hp, 2); assert.equal(s.phase, 'play');
  hitOnce(); assert.equal(s.hp, 1);
  hitOnce(); assert.equal(s.hp, 0); assert.equal(s.phase, 'done'); assert.equal(s.endReason, 'down');
  const lost = Object.values(s.lost).reduce((a, b) => a + b, 0);
  assert.equal(lost, 4); assert.equal(E.bagCount(s), 6);
  const r = E.resultOf(s); assert.equal(r.reason, 'down'); assert.deepEqual(r.lost, s.lost);
  // 같은 판(시드)이면 잃는 품목이 같고, 가방이 1개뿐이어도 1개는 잃으며, 빈 가방은 잃을 것이 없다
  assert.deepEqual(E.lossOf({ 'young-herb': 6, wildflower: 4 }, 11), E.lossOf({ wildflower: 4, 'young-herb': 6 }, 11));
  assert.deepEqual(E.lossOf({ 'four-leaf-flower': 1 }, 3), { 'four-leaf-flower': 1 });
  assert.deepEqual(E.lossOf({}, 3), {});
  for (let seed = 1; seed <= 200; seed++) {
    const bag = { 'young-herb': seed % 7, wildflower: seed % 5, 'soft-twig': 3 };
    const total = Object.values(bag).reduce((a, b) => a + b, 0), loss = E.lossOf(bag, seed);
    assert.equal(Object.values(loss).reduce((a, b) => a + b, 0), Math.max(1, Math.floor(total * 0.4)));
    for (const [id, n] of Object.entries(loss)) assert.ok(n <= bag[id]);
  }
});

