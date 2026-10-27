"use client";
/**
 * 탐험 로비·결과 화면(LIFE_CONTENT_EXPANSION_SPEC 3절). 지역 선택 → 한 판(ExploreGame, 필요할 때 로드) → 결과.
 * 지급·저장은 page가 onFinish에서 한 번만 처리한다.
 */
import { lazy, Suspense, useState } from "react";
import type { LunchBuff } from "../cooking/lunch";
import type { Season } from "../fishing";
import { FORAGE, MINE_DAILY_RUNS, dailyOf, extraOpenRegions, fourSeasonsOpen, inSeasonBonus, openRegions, REGIONS, type ExploreDaily, type ExploreRegion } from "./data";
import { createRun, resumeRun, RARE_PITY_MISSES, RUN_SECONDS, type RunResult, type RunState } from "./engine";
import type { ExplorationCheckpoint, ExplorationState } from "./types";
import { availableTools, gearOpts, toolBonus, toolPlan } from "./tools";
import type { Inventory } from "../items";
import type { ConsumeOptions } from "../stock";

const ExploreGame = lazy(() => import("./ExploreGame"));
const itemsOf = (region: ExploreRegion) => FORAGE.filter(item => item.season === region.season);
const HAZARD_INFO: Record<string, string> = { "sprout-trail": "🐝 벌떼(닿으면 1.5초 멈춤·시간 −2초) · 🐗 멧돼지 돌진 · 🟤 진흙(이동 느려짐)", "sun-marsh": "🍄 독버섯 포자(보라 고리가 차면 0.6초 구름) · 🐍 물뱀 돌진 · 💧 물웅덩이(이동 느려짐)", "maple-valley": "🪨 낙석(그림자가 차오르면 떨어짐) · 🐗 멧돼지 돌진 · 🌿 가시덤불(이동 느려짐)", "frost-cave": "🧊 고드름(그림자가 차오르면 떨어짐) · 🐺 늑대 돌진 · ❄️ 빙판(미끄러짐)" };

type Props = {
  exploration: ExplorationState;
  season: Season | "휴식";
  /** 안내소 단계(마을 복구 전에는 0) */
  guideLevel: number;
  onStart?: () => LunchBuff | null;
  /** 탐험 캐릭터로 그릴 이용자 아바타 */
  avatar?: { src: string; pixelated: boolean };
  onCheckpoint: (checkpoint: ExplorationCheckpoint) => void;
  onFinish: (result: RunResult) => void;
  onOpenStorage: () => void;
  /** 탐험 장비 제작·장착(생활 콘텐츠 2단계). 없으면 장비 칸을 숨긴다 */
  tools?: { inventory: Inventory; money: number; options: ConsumeOptions; onCraft: (id: string) => void; onEquip: (id: string | null) => void };
  /** 광차 정거장 단계(1단계: 비겨울 서리 동굴 하루 2회) */
  mineLevel?: number;
  /** 하루 단위 비계절 입장 기록 갱신(안내소 2단계 선택·광차 입장) */
  onDaily?: (daily: ExploreDaily) => void;
};

