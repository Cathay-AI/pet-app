export type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  createdAt: string;
};

export type ProgressRecord = {
  id: string;
  amount: number;
  note: string;
  type: "saved_money" | "reduced_spending" | "manual_adjustment";
  createdAt: string;
};

export type UserState = {
  coins: number;
  streak: number;
  lastRecordDate: string | null;
  selectedSkinId: string;
  unlockedSkinIds: string[];
  unlockedAchievementIds: string[];
};

export type AppData = {
  version: 1;
  goal: Goal | null;
  records: ProgressRecord[];
  userState: UserState;
};

export type Skin = {
  id: string;
  name: string;
  price: number;
  emoji: string;
};

export type Achievement = {
  id: string;
  name: string;
  condition: string;
};
