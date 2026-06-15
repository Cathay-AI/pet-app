"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import PixelIcon from "@/components/PixelIcon";
import type { PixelIconName } from "@/types";

const tabs: { href: string; label: string; icon: PixelIconName }[] = [
  { href: "/home", label: "首頁", icon: "home" },
  { href: "/leaderboard", label: "排行", icon: "rank" }
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t-4 border-[#3D2B1F] bg-[#FDF8F0] px-4 py-2">
      <div className="mx-auto grid max-w-md grid-cols-2 gap-2">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center justify-center gap-2 rounded-md border-2 px-4 py-3 text-sm font-black transition ${
                active
                  ? "border-[#3D2B1F] bg-[#E8734A] text-white shadow-[3px_3px_0_#3D2B1F]"
                  : "border-[#D4A96A] bg-[#F5E6C8] text-[#3D2B1F]"
              }`}
            >
              <PixelIcon name={tab.icon} size="sm" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
