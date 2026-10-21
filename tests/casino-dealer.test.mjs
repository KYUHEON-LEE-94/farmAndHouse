import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { buildSync } from "esbuild";

const root = new URL("..", import.meta.url).pathname;
const { outputFiles } = buildSync({
  stdin: {
    contents: `export * from "./app/casino"; export * from "./app/casinoPresentation";
      export { CasinoDealer } from "./app/CasinoDealer";
      export { createElement } from "react"; export { renderToStaticMarkup } from "react-dom/server";`,
    resolveDir: root, loader: "tsx",
  },
  bundle: true, platform: "node", format: "cjs", write: false,
  external: ["react", "react/jsx-runtime", "react-dom/server"], loader: { ".css": "empty" },
});
const mod = { exports: {} };
new Function("require", "module", "exports", outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
const C = mod.exports;
const render = props => C.renderToStaticMarkup(C.createElement(C.CasinoDealer, {
  reaction: null, idleLine: "대기 중", streak: 0, ...props,
}));

test("대사 치환 후 직전 대사를 제외하고, 한 문장뿐인 목록도 안전하게 처리한다", () => {
  assert.equal(C.dealerLine(["{n}점!", "메롱~"], { n: 22 }, "22점!", () => 0), "메롱~");
  assert.equal(C.dealerLine(["동점"], {}, "동점", () => 0), "동점");
  assert.ok(C.dealerLine([]));
  for (const lines of [C.STREAK_TAUNTS, C.PARITY_TAUNTS, C.NEAR_MISS_TAUNTS, C.BLACKJACK_TAUNTS.bust]) {
    for (let i = 0; i < lines.length; i++) {
      assert.doesNotMatch(C.dealerLine(lines, { n: 6, result: "홀", pick: "짝", x: 150, icon: "7️⃣" }, "", () => i / lines.length), /\{\w+\}/);
    }
  }
});

test("아슬아슬한 실패는 메롱, 승리·잭팟은 삐짐, 무승부는 중립이며 연패 문구가 성공에 섞이지 않는다", () => {
  assert.equal(C.dealerPresentation("near", -6).mood, "tease");
  assert.match(C.dealerPresentation("lose", -6).aside, /6연패/);
  assert.equal(C.dealerPresentation("win", 1).mood, "sulk");
  assert.equal(C.dealerPresentation("jackpot", 1).mood, "sulk");
  assert.doesNotMatch(C.dealerPresentation("win", -6).aside, /연패/);
  assert.equal(C.dealerPresentation("push", 0).sign, "");
});

test("무승부는 이익처럼 표시하지 않고 반환한 판돈을 읽어 준다", () => {
  const html = render({ reaction: { id: 1, kind: "push", amount: 500, line: C.BLACKJACK_TAUNTS.push[0] } });
  assert.match(html, /무승부/);
  assert.match(html, /돌려받은 판돈/);
  assert.match(html, />500원</);
  assert.doesNotMatch(html, /\+500원|플레이어 승/);
  assert.match(html, /aria-live="polite"/);
});

test("다음 판 진행 중에는 직전 패배 대사·금액·메롱이 남지 않는다", () => {
  const html = render({ busy: true, tension: true, reaction: { id: 2, kind: "near", amount: 500, line: "직전 대사" } });
  assert.doesNotMatch(html, /직전 대사|−500원|메~롱/);
  assert.match(html, /둘까지는 맞았네/);
});

test("당첨 지급액과 손실을 구분하고 큰 금액도 정산 라벨을 유지한다", () => {
  const win = render({ reaction: { id: 3, kind: "jackpot", amount: 150000000, line: "금고 열어!" } });
  assert.match(win, /판돈 포함/);
  assert.match(win, /\+150,000,000원/);
  const loss = render({ streak: -3, reaction: { id: 4, kind: "lose", amount: 500, line: "도토리 적립!" } });
  assert.match(loss, /잃은 금액/);
  assert.match(loss, /−500원/);
  assert.match(loss, /3연패/);
});
