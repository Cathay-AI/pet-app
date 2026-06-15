import type { Food, LeaderboardEntry, NekoData, PetColorId } from "@/types";

export const initialNekoData: NekoData = {
  version: 1,
  user: null,
  pet: null
};

export const PET_COLORS: Record<
  PetColorId,
  { name: string; fur: string; shade: string; accent: string; blush: string }
> = {
  orange: { name: "橘黃", fur: "#EAA24B", shade: "#B86F2E", accent: "#FFF0C5", blush: "#F37F7F" },
  brown: { name: "奶茶棕", fur: "#C99361", shade: "#7E5439", accent: "#F7DDB9", blush: "#D9877B" },
  gray: { name: "灰白", fur: "#D8D8D6", shade: "#878E96", accent: "#F8F8F5", blush: "#E99A9A" },
  blue: { name: "淡藍", fur: "#8DC7E8", shade: "#4E83A6", accent: "#D8F1FF", blush: "#F5A1B1" },
  mint: { name: "薄荷綠", fur: "#8DDEBF", shade: "#4E9C7F", accent: "#DDF9EC", blush: "#F29E9E" },
  lavender: { name: "薰衣草紫", fur: "#B9A6EA", shade: "#7966B6", accent: "#EEE7FF", blush: "#F09CBA" }
};

export const COLOR_OPTIONS = Object.keys(PET_COLORS) as PetColorId[];

export const FOODS: Food[] = [
  { id: "fish", label: "小魚乾", icon: "fish", hungerBoost: 8 },
  { id: "can", label: "罐頭", icon: "can", hungerBoost: 14 },
  { id: "bento", label: "便當", icon: "bento", hungerBoost: 22 },
  { id: "snack", label: "零食", icon: "snack", hungerBoost: 5, moodBoost: 8 }
];

export const DECAY_PER_HOUR = {
  hunger: 8,
  cleanliness: 5,
  mood: 3
} as const;

export const BATH_COOLDOWN_MS = 6 * 60 * 60 * 1000;
export const FEED_COOLDOWN_MS = 45 * 60 * 1000;
export const FEED_FULL_THRESHOLD = 85;
export const PLAY_COOLDOWN_MS = 4 * 60 * 60 * 1000;
export const SICK_GRACE_MS = 2 * 60 * 60 * 1000;

export const FAKE_LEADERBOARD: LeaderboardEntry[] = [
  {
    id: "jason",
    username: "Jason",
    petName: "Kiki",
    petType: "cat",
    petColor: "orange",
    hunger: 96,
    cleanliness: 88,
    mood: 92,
    isSick: false,
    lastCareAt: new Date(Date.now() - 2 * 60 * 1000).toISOString()
  },
  {
    id: "nico",
    username: "Nico",
    petName: "Dango",
    petType: "dog",
    petColor: "brown",
    hunger: 70,
    cleanliness: 58,
    mood: 73,
    isSick: false,
    lastCareAt: new Date(Date.now() - 60 * 60 * 1000).toISOString()
  },
  {
    id: "mei",
    username: "小美",
    petName: "Maru",
    petType: "cat",
    petColor: "gray",
    hunger: 84,
    cleanliness: 83,
    mood: 88,
    isSick: false,
    lastCareAt: new Date(Date.now() - 6 * 60 * 1000).toISOString()
  },
  {
    id: "hao",
    username: "阿豪",
    petName: "Panda",
    petType: "dog",
    petColor: "lavender",
    hunger: 18,
    cleanliness: 23,
    mood: 27,
    isSick: false,
    lastCareAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "luna",
    username: "Luna",
    petName: "Mochi",
    petType: "cat",
    petColor: "mint",
    hunger: 78,
    cleanliness: 71,
    mood: 80,
    isSick: false,
    lastCareAt: new Date(Date.now() - 24 * 60 * 1000).toISOString()
  },
  {
    id: "riku",
    username: "Riku",
    petName: "Sora",
    petType: "dog",
    petColor: "blue",
    hunger: 60,
    cleanliness: 63,
    mood: 55,
    isSick: false,
    lastCareAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  }
];
