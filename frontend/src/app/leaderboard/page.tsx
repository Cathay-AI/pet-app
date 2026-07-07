"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AuthStatus from "@/components/AuthStatus";
import BottomNav from "@/components/BottomNav";
import PetCanvas from "@/components/PetCanvas";
import { decayPet, formatRelativeTime, healthScore } from "@/lib/gameLogic";
import { loadCurrentNekoData, loadLeaderboard, loadCareStats, loadPerUserCareStats, saveCurrentNekoData, type AuthState, type CareStats, type UserCareStats } from "@/lib/nekoRepository";
import { upsertPet } from "@/lib/petCollection";
import type { LeaderboardEntry, NekoData } from "@/types";

const typeLabel: Record<string, string> = {
  visit_pet: "摸摸",
  feed: "餵食",
  bath: "洗澡",
  play: "玩耍"
};

export default function LeaderboardPage() {
  const router = useRouter();
  const [data, setData] = useState<NekoData | null>(null);
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<CareStats | null>(null);
  const [userStats, setUserStats] = useState<UserCareStats[]>([]);

  useEffect(() => {
    loadCurrentNekoData().then(async (loaded) => {
      setAuth(loaded.auth);
      if (loaded.auth.isConfigured && !loaded.auth.userId) {
        router.replace("/login");
        return;
      }
      if (!loaded.data.user || !loaded.data.pet) {
        router.replace("/gacha");
        return;
      }
      const decayedPet = decayPet(loaded.data.pet);
      const decayed = upsertPet({ ...loaded.data, pet: decayedPet, activePetId: decayedPet.id }, decayedPet);
      await saveCurrentNekoData(decayed);
      setData(decayed);
      setRows((await loadLeaderboard(decayed)).sort((a, b) => healthScore(b) - healthScore(a)));

      const today = new Date().toISOString().slice(0, 10);
      const [s, u] = await Promise.all([loadCareStats(today), loadPerUserCareStats(today)]);
      setStats(s);
      setUserStats(u);
    });
  }, [router]);

  const rankedRows = useMemo(() => [...rows].sort((a, b) => healthScore(b) - healthScore(a)), [rows]);

  if (!data?.user || !data.pet) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#FDF8F0] text-sm font-black text-[#3D2B1F]">
        排行榜載入中...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDF8F0] px-4 pb-28 pt-5 text-[#3D2B1F]">
      <div className="mx-auto max-w-md">
        <header className="mb-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-[#8B6F5E]">公開狀態 · 每 5 分鐘更新</p>
              <h1 className="text-3xl font-black">照顧近況</h1>
            </div>
            <AuthStatus auth={auth} />
          </div>
        </header>

        {stats ? (
          <section className="mb-5">
            <h2 className="mb-3 text-lg font-black">今日互動統計</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border-4 border-[#3D2B1F] bg-white p-3 text-center shadow-[3px_3px_0_#3D2B1F]">
                <p className="text-2xl font-black">{stats.total_events}</p>
                <p className="mt-1 text-xs font-black text-[#8B6F5E]">照顧總次數</p>
              </div>
              <div className="rounded-md border-4 border-[#3D2B1F] bg-white p-3 text-center shadow-[3px_3px_0_#3D2B1F]">
                <p className="text-2xl font-black">{stats.unique_users}/{stats.total_users}</p>
                <p className="mt-1 text-xs font-black text-[#8B6F5E]">活躍/總人數</p>
              </div>
              <div className="rounded-md border-4 border-[#3D2B1F] bg-white p-3 text-center shadow-[3px_3px_0_#3D2B1F]">
                <p className="text-2xl font-black">{stats.avg_events_per_user}</p>
                <p className="mt-1 text-xs font-black text-[#8B6F5E]">平均次數/人</p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="overflow-hidden rounded-md border-4 border-[#3D2B1F] bg-white shadow-[6px_6px_0_#3D2B1F]">
          {rankedRows.map((entry, index) => {
            const score = healthScore(entry);
            const weakest = weakestCare(entry);
            const userStat = userStats.find((u) => u.username === entry.username);
            return (
              <Link
                key={entry.id}
                href={`/rooms/${encodeURIComponent(entry.id)}`}
                aria-label={`拜訪 ${entry.username} 的房間`}
                className={`grid grid-cols-[3rem_3.75rem_1fr_3.25rem] items-center gap-2 border-b-4 border-[#F5E6C8] p-3 last:border-b-0 ${
                  entry.isSelf ? "bg-[#F5E6C8] outline-none focus:bg-[#FFE0DA]" : "bg-white focus:bg-[#FDF8F0]"
                }`}
              >
                <div className="text-center">
                  <p className="text-lg font-black">{rankLabel(index + 1)}</p>
                  {entry.isSelf ? <p className="text-xs font-black text-[#E8734A]">▶</p> : null}
                </div>
                <div className="grid h-14 w-14 place-items-center rounded bg-[#1A1A2E]">
                  <PetCanvas
                    type={entry.petType}
                    color={entry.petColor}
                    animation={score < 30 ? "sad" : "idle"}
                    hunger={entry.hunger}
                    cleanliness={entry.cleanliness}
                    size={52}
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-black">{entry.username}</p>
                  <p className="truncate text-xs font-bold text-[#8B6F5E]">
                    {entry.petName} · {entry.petType === "cat" ? "貓" : "狗"} · {entry.lastCareAt ? formatRelativeTime(entry.lastCareAt) : "尚未照顧"}
                  </p>
                  {userStat ? (
                    <p className="mt-1 truncate text-xs font-bold text-[#8B6F5E]">
                      今日 {userStat.by_type.map((t) => `${typeLabel[t.type] ?? t.type} ${t.count}`).join(" · ")}
                    </p>
                  ) : (
                    <p className="mt-1 truncate text-xs font-bold text-[#8B6F5E]">今日尚未互動</p>
                  )}
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-black ${score < 40 ? "text-[#E24B4A]" : "text-[#3D2B1F]"}`}>{score}</p>
                  <p className="text-xs font-black text-[#8B6F5E]">分</p>
                </div>
              </Link>
            );
          })}
        </section>

      </div>
      <BottomNav />
    </main>
  );
}

function rankLabel(rank: number) {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return `${rank}th`;
}

function weakestCare(entry: LeaderboardEntry) {
  const stats = [
    { label: "飽足", value: entry.hunger },
    { label: "清潔", value: entry.cleanliness },
    { label: "心情", value: entry.mood }
  ];
  return stats.sort((a, b) => a.value - b.value)[0];
}
