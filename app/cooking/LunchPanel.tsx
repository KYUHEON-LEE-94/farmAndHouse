"use client";
import { useState } from "react";
import { DISH_GRADES } from "../kitchen";
import { parseItemKey, type Inventory } from "../items";
import type { ConsumeOptions } from "../stock";
import { batchLimit } from "./batch";
import { ingredientName, LUNCHES, lunchOpportunityCost, lunchPlan, lunchRecipe, type LunchRecipe } from "./recipes";

const FAVORITE_KEY = "lunch-favorites";

export function LunchBag({ inventory, locks, onEat, onLock, query = "" }: { query?: string; inventory: Inventory; locks: Record<string, boolean>; onEat: (key: string) => void; onLock: (key: string) => void }) {
  const rows = Object.entries(inventory).filter(([key, n]) => n > 0 && key.startsWith("dish:") && lunchRecipe(parseItemKey(key).id)?.name.includes(query.trim()));
  return <div className="lunch-bag"><h4>🍱 도시락 가방 · 판매 불가</h4>{!rows.length && <p>아직 만든 도시락이 없어요.</p>}{rows.map(([key, n]) => {
    const ref = parseItemKey(key), dish = lunchRecipe(ref.id)!;
    return <div className="lunch-stock" key={key}><span>{dish.icon} {dish.name} · {DISH_GRADES[ref.quality]?.name} ×{n}</span><button onClick={() => onLock(key)} aria-pressed={!!locks[key]} aria-label={`${dish.name} 잠금`}>{locks[key] ? "🔒" : "🔓"}</button><button disabled={!!locks[key]} onClick={() => onEat(key)}>먹기</button></div>;
  })}</div>;
}
export default function LunchPanel({ inventory, options, unlocked, crafted, level, onStart, onEat, onLock, onExplore }: {
  inventory: Inventory; options: ConsumeOptions; unlocked: boolean; crafted: number; level: number;
  onStart: (dish: LunchRecipe, quantity: number, expectedTake: Record<string, number>) => void;
  onEat: (key: string) => void; onLock: (key: string) => void; onExplore: () => void;
}) {
  const [quantity, setQuantity] = useState(1), [onlyReady, setOnlyReady] = useState(false), [target, setTarget] = useState("all");
  const [preview, setPreview] = useState<LunchRecipe | null>(null);
  // 공방 거리 1단계: 도시락 즐겨찾기(이 기기 화면 편의 설정이라 브라우저에만 저장)
  const [favorites, setFavorites] = useState<string[]>(() => { try { const raw = typeof window !== "undefined" ? window.localStorage.getItem(FAVORITE_KEY) : null; const list = raw ? JSON.parse(raw) : []; return Array.isArray(list) ? list.filter((id: unknown): id is string => typeof id === "string") : []; } catch { return []; } });
  const toggleFavorite = (id: string) => setFavorites(list => { const next = list.includes(id) ? list.filter(entry => entry !== id) : [...list, id]; try { window.localStorage.setItem(FAVORITE_KEY, JSON.stringify(next)); } catch { /* 저장소 없음: 이번 화면에서만 유지 */ } return next; });
  const shortcuts = level >= 1;
  const n = Math.min(quantity, batchLimit(level));
  const previewPlan = preview ? lunchPlan(inventory, preview, n, options) : null;
  return <div className="lunch-panel">
    <p>생활 도시락은 하나만 먹을 수 있어요. 등급에 따라 30/40/50분, 탐험용은 최대 5/7/9판 동안 지속돼요.</p>
    {!unlocked && <p role="status">서로 다른 전투 음식 3종을 완성하면 열려요. ({crafted}/3)</p>}
    <div className="lunch-controls"><label>만들 수 있는 요리만 <input type="checkbox" checked={onlyReady} onChange={e => setOnlyReady(e.target.checked)} /></label><label>추천 콘텐츠 <select value={target} onChange={e => setTarget(e.target.value)}><option value="all">전체</option><option value="farm">농사</option><option value="fish">낚시</option><option value="explore">탐험</option></select></label><label>제작 수량 <select value={n} onChange={e => setQuantity(Number(e.target.value))}>{Array.from({ length: batchLimit(level) }, (_, i) => <option key={i} value={i + 1}>{i + 1}개</option>)}</select></label></div>
    <p className="hint">공방 거리 2단계 최대 3개 · 3단계 최대 5개. 잠금·미션 예약 재료는 쓰지 않아요.</p>
    <div className="recipe-list">{LUNCHES.filter(d => target === "all" || target === d.target).sort((a, b) => (shortcuts ? Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)) : 0)).map(dish => {
      const plan = lunchPlan(inventory, dish, n, options);
      if (onlyReady && (!unlocked || !plan.ok)) return null;
      return <div className="recipe dish" key={dish.id}><div className="recipe-head"><span className="recipe-icon">{dish.icon}</span>{shortcuts && <button className={`lunch-fav ${favorites.includes(dish.id) ? "on" : ""}`} aria-pressed={favorites.includes(dish.id)} aria-label={`${dish.name} 즐겨찾기`} onClick={() => toggleFavorite(dish.id)}>{favorites.includes(dish.id) ? "★" : "☆"}</button>}<span><b>{dish.name}</b><small>생활 도시락 · {dish.label} {dish.values.map(v => Math.round(v * 100)).join("/")}%</small></span></div>
        <ul className="recipe-inputs">{dish.ingredients.map(i => <li key={`${i.category}:${i.id}`}>{ingredientName(i.category, i.id)} ×{i.count * n} · {i.category === "crop" ? "농사" : i.category === "fish" ? "낚시" : "봄 숲길 탐험"}</li>)}</ul>
        {!plan.ok && <p>부족: {plan.missing.map(i => `${ingredientName(i.category, i.id)} ${i.count}개`).join(", ")}{shortcuts && plan.missing.some(i => i.category === "forage") && <button className="lunch-go-explore" onClick={onExplore}>🧭 봄 숲길에서 모으기</button>}</p>}
        <button disabled={!unlocked || !plan.ok} onClick={() => setPreview(dish)}>재료 확인하고 만들기</button>
      </div>;
    })}</div>
    {!shortcuts && <p className="hint">🏘️ 마을 공방 거리를 1단계로 복구하면 즐겨찾기와 부족 재료 탐험 바로가기가 열려요.</p>}
    {preview && previewPlan && <section className="lunch-preview" aria-label="도시락 제작 재료 확인"><h4>{preview.name} {n}개 제작</h4><ul>{Object.entries(previewPlan.take).map(([key, count]) => { const r = parseItemKey(key); return <li key={key}>{ingredientName(r.category, r.id)}{r.category === "crop" ? ` · 품질 ${r.quality + 1}${r.golden ? " · 황금" : ""}` : ""} ×{count}</li>; })}</ul><p>재료 활용 가치 약 {lunchOpportunityCost(previewPlan.take).toLocaleString()}원 (작물은 말랭이 비례 가치, 물고기·채집물은 원물 기준)</p><p>시작하면 재료를 사용해요. 취소해도 재료는 돌아오지 않아요.</p><button disabled={!previewPlan.ok || !unlocked} onClick={() => { onStart(preview, n, previewPlan.take); setPreview(null); }}>확인 · 조리 시작</button><button onClick={() => setPreview(null)}>돌아가기</button></section>}
    <LunchBag inventory={inventory} locks={options.locks} onEat={onEat} onLock={onLock} />
  </div>;
}
