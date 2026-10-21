import type { CSSProperties } from "react";

export type NeogulMood = "idle" | "laugh" | "sulk" | "help" | "tease";

const POSES = {
  idle: { position: "0% 0%", label: "카드를 들고 기다리는 너굴" },
  laugh: { position: "100% 0%", label: "신나게 웃는 너굴" },
  sulk: { position: "0% 100%", label: "볼이 부어 삐진 너굴" },
  help: { position: "100% 100%", label: "쑥스러워하며 지원금을 건네는 너굴" },
  tease: { position: "center", label: "메롱하며 약 올리는 너굴" },
} satisfies Record<NeogulMood, { position: string; label: string }>;

/** Relative public URLs also work in the packaged file:// desktop widget. */
export function NeogulMascot({ mood = "idle", decorative = false }: {
  mood?: NeogulMood;
  decorative?: boolean;
}) {
  const pose = POSES[mood];
  return <span
    className="neogul-mascot"
    role={decorative ? undefined : "img"}
    aria-label={decorative ? undefined : pose.label}
    aria-hidden={decorative ? true : undefined}
    style={{
      backgroundImage: `url("images/mascot/neogul-${mood === "tease" ? "tease" : "poses"}.png")`,
      backgroundPosition: pose.position,
      backgroundSize: mood === "tease" ? "100% 100%" : "200% 200%",
    } as CSSProperties}
  />;
}
