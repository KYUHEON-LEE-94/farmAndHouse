"use client";

import { useState } from "react";

const COLUMNS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];
const HEADER = ["구분", "1월", "2월", "3월", "1분기", "4월", "5월", "6월", "2분기", "증감률", "비고"];
const ROWS = ["국내 매출", "해외 매출", "온라인", "오프라인", "B2B", "제품 A", "제품 B", "제품 C", "원가", "판관비", "인건비", "마케팅비", "영업이익", "영업이익률", "순이익"];

/** 행·열마다 항상 같은 그럴듯한 숫자(새로고침해도 표가 바뀌지 않게). */
function cellValue(row: number, col: number) {
  const seed = Math.sin((row + 1) * 12.9898 + (col + 1) * 78.233) * 43758.5453;
  return Math.round(800 + (seed - Math.floor(seed)) * 4200 + row * 37);
}

/**
 * 보스 키(ESC) 화면: 엑셀처럼 보이는 가짜 업무 화면.
 * 셀을 누르면 선택된 것처럼 보이고, 수식 입력줄에 그 셀 값이 나온다.
 */
export default function BossScreen() {
  const [selected, setSelected] = useState<[number, number]>([12, 4]);
  const value = (row: number, col: number) => {
    if (col === 0) return ROWS[row];
    if (col === 4 || col === 8) return (cellValue(row, col - 1) + cellValue(row, col - 2) + cellValue(row, col - 3)).toLocaleString();
    if (col === 9) return `${((cellValue(row, 7) / cellValue(row, 3) - 1) * 100).toFixed(1)}%`;
    if (col === 10) return row === 12 ? "목표 달성" : row === 11 ? "검토 필요" : "";
    return cellValue(row, col).toLocaleString();
  };
  const [sr, sc] = selected;
  const formula = sc === 4 ? `=SUM(B${sr + 2}:D${sr + 2})` : sc === 8 ? `=SUM(F${sr + 2}:H${sr + 2})` : sc === 9 ? `=H${sr + 2}/D${sr + 2}-1` : value(sr, sc);

  return (
    <div className="boss-screen" role="presentation">
      <div className="xl-title"><span className="xl-logo">X</span><b>3분기_실적보고_최종_진짜최종.xlsx</b><span>- Excel</span><i>— ☐ ✕</i></div>
      <div className="xl-menu">{["파일", "홈", "삽입", "페이지 레이아웃", "수식", "데이터", "검토", "보기", "도움말"].map((menu, i) => <span key={menu} className={i === 1 ? "on" : ""}>{menu}</span>)}</div>
      <div className="xl-ribbon">
        <div><b>📋</b><small>붙여넣기</small></div><div className="xl-font"><span>맑은 고딕</span><span>11</span><b>가</b><i>가</i><u>가</u></div>
        <div><b>≡</b><small>맞춤</small></div><div><b>%</b><small>표시 형식</small></div><div><b>▦</b><small>조건부 서식</small></div><div><b>Σ</b><small>자동 합계</small></div><div><b>⇅</b><small>정렬 및 필터</small></div>
      </div>
      <div className="xl-formula"><span className="xl-name">{COLUMNS[sc]}{sr + 2}</span><i>fx</i><span>{formula}</span></div>
      <div className="xl-grid" style={{ gridTemplateColumns: `40px 120px repeat(${COLUMNS.length - 1}, 1fr)` }}>
        <span className="xl-corner" />{COLUMNS.map(col => <span key={col} className="xl-col">{col}</span>)}
        <span className="xl-row">1</span>{HEADER.map(text => <span key={text} className="xl-head">{text}</span>)}
        {ROWS.map((_, row) => [<span key={`r${row}`} className="xl-row">{row + 2}</span>, ...COLUMNS.map((_, col) => <button type="button" tabIndex={-1} key={`${row}-${col}`} className={`xl-cell ${col === 0 ? "label" : ""} ${row === 12 || row === 14 ? "total" : ""} ${sr === row && sc === col ? "sel" : ""}`} onClick={() => setSelected([row, col])}>{value(row, col)}</button>)])}
        {Array.from({ length: 12 }).map((_, row) => [<span key={`e${row}`} className="xl-row">{row + ROWS.length + 2}</span>, ...COLUMNS.map((_, col) => <button type="button" tabIndex={-1} key={`e${row}-${col}`} className="xl-cell" onClick={() => setSelected([row + ROWS.length, col])} />)])}
      </div>
      <div className="xl-sheets"><span className="on">Q3 요약</span><span>월별 상세</span><span>원본 데이터</span><span>피벗</span><b>+</b></div>
      <div className="xl-status"><span>준비</span><span>평균: 2,431 · 개수: 15 · 합계: 36,465</span><span>100%</span></div>
    </div>
  );
}
