"use client";
/**
 * 생활 가공 화면(WORKSHOP_PROCESSING_REDESIGN 10절 규칙 + 2026-10-27 시안 배치).
 * 왼쪽 레시피 목록 · 가운데 재료 → 완성품 · 오른쪽 수익 예상 · 아래 작업대. 자유·혼합·특선 규칙과 3~8분 제작 시간은 그대로다.
 */
import { useMemo, useState, type CSSProperties } from "react";
import { CROPS, QUALITIES } from "./farming";
import { ItemArt } from "./itemArt";
import { PROC_RECIPES, TAG_NAME, autoFill, checkInputs, cropFits, goodsInfo, jobInfo, maxBatches, processResult, subtractStock, type ProcRecipe, type ProcessingInput, type Stock, type Workshop } from "./workshop";

export type ProcBatch = { recipe: ProcRecipe; inputs: ProcessingInput[] };
type Props = {
  workshop: Workshop; nowMs: number; stock: Stock[]; goods: Record<string, number>;
  slotPrice: number; maxSlots: number; formatClock: (s: number) => string;
  onStart: (batches: ProcBatch[]) => void; onCollect: (index: number) => void; onCollectAll: () => void; onSell: (key: string, n: number) => void; onBuySlot: () => void;
};
const KIND_LABEL = { free: "자유 가공", mix: "혼합 가공", special: "특선 레시피" } as const;
const KIND_ICON = { free: "🫙", mix: "📦", special: "⭐" } as const;
/** 작업 슬롯 설비 그림(UI_IMAGE_ASSET_GUIDE 3절): 항아리=절임·김치, 건조대=말랭이, 구리 냄비=주스·잼, 압착기=혼합 상자·도시락 */
const EQUIPMENT: Record<string, string> = { pickle: "fermentation-jar", garlicpickle: "fermentation-jar", kkakdugi: "fermentation-jar", kimjang: "fermentation-jar", dried: "drying-rack", juice: "copper-pot", applejuice: "copper-pot", jam: "copper-pot", jamset: "copper-pot", fruitjam: "copper-pot", veggiebox: "artisan-press", farmbox: "artisan-press", salad: "artisan-press" };
const equipmentStyle = (recipeId: string) => EQUIPMENT[recipeId] ? { backgroundImage: `url("/images/workshop/${EQUIPMENT[recipeId]}.webp")` } : undefined;
const stockKey = (s: { cropId: string; quality: number; golden: boolean }) => `${s.cropId}|${s.quality}|${s.golden ? 1 : 0}`;
const won = (n: number) => `${Math.round(n).toLocaleString()}원`;

