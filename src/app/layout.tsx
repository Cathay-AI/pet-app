import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Neko | 虛擬寵物存錢目標",
  description: "設定存錢目標、完成每日任務、讓寵物成長並解鎖獎勵。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
