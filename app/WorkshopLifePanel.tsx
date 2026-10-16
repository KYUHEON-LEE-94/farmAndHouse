"use client";
/** 생활 가공 개편 화면(WORKSHOP_PROCESSING_REDESIGN 10절). WORKSHOP_V2_ENABLED 동안만 쓴다. */
import { useMemo, useState } from "react";
import { CROPS, QUALITIES } from "./farming";
import { PROC_RECIPES, TAG_NAME, autoFill, checkInputs, cropFits, goodsInfo, jobInfo, maxBatches, processResult, subtractStock, type ProcRecipe, type ProcessingInput, type Stock, type Workshop } from "./workshop";

export type ProcBatch = { recipe: ProcRecipe; inputs: ProcessingInput[] };
type Props = {
  workshop: Workshop; nowMs: number; stock: Stock[]; goods: Record<string, number>;
  slotPrice: number; maxSlots: number; formatClock: (s: number) => string;
  onStart: (batches: ProcBatch[]) => void; onCollect: (index: number) => void; onSell: (key: string, n: number) => void; onBuySlot: () => void;
};
const KIND_LABEL = { free: "🫙 자유 가공", mix: "📦 혼합 가공", special: "⭐ 특선 레시피" } as const;
const stockKey = (s: { cropId: string; quality: number; golden: boolean }) => `${s.cropId}|${s.quality}|${s.golden ? 1 : 0}`;

