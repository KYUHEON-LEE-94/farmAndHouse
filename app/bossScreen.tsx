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
function ExcelScreen() {
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

export type BossMode = "office" | "dev" | "design";
export const BOSS_MODES: { id: BossMode; name: string; icon: string; title: string }[] = [
  { id: "office", name: "사무직", icon: "📊", title: "3분기_실적보고_최종_진짜최종.xlsx - Excel" },
  { id: "dev", name: "개발자", icon: "💻", title: "paymentService.ts — wolru-backend — Visual Studio Code" },
  { id: "design", name: "디자이너", icon: "🎨", title: "Q4 캠페인 배너_v12_final – Figma" },
];

const CODE = [
  ["k:import", " { ", "t:Injectable", " } ", "k:from", " ", "s:'@nestjs/common'", ";"],
  ["k:import", " { ", "t:PaymentRepository", " } ", "k:from", " ", "s:'./payment.repository'", ";"],
  [],
  ["d:@Injectable", "()"],
  ["k:export class", " ", "t:PaymentService", " {"],
  ["  ", "k:constructor", "(", "k:private readonly", " repo: ", "t:PaymentRepository", ") {}"],
  [],
  ["  ", "c:/** 결제 승인 후 정산 대기열에 등록한다. */"],
  ["  ", "k:async", " ", "f:approve", "(orderId: ", "t:string", ", amount: ", "t:number", "): ", "t:Promise", "<", "t:Receipt", "> {"],
  ["    ", "k:if", " (amount <= ", "n:0", ") ", "k:throw new", " ", "t:BadRequestException", "(", "s:'INVALID_AMOUNT'", ");"],
  ["    ", "k:const", " order = ", "k:await", " ", "k:this", ".repo.", "f:findOrder", "(orderId);"],
  ["    ", "k:const", " fee = ", "t:Math", ".", "f:round", "(amount * ", "n:0.033", ");"],
  ["    ", "k:const", " receipt = ", "k:await", " ", "k:this", ".repo.", "f:saveReceipt", "({ order, amount, fee });"],
  ["    ", "k:await", " ", "k:this", ".", "f:enqueueSettlement", "(receipt.id);"],
  ["    ", "k:return", " receipt;"],
  ["  }"],
  [],
  ["  ", "k:private async", " ", "f:enqueueSettlement", "(receiptId: ", "t:string", ") {"],
  ["    ", "c:// TODO: 재시도 정책 팀장님 리뷰 받기"],
  ["    ", "k:return", " ", "k:this", ".repo.", "f:pushQueue", "(", "s:'settlement'", ", receiptId);"],
  ["  }"],
  ["}"],
];

const TERMINAL = ["$ npm run test -- payment", "", " PASS  src/payment/payment.spec.ts (3.21 s)", "  PaymentService", "    ✓ approves a valid order (41 ms)", "    ✓ rejects zero amount (6 ms)", "    ✓ enqueues settlement (12 ms)", "", "Tests:       3 passed, 3 total", "Time:        3.84 s", "$ █"];

function DevScreen() {
  const [line, setLine] = useState(12);
  return (
    <div className="boss-screen dev" role="presentation">
      <div className="vs-title"><span>파일 편집 선택 보기 이동 실행 터미널 도움말</span><b>paymentService.ts — wolru-backend</b><i>— ☐ ✕</i></div>
      <div className="vs-main">
        <div className="vs-activity">{["📄", "🔍", "🔀", "🐞", "🧩"].map(icon => <span key={icon}>{icon}</span>)}</div>
        <div className="vs-explorer"><b>탐색기</b>{["▾ src", "  ▾ payment", "    payment.module.ts", "    payment.repository.ts", "    paymentService.ts", "    payment.spec.ts", "  ▸ order", "  ▸ settlement", "  main.ts", "package.json", "tsconfig.json"].map(name => <span key={name} className={name.includes("paymentService") ? "on" : ""}>{name}</span>)}</div>
        <div className="vs-editor">
          <div className="vs-tabs"><span className="on">paymentService.ts</span><span>payment.spec.ts</span><span>README.md</span></div>
          <div className="vs-code">{CODE.map((tokens, i) => <button type="button" tabIndex={-1} key={i} className={line === i ? "cur" : ""} onClick={() => setLine(i)}><em>{i + 1}</em>{tokens.map((token, k) => { const [kind, text] = token.includes(":") && /^[ktsdcfn]:/.test(token) ? [token[0], token.slice(2)] : ["", token]; return <span key={k} className={`tk-${kind}`}>{text}</span>; })}</button>)}</div>
          <div className="vs-terminal"><div className="vs-term-tabs"><span className="on">터미널</span><span>문제</span><span>출력</span></div><pre>{TERMINAL.join(String.fromCharCode(10))}</pre></div>
        </div>
      </div>
      <div className="vs-status"><span>⎇ feature/settlement-retry</span><span>⊗ 0 ⚠ 2</span><span>줄 {line + 1}, 열 18</span><span>UTF-8</span><span>TypeScript</span></div>
    </div>
  );
}

const LAYERS = ["▾ Banner / 1200×628", "  ▾ Header", "    Logo", "    Nav", "  ▾ Hero", "    Title", "    Subtitle", "    CTA Button", "    Illustration", "  Background"];

function DesignScreen() {
  const [selected, setSelected] = useState(7);
  return (
    <div className="boss-screen design" role="presentation">
      <div className="fg-top"><span className="fg-logo">◆</span>{["▭", "◯", "✎", "T", "✋", "💬"].map(tool => <span key={tool} className="fg-tool">{tool}</span>)}<b>Q4 캠페인 배너_v12_final</b><span className="fg-users"><i>김</i><i>박</i><i>이</i></span><span className="fg-share">공유</span><span>100%</span></div>
      <div className="fg-main">
        <div className="fg-layers"><b>레이어</b>{LAYERS.map((name, i) => <button type="button" tabIndex={-1} key={name} className={selected === i ? "on" : ""} onClick={() => setSelected(i)}>{name.trimStart().startsWith("▾") ? "▣" : "▭"} {name}</button>)}</div>
        <div className="fg-canvas">
          <div className="fg-frame-label">Banner / 1200×628</div>
          <div className="fg-artboard">
            <div className="fg-nav"><b>WOLRU</b><span>제품 · 요금 · 고객사례</span></div>
            <div className="fg-hero"><h4>일하는 시간,<br />더 똑똑하게</h4><p>팀의 생산성을 2배로 올리는 협업 툴</p><span className={`fg-cta ${selected === 7 ? "sel" : ""}`}>무료로 시작하기</span></div>
            <div className="fg-illust"><i /><i /><i /></div>
          </div>
        </div>
        <div className="fg-props"><b>디자인</b><span>프레임 · Auto layout</span><div className="fg-grid"><span>X 812</span><span>Y 436</span><span>W 220</span><span>H 56</span></div><b>채우기</b><span className="fg-fill"><i />#5A4FA8 · 100%</span><b>테두리 반경</b><span>12</span><b>효과</b><span>Drop shadow 0 8 24 #00000026</span><b>내보내기</b><span>PNG · 2x</span></div>
      </div>
    </div>
  );
}

/** 보스 키(ESC) 화면: 직군에 맞는 가짜 업무 화면. */
export default function BossScreen({ mode }: { mode: BossMode }) {
  return mode === "dev" ? <DevScreen /> : mode === "design" ? <DesignScreen /> : <ExcelScreen />;
}
