import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Neko | 像素虛擬寵物",
  description: "抽一隻像素貓或狗，每天餵食、洗澡、清便便、陪牠玩。"
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
