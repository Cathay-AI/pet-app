"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { type CareStats, loadCareStats, loadCurrentNekoData } from "@/lib/nekoRepository";

export default function AnalyticsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [stats, setStats] = useState<CareStats | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrentNekoData().then(({ data, auth }) => {
      if (auth.isConfigured && !auth.userId) {
        router.replace("/login");
        return;
      }
      if (!data.user || !data.pet) {
        router.replace("/gacha");
        return;
      }
      setReady(true);
    });
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    loadCareStats(date).then((result) => {
      setStats(result);
      setLoading(false);
    });
  }, [date, ready]);

  const typeLabel: Record<string, string> = {
    feed: "餵食",
    bath: "洗澡",
    clean: "清潔",
    play: "玩耍",
    treat: "治療"
  };

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#FDF8F0] text-sm font-black text-[#3D2B1F]">
        載入中...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDF8F0] px-4 pb-28 pt-5 text-[#3D2B1F]">
      <div className="mx-auto max-w-md">
        <header className="mb-5">
          <p className="text-sm font-black text-[#8B6F5E]">使用狀況</p>
          <h1 className="text-3xl font-black">照顧統計</h1>
        </header>

        <section className="mb-4">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border-4 border-[#3D2B1F] bg-white px-4 py-3 text-base font-black shadow-[3px_3px_0_#3D2B1F]"
          />
        </section>

        {loading ? (
          <p className="text-center text-sm font-black text-[#8B6F5E]">載入中...</p>
        ) : !stats ? (
          <p className="text-center text-sm font-black text-[#8B6F5E]">無法取得統計資料（需要登入）</p>
        ) : (
          <>
            <section className="grid grid-cols-3 gap-3">
              <StatCard label="照顧總次數" value={stats.totalEvents} />
              <StatCard label="活躍人數" value={stats.uniqueUsers} />
              <StatCard label="平均次數/人" value={stats.avgEventsPerUser} />
            </section>

            <section className="mt-5 rounded-md border-4 border-[#3D2B1F] bg-white p-4 shadow-[4px_4px_0_#3D2B1F]">
              <h2 className="mb-3 text-base font-black">各操作次數</h2>
              {stats.byType.length === 0 ? (
                <p className="text-sm font-bold text-[#8B6F5E]">今天還沒有人照顧寵物</p>
              ) : (
                <div className="space-y-2">
                  {stats.byType.map((item) => (
                    <div key={item.type} className="flex items-center justify-between rounded-md border-2 border-[#D4A96A] bg-[#FDF8F0] px-3 py-2">
                      <span className="text-sm font-black">{typeLabel[item.type] ?? item.type}</span>
                      <span className="text-lg font-black">{item.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
      <BottomNav />
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border-4 border-[#3D2B1F] bg-white p-3 text-center shadow-[3px_3px_0_#3D2B1F]">
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-black text-[#8B6F5E]">{label}</p>
    </div>
  );
}
