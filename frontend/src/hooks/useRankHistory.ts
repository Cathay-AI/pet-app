import { useEffect, useRef } from "react";
import type { LeaderboardEntry } from "@/types";

const STORAGE_KEY = "neko_rank_history";
const MAX_HISTORY_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

type RankSnapshot = {
  petId: string;
  rank: number;
  healthScore: number;
  timestamp: string;
};

type StoredHistory = {
  timestamp: string;
  rankings: RankSnapshot[];
};

/**
 * Hook to track rank changes in leaderboard
 * Compares current rankings with previous snapshot stored in localStorage
 */
export function useRankHistory(currentEntries: LeaderboardEntry[]) {
  const previousHistoryRef = useRef<RankSnapshot[]>([]);

  useEffect(() => {
    // Load previous history on mount
    previousHistoryRef.current = loadHistory();
  }, []);

  useEffect(() => {
    if (currentEntries.length === 0) return;

    // Save current rankings as new history
    const newHistory: RankSnapshot[] = currentEntries.map((entry, index) => ({
      petId: entry.id,
      rank: entry.rank ?? index + 1,
      healthScore: entry.healthScore ?? 0,
      timestamp: new Date().toISOString()
    }));

    saveHistory(newHistory);
  }, [currentEntries]);

  /**
   * Calculate rank changes for entries based on previous history
   */
  const calculateRankChanges = (entries: LeaderboardEntry[]): LeaderboardEntry[] => {
    const previousRankMap = new Map<string, number>();
    previousHistoryRef.current.forEach((record) => {
      previousRankMap.set(record.petId, record.rank);
    });

    return entries.map((entry, currentIndex) => {
      const currentRank = entry.rank ?? currentIndex + 1;
      const previousRank = previousRankMap.get(entry.id);

      if (previousRank === undefined) {
        // New entry
        return {
          ...entry,
          rank: currentRank,
          rankChange: undefined
        };
      }

      const rankChange = previousRank - currentRank; // 正數=上升，負數=下降

      return {
        ...entry,
        rank: currentRank,
        rankChange
      };
    });
  };

  return {
    calculateRankChanges
  };
}

function loadHistory(): RankSnapshot[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed: StoredHistory = JSON.parse(stored);
    const age = Date.now() - new Date(parsed.timestamp).getTime();

    // Clear if older than 24 hours
    if (age > MAX_HISTORY_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }

    return parsed.rankings;
  } catch {
    return [];
  }
}

function saveHistory(rankings: RankSnapshot[]): void {
  if (typeof window === "undefined") return;

  try {
    const stored: StoredHistory = {
      timestamp: new Date().toISOString(),
      rankings
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Ignore storage errors
  }
}
