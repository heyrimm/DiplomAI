import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DiplomAI — ODA 분석 및 AI 사업 추천",
  description: "외교부·KOICA 공공데이터 기반 국가별 ODA 분석 플랫폼",
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
