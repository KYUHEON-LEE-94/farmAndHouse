// 서버 렌더링 결과 검사(npm test: vinext build 후 실행, Node 22.13 이상 필요).
// 2026-10-16 예전 Sites 미리보기 골격 검사를 현재 게임 화면의 핵심 요소 검사로 바꿨다(IMPLEMENTATION_GAP_AUDIT 3.3).
import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("첫 화면을 서버에서 HTML로 그린다(제목·설명·공유 메타)", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>월루농가[^<]*<\/title>/);
  assert.match(html, /<meta[^>]+name="description"[^>]+content="[^"]+"/);
  assert.match(html, /<meta[^>]+property="og:title"[^>]+content="월루농가"/);
});

test("주요 탭과 창고·미션 버튼이 있고 서버 오류 문구가 없다", async () => {
  const html = await (await render()).text();
  for (const label of ["농사", "공방", "낚시", "사냥", "토벌", "창고", "미션"]) assert.ok(html.includes(label), `missing: ${label}`);
  assert.doesNotMatch(html, /Internal Server Error|Application error|Your site is taking shape/);
});
