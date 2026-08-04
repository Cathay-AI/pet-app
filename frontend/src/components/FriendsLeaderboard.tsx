import { useMemo } from "react";
import Link from "next/link";
import PetCanvas from "@/components/PetCanvas";
import RankChangeIndicator from "@/components/RankChangeIndicator";
import { formatRelativeTime, healthScore } from "@/lib/gameLogic";
import { useRankHistory } from "@/hooks/useRankHistory";
import type { UserCareStats } from "@/lib/nekoRepository";
import type { LeaderboardEntry } from "@/types";

type FriendsLeaderboardProps = {
  friends: LeaderboardEntry[];
  selfEntry: LeaderboardEntry | null;
  isLoading?: boolean;
  userStats?: UserCareStats[];
};

const typeLabel: Record<string, string> = {
  visit_pet: "摸摸",
  feed: "餵食",
  bath: "洗澡",
  play: "玩耍"
};

export default function FriendsLeaderboard({
  friends,
  selfEntry,
  isLoading,
  userStats = []
}: FriendsLeaderboardProps) {
  const sortedEntries = useMemo(() => {
    const allEntries = selfEntry && !friends.some((entry) => entry.id === selfEntry.id)
      ? [...friends, selfEntry]
      : friends;
    return [...allEntries].sort((a, b) => healthScore(b) - healthScore(a));
  }, [friends, selfEntry]);
  const rankedEntries = useRankHistory(sortedEntries);

  if (isLoading) {
    return (
      <div className="rounded-md border-4 border-[#3D2B1F] bg-white p-8 text-center shadow-[6px_6px_0_#3D2B1F]">
        <p className="text-sm font-black text-[#8B6F5E]">載入好友排行榜中...</p>
      </div>
    );
  }

  if (rankedEntries.length === 0) {
    return (
      <div className="rounded-md border-4 border-[#3D2B1F] bg-white p-8 text-center shadow-[6px_6px_0_#3D2B1F]">
        <p className="text-lg font-black">還沒有好友</p>
        <p className="mt-2 text-sm text-[#8B6F5E]">加入好友後，就能在這裡看到他們的寵物排行！</p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-md border-4 border-[#3D2B1F] bg-white shadow-[6px_6px_0_#3D2B1F]">
      {rankedEntries.map((entry, index) => {
        const score = healthScore(entry);
        const weakest = weakestCare(entry);
        const userStat = userStats.find((stats) => stats.user_id === entry.userId);
        const currentRank = index + 1; // Use index-based rank after sorting
        const isDangerous = entry.isSick || score < 30;

        return (
          <Link
            key={entry.id}
            href={`/rooms/${encodeURIComponent(entry.id)}`}
            aria-label={`拜訪 ${entry.username} 的房間`}
            className={`grid grid-cols-[3.5rem_3.75rem_1fr_3.25rem] items-center gap-2 border-b-4 border-[#F5E6C8] p-3 last:border-b-0 transition hover:bg-[#FDF8F0] ${
              entry.isSelf
                ? "bg-[#F5E6C8] outline-none focus:bg-[#FFE0DA]"
                : isDangerous
                  ? "bg-[#FFF5F5]"
                  : "bg-white"
            }`}
          >
            {/* Rank & Change */}
            <div className="text-center">
              <p className="text-lg font-black">{rankLabel(currentRank)}</p>
              <div className="mt-0.5 flex justify-center">
                <RankChangeIndicator rankChange={entry.rankChange} />
              </div>
              {entry.isSelf ? <p className="mt-1 text-xs font-black text-[#E8734A]">▶ 你</p> : null}
            </div>

            {/* Pet Avatar */}
            <div className="relative grid h-14 w-14 place-items-center rounded bg-[#1A1A2E]">
              <PetCanvas
                type={entry.petType}
                color={entry.petColor}
                animation={entry.isSick ? "sick" : score < 30 ? "sad" : "idle"}
                hunger={entry.hunger}
                cleanliness={entry.cleanliness}
                size={52}
              />
              {entry.isSick ? (
                <div className="absolute -right-1 -top-1 text-base" title="生病中">
                  🤢
                </div>
              ) : isDangerous ? (
                <div className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full border-2 border-[#3D2B1F] bg-[#E24B4A] text-[10px]">
                  ⚠️
                </div>
              ) : null}
            </div>

            {/* Pet Info */}
            <div className="min-w-0">
              <p className="truncate text-base font-black">{entry.username}</p>
              <p className="truncate text-xs font-bold text-[#8B6F5E]">
                {entry.petName} · {entry.petType === "cat" ? "貓" : "狗"}
              </p>
              <p
                className={`mt-0.5 truncate text-xs font-black ${
                  weakest.value < 30 ? "text-[#E24B4A]" : "text-[#8B6F5E]"
                }`}
              >
                {entry.lastCareAt ? formatRelativeTime(entry.lastCareAt) : "尚未照顧"}
                {weakest.value < 40 ? ` · ${weakest.label} ${weakest.value}%` : ""}
              </p>
              {userStat ? (
                <p className="mt-1 truncate text-xs font-bold text-[#8B6F5E]">
                  今日 {userStat.by_type.map((item) => `${typeLabel[item.type] ?? item.type} ${item.count}`).join(" · ")}
                </p>
              ) : (
                <p className="mt-1 truncate text-xs font-bold text-[#8B6F5E]">今日尚未互動</p>
              )}
            </div>

            {/* Health Score */}
            <div className="text-right">
              <p className={`text-2xl font-black ${score < 40 ? "text-[#E24B4A]" : "text-[#3D2B1F]"}`}>{score}</p>
              <p className="text-xs font-black text-[#8B6F5E]">分</p>
            </div>
          </Link>
        );
      })}
    </section>
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
