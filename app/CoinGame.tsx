"use client";

import { useState } from "react";
import { COIN_MIN_BUY, coinBoard, type CoinHoldings } from "./coin";

const pct = (value: number) => `${value >= 0 ? "+" : ""}${Math.round(value * 100)}%`;
const clock = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const spark = (history: number[], w: number, h: number) => {
  const max = Math.max(...history, 1), n = Math.max(1, history.length - 1);
  return history.map((p, i) => `${(i / n) * w},${h - 2 - (p / max) * (h - 4)}`).join(" ");
};

/** 도박장 코인 거래소: 코인 10종 시세판 + 고른 코인 매수·매도. */
export default function CoinGame({ nowMs, money, holdings, onBuy, onSell }: {
  nowMs: number; money: number; holdings: CoinHoldings;
  onBuy: (key: string, amount: number) => void; onSell: (key: string, fraction: number) => void;
}) {
  const [picked, setPicked] = useState(0);
  const [amount, setAmount] = useState(1000);
  const { quotes, nextAt } = coinBoard(nowMs);
  const q = quotes[picked], mine = holdings[q.key];
  const value = mine ? Math.floor(mine.units * q.price) : 0, profit = mine ? value / mine.spent - 1 : 0;
  const buy = Math.min(money, Math.max(COIN_MIN_BUY, Math.floor(amount) || 0));
  const news = quotes.filter(item => item.ended);
  const total = quotes.reduce((sum, item) => sum + (holdings[item.key] ? Math.floor(holdings[item.key].units * item.price) : 0), 0);

  return <div className="coin-game">
    <div className="coin-top"><b>🪙 월루 코인 거래소</b><span>내 코인 평가 <b>{total.toLocaleString()}원</b> · 다음 시세 {clock(nextAt - nowMs)}</span></div>
    {news.length > 0 && <div className="coin-newsline">{news.map(item => <span key={item.key} className={item.ended!.delisted ? "bad" : "good"}>{item.ended!.delisted ? "💀" : "🎉"} {item.ended!.name} {item.ended!.delisted ? "상장 폐지" : "만기 정산"}</span>)}</div>}
    <ul className="coin-board" role="listbox" aria-label="코인 시세판">{quotes.map((item, slot) => { const own = holdings[item.key];
      return <li key={item.key} role="option" aria-selected={slot === picked} className={`${slot === picked ? "on" : ""} ${item.step === 0 ? "new" : ""}`} onClick={() => setPicked(slot)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") setPicked(slot); }} tabIndex={0}>
        <span className="coin-icon">{item.coin.icon}</span>
        <span className="coin-name"><b>{item.coin.name}</b>{item.step === 0 ? <small className="new-badge">신규 상장</small> : own ? <small>보유 {Math.floor(own.units * item.price).toLocaleString()}원</small> : null}</span>
        <svg className="coin-spark" viewBox="0 0 60 22" aria-hidden="true"><polyline points={spark(item.history, 60, 22)} /></svg>
        <span className="coin-quote"><b>{item.price.toLocaleString()}원</b><em className={item.change > 0 ? "up" : item.change < 0 ? "down" : ""}>{item.step === 0 ? "—" : `${item.change > 0 ? "▲" : "▼"} ${pct(item.change)}`}</em></span>
      </li>; })}</ul>
    <div className="coin-detail">
      <div className="coin-head"><span className="coin-icon">{q.coin.icon}</span><div><b>{q.coin.name}</b><small>상장 후 {q.step}번 갱신</small></div><div className="coin-price"><strong>{q.price.toLocaleString()}원</strong>{q.step > 0 && <em className={q.change >= 0 ? "up" : "down"}>{q.change >= 0 ? "▲" : "▼"} {pct(q.change)}</em>}</div></div>
      <svg className="coin-chart" viewBox="0 0 100 40" preserveAspectRatio="none" aria-label={`${q.coin.name} 시세 흐름`}><polyline points={spark(q.history, 100, 40)} /></svg>
      <div className="coin-wallet">{mine ? <><span>보유 <b>{mine.units.toLocaleString(undefined, { maximumFractionDigits: 3 })}개</b></span><span>평가 <b>{value.toLocaleString()}원</b></span><span className={profit >= 0 ? "up" : "down"}>{pct(profit)} ({value - mine.spent >= 0 ? "+" : ""}{(value - mine.spent).toLocaleString()}원)</span></> : <span>이 코인은 아직 갖고 있지 않아요.</span>}</div>
      <div className="coin-trade">
        <label>매수 금액<input type="number" min={COIN_MIN_BUY} step={100} value={amount} onChange={event => setAmount(Number(event.target.value))} /></label>
        <div className="coin-quick">{[100, 1000, 10000].map(v => <button key={v} onClick={() => setAmount(v)}>{v.toLocaleString()}</button>)}<button onClick={() => setAmount(money)}>전부</button></div>
        <button className="save-button" onClick={() => onBuy(q.key, buy)} disabled={money < COIN_MIN_BUY || q.price <= 0}>🪙 {q.coin.name} {buy.toLocaleString()}원어치 사기</button>
        <div className="coin-sell">{[0.25, 0.5, 1].map(f => <button key={f} className={f === 1 ? "all" : ""} onClick={() => onSell(q.key, f)} disabled={!mine}>{f === 1 ? "전부 팔기" : `${f * 100}% 팔기`}</button>)}</div>
      </div>
    </div>
  </div>;
}
