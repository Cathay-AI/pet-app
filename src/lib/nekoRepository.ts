"use client";

import { FAKE_LEADERBOARD, initialNekoData } from "@/lib/constants";
import { decayPet } from "@/lib/gameLogic";
import { loadNekoData, saveNekoData } from "@/lib/storage";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { LeaderboardEntry, NekoData, Pet, PetColorId, PetType, User } from "@/types";

type DbProfile = {
  id: string;
  username: string;
  created_at: string;
};

type DbPet = {
  id: string;
  user_id: string;
  name: string;
  type: PetType;
  color: PetColorId;
  hunger: number;
  cleanliness: number;
  mood: number;
  is_sick: boolean;
  zero_since_at: string | null;
  last_fed_at: string | null;
  last_bath_at: string | null;
  last_play_at: string | null;
  updated_at: string;
  profiles?: Pick<DbProfile, "username"> | null;
};

export type AuthState = {
  isConfigured: boolean;
  userId: string | null;
  email: string | null;
};

export async function getAuthState(): Promise<AuthState> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { isConfigured: false, userId: null, email: null };

  const { data } = await supabase.auth.getUser();
  return {
    isConfigured: true,
    userId: data.user?.id ?? null,
    email: data.user?.email ?? null
  };
}

export async function signInWithEmail(email: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { error: "目前只能在這台裝置照顧，分數不會公開。" };

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: typeof window === "undefined" ? undefined : `${window.location.origin}/home`
    }
  });

  return { error: error?.message ?? null };
}

export async function signOut() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function loadCurrentNekoData(): Promise<{ data: NekoData; auth: AuthState; source: "supabase" | "local" }> {
  const auth = await getAuthState();
  if (!auth.isConfigured || !auth.userId) {
    return { data: loadNekoData(), auth, source: "local" };
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { data: loadNekoData(), auth, source: "local" };

  const [{ data: profile }, { data: pet }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", auth.userId).maybeSingle<DbProfile>(),
    supabase.from("pets").select("*").eq("user_id", auth.userId).maybeSingle<DbPet>()
  ]);

  if (!profile || !pet) return { data: initialNekoData, auth, source: "supabase" };

  return {
    data: {
      version: 1,
      user: mapProfile(profile),
      pet: decayPet(mapPet(pet))
    },
    auth,
    source: "supabase"
  };
}

export async function saveCurrentNekoData(data: NekoData) {
  const auth = await getAuthState();
  if (!auth.isConfigured || !auth.userId || !data.user || !data.pet) {
    saveNekoData(data);
    return "local" as const;
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    saveNekoData(data);
    return "local" as const;
  }

  const profile = {
    id: auth.userId,
    username: data.user.username,
    created_at: data.user.createdAt
  };
  const pet = {
    id: data.pet.id,
    user_id: auth.userId,
    name: data.pet.name,
    type: data.pet.type,
    color: data.pet.color,
    hunger: data.pet.hunger,
    cleanliness: data.pet.cleanliness,
    mood: data.pet.mood,
    is_sick: data.pet.isSick,
    zero_since_at: data.pet.zeroSinceAt,
    last_fed_at: data.pet.lastFedAt,
    last_bath_at: data.pet.lastBathAt,
    last_play_at: data.pet.lastPlayAt,
    updated_at: data.pet.updatedAt
  };

  const { error: profileError } = await supabase.from("profiles").upsert(profile);
  if (profileError) {
    saveNekoData(data);
    return "local" as const;
  }

  const { error: petError } = await supabase.from("pets").upsert(pet);
  if (petError) {
    saveNekoData(data);
    return "local" as const;
  }

  return "supabase" as const;
}

export async function loadLeaderboard(currentData: NekoData | null): Promise<LeaderboardEntry[]> {
  const auth = await getAuthState();
  const supabase = getSupabaseBrowserClient();

  if (!auth.isConfigured || !supabase) {
    return mergeLocalLeaderboard(currentData);
  }

  const { data, error } = await supabase
    .from("pets")
    .select("*, profiles(username)")
    .order("updated_at", { ascending: false })
    .limit(50)
    .returns<DbPet[]>();

  if (error || !data) return mergeLocalLeaderboard(currentData);

  const remote = data.map((pet) => ({
    id: pet.id,
    username: pet.profiles?.username ?? "Neko 用戶",
    petName: pet.name,
    petType: pet.type,
    petColor: pet.color,
    hunger: pet.hunger,
    cleanliness: pet.cleanliness,
    mood: pet.mood,
    isSick: pet.is_sick,
    lastCareAt: latestCareAt(mapPet(pet)),
    isSelf: pet.user_id === auth.userId
  }));

  return remote.length ? remote : mergeLocalLeaderboard(currentData);
}

export function mergeLocalLeaderboard(data: NekoData | null) {
  const self: LeaderboardEntry[] =
    data?.user && data.pet
      ? [
          {
            id: data.user.id,
            username: data.user.username,
            petName: data.pet.name,
            petType: data.pet.type,
            petColor: data.pet.color,
            hunger: data.pet.hunger,
            cleanliness: data.pet.cleanliness,
            mood: data.pet.mood,
            isSick: data.pet.isSick,
            lastCareAt: latestCareAt(data.pet),
            isSelf: true
          }
        ]
      : [];

  return [...FAKE_LEADERBOARD, ...self];
}

function mapProfile(profile: DbProfile): User {
  return {
    id: profile.id,
    username: profile.username,
    createdAt: profile.created_at
  };
}

function mapPet(pet: DbPet): Pet {
  return {
    id: pet.id,
    userId: pet.user_id,
    name: pet.name,
    type: pet.type,
    color: pet.color,
    hunger: pet.hunger,
    cleanliness: pet.cleanliness,
    mood: pet.mood,
    isSick: pet.is_sick,
    zeroSinceAt: pet.zero_since_at,
    lastFedAt: pet.last_fed_at,
    lastBathAt: pet.last_bath_at,
    lastPlayAt: pet.last_play_at,
    updatedAt: pet.updated_at
  };
}

function latestCareAt(pet: Pick<Pet, "lastFedAt" | "lastBathAt" | "lastPlayAt" | "updatedAt">) {
  return [pet.lastFedAt, pet.lastBathAt, pet.lastPlayAt, pet.updatedAt]
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}
