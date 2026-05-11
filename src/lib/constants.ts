import type { Achievement, AppData, Skin } from "@/types";

export const skins: Skin[] = [
  { id: "basic", name: "Basic Cat", price: 0, emoji: "🐱" },
  { id: "ninja", name: "Ninja Cat", price: 50, emoji: "🥷" },
  { id: "coach", name: "Coach Cat", price: 100, emoji: "🏋️" },
  { id: "king", name: "King Cat", price: 200, emoji: "👑" }
];

export const achievements: Achievement[] = [
  { id: "first_record", name: "第一次紀錄", condition: "新增第一筆進度" },
  { id: "save_1000", name: "存下 1,000 元", condition: "累積金額達 1,000" },
  { id: "progress_50", name: "完成一半", condition: "完成百分比達 50%" },
  { id: "goal_completed", name: "目標達成", condition: "完成百分比達 100%" },
  { id: "streak_7", name: "連續 7 天", condition: "連續紀錄 7 天" }
];

export const dailyTasks = [
  "今天存下 300 元",
  "今天少買一杯飲料",
  "今天記錄一筆消費"
];

export const initialAppData: AppData = {
  version: 1,
  goal: null,
  records: [],
  userState: {
    coins: 0,
    streak: 0,
    lastRecordDate: null,
    selectedSkinId: "basic",
    unlockedSkinIds: ["basic"],
    unlockedAchievementIds: []
  }
};
