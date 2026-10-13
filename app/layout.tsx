import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://four-seasons-farm.solargecko4.chatgpt.site"),
  title: "사계농가 | 현실 시간 농장 게임",
  description: "현실의 하루 속 네 계절을 농사짓고, 번 돈으로 나만의 집을 꾸미는 힐링 웹게임",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "사계농가",
    description: "오늘 심고, 천천히 사는 집",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "사계절이 한 풍경에 담긴 사계농가" }],
  },
  twitter: { card: "summary_large_image", title: "사계농가", description: "오늘 심고, 천천히 사는 집", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