export default function WorkshopLifePanel({ workshop, nowMs, stock, goods, slotPrice, maxSlots, formatClock, onStart, onCollect, onCollectAll, onSell, onBuySlot }: Props) {
  const [kind, setKind] = useState<"ready" | "free" | "mix" | "special">("ready");
  const [query, setQuery] = useState("");
  const [allowGolden, setAllowGolden] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<string, number> | null>(null);
  const [qty, setQty] = useState(1);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<null | { batches: ProcBatch[]; golden: boolean; label: string }>(null);
  const empty = Math.max(0, workshop.slots - workshop.jobs.length);
  const counts = useMemo(() => Object.fromEntries(PROC_RECIPES.map(r => [r.id, maxBatches(r, stock, allowGolden, 99)])), [stock, allowGolden]);
  /** 레시피별 자동 채우기 기준 예상 완성품(목록 카드 가격 표시용) */
  const previews = useMemo(() => Object.fromEntries(PROC_RECIPES.map(r => { const fill = autoFill(r, stock, allowGolden); return [r.id, fill ? processResult(r, fill) : null]; })), [stock, allowGolden]);
  const readyCount = PROC_RECIPES.filter(r => counts[r.id] > 0).length;
  const shown = PROC_RECIPES.filter(r => (kind === "ready" ? counts[r.id] > 0 : r.kind === kind) && (!query.trim() || r.name.includes(query.trim()) || r.note.includes(query.trim())));
  const recipe = PROC_RECIPES.find(r => r.id === open) ?? shown[0] ?? PROC_RECIPES.find(r => counts[r.id] > 0) ?? PROC_RECIPES[0];

  const inputsOf = (sel: Record<string, number>): ProcessingInput[] => Object.entries(sel).filter(([, n]) => n > 0).map(([k, n]) => { const [cropId, q, g] = k.split("|"); return { cropId, quality: Number(q), golden: g === "1", count: n }; });
  const auto = (r: ProcRecipe) => { const fill = autoFill(r, stock, allowGolden); return fill ? Object.fromEntries(fill.map(i => [stockKey(i), i.count])) : {}; };
  const select = (r: ProcRecipe) => { setOpen(r.id); setPicked(null); setQty(1); setEditing(false); setConfirm(null); };
  const sel = picked ?? auto(recipe), inputs = inputsOf(sel);
  const problem = checkInputs(recipe, inputs);
  const product = !problem ? processResult(recipe, inputs) : null;
  const maxQty = Math.max(1, Math.min(counts[recipe.id] || 0, empty));
  const amount = Math.min(qty, maxQty);

  const ask = (batches: ProcBatch[], label: string) => {
    if (!batches.length) return;
    const golden = batches.some(b => b.inputs.some(i => i.golden));
    if (golden || batches.length > 1) setConfirm({ batches, golden, label }); else onStart(batches);
  };
  /** n개 담기: 첫 묶음은 고른 재료, 나머지는 자동 채우기 */
  const batchesOf = (r: ProcRecipe, n: number, first?: ProcessingInput[]) => {
    let left = stock; const batches: ProcBatch[] = [];
    if (first) { batches.push({ recipe: r, inputs: first }); left = subtractStock(left, first); }
    while (batches.length < n) { const fill = autoFill(r, left, allowGolden); if (!fill) break; batches.push({ recipe: r, inputs: fill }); left = subtractStock(left, fill); }
    return batches;
  };
  const start = () => { if (!product || empty <= 0) return; ask(batchesOf(recipe, amount, inputs), amount > 1 ? `${recipe.name} ${amount}개 담기` : recipe.name); };
  const fillEmpty = () => { if (empty <= 0 || !counts[recipe.id]) return; ask(batchesOf(recipe, empty), `빈 작업대 ${empty}칸 채우기 · ${recipe.name}`); };
  const doneCount = workshop.jobs.filter(job => job.doneAt <= nowMs).length;

  const profit = product ? product.price - product.raw : 0;
  return <div className="workshop-view ws3">
    <aside className="ws3-list">
      <div className="ws3-title"><span aria-hidden="true">🏺</span><h3>가공 공방</h3></div>
      <div className="ws3-tabs" role="tablist">{([["ready", `지금 가능 ${readyCount}`], ["free", KIND_LABEL.free], ["mix", KIND_LABEL.mix], ["special", KIND_LABEL.special]] as const).map(([id, label]) =>
        <button key={id} role="tab" aria-selected={kind === id} className={kind === id ? "on" : ""} onClick={() => setKind(id)}>{label}</button>)}</div>
      <div className="ws3-search"><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="🔍 레시피 검색" aria-label="레시피 검색" />
        <label title="황금 작물은 가치가 3배라 기본으로 빼 둬요"><input type="checkbox" checked={allowGolden} onChange={e => { setAllowGolden(e.target.checked); setPicked(null); }} /> 🌟 황금</label></div>
      <div className="ws3-cards">{shown.length === 0 ? <p className="empty">{kind === "ready" ? "지금 창고로 만들 수 있는 가공이 없어요. 작물을 창고에 보관해 주세요." : "조건에 맞는 레시피가 없어요."}</p> : shown.map(r => {
        const n = counts[r.id], prev = previews[r.id];
        return <button key={r.id} className={`ws3-card ${recipe.id === r.id ? "on" : ""} ${n > 0 ? "ready" : ""}`} onClick={() => select(r)} aria-pressed={recipe.id === r.id}>
          <ItemArt kind="goods" id={r.id} icon={r.icon} size={56} className="ws3-card-art" />
          <span className="ws3-card-body"><b>{r.name}{n > 0 && <i className="ws3-badge">{n >= 99 ? "99+" : n}번 가능</i>}</b><small>{r.note}</small>
            <span className="ws3-card-meta"><em>⏱ {r.minutes}분</em><em>🪙 {prev ? won(prev.price) : `가치 +${Math.round((r.mult - 1) * 100)}%`}</em></span>
            {r.inputs && <span className="ws3-card-inputs">{r.inputs.map(input => { const crop = CROPS.find(c => c.id === input.cropId)!, have = stock.filter(s => s.cropId === input.cropId && (allowGolden || !s.golden)).reduce((t, s) => t + s.n, 0);
              return <i key={input.cropId} className={have >= input.count ? "ok" : ""}>{crop.icon} {have}/{input.count}</i>; })}</span>}</span>
        </button>; })}</div>
    </aside>

    <section className="ws3-detail">
      <div className="ws3-head">
        <ItemArt kind="goods" id={recipe.id} icon={recipe.icon} size={84} className="ws3-head-art" />
        <div><h4>{recipe.name} <i className={`ws3-kind ${recipe.kind}`}>{KIND_ICON[recipe.kind]} {KIND_LABEL[recipe.kind]}</i></h4><p>{recipe.note}{recipe.tags ? ` · ${recipe.tags.map(t => TAG_NAME[t]).join("·")}` : ""}</p>
          <span className="ws3-head-meta"><em>⏱ {recipe.minutes}분</em><em>🪙 재료 가치 +{Math.round((recipe.mult - 1) * 100)}%</em>{counts[recipe.id] > 0 && <em>지금 {counts[recipe.id] >= 99 ? "99+" : counts[recipe.id]}번 가능</em>}</span></div>
      </div>
      <div className="ws3-flow">
        <div className="ws3-inputs">{recipe.inputs
          ? recipe.inputs.map((input, k) => { const crop = CROPS.find(c => c.id === input.cropId)!, have = stock.filter(s => s.cropId === input.cropId && (allowGolden || !s.golden)).reduce((t, s) => t + s.n, 0);
            return <span key={input.cropId} className="ws3-slot-wrap">{k > 0 && <i className="ws3-plus">＋</i>}<span className={`ws3-slot ${have >= input.count ? "ok" : "lack"}`}><ItemArt kind="crops" id={crop.id} icon={crop.icon} size={54} /><b>{crop.name}</b><small>{have} / {input.count}</small></span></span>; })
          : inputs.length ? inputs.map((input, k) => { const crop = CROPS.find(c => c.id === input.cropId)!;
            return <span key={stockKey(input)} className="ws3-slot-wrap">{k > 0 && <i className="ws3-plus">＋</i>}<span className="ws3-slot ok"><ItemArt kind="crops" id={crop.id} icon={crop.icon} size={54} /><b>{crop.name}{QUALITIES[input.quality].stars}{input.golden ? "🌟" : ""}</b><small>×{input.count}</small></span></span>; })
          : <span className="ws3-slot lack wide"><b>재료가 모자라요</b><small>{recipe.note}</small></span>}</div>
        <i className="ws3-arrow" aria-hidden="true">➜</i>
        <div className="ws3-output">
          <ItemArt kind="goods" id={recipe.id} icon={product?.icon ?? recipe.icon} size={96} className="ws3-out-art" />
          <b>{product?.name ?? recipe.name}</b>
          <div className="ws3-qty" role="group" aria-label="만들 개수"><button onClick={() => setQty(Math.max(1, amount - 1))} disabled={amount <= 1}>−</button><span>{amount}</span><button onClick={() => setQty(Math.min(maxQty, amount + 1))} disabled={amount >= maxQty}>＋</button><button className="max" onClick={() => setQty(maxQty)} disabled={amount >= maxQty}>최대</button></div>
          <button className="ws3-start" disabled={!product || empty <= 0} onClick={start}>{empty <= 0 ? "작업대가 가득 찼어요" : `🏺 가공 시작${amount > 1 ? ` ×${amount}` : ""}`}</button>
        </div>
      </div>
      {recipe.kind !== "special" && <div className="ws3-pick">
        <button className="ws3-pick-toggle" onClick={() => setEditing(on => !on)} aria-expanded={editing}>{editing ? "재료 고르기 닫기" : "🥕 재료 직접 고르기"}</button>
        {!editing && <small>기본은 낮은 품질·싼 작물부터 자동으로 채워요.</small>}
        {editing && <ProcEditor recipe={recipe} stock={stock} allowGolden={allowGolden} picked={sel} setPicked={setPicked} onAuto={() => setPicked(auto(recipe))} />}
      </div>}
      {!product && problem && <p className="ws3-problem">{problem}</p>}
    </section>

    <aside className="ws3-profit">
      <div className="ws3-title small"><span aria-hidden="true">📈</span><h4>수익 예상</h4></div>
      {product ? <>
        <ul>
          <li><span>🧺 재료 시장 기준가</span><b>{won(product.raw)}</b></li>
          <li><span>🏷️ 예상 판매가</span><b>{won(product.price)}</b></li>
          <li className="good"><span>💰 순이익</span><b>{won(profit)}</b></li>
          <li className="good"><span>📊 이익률</span><b>{product.raw ? Math.round((profit / product.raw) * 100) : 0}%</b></li>
          <li><span>⏱ 제작 시간</span><b>{recipe.minutes}분</b></li>
          <li><span>🪙 시간당 수익</span><b>{won(profit / recipe.minutes * 60)}</b></li>
        </ul>
        <div className="ws3-callout">그냥 팔기보다<b>+{won(profit * amount)}</b>{amount > 1 && <small>{amount}개 기준</small>}</div>
      </> : <p className="hint">재료가 갖춰지면 예상 수익을 보여 줘요.</p>}
      <p className="hint">재료 가치는 시세·포화와 무관한 시장 기준가예요. 담글 때 완성품 값이 확정돼요.</p>
    </aside>

    <section className="ws3-bench">
      <div className="ws3-bench-head">
        <h4>🛠️ 작업대 <small>({workshop.slots}개)</small></h4>
        <span className="ws3-running">⚙️ 가동 중 {workshop.jobs.length} / {workshop.slots}</span>
        <button className="ws3-collect" disabled={!doneCount} onClick={onCollectAll}>📦 완료품 일괄 수령{doneCount ? ` (${doneCount})` : ""}</button>
        <button className="ws3-fill" disabled={empty <= 0 || !counts[recipe.id]} onClick={fillEmpty} title={`빈 작업대를 '${recipe.name}'로 채워요`}>🔄 빈 작업대 채우기 · {recipe.name}</button>
      </div>
      <div className="ws3-slots">{Array.from({ length: workshop.slots }).map((_, i) => { const job = workshop.jobs[i], info = job && jobInfo(job);
        if (!job || !info) return <div key={i} className="ws3-bench-slot empty" style={equipmentStyle("pickle")}><i className="ws3-no">{i + 1}</i><small>대기 중</small><button onClick={() => setKind("ready")}>＋ 레시피 선택</button></div>;
        const left = Math.max(0, Math.ceil((job.doneAt - nowMs) / 1000)), totalSec = info.minutes * 60, done = left <= 0, k = Math.min(1, 1 - left / totalSec);
        return <div key={i} className={`ws3-bench-slot ${done ? "done" : ""}`} style={equipmentStyle(job.recipeId)}>
          <i className="ws3-no">{i + 1}</i>
          <span className="ws3-ring" style={{ "--k": `${k * 360}deg` } as CSSProperties}><ItemArt kind="goods" id={job.recipeId} icon={info.icon} size={30} /></span>
          <b>{info.name}</b>
          {done ? <button onClick={() => onCollect(i)}>수령하기 ✨</button> : <small>{formatClock(left)} · 가공 중</small>}
        </div>; })}
        {workshop.slots < maxSlots && <button className="ws3-bench-slot add" onClick={onBuySlot}><span>＋</span><b>작업대 확장</b><small>{workshop.slots} / {maxSlots} · {won(slotPrice)}</small></button>}
      </div>
      {workshop.jobs.length > 0 && <div className="ws3-strip" aria-label="진행 현황">{workshop.jobs.map((job, i) => { const info = jobInfo(job), left = Math.max(0, Math.ceil((job.doneAt - nowMs) / 1000));
        return <span key={i} className={left <= 0 ? "done" : ""}><ItemArt kind="goods" id={job.recipeId} icon={info?.icon ?? "🏺"} size={26} /><small>{left <= 0 ? "완료" : formatClock(left)}</small></span>; })}</div>}
    </section>

    {confirm && <div className="proc-confirm" role="dialog" aria-label="가공 확인">
      <b>{confirm.label}</b>
      <span>작업대 {confirm.batches.length}칸 · 재료 총 {confirm.batches.reduce((t, b) => t + b.inputs.reduce((s, i) => s + i.count, 0), 0)}개 · 예상 완성품 {confirm.batches.reduce((t, b) => t + processResult(b.recipe, b.inputs).price, 0).toLocaleString()}원</span>
      {confirm.golden && <span className="warn">🌟 황금 작물이 들어가요. 황금 작물은 시장에서 3배 값이에요. 정말 가공할까요?</span>}
      <div><button onClick={() => setConfirm(null)}>취소</button><button className="go" onClick={() => { onStart(confirm.batches); setConfirm(null); setQty(1); setPicked(null); }}>담그기</button></div>
    </div>}

    <div className="goods-list ws3-goods"><b className="tool-shop-sub">🎁 만든 가공품 <small>(시세·포화 없는 고정가)</small></b>{Object.keys(goods).filter(k => goods[k] > 0).length === 0 ? <p className="empty">아직 만든 가공품이 없어요.</p> :
      Object.keys(goods).filter(k => goods[k] > 0).map(k => ({ k, ...goodsInfo(k) })).sort((a, b) => a.name.localeCompare(b.name) || a.price - b.price).map(g => <div key={g.k} className="goods-item"><ItemArt kind="goods" id={g.k.split("~")[0]} icon={g.icon} size={30} /><b>{g.name} ×{goods[g.k]}</b><small>개당 {g.price.toLocaleString()}원</small><button onClick={() => onSell(g.k, 1)}>1개</button><button className="all" onClick={() => onSell(g.k, goods[g.k])}>전부 {(g.price * goods[g.k]).toLocaleString()}원</button></div>)}</div>
  </div>;
}

