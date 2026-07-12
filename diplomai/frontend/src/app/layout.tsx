import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://diplom-ai.com"),
  title: "DiplomAI — 공공데이터 기반 사업 설계 AI 코파일럿",
  description: "내 사업에 맞는 진출 국가 추천 → 타당성 진단 → 사업계획서까지. 외교부·KOICA·KF 공공데이터 + AI.",
  openGraph: {
    title: "DiplomAI — 공공데이터 기반 사업 설계 AI 코파일럿",
    description: "내 사업에 맞는 진출 국가 추천 → 타당성 진단 → 사업계획서까지. 외교부·KOICA·KF 공공데이터 + AI.",
    url: "https://diplom-ai.com",
    siteName: "DiplomAI",
    locale: "ko_KR",
    type: "website",
    images: [{ url: "/og-image.png", width: 1280, height: 853, alt: "DiplomAI — 대한민국 공공외교·ODA" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DiplomAI — 공공데이터 기반 사업 설계 AI 코파일럿",
    description: "진출 국가 추천 → 타당성 진단 → 사업계획서. 공공데이터 + AI.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
