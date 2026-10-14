"use client";

import { useState } from "react";

/**
 * 수량을 정해서 사는 작은 구매 상자: [−] [수량] [+] [구매 N원].
 * unitPrice는 1개 값. 살 수 있는 최대 수량(돈 기준)을 넘지 않게 맞춘다.
 */
export function QtyBuy({ unitPrice, money, step = 1, initial = 1, label, onBuy }: { unitPrice: number; money: number; step?: number; initial?: number; label: string; onBuy: (count: number) => void }) {
  const [count, setCount] = useState(initial);
  const max = Math.max(0, Math.floor(money / unitPrice));
  const clamp = (value: number) => Math.max(1, Math.min(999, Math.round(value) || 1));
  const total = Math.round(unitPrice * count);
  return <div className="qty-buy" role="group" aria-label={`${label} 수량 정해서 사기`}>
    <button type="button" onClick={() => setCount(value => clamp(value - step))} aria-label="수량 줄이기" disabled={count <= 1}>−</button>
    <input type="number" inputMode="numeric" min={1} max={999} value={count} onChange={event => setCount(clamp(Number(event.target.value)))} aria-label={`${label} 수량`} />
    <button type="button" onClick={() => setCount(value => clamp(value + step))} aria-label="수량 늘리기">＋</button>
    <button type="button" className="qty-max" onClick={() => setCount(clamp(max))} disabled={max < 1} title="가진 돈으로 살 수 있는 만큼">최대</button>
    <button type="button" className="qty-go" onClick={() => onBuy(count)} disabled={money < total}>{total.toLocaleString()}원</button>
  </div>;
}
