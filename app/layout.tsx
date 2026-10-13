import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://four-seasons-farm.solargecko4.chatgpt.site"),
  title: "월루농가 | 일하다 몰래 하는 농장 게임",
  description: "근무 시간을 네 계절로 나눠 농사짓고 낚시하고 3D 집을 꾸미는 월급루팡 힐링 웹게임",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "월루농가",
    description: "월급은 루팡, 농사는 진심",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "사계절이 한 풍경에 담긴 월루농가" }],
  },
  twitter: { card: "summary_large_image", title: "월루농가", description: "월급은 루팡, 농사는 진심", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
