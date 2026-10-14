"use client";

import { DISHES, DISH_GRADES, cropIcon, cropName, dishEffectText, type Dish } from "./kitchen";

/** 주방 화면(텃밭 오른쪽 패널의 🍳 주방 탭): 사냥 준비물인 요리를 만들고 🎒 사냥 가방을 보여 준다. */
export function KitchenPanel({ cropHave, fishHave, dishStock, onCook }: {
  cropHave: (cropId: string) => number;
  fishHave: number;
  dishStock: Record<string, number>;
  onCook: (dish: Dish) => void;
}) {
  const bag = Object.entries(dishStock).filter(([, count]) => count > 0).map(([sub, count]) => { const [id, grade] = sub.split("|"); return { dish: DISHES.find(d => d.id === id), grade: Number(grade) || 0, count }; })
    .filter(entry => entry.dish).sort((a, b) => b.grade - a.grade);
  return <div className="kitchen-view">
    <div className="panel-heading"><div><span className="eyebrow">KITCHEN · 사냥 준비</span><h3>주방</h3></div></div>
    <p className="hint"><b>요리는 사냥 준비물</b>이에요(팔 수 없고, 농사에는 효과가 없어요). 사냥에서 먹으면 공격·회복·추적·회피가 올라가요. 요리할 때 <b>타이밍 미니게임</b>을 잘 맞출수록 <b>맛있음★·일품★★이 나올 확률</b>이 올라가요(확정은 아니에요). 작물을 비싸게 팔고 싶다면 🏺 가공을 쓰세요.</p>
    <div className="recipe-list">{DISHES.map(dish => { const ok = dish.ingredients.every(ing => (ing.kind === "crop" ? cropHave(ing.id) : fishHave) >= ing.count);
      return <div key={dish.id} className={`recipe dish ${ok ? "ready" : ""}`}>
        <div className="recipe-head"><span className="recipe-icon">{dish.icon}</span><span><b>{dish.name}</b><small>{dish.note} · 보통 {dishEffectText(dish, 0)} → 일품 {dishEffectText(dish, 2)}</small></span></div>
        <ul className="recipe-inputs">{dish.ingredients.map((ing, i) => { const have = ing.kind === "crop" ? cropHave(ing.id) : fishHave;
          return <li key={i} className={have >= ing.count ? "ok" : ""}>{ing.kind === "crop" ? `${cropIcon(ing.id)} ${cropName(ing.id)}` : "🐟 아무 물고기"} <b>{Math.min(have, ing.count)}/{ing.count}</b></li>; })}</ul>
        <button onClick={() => onCook(dish)} disabled={!ok}>{ok ? "🍳 요리하기" : "재료 모으는 중"}</button>
      </div>; })}</div>
    <div className="goods-list"><b className="tool-shop-sub">🎒 사냥 가방 <small>(사냥 업데이트에서 먹을 수 있어요)</small></b>{bag.length === 0 ? <p className="empty">아직 만든 요리가 없어요.</p> : bag.map(({ dish, grade, count }) => <div key={`${dish!.id}-${grade}`} className={`dish-item grade-${grade}`}>
      <span className="dish-icon">{dish!.icon}</span>
      <span className="dish-info"><b>{dish!.name} {DISH_GRADES[grade].stars}<em> {DISH_GRADES[grade].name} ×{count}</em></b><small>사냥에서 먹으면 {dishEffectText(dish!, grade)}</small></span>
    </div>)}</div>
  </div>;
}
