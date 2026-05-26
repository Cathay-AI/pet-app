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

export default function Home() {
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
      <main className="grid min-h-screen place-items-center px-6">
        <div className="card p-6 text-center">
          <div className="mx-auto h-16 w-16 overflow-hidden rounded-lg bg-mint-100 shadow-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="Neko waking up" className="h-full w-full object-cover" src="/cat.gif" />
          </div>
          <p className="mt-3 text-sm font-semibold text-ink/70">Neko 正在醒來...</p>
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
            <span className="h-10 w-10 overflow-hidden rounded-lg bg-white shadow-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="Neko" className="h-full w-full object-cover" src="/cat.gif" />
            </span>
            <span>
              <span className="block text-lg font-black">Neko</span>
              <span className="block text-xs font-semibold text-ink/55">目標養成夥伴</span>
            </span>
          </button>
          {data.goal ? (
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-white px-3 py-2 text-sm font-black text-ink shadow-card">🪙 {data.userState.coins}</span>
              <span className="rounded-lg bg-white px-3 py-2 text-sm font-black text-ink shadow-card">🔥 {data.userState.streak}</span>
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