export default function WorkshopLifePanel({ workshop, nowMs, stock, goods, slotPrice, maxSlots, formatClock, onStart, onCollect, onSell, onBuySlot }: Props) {
  const [kind, setKind] = useState<"ready" | "free" | "mix" | "special">("ready");
  const [onlyReady, setOnlyReady] = useState(false);
  const [allowGolden, setAllowGolden] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<string, number> | null>(null);
  const [confirm, setConfirm] = useState<null | { batches: ProcBatch[]; golden: boolean; label: string }>(null);
  const empty = Math.max(0, workshop.slots - workshop.jobs.length);
  const counts = useMemo(() => Object.fromEntries(PROC_RECIPES.map(r => [r.id, maxBatches(r, stock, allowGolden, 99)])), [stock, allowGolden]);
  const recipe = open ? PROC_RECIPES.find(r => r.id === open) ?? null : null;

  const shown = PROC_RECIPES.filter(r => kind === "ready" ? counts[r.id] > 0 : r.kind === kind && (!onlyReady || counts[r.id] > 0));
  const inputsOf = (sel: Record<string, number>): ProcessingInput[] => Object.entries(sel).filter(([, n]) => n > 0).map(([k, n]) => { const [cropId, q, g] = k.split("|"); return { cropId, quality: Number(q), golden: g === "1", count: n }; });
  const auto = (r: ProcRecipe) => { const fill = autoFill(r, stock, allowGolden); return fill ? Object.fromEntries(fill.map(i => [stockKey(i), i.count])) : {}; };
  const openRecipe = (r: ProcRecipe) => { setOpen(r.id); setPicked(auto(r)); setConfirm(null); };
  const sel = picked ?? (recipe ? auto(recipe) : {}), inputs = inputsOf(sel);
  const problem = recipe ? checkInputs(recipe, inputs) : "레시피를 골라 주세요.";
  const product = recipe && !problem ? processResult(recipe, inputs) : null;
  const ask = (batches: ProcBatch[], label: string) => {
    if (!batches.length) return;
    const golden = batches.some(b => b.inputs.some(i => i.golden));
    if (golden || batches.length > 1) setConfirm({ batches, golden, label }); else onStart(batches);
  };
  const fillAll = (r: ProcRecipe) => {
    let left = stock; const batches: ProcBatch[] = [];
    for (let i = 0; i < empty; i++) { const fill = autoFill(r, left, allowGolden); if (!fill) break; batches.push({ recipe: r, inputs: fill }); left = subtractStock(left, fill); }
    ask(batches, `빈 항아리 전부 채우기 · ${r.name}`);
  };

  return <div className="workshop-view proc-v2">
    <div className="panel-heading"><div><span className="eyebrow">WORKSHOP · 절임 항아리</span><h3>가공 공방</h3></div><span className="plot-count">항아리 {workshop.jobs.length}/{workshop.slots}</span></div>
    <p className="hint">어느 계절 작물이든 가공할 수 있어요. 재료 가치는 <b>시장 기준가</b>(시세·포화 무관)로 계산하고, 담글 때 완성품 값이 확정돼요. 잠금·주문 예약분·황금 작물은 쓰지 않아요.</p>
    <div className="jar-row">{Array.from({ length: workshop.slots }).map((_, i) => { const job = workshop.jobs[i], info = job && jobInfo(job);
      if (!job || !info) return <div key={i} className="jar empty"><span>🏺</span><small>비어 있어요</small></div>;
      const left = Math.max(0, Math.ceil((job.doneAt - nowMs) / 1000)), totalSec = info.minutes * 60, done = left <= 0, price = job.price ?? goodsInfo(info.key).price;
      return <div key={i} className={`jar ${done ? "done" : ""}`}><span>{info.icon}</span><b>{info.name}</b><small>{price.toLocaleString()}원</small>{done ? <button onClick={() => onCollect(i)}>꺼내기 ✨</button> : <><span className="jar-bar"><i style={{ width: `${(1 - left / totalSec) * 100}%` }} /></span><small>{formatClock(left)} 남음</small></>}</div>; })}
      {workshop.slots < maxSlots && <button className="jar add" onClick={onBuySlot}><span>＋</span><small>항아리 추가<br />{slotPrice.toLocaleString()}원</small></button>}</div>

    <div className="proc-tabs shop-tabs" role="tablist">{([["ready", `✅ 지금 만들 수 있음 ${PROC_RECIPES.filter(r => counts[r.id] > 0).length}`], ["free", KIND_LABEL.free], ["mix", KIND_LABEL.mix], ["special", KIND_LABEL.special]] as const).map(([id, label]) =>
      <button key={id} role="tab" aria-selected={kind === id} className={kind === id ? "active" : ""} onClick={() => setKind(id)}>{label}</button>)}</div>
    <div className="proc-filters">
      {kind !== "ready" && <label><input type="checkbox" checked={onlyReady} onChange={e => setOnlyReady(e.target.checked)} /> 만들 수 있는 것만</label>}
      <label title="황금 작물은 가치가 3배라 기본으로 빼 둬요"><input type="checkbox" checked={allowGolden} onChange={e => { setAllowGolden(e.target.checked); if (recipe) setPicked(null); }} /> 🌟 황금 작물 포함</label>
    </div>

    <div className="recipe-list">{shown.length === 0 ? <p className="empty">{kind === "ready" ? "지금 창고로 만들 수 있는 가공이 없어요. 작물을 창고에 보관해 주세요." : "조건에 맞는 레시피가 없어요."}</p> : shown.map(r => {
      const n = counts[r.id], isOpen = open === r.id;
      return <div key={r.id} className={`recipe ${n > 0 ? "ready" : ""} ${r.kind !== "free" ? "mix" : ""} ${isOpen ? "open" : ""}`}>
        <div className="recipe-head"><span className="recipe-icon">{r.icon}</span><span><b>{r.name} <small className="proc-kind">{KIND_LABEL[r.kind]}</small></b><small>⏱ {r.minutes}분 · 재료 가치 <em>+{Math.round((r.mult - 1) * 100)}%</em> · {r.note}{n > 0 ? ` · 지금 ${n >= 99 ? "99+" : n}번 가능` : ""}</small></span></div>
        {r.inputs ? <ul className="recipe-inputs">{r.inputs.map(input => { const crop = CROPS.find(c => c.id === input.cropId)!, have = stock.filter(s => s.cropId === input.cropId && (allowGolden || !s.golden)).reduce((t, s) => t + s.n, 0);
          return <li key={input.cropId} className={have >= input.count ? "ok" : ""}>{crop.icon} {crop.name} <b>{Math.min(have, input.count)}/{input.count}</b><small>{crop.seasons.join("·")}</small></li>; })}</ul>
          : <ul className="recipe-inputs">{(r.tags ?? []).map(t => <li key={t}>{TAG_NAME[t]}</li>)}{!r.tags && <li>모든 작물(계절 한정 제외)</li>}</ul>}
        {!isOpen ? <button onClick={() => openRecipe(r)} disabled={n <= 0}>{n > 0 ? "재료 고르기" : "재료 모으는 중"}</button> : <ProcEditor recipe={r} stock={stock} allowGolden={allowGolden} picked={sel} setPicked={setPicked} problem={problem} product={product} empty={empty}
          onAuto={() => setPicked(auto(r))} onStart={() => product && ask([{ recipe: r, inputs }], r.name)} onFillAll={() => fillAll(r)} onClose={() => setOpen(null)} />}
      </div>; })}</div>

    {confirm && <div className="proc-confirm" role="dialog" aria-label="가공 확인">
      <b>{confirm.label}</b>
      <span>항아리 {confirm.batches.length}개 · 재료 총 {confirm.batches.reduce((t, b) => t + b.inputs.reduce((s, i) => s + i.count, 0), 0)}개 · 예상 완성품 {confirm.batches.reduce((t, b) => t + processResult(b.recipe, b.inputs).price, 0).toLocaleString()}원</span>
      {confirm.golden && <span className="warn">🌟 황금 작물이 들어가요. 황금 작물은 시장에서 3배 값이에요. 정말 가공할까요?</span>}
      <div><button onClick={() => setConfirm(null)}>취소</button><button className="go" onClick={() => { onStart(confirm.batches); setConfirm(null); setOpen(null); }}>담그기</button></div>
    </div>}

    <div className="goods-list"><b className="tool-shop-sub">🎁 만든 가공품 <small>(시세·포화 없는 고정가)</small></b>{Object.keys(goods).filter(k => goods[k] > 0).length === 0 ? <p className="empty">아직 만든 가공품이 없어요.</p> :
      Object.keys(goods).filter(k => goods[k] > 0).map(k => ({ k, ...goodsInfo(k) })).sort((a, b) => a.name.localeCompare(b.name) || a.price - b.price).map(g => <div key={g.k} className="goods-item"><span>{g.icon}</span><b>{g.name} ×{goods[g.k]}</b><small>개당 {g.price.toLocaleString()}원</small><button onClick={() => onSell(g.k, 1)}>1개</button><button className="all" onClick={() => onSell(g.k, goods[g.k])}>전부 {(g.price * goods[g.k]).toLocaleString()}원</button></div>)}</div>
  </div>;
}

