import { NeogulMascot } from "./NeogulMascot";
import { laughter } from "./casino";
import { dealerPresentation, type CasinoReaction } from "./casinoPresentation";
import "./casinoDealer.css";

export function CasinoDealer({ reaction, idleLine, streak, busy = false, tension = false }: {
  reaction: CasinoReaction | null;
  idleLine: string;
  streak: number;
  busy?: boolean;
  tension?: boolean;
}) {
  const fx = busy ? null : reaction;
  const look = fx ? dealerPresentation(fx.kind, streak) : null;
  const line = tension ? "둘까지는 맞았네… 잠깐, 나도 꼬리에 힘 좀 줄게."
    : busy ? "쉿, 결과 나오는 중. 내 표정 미리 읽지 마~"
    : fx?.line ?? idleLine;
  const teasing = fx?.kind === "lose" || fx?.kind === "near";

  return <section className={`neogul-booth ${fx ? `is-${fx.kind}` : busy ? "is-waiting" : "is-idle"}`} aria-label="딜러 너굴">
    <div className="neogul-booth-top">
      <span>뒷골목 터줏대감 <b>너굴</b></span>
      <span className="neogul-booth-tag">{look?.tag ?? (busy ? "표정 관리 중" : "오늘도 능청 영업")}</span>
    </div>
    <div className="neogul-booth-scene" key={fx?.id ?? (busy ? "waiting" : "idle")}>
      <div className="neogul-stage" aria-hidden="true">
        <span className="neogul-stage-halo" />
        <span className="neogul-stage-shadow" />
        <span className="neogul-actor"><NeogulMascot mood={look?.mood ?? "idle"} decorative /></span>
        {look && <span className="neogul-particles">{look.particles.map((particle, i) =>
          <i key={i} style={{ left: `${8 + i * 15}%`, animationDelay: `${0.18 + i * 0.07}s` }}>{particle}</i>)}</span>}
        {look && <strong className="neogul-stamp">{look.stamp}</strong>}
      </div>
      <div className="neogul-dialogue" role="status" aria-live="polite" aria-atomic="true">
        <span className="neogul-aside">{look?.aside ?? (tension ? "꼬리도 잠깐 멈춤" : busy ? "너굴도 숨 고르는 중" : "입꼬리부터 수상한 딜러")}</span>
        <p className="neogul-line">{line}</p>
        <div className="neogul-receipt">
          {fx && look ? <><span>{look.money}</span><strong>{look.sign}{fx.amount.toLocaleString()}원</strong></>
            : <span>“정산은 정확하게. 약 올리기는 덤으로.”</span>}
        </div>
        {teasing && <span className="neogul-giggle" aria-hidden="true">{fx.kind === "near" ? "메롱은 서비스~" : laughter(Math.max(1, -streak))}</span>}
      </div>
    </div>
  </section>;
}
