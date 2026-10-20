"use client";
/**
 * 탐험 로비·결과 화면(LIFE_CONTENT_EXPANSION_SPEC 3절). 지역 선택 → 한 판(ExploreGame, 필요할 때 로드) → 결과.
 * 지급·저장은 page가 onFinish에서 한 번만 처리한다.
 */
import { lazy, Suspense, useState } from "react";
import type { LunchBuff } from "../cooking/lunch";
import type { Season } from "../fishing";
import { FORAGE, inSeasonBonus, openRegions, REGIONS, type ExploreRegion } from "./data";
import { createRun, RARE_PITY_MISSES, RUN_SECONDS, type RunResult, type RunState } from "./engine";
import type { ExplorationCheckpoint, ExplorationState } from "./types";

const ExploreGame = lazy(() => import("./ExploreGame"));
const itemsOf = (region: ExploreRegion) => FORAGE.filter(item => item.season === region.season);
const HAZARD_INFO: Record<string, string> = { "sprout-trail": "🐝 벌떼(닿으면 1.5초 멈춤·시간 −2초) · 🟤 진흙(이동 느려짐)" };

type Props = {
  exploration: ExplorationState;
  season: Season | "휴식";
  /** 안내소 단계(마을 복구 전에는 0) */
  guideLevel: number;
  onStart?: () => LunchBuff | null;
  onCheckpoint: (checkpoint: ExplorationCheckpoint) => void;
  onFinish: (result: RunResult) => void;
  onOpenStorage: () => void;
};

export default function ExplorePanel({ exploration, season, guideLevel, onStart, onCheckpoint, onFinish, onOpenStorage }: Props) {
  const regions = openRegions(season);
  const [regionId, setRegionId] = useState(regions[0]?.id ?? REGIONS[0].id);
  const [run, setRun] = useState<RunState | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  /** 안내소 2단계 집중 탐색 재료(5.2.1절). 선택하지 않으면 기본 분포 */
  const [focusItem, setFocusItem] = useState<string | null>(null);
  const region = REGIONS.find(entry => entry.id === regionId) ?? REGIONS[0];

  const start = () => {
    const seed = Math.floor(Math.random() * 2 ** 31), now = Date.now();
    setResult(null);
    setRun(createRun({ seed, runId: `${now.toString(36)}-${seed.toString(36)}`, startedAt: now, lunch: onStart?.() ?? null, regionId: region.id, inSeason: inSeasonBonus(region, season), guideLevel, focusItem: guideLevel >= 2 && itemsOf(region).some(item => item.id === focusItem && !item.rare) ? focusItem : null, rareMisses: exploration.rareMissesByRegion[region.id] ?? 0 }));
  };
  const finish = (next: RunResult) => { onFinish(next); setResult(next); setRun(null); };

  if (run) return <section className="panel explore-panel playing">
    <Suspense fallback={<p className="explore-loading">🧭 숲길로 가는 중…</p>}>
      <ExploreGame key={run.runId} run={run} showResourcesOnMinimap={guideLevel >= 1} onCheckpoint={onCheckpoint} onFinish={finish} />
    </Suspense>
  </section>;

  const misses = exploration.rareMissesByRegion[region.id] ?? 0;
  return <section className="panel explore-panel">
    <div className="panel-heading"><div><span className="eyebrow">FORAGING · {RUN_SECONDS}초</span><h3>채집·탐험</h3></div><span className="plot-count">누적 {exploration.totalRuns}회</span></div>
    {result && <div className="explore-result">
      <b>{result.reason === "time" ? "⏱ 시간 종료 · 무사히 귀환!" : result.reason === "resume" ? "🔄 지난 탐험 기록을 정리했어요" : "🏕️ 귀환 완료!"}</b>
      {Object.keys(result.bag).length === 0 ? <p>이번에는 아무것도 캐지 못했어요.</p> : <ul>{Object.entries(result.bag).map(([id, n]) => { const item = FORAGE.find(entry => entry.id === id); return <li key={id} className={item?.rare ? "rare" : ""}><span>{item?.icon}</span>{item?.name}<em>×{n}</em></li>; })}</ul>}
      {result.bait > 0 && <p>🪱 기본 미끼 +{result.bait}</p>}
      <small>모두 통합 창고로 옮겼어요.{result.stuns > 0 ? ` 벌떼에 ${result.stuns}번 쏘였어요.` : ""}</small>
      <div className="explore-result-actions"><button className="save-button" onClick={start}>🧭 다시 탐험</button><button className="ghost-button" onClick={onOpenStorage}>📦 창고 열기 (E)</button></div>
    </div>}
    <div className="explore-regions">{REGIONS.map(entry => { const open = regions.some(r => r.id === entry.id), here = entry.id === region.id;
      return <button key={entry.id} className={`explore-region ${here ? "on" : ""}`} disabled={!open} onClick={() => setRegionId(entry.id)} aria-pressed={here}>
        <span className="explore-region-icon">{entry.icon}</span><b>{entry.name}</b><small>{open ? `${entry.season} 지역${inSeasonBonus(entry, season) ? " · 제철 +20%" : ""}` : "준비 중"}</small>
      </button>; })}</div>
    <div className="explore-brief">
      <div><span>주요 재료</span><b>{itemsOf(region).filter(item => !item.rare).map(item => `${item.icon} ${item.name}`).join(" · ")}</b></div>
      <div><span>희귀 발견물</span><b>{itemsOf(region).filter(item => item.rare).map(item => `${item.icon} ${item.name}`).join("")}</b><small>{misses >= RARE_PITY_MISSES ? "이번 판 확정 등장!" : `${RARE_PITY_MISSES - misses}판 더 못 찾으면 다음 판 확정`}</small></div>
      <div><span>위험</span><b>{HAZARD_INFO[region.id] ?? "-"}</b></div>
      <div><span>규칙</span><b>가방 16칸 · 사망 없음 · 중도 귀환해도 불이익 없음</b></div>
      {guideLevel >= 1 && <div><span>🧭 안내소</span><b>{["", "미니맵에 자원 위치 표시", "미니맵 표시 · 집중 탐색", "미니맵 표시 · 집중 탐색 · 큰 자원 1곳 추가"][Math.min(3, guideLevel)]}</b>{guideLevel >= 2 && <small>비계절 지역 선택은 4계절 지역이 모두 열리면 추가돼요.</small>}</div>}
    </div>
    {guideLevel >= 2 && <div className="explore-focus" role="group" aria-label="집중 탐색 재료">
      <span>🎯 집중 탐색</span>
      <button className={focusItem === null ? "on" : ""} aria-pressed={focusItem === null} onClick={() => setFocusItem(null)}>선택 안 함</button>
      {itemsOf(region).filter(item => !item.rare).map(item => <button key={item.id} className={focusItem === item.id ? "on" : ""} aria-pressed={focusItem === item.id} onClick={() => setFocusItem(item.id)}>{item.icon} {item.name}</button>)}
      <small>고른 재료로 일반 자원의 30%를 바꿔요. 자원 수·희귀 확률·가방은 그대로예요.</small>
    </div>}
    <button className="save-button explore-start" onClick={start}>🧭 {region.name} 탐험 시작</button>
    <p className="hint">입장권·에너지는 없어요. 반짝이는 채집물에 다가가 F(또는 클릭)로 캐고, 시간이 끝나거나 귀환하면 통합 창고로 들어가요. 탐험 중 브라우저를 닫아도 10초마다 저장한 채집물은 다음 접속 때 받아요.</p>
  </section>;
}
