import { initialAppData } from "@/lib/constants";
import { getUnlockedAchievements } from "@/lib/gameLogic";
import type { AppData } from "@/types";

const STORAGE_KEY = "neko-app-data";
const STORAGE_VERSION = 1 as const;

export function loadAppData(): AppData {
  if (typeof window === "undefined") {
    return initialAppData;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialAppData;
    const parsed = JSON.parse(raw) as Partial<AppData>;

    const data = {
      ...initialAppData,
      ...parsed,
      version: STORAGE_VERSION,
      userState: {
        ...initialAppData.userState,
        ...parsed.userState
      },
      records: Array.isArray(parsed.records) ? parsed.records : []
    };
    return {
      ...data,
      userState: {
        ...data.userState,
        unlockedAchievementIds: getUnlockedAchievements(data)
      }
    };
  } catch {
    return initialAppData;
  }
}

export function saveAppData(data: AppData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, version: STORAGE_VERSION }));
}

export function clearAppData() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
