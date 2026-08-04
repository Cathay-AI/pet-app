export type PetType = "cat" | "dog";

export type PetAnimation =
  | "idle"
  | "happy"
  | "sad"
  | "eating"
  | "bathing"
  | "sick"
  | "sleeping"
  | "walking";

export type PetColorId = "orange" | "brown" | "gray" | "blue" | "mint" | "lavender";

export type PixelIconName =
  | "feed"
  | "bath"
  | "poop"
  | "play"
  | "fish"
  | "can"
  | "bento"
  | "snack"
  | "home"
  | "rank"
  | "stats"
  | "user";

export type User = {
  id: string;
  username: string;
  createdAt: string;
};

export type Pet = {
  id: string;
  userId: string;
  name: string;
  type: PetType;
  color: PetColorId;
  hunger: number;
  cleanliness: number;
  mood: number;
  isSick: boolean;
  zeroSinceAt: string | null;
  lastFedAt: string | null;
  lastBathAt: string | null;
  lastPlayAt: string | null;
  updatedAt: string;
};

export type NekoData = {
  version: 1;
  user: User | null;
  pets: Pet[];
  activePetId: string | null;
  pet: Pet | null;
};

export type LeaderboardEntry = {
  id: string;
  userId: string;
  username: string;
  petName: string;
  petType: PetType;
  petColor: PetColorId;
  hunger: number;
  cleanliness: number;
  mood: number;
  isSick: boolean;
  lastCareAt: string | undefined;
  isSelf?: boolean;
  isFriend?: boolean;
  rank?: number;
  rankChange?: number; // 正數=上升, 負數=下降, null/undefined=無變化或新進榜
  healthScore?: number;
};

export type FriendsLeaderboard = {
  friends: LeaderboardEntry[];
  selfEntry: LeaderboardEntry | null;
  totalFriends: number;
  lastUpdated: string;
};

export type SuggestedUser = {
  id: string;
  username: string;
  friendCode: string;
  petName: string;
  petType: PetType;
  petColor: PetColorId;
  healthScore: number;
  mutualFriends: number;
  reason: string;
};

export type SuggestionsResponse = {
  suggestions: SuggestedUser[];
  total: number;
};

export type Food = {
  id: "fish" | "can" | "bento" | "snack";
  label: string;
  icon: PixelIconName;
  hungerBoost: number;
  moodBoost?: number;
};
