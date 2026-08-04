"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthStatus from "@/components/AuthStatus";
import BottomNav from "@/components/BottomNav";
import FriendsLeaderboard from "@/components/FriendsLeaderboard";
import SuggestedUsers from "@/components/SuggestedUsers";
import {
  loadCareStats,
  loadCurrentNekoData,
  loadPerUserCareStats,
  type AuthState,
  type CareStats,
  type UserCareStats
} from "@/lib/nekoRepository";
import { fetchFriendsLeaderboard, fetchSuggestions, sendFriendRequest } from "@/lib/leaderboardApi";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { FriendsLeaderboard as FriendsLeaderboardType, SuggestedUser } from "@/types";

export default function LeaderboardPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [leaderboard, setLeaderboard] = useState<FriendsLeaderboardType | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<CareStats | null>(null);
  const [userStats, setUserStats] = useState<UserCareStats[]>([]);

  // Load data function
  const loadData = async () => {
    try {
      // Check auth and user/pet data (preserve existing behavior)
      const loaded = await loadCurrentNekoData();
      setAuth(loaded.auth);

      if (loaded.auth.isConfigured && !loaded.auth.userId) {
        router.replace("/login");
        return;
      }

      // Redirect to gacha if user has no pet (preserve existing onboarding flow)
      if (!loaded.data.user || !loaded.data.pet) {
        router.replace("/gacha");
        return;
      }

      if (!loaded.auth.userId) {
        setError("請先登入以查看好友排行榜");
        setIsLoadingLeaderboard(false);
        setIsLoadingSuggestions(false);
        return;
      }

      // Get Supabase token
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setError("Supabase 未配置");
        setIsLoadingLeaderboard(false);
        setIsLoadingSuggestions(false);
        return;
      }

      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError("請先登入以查看好友排行榜");
        setIsLoadingLeaderboard(false);
        setIsLoadingSuggestions(false);
        return;
      }

      setIsLoadingLeaderboard(true);
      setIsLoadingSuggestions(true);
      try {
        const today = new Date().toISOString().slice(0, 10);
        const [friendsData, suggestionsData, careStats, perUserStats] = await Promise.all([
          fetchFriendsLeaderboard(session.access_token),
          fetchSuggestions(session.access_token, 10),
          loadCareStats(today),
          loadPerUserCareStats(today)
        ]);
        setLeaderboard(friendsData);
        setSuggestions(suggestionsData.suggestions);
        setStats(careStats);
        setUserStats(perUserStats);
        setError(null);
      } catch (err) {
        console.error("Failed to load leaderboard:", err);
        setError("載入好友排行榜失敗");
      } finally {
        setIsLoadingLeaderboard(false);
        setIsLoadingSuggestions(false);
      }
    } catch (err) {
      console.error("Error loading data:", err);
      setError("載入資料失敗");
      setIsLoadingLeaderboard(false);
      setIsLoadingSuggestions(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadData();
  }, [router]);

  // Auto-refresh every 3 minutes
  const { lastUpdated, isRefreshing, refresh } = useAutoRefresh(loadData, 3 * 60 * 1000, true);

  // Handle add friend
  const handleAddFriend = async (friendCode: string) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) throw new Error("Supabase 未配置");

    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("請先登入");

    await sendFriendRequest(session.access_token, friendCode);

    // Refresh suggestions after adding friend
    await loadData();
  };

  // Format last updated time
  const formatLastUpdated = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "剛剛更新";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} 分鐘前更新`;
    const hours = Math.floor(minutes / 60);
    return `${hours} 小時前更新`;
  };

  if (error && !leaderboard) {
    return (
      <main className="min-h-screen bg-[#FDF8F0] px-4 pb-28 pt-5 text-[#3D2B1F]">
        <div className="mx-auto max-w-md">
          <div className="rounded-md border-4 border-[#E24B4A] bg-[#FFE0DA] p-6 text-center">
            <p className="text-lg font-black">⚠️ {error}</p>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="mt-4 rounded-md border-2 border-[#3D2B1F] bg-[#E8734A] px-4 py-2 text-sm font-black text-white"
            >
              前往登入
            </button>
          </div>
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDF8F0] px-4 pb-28 pt-5 text-[#3D2B1F]">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <header className="mb-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-black">好友排行</h1>
              <p className="mt-1 text-xs text-[#8B6F5E]">
                {formatLastUpdated(lastUpdated)} · 每 3 分鐘自動更新
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={refresh}
                disabled={isRefreshing}
                className="grid h-10 w-10 place-items-center rounded-md border-2 border-[#3D2B1F] bg-white transition hover:bg-[#F5E6C8] disabled:opacity-50"
                title="手動刷新"
              >
                <svg
                  className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
              <AuthStatus auth={auth} />
            </div>
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

        {/* Friends Leaderboard */}
        <FriendsLeaderboard
          friends={leaderboard?.friends ?? []}
          selfEntry={leaderboard?.selfEntry ?? null}
          isLoading={isLoadingLeaderboard}
          userStats={userStats}
        />

        {/* Stats */}
        {leaderboard && !isLoadingLeaderboard ? (
          <div className="mt-3 rounded-md border-2 border-[#D4A96A] bg-[#FDF8F0] px-4 py-2 text-center">
            <p className="text-xs font-black text-[#8B6F5E]">
              目前有 {leaderboard.totalFriends} 位好友 ·
              {leaderboard.selfEntry ? " 你尚未在排行榜中" : " 繼續加油！"}
            </p>
          </div>
        ) : null}

        {/* Suggested Users */}
        <div className="mt-6">
          <SuggestedUsers
            suggestions={suggestions}
            isLoading={isLoadingSuggestions}
            onAddFriend={handleAddFriend}
          />
        </div>
      </div>
      <BottomNav />
    </main>
  );
}