function ProcEditor({ recipe, stock, allowGolden, picked, setPicked, problem, product, empty, onAuto, onStart, onFillAll, onClose }: {
  recipe: ProcRecipe; stock: Stock[]; allowGolden: boolean; picked: Record<string, number>; setPicked: (p: Record<string, number>) => void;
  problem: string | null; product: { name: string; icon: string; price: number; raw: number } | null; empty: number;
  onAuto: () => void; onStart: () => void; onFillAll: () => void; onClose: () => void;
}) {
  const rows = stock.filter(s => (allowGolden || !s.golden)).filter(s => { const crop = CROPS.find(c => c.id === s.cropId); return !!crop && cropFits(recipe, crop); })
    .sort((a, b) => a.cropId.localeCompare(b.cropId) || a.quality - b.quality || Number(a.golden) - Number(b.golden));
  const need = recipe.count ?? recipe.inputs?.reduce((t, i) => t + i.count, 0) ?? 0, chosen = Object.values(picked).reduce((t, n) => t + n, 0);
  const bump = (s: Stock, d: number) => { const k = stockKey(s), v = Math.max(0, Math.min(s.n, (picked[k] ?? 0) + d)); if (d > 0 && chosen >= need) return; setPicked({ ...picked, [k]: v }); };
  return <div className="proc-editor">
    <div className="proc-count">재료 {chosen}/{need}</div>
    <div className="proc-chips">{rows.map(s => { const crop = CROPS.find(c => c.id === s.cropId)!, k = stockKey(s), n = picked[k] ?? 0;
      return <span key={k} className={`proc-chip ${n > 0 ? "on" : ""} ${s.golden ? "golden" : ""}`}><button aria-label="빼기" onClick={() => bump(s, -1)} disabled={n <= 0}>−</button><b>{crop.icon} {crop.name}{QUALITIES[s.quality].stars}{s.golden ? "🌟" : ""} ×{n}</b><small>/{s.n}</small><button aria-label="넣기" onClick={() => bump(s, 1)} disabled={n >= s.n || chosen >= need}>＋</button></span>; })}</div>
    {product ? <p className="proc-preview">예상 완성품: <b>{product.icon} {product.name}</b><br />재료 가치 {product.raw.toLocaleString()}원 → 완성품 <b>{product.price.toLocaleString()}원</b> <em>(+{(product.price - product.raw).toLocaleString()}원)</em> · ⏱ {recipe.minutes}분</p> : <p className="proc-preview lack">{problem}</p>}
    <div className="proc-actions"><button onClick={onClose}>닫기</button><button onClick={onAuto}>자동으로 채우기</button>{empty > 1 && <button onClick={onFillAll}>빈 항아리 {empty}개 전부 채우기</button>}<button className="go" disabled={!product || empty <= 0} onClick={onStart}>{empty <= 0 ? "항아리 가득" : "🏺 가공 시작"}</button></div>
  </div>;
}