export default function ExplorePanel({ exploration, season, guideLevel, onStart, avatar, onCheckpoint, onFinish, onOpenStorage, tools, mineLevel = 0, onDaily }: Props) {
  const gear = toolBonus(exploration.equippedTool), gearRun = gearOpts(exploration.equippedTool);
  // 4계절 공개 뒤(3.3절): 현재 계절 지역 무료 + 안내소 2단계 하루 1곳 + 광차 정거장 비겨울 서리 동굴 하루 2회
  const daily = dailyOf(exploration.daily), fourSeasons = fourSeasonsOpen();
  const regions = openRegions(season, extraOpenRegions(season, daily, guideLevel, mineLevel));
  const [regionId, setRegionId] = useState(regions[0]?.id ?? REGIONS[0].id);
  // 진행 중이던 판이 있으면(창 닫기·새로고침) 같은 판을 이어 한다
  const saved = exploration.checkpoint?.snap ? exploration.checkpoint : null;
  const [run, setRun] = useState<RunState | null>(() => (saved?.snap ? resumeRun({ ...saved, snap: saved.snap }, gearRun) : null));
  const [result, setResult] = useState<RunResult | null>(null);
  /** 안내소 2단계 집중 탐색 재료(5.2.1절). 선택하지 않으면 기본 분포 */
  const [focusItem, setFocusItem] = useState<string | null>(null);
  /** 광차 정거장 2단계 장비 프리셋 2칸(화면 편의 설정이라 이 기기에만 저장) */
  const [toolPresets, setToolPresets] = useState<(string | null)[]>(() => { try { const raw = JSON.parse(localStorage.getItem("explore-tool-presets") ?? "[]"); return [0, 1].map(i => (typeof raw[i] === "string" ? raw[i] : null)); } catch { return [null, null]; } });
  const savePresets = (next: (string | null)[]) => { setToolPresets(next); try { localStorage.setItem("explore-tool-presets", JSON.stringify(next)); } catch { /* 저장 불가 환경 */ } };
  const region = REGIONS.find(entry => entry.id === regionId) ?? REGIONS[0];

  const viaMine = fourSeasons && region.id === "frost-cave" && season !== "겨울" && season !== "휴식" && daily.guidePick !== "frost-cave";
  const start = () => {
    if (!regions.some(r => r.id === region.id)) return;
    if (viaMine) onDaily?.({ ...daily, mineRuns: daily.mineRuns + 1 });
    const seed = Math.floor(Math.random() * 2 ** 31), now = Date.now();
    setResult(null);
    setRun(createRun({ seed, runId: `${now.toString(36)}-${seed.toString(36)}`, startedAt: now, lunch: onStart?.() ?? null, ...gearRun, sidepathBonus: mineLevel >= 3, regionId: region.id, inSeason: inSeasonBonus(region, season), guideLevel, focusItem: guideLevel >= 2 && itemsOf(region).some(item => item.id === focusItem && !item.rare) ? focusItem : null, rareMisses: exploration.rareMissesByRegion[region.id] ?? 0 }));
  };
  const finish = (next: RunResult) => { onFinish(next); setResult(next); setRun(null); };

  if (run) return <section className="panel explore-panel playing">
    <Suspense fallback={<p className="explore-loading">🧭 숲길로 가는 중…</p>}>
      <ExploreGame key={run.runId} run={run} avatar={avatar} showResourcesOnMinimap={guideLevel >= 1} onCheckpoint={onCheckpoint} onFinish={finish} />
    </Suspense>
  </section>;

  const misses = exploration.rareMissesByRegion[region.id] ?? 0;
  if (saved?.snap) return <section className="panel explore-panel">
    <div className="explore-result"><b>🔄 진행 중인 탐험이 있어요</b><p>남은 시간 {Math.ceil(saved.snap.timeLeft)}초 · 체력 {saved.snap.hp} · 가방 {Object.values(saved.bag).reduce((a, b) => a + b, 0)}개. 같은 자리에서 이어 해요.</p>
      <div className="explore-result-actions"><button className="save-button" onClick={() => setRun(resumeRun({ ...saved, snap: saved.snap! }, gearRun))}>▶ 이어 하기</button></div></div>
  </section>;
  return <section className="panel explore-panel">
    <div className="panel-heading"><div><span className="eyebrow">FORAGING · {RUN_SECONDS}초</span><h3>채집·탐험</h3></div><span className="plot-count">누적 {exploration.totalRuns}회</span></div>
    {result && <div className="explore-result">
      <b>{result.reason === "down" ? "💫 쓰러졌어요… 채집물 일부를 떨어뜨렸어요" : result.reason === "time" ? "⏱ 시간 종료 · 무사히 귀환!" : result.reason === "resume" ? "🔄 지난 탐험 기록을 정리했어요" : "🏕️ 귀환 완료!"}</b>
      {Object.keys(result.bag).length === 0 ? <p>이번에는 아무것도 캐지 못했어요.</p> : <ul>{Object.entries(result.bag).map(([id, n]) => { const item = FORAGE.find(entry => entry.id === id); return <li key={id} className={item?.rare ? "rare" : ""}><span>{item?.icon}</span>{item?.name}<em>×{n}</em></li>; })}</ul>}
      {result.bait > 0 && <p>🪱 기본 미끼 +{result.bait}</p>}
      {result.lost && Object.keys(result.lost).length > 0 && <p className="explore-lost">잃어버린 채집물: {Object.entries(result.lost).map(([id, n]) => { const item = FORAGE.find(entry => entry.id === id); return `${item?.icon ?? ""} ${item?.name ?? id} ×${n}`; }).join(" · ")}</p>}
      <small>{Object.keys(result.bag).length ? "남은 채집물은 모두 통합 창고로 옮겼어요." : ""}{result.stuns > 0 ? ` 위험에 ${result.stuns}번 맞았어요.` : ""}</small>
      <div className="explore-result-actions"><button className="save-button" onClick={start}>🧭 다시 탐험</button><button className="ghost-button" onClick={onOpenStorage}>📦 창고 열기 (E)</button></div>
    </div>}
    <div className="explore-regions">{REGIONS.map(entry => { const open = regions.some(r => r.id === entry.id), here = entry.id === region.id;
      return <button key={entry.id} className={`explore-region ${here ? "on" : ""}`} disabled={!open} onClick={() => setRegionId(entry.id)} aria-pressed={here}>
        <span className="explore-region-icon">{entry.icon}</span><b>{entry.name}</b><small>{open ? `${entry.season} 지역${inSeasonBonus(entry, season) ? " · 제철 +20%" : ""}${fourSeasons && entry.id === "frost-cave" && season !== "겨울" && season !== "휴식" && daily.guidePick !== "frost-cave" ? ` · 광차 ${MINE_DAILY_RUNS - daily.mineRuns}회` : ""}` : entry.released ? "제철 아님" : "준비 중"}</small>
      </button>; })}</div>
    {fourSeasons && guideLevel >= 2 && season !== "휴식" && <div className="explore-daily" role="group" aria-label="오늘의 비계절 지역">
      <span>🧭 안내소 · 오늘의 비계절 지역</span>
      {daily.guidePick ? <b>{REGIONS.find(r => r.id === daily.guidePick)?.icon} {REGIONS.find(r => r.id === daily.guidePick)?.name} (내일 다시 고를 수 있어요)</b>
        : REGIONS.filter(r => r.released && r.season !== season).map(r => <button key={r.id} onClick={() => { onDaily?.({ ...daily, guidePick: r.id }); setRegionId(r.id); }}>{r.icon} {r.name}</button>)}
    </div>}
    {fourSeasons && !regions.some(r => r.id === region.id) && <p className="explore-closed">{region.name}은 지금 제철이 아니에요. 안내소 2단계(하루 1곳)나 광차 정거장(서리 동굴)으로 들어갈 수 있어요.</p>}
    <div className="explore-brief">
      <div><span>주요 재료</span><b>{itemsOf(region).filter(item => !item.rare).map(item => `${item.icon} ${item.name}`).join(" · ")}</b></div>
      <div><span>희귀 발견물</span><b>{itemsOf(region).filter(item => item.rare).map(item => `${item.icon} ${item.name}`).join("")}</b><small>{misses >= RARE_PITY_MISSES ? "이번 판 확정 등장!" : `${RARE_PITY_MISSES - misses}판 더 못 찾으면 다음 판 확정`}</small></div>
      <div><span>위험</span><b>{HAZARD_INFO[region.id] ?? "-"}</b></div>
      <div><span>규칙</span><b>가방 {16 + gear.bag}칸 · ❤️ 3칸 · 중도 귀환해도 불이익 없음</b></div>
      {guideLevel >= 1 && <div><span>🧭 안내소</span><b>{["", "미니맵에 자원 위치 표시", "미니맵 표시 · 집중 탐색", "미니맵 표시 · 집중 탐색 · 큰 자원 1곳 추가"][Math.min(3, guideLevel)]}</b>{guideLevel >= 2 && <small>비계절 지역 선택은 4계절 지역이 모두 열리면 추가돼요.</small>}</div>}
    </div>
    {guideLevel >= 2 && <div className="explore-focus" role="group" aria-label="집중 탐색 재료">
      <span>🎯 집중 탐색</span>
      <button className={focusItem === null ? "on" : ""} aria-pressed={focusItem === null} onClick={() => setFocusItem(null)}>선택 안 함</button>
      {itemsOf(region).filter(item => !item.rare).map(item => <button key={item.id} className={focusItem === item.id ? "on" : ""} aria-pressed={focusItem === item.id} onClick={() => setFocusItem(item.id)}>{item.icon} {item.name}</button>)}
      <small>고른 재료로 일반 자원의 30%를 바꿔요. 자원 수·희귀 확률·가방은 그대로예요.</small>
    </div>}
    {tools && availableTools().length > 0 && <div className="explore-tools" role="group" aria-label="탐험 장비">
      <b>🎒 탐험 장비 <small>한 번에 하나만 장착 · 내구도 없음</small></b>
      {mineLevel >= 2 && <div className="explore-presets" role="group" aria-label="장비 프리셋">{toolPresets.map((id, i) => { const tool = availableTools().find(t => t.id === id);
        return tool ? <span key={i}><button className={exploration.equippedTool === tool.id ? "on" : ""} onClick={() => tools.onEquip(tool.id)} disabled={!exploration.ownedTools.includes(tool.id)}>{tool.icon} 프리셋 {i + 1} · {tool.name}</button><button className="x" aria-label={`프리셋 ${i + 1} 비우기`} onClick={() => savePresets(toolPresets.map((v, k) => (k === i ? null : v)))}>✕</button></span>
          : <span key={i}><button disabled={!exploration.equippedTool} onClick={() => savePresets(toolPresets.map((v, k) => (k === i ? exploration.equippedTool : v)))}>＋ 지금 장비를 프리셋 {i + 1}에</button></span>; })}</div>}
      {availableTools().map(tool => { const owned = exploration.ownedTools.includes(tool.id), on = exploration.equippedTool === tool.id, plan = owned ? null : toolPlan(tools.inventory, tool, tools.options);
        return <div key={tool.id} className={`explore-tool ${on ? "on" : ""}`}>
          <span className="explore-tool-icon">{tool.icon}</span>
          <span className="explore-tool-info"><b>{tool.name}</b><small>{tool.note}</small>{!owned && <small>{tool.gold.toLocaleString()}원 · {tool.forage.map(f => `${FORAGE.find(item => item.id === f.id)?.icon ?? ""} ${FORAGE.find(item => item.id === f.id)?.name ?? f.id} ${f.count}`).join(" · ")} · 🌾 농산물 {tool.crops}개(황금 제외)</small>}</span>
          {owned ? <button className={on ? "ghost-button" : "save-button"} onClick={() => tools.onEquip(on ? null : tool.id)}>{on ? "해제" : "장착"}</button>
            : <button className="save-button" disabled={!plan?.ok || tools.money < tool.gold} title={plan?.ok ? "" : `부족: ${plan?.missing.map(m => m.id === "any" ? `농산물 ${m.count}개` : `${FORAGE.find(item => item.id === m.id)?.name ?? m.id} ${m.count}개`).join(", ")}`} onClick={() => tools.onCraft(tool.id)}>제작</button>}
        </div>; })}
    </div>}
    <button className="save-button explore-start" onClick={start} disabled={!regions.some(r => r.id === region.id)}>🧭 {region.name} 탐험 시작</button>
    <p className="hint">입장권·에너지는 없어요. 반짝이는 채집물에 다가가 F(또는 클릭)로 캐고, 시간이 끝나거나 귀환하면 통합 창고로 들어가요. 벌떼에 3번 쏘이면 쓰러지고, 가방에 든 채집물의 40%를 무작위로 잃어요. 탐험 중 브라우저를 닫아도 10초마다 저장한 채집물은 다음 접속 때 받아요.</p>
  </section>;
}