function ProcEditor({ recipe, stock, allowGolden, picked, setPicked, onAuto }: {
  recipe: ProcRecipe; stock: Stock[]; allowGolden: boolean; picked: Record<string, number>; setPicked: (p: Record<string, number>) => void; onAuto: () => void;
}) {
  const rows = stock.filter(s => (allowGolden || !s.golden)).filter(s => { const crop = CROPS.find(c => c.id === s.cropId); return !!crop && cropFits(recipe, crop); })
    .sort((a, b) => a.cropId.localeCompare(b.cropId) || a.quality - b.quality || Number(a.golden) - Number(b.golden));
  const need = recipe.count ?? recipe.inputs?.reduce((t, i) => t + i.count, 0) ?? 0, chosen = Object.values(picked).reduce((t, n) => t + n, 0);
  const bump = (s: Stock, d: number) => { const k = stockKey(s), v = Math.max(0, Math.min(s.n, (picked[k] ?? 0) + d)); if (d > 0 && chosen >= need) return; setPicked({ ...picked, [k]: v }); };
  return <div className="proc-editor">
    <div className="proc-count">재료 {chosen}/{need} <button onClick={onAuto}>자동으로 채우기</button></div>
    <div className="proc-chips">{rows.map(s => { const crop = CROPS.find(c => c.id === s.cropId)!, k = stockKey(s), n = picked[k] ?? 0;
      return <span key={k} className={`proc-chip ${n > 0 ? "on" : ""} ${s.golden ? "golden" : ""}`}><button aria-label="빼기" onClick={() => bump(s, -1)} disabled={n <= 0}>−</button><b>{crop.icon} {crop.name}{QUALITIES[s.quality].stars}{s.golden ? "🌟" : ""} ×{n}</b><small>/{s.n}</small><button aria-label="넣기" onClick={() => bump(s, 1)} disabled={n >= s.n || chosen >= need}>＋</button></span>; })}</div>
  </div>;
}
