"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AuthStatus from "@/components/AuthStatus";
import BottomNav from "@/components/BottomNav";
import PetCanvas from "@/components/PetCanvas";
import { decayPet, formatRelativeTime, healthScore } from "@/lib/gameLogic";
import { loadCurrentNekoData, loadLeaderboard, saveCurrentNekoData, type AuthState } from "@/lib/nekoRepository";
import type { LeaderboardEntry, NekoData } from "@/types";

export default function LeaderboardPage() {
  const router = useRouter();
  const [data, setData] = useState<NekoData | null>(null);
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);

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
      const decayed = { ...loaded.data, pet: decayPet(loaded.data.pet) };
      await saveCurrentNekoData(decayed);
      setData(decayed);
      setRows((await loadLeaderboard(decayed)).sort((a, b) => healthScore(b) - healthScore(a)));
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

        <section className="overflow-hidden rounded-md border-4 border-[#3D2B1F] bg-white shadow-[6px_6px_0_#3D2B1F]">
          {rankedRows.map((entry, index) => {
            const score = healthScore(entry);
            const weakest = weakestCare(entry);
            return (
              <div
                key={entry.id}
                role={entry.isSelf ? "button" : undefined}
                tabIndex={entry.isSelf ? 0 : undefined}
                onClick={entry.isSelf ? () => router.push("/home") : undefined}
                onKeyDown={(event) => {
                  if (!entry.isSelf) return;
                  if (event.key === "Enter" || event.key === " ") router.push("/home");
                }}
                className={`grid grid-cols-[3rem_3.75rem_1fr_3.25rem] items-center gap-2 border-b-4 border-[#F5E6C8] p-3 last:border-b-0 ${
                  entry.isSelf ? "cursor-pointer bg-[#F5E6C8] outline-none focus:bg-[#FFE0DA]" : "bg-white"
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
                    {entry.petName} · {entry.petType === "cat" ? "貓" : "狗"} · {formatRelativeTime(entry.lastCareAt)}
                  </p>
                  <p className={`mt-1 truncate text-xs font-black ${weakest.value < 40 ? "text-[#E24B4A]" : "text-[#8B6F5E]"}`}>
                    {entry.isSelf ? "現在最需要" : "目前最弱"}：{weakest.label} {weakest.value}%
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-black ${score < 40 ? "text-[#E24B4A]" : "text-[#3D2B1F]"}`}>{score}</p>
                  <p className="text-xs font-black text-[#8B6F5E]">分</p>
                </div>
              </div>
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
