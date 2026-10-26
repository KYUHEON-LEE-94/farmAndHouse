import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const out = buildSync({ stdin: { contents: `export * from './app/cooking/recipes'; export * from './app/cooking/lunch'; export * from './app/cooking/batch'; export * from './app/items'; export * from './app/stock'; export { ALL_FISH } from './app/fishing'; export { createRun, step, NO_INPUT, GATHER_SMALL } from './app/explore/engine';`, resolveDir: root, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent' });
const L = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
const fish = L.ALL_FISH.filter(f => f.rarity !== '전설' && f.rarity !== '신화').sort((a,b) => a.price-b.price || a.id.localeCompare(b.id));
const cheap = `fish:${fish[0].id}`, next = `fish:${fish[1].id}`;
const inv = { 'crop:potato:0:0': 10, 'crop:potato:2:1': 3, 'forage:young-herb': 5, [cheap]: 5, [next]: 5 };
test('도시락 3종: 잠금·예약 제외, 낮은 품질·비황금 및 싼 물고기 우선 소비', () => {
  assert.equal(L.LUNCHES.length, 3);
  const plan = L.lunchPlan(inv,L.LUNCHES[0],2,{ locks: { [cheap]:true },reserved:{'crop:potato:0:0':8} });
  assert.equal(plan.ok,true);
  assert.deepEqual(plan.take, {'crop:potato:0:0':2,'crop:potato:2:1':2,'forage:young-herb':2,[next]:2});
  const after=L.applyTake(inv,plan.take);
  assert.equal(after[cheap],5); assert.equal(after['crop:potato:0:0'],8);
  assert.equal(inv['crop:potato:0:0'],10);
  assert.equal(L.lunchPlan(inv,L.LUNCHES[0],1,{ locks:{'forage:young-herb':true} }).ok,false);
});
test('전설·신화 물고기는 도시락 재료로 소비하지 않는다',()=>{
  const rare=L.ALL_FISH.filter(f=>['전설','신화'].includes(f.rarity));
  const stock={...inv,[cheap]:0,[next]:0,...Object.fromEntries(rare.map(f=>[`fish:${f.id}`,99]))};
  const p=L.lunchPlan(stock,L.LUNCHES[0],1,{locks:{}});
  assert.equal(p.ok,false);assert.equal(p.missing.at(-1).category,'fish');
});
test('조리 점수·시드 복원, 독립 등급 지급, 미완성·다른 배치·완료 후 재지급 차단',()=>{
  const b={batchId:'one',dishId:L.LUNCHES[0].id,quantity:5,consumed:{x:1},seed:42,results:[2,1,2],facilityLevelAtStart:3};
  const restored=L.restoreCookingBatch(JSON.parse(JSON.stringify(b)),L.LUNCHES.map(d=>d.id));
  assert.deepEqual(restored,b);
  const result=L.completeLunchBatch(inv,restored,'one');
  assert.equal(result.counts.reduce((a,b)=>a+b),5);
  assert.deepEqual(result,L.completeLunchBatch(inv,b,'one'));
  assert.equal(L.completeLunchBatch(inv,{...b,results:[2,1]},'one'),null);
  assert.equal(L.completeLunchBatch(inv,b,'other'),null);
  assert.equal(L.completeLunchBatch(result.inventory,null,'one'),null);
  const totals=[0,0,0];
  for(let seed=0;seed<2000;seed++){const r=L.completeLunchBatch({}, {...b,seed},'one');r.counts.forEach((n,i)=>totals[i]+=n);}
  assert.ok(totals.every(n=>n>1000));
});
test('시간·횟수 제한: 오프라인 만료, 마지막 탐험에도 효과 적용, 농사·낚시는 횟수 미소모',()=>{
  const now=100000, buff=L.activateLunch(L.LUNCHES[0].id,2,now);
  assert.equal(buff.expiresAt,now+50*60000);assert.equal(buff.actionsLeft,9);
  assert.equal(L.lunchPower(buff,'explore',now),.15);
  assert.equal(L.lunchPower(buff,'fish',now),0);
  assert.equal(L.lunchPower(buff,'explore',buff.expiresAt),0);
  const last=L.enterLunchRun({...buff,actionsLeft:1},now);
  assert.equal(last.applied.actionsLeft,1);assert.equal(last.next,null);
  for(const d of L.LUNCHES.slice(1)) { const b=L.activateLunch(d.id,0,now);assert.deepEqual(L.enterLunchRun(b,now),{applied:null,next:b}); }
});
test('탐험 실제 엔진에서 도시락 채집 시간 감소, 만료시 기본 시간',()=>{
  for(const expired of [false,true]){
    const lunch=L.activateLunch(L.LUNCHES[0].id,2);
    if(expired)lunch.expiresAt=1;
    const run=L.createRun({seed:1,runId:'test',startedAt:Date.now(),regionId:'sprout-trail',inSeason:false,lunch});
    const node=run.nodes.find(n=>n.size==='small');run.phase='play';run.hazards=[];run.player.x=node.x;run.player.y=node.y;
    L.step(run,{...L.NO_INPUT,gather:true,gatherTarget:node.id},.001);
    assert.ok(Math.abs(run.gather.need-L.GATHER_SMALL*(expired?1:.85))<1e-9);
  }
});
