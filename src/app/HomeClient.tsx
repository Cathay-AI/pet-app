"use client";

import { useEffect, useState } from "react";
import Dashboard from "@/components/Dashboard";
import GoalSetup from "@/components/GoalSetup";
import LandingPage from "@/components/LandingPage";
import { initialAppData } from "@/lib/constants";
import { getUnlockedAchievements } from "@/lib/gameLogic";
import { loadAppData, saveAppData } from "@/lib/storage";
import type { AppData, Goal } from "@/types";

type View = "landing" | "setup" | "dashboard";

export default function HomeClient() {
  const [data, setData] = useState<AppData>(initialAppData);
  const [view, setView] = useState<View>("landing");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const stored = loadAppData();
    setData(stored);
    setView(stored.goal ? "dashboard" : "landing");
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (isReady) saveAppData(data);
  }, [data, isReady]);

  function handleCreateGoal(goal: Goal) {
    setData((current) => {
      const nextData = { ...current, goal };
      return {
        ...nextData,
        userState: {
          ...nextData.userState,
          unlockedAchievementIds: getUnlockedAchievements(nextData)
        }
      };
    });
    setView("dashboard");
  }

  if (!isReady) {
    return (
      <main className="min-h-screen px-3 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <header className="mb-4 flex items-center gap-2 sm:mb-5">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-mint-600 text-sm font-black text-white shadow-card">N</span>
            <span>
              <span className="block text-lg font-black text-ink">Neko</span>
              <span className="block text-xs font-semibold text-ink/55">目標養成夥伴</span>
            </span>
          </header>
          <div className="overflow-hidden rounded-lg border border-[#eadfcd] bg-[#fffaf0] shadow-soft">
            <div className="grid gap-4 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-4">
              <div className="animate-pulse rounded-lg bg-[#e4d1ae] min-h-[18rem] sm:min-h-[25rem]" />
              <div className="flex flex-col gap-4 rounded-lg bg-[#fffaf0] p-4 sm:p-5">
                <div className="animate-pulse h-3 w-20 rounded bg-[#e4d1ae]" />
                <div className="animate-pulse h-9 w-3/4 rounded bg-[#e4d1ae]" />
                <div className="animate-pulse h-5 w-full rounded bg-[#e4d1ae]" />
                <div className="animate-pulse h-5 w-2/3 rounded bg-[#e4d1ae]" />
                <div className="mt-auto animate-pulse h-16 w-full rounded bg-[#e4d1ae]" />
                <div className="animate-pulse h-12 w-full rounded bg-[#e4d1ae]" />
                <div className="animate-pulse h-20 w-full rounded bg-[#e4d1ae]" />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-3 py-4 text-ink sm:px-6 sm:py-5 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-4 flex items-center justify-between gap-3 sm:mb-5">
          <button
            className="flex items-center gap-2 rounded-lg px-2 py-1 text-left focus-ring"
            onClick={() => setView(data.goal ? "dashboard" : "landing")}
            type="button"
          >
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-mint-600 text-sm font-black text-white shadow-card">N</span>
            <span>
              <span className="block text-lg font-black">Neko</span>
              <span className="block text-xs font-semibold text-ink/55">目標養成夥伴</span>
            </span>
          </button>
          {data.goal ? (
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-ink shadow-card">{data.userState.coins} coins</span>
              <span className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-ink shadow-card">{data.userState.streak} days</span>
            </div>
          ) : null}
        </header>

        {view === "landing" ? <LandingPage onStart={() => setView("setup")} /> : null}
        {view === "setup" ? <GoalSetup onCreateGoal={handleCreateGoal} onBack={() => setView("landing")} /> : null}
        {view === "dashboard" && data.goal ? <Dashboard data={data} setData={setData} /> : null}
      </div>
    </main>
  );
}
