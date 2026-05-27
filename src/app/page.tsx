import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "Neko | 虛擬寵物存錢目標",
  description: "設定一個存錢目標，讓 Neko 每天陪你把進度補上。完成每日行動，解鎖小窩變化，讓目標有情感依附。",
  openGraph: {
    title: "Neko | 虛擬寵物存錢目標",
    description: "設定一個存錢目標，讓 Neko 每天陪你把進度補上。完成每日行動，解鎖小窩變化。",
    type: "website"
  }
};

export default function Page() {
  return <HomeClient />;
}
