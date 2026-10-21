import type { NeogulMood } from "./NeogulMascot";

export type CasinoReactionKind = "win" | "lose" | "near" | "jackpot" | "push";
export type CasinoReaction = { id: number; kind: CasinoReactionKind; amount: number; line: string };

const REACTIONS = {
  lose: { mood: "laugh", stamp: "도토리 적립", aside: "웃음 참기 실패", tag: "너굴 승", money: "잃은 금액", sign: "−", particles: ["ㅋ", "🌰", "ㅋ", "✦", "ㅋㅋ", "🌰"] },
  near: { mood: "tease", stamp: "메~롱", aside: "마지막 한 칸의 배신", tag: "아슬아슬… 꽝", money: "잃은 금액", sign: "−", particles: ["?", "✦", "ㅋ", "!", "✧", "ㅋ"] },
  win: { mood: "sulk", stamp: "흥! 가져가", aside: "축하는 아주 작게", tag: "플레이어 승", money: "받은 금액 · 판돈 포함", sign: "+", particles: ["✦", "🪙", "✧", "✦", "🪙", "✧"] },
  jackpot: { mood: "sulk", stamp: "금고 비상!", aside: "너굴 간식 예산 긴급 회의", tag: "JACKPOT", money: "받은 금액 · 판돈 포함", sign: "+", particles: ["★", "🪙", "✦", "★", "🪙", "✦"] },
  push: { mood: "idle", stamp: "쌤쌤!", aside: "자존심은 각자 챙기기", tag: "무승부", money: "돌려받은 판돈", sign: "", particles: ["=", "✧", "=", "✧"] },
} satisfies Record<CasinoReactionKind, {
  mood: NeogulMood; stamp: string; aside: string; tag: string; money: string; sign: string; particles: string[];
}>;

export function dealerPresentation(kind: CasinoReactionKind, streak: number) {
  const base = REACTIONS[kind];
  const losses = Math.max(0, -streak);
  return {
    ...base,
    aside: (kind === "lose" || kind === "near") && losses >= 3
      ? `${losses}연패 목격 중 · ${losses >= 6 ? "웃다가 볼 아픈 너굴" : "꼬리까지 신난 너굴"}`
      : base.aside,
  };
}
