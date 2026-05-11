import { achievements, skins } from "@/lib/constants";
import type { AppData, Goal, ProgressRecord, UserState } from "@/types";

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0
  }).format(amount);
}

export function getProgressPercent(goal: Goal | null) {
  if (!goal || goal.targetAmount <= 0) return 0;
  return Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
}

export function getPetStatus(percent: number) {
  if (percent >= 100) {
    return { emoji: "👑", label: "目標達成，寵物進化", tone: "完成進化" };
  }
  if (percent >= 81) {
    return { emoji: "🦁", label: "接近完成，非常興奮", tone: "非常興奮" };
  }
  if (percent >= 51) {
    return { emoji: "🐯", label: "狀態很好，很有活力", tone: "很有活力" };
  }
  if (percent >= 26) {
    return { emoji: "🐱", label: "逐漸成長，開始有精神", tone: "開始有精神" };
  }
  return { emoji: "🐣", label: "剛開始，有點懶散", tone: "有點懶散" };
}

export function getSelectedSkin(userState: UserState) {
  return skins.find((skin) => skin.id === userState.selectedSkinId) ?? skins[0];
}

export function getDailySuggestedAmount(goal: Goal | null) {
  if (!goal) return 300;

  const today = startOfDay(new Date());
  const deadline = startOfDay(new Date(goal.deadline));
  const remainingDays = Math.max(1, Math.ceil((deadline.getTime() - today.getTime()) / 86400000));
  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);

  return Math.max(100, Math.ceil(remainingAmount / remainingDays));
}

export function calculateCoins(recordAmount: number, suggestedAmount: number, completedGoal: boolean) {
  let coins = recordAmount > 0 ? 10 : 0;
  if (recordAmount >= suggestedAmount && recordAmount > 0) coins += 20;
  if (completedGoal) coins += 100;
  return coins;
}

export function calculateNextStreak(lastRecordDate: string | null, now = new Date()) {
  const today = toDateKey(now);
  if (!lastRecordDate) return 1;
  if (lastRecordDate === today) return null;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  return lastRecordDate === toDateKey(yesterday) ? undefined : 1;
}

export function resolveStreak(lastRecordDate: string | null, currentStreak: number, now = new Date()) {
  const result = calculateNextStreak(lastRecordDate, now);
  if (result === null) return currentStreak;
  if (typeof result === "undefined") return currentStreak + 1;
  return result;
}

export function getFeedback(amount: number, percent: number, type: ProgressRecord["type"], completedGoal: boolean) {
  if (completedGoal) return "目標達成，寵物完成進化。";
  if (percent >= 50) return "你已經完成一半了，現在不要停。";
  if (type === "reduced_spending") return "少喝一杯飲料也算進步，繼續累積。";
  if (amount >= 1000) return "這筆存款很關鍵，寵物變得更有精神了。";
  return "很好，今天又離目標更近一步了。";
}

export function getUnlockedAchievements(data: AppData) {
  const goal = data.goal;
  const percent = getProgressPercent(goal);
  const ids = new Set(data.userState.unlockedAchievementIds);

  if (data.records.length >= 1) ids.add("first_record");
  if ((goal?.currentAmount ?? 0) >= 1000) ids.add("save_1000");
  if (percent >= 50) ids.add("progress_50");
  if (percent >= 100) ids.add("goal_completed");
  if (data.userState.streak >= 7) ids.add("streak_7");

  return achievements.filter((achievement) => ids.has(achievement.id)).map((achievement) => achievement.id);
}

export function applyProgressRecord(data: AppData, record: ProgressRecord) {
  if (!data.goal) return { data, earnedCoins: 0, feedback: "" };

  const previousPercent = getProgressPercent(data.goal);
  const suggestedAmount = getDailySuggestedAmount(data.goal);
  const nextGoal: Goal = {
    ...data.goal,
    currentAmount: Math.max(0, data.goal.currentAmount + record.amount)
  };
  const completedGoal = previousPercent < 100 && getProgressPercent(nextGoal) >= 100;
  const earnedCoins = calculateCoins(record.amount, suggestedAmount, completedGoal);
  const today = toDateKey(new Date());
  const nextState: UserState = {
    ...data.userState,
    coins: data.userState.coins + earnedCoins,
    streak: resolveStreak(data.userState.lastRecordDate, data.userState.streak),
    lastRecordDate: today
  };

  const nextData: AppData = {
    version: data.version,
    goal: nextGoal,
    records: [record, ...data.records],
    userState: nextState
  };

  nextData.userState.unlockedAchievementIds = getUnlockedAchievements(nextData);

  return {
    data: nextData,
    earnedCoins,
    feedback: getFeedback(record.amount, getProgressPercent(nextGoal), record.type, completedGoal)
  };
}

export function buySkin(data: AppData, skinId: string) {
  const skin = skins.find((item) => item.id === skinId);
  if (!skin) return data;
  if (data.userState.unlockedSkinIds.includes(skinId)) {
    return {
      ...data,
      userState: { ...data.userState, selectedSkinId: skinId }
    };
  }
  if (data.userState.coins < skin.price) return data;

  return {
    ...data,
    userState: {
      ...data.userState,
      coins: data.userState.coins - skin.price,
      selectedSkinId: skinId,
      unlockedSkinIds: [...data.userState.unlockedSkinIds, skinId]
    }
  };
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
