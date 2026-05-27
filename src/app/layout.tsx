import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://pet-app-git-core-experience-redesign-vic4codes-projects.vercel.app"),
  title: {
    default: "Neko | 虛擬寵物存錢目標",
    template: "%s | Neko"
  },
  description: "設定一個存錢目標，讓 Neko 每天陪你把進度補上。完成每日行動，解鎖小窩變化，讓目標有情感依附。"
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
