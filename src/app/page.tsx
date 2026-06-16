"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadCurrentNekoData } from "@/lib/nekoRepository";

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    loadCurrentNekoData().then(({ data, auth }) => {
      if (auth.isConfigured && !auth.userId) {
        router.replace("/login");
        return;
      }
      router.replace(data.user && data.pet ? "/home" : "/gacha");
    });
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#FDF8F0] px-6 text-[#3D2B1F]">
      <div className="rounded-md border-4 border-[#3D2B1F] bg-[#F5E6C8] p-5 text-center shadow-[6px_6px_0_#3D2B1F]">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center bg-[#1A1A2E] font-black text-[#FDF8F0]">N</div>
        <p className="text-sm font-black">Neko 正在醒來...</p>
      </div>
    </main>
  );
}
