"use client";

import { FAKE_LEADERBOARD, initialNekoData } from "@/lib/constants";
import { loadNekoData, saveNekoData } from "@/lib/storage";
import { normalizeNekoData } from "@/lib/petCollection";
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

  const [{ data: profile }, { data: pets }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", auth.userId).maybeSingle<DbProfile>(),
    supabase.from("pets").select("*").eq("user_id", auth.userId).order("updated_at", { ascending: false }).returns<DbPet[]>()
  ]);

  if (!profile || !pets?.length) return { data: initialNekoData, auth, source: "supabase" };

  const localData = loadNekoData();
  const mappedPets = pets.map(mapPet);
  const localActiveId = mappedPets.some((pet) => pet.id === localData.activePetId) ? localData.activePetId : null;
  const activePetId = localActiveId ?? mappedPets[0]?.id ?? null;

  return {
    data: normalizeNekoData({
      version: 1,
      user: mapProfile(profile),
      pets: mappedPets,
      activePetId,
      pet: mappedPets.find((pet) => pet.id === activePetId) ?? mappedPets[0] ?? null
    }),
    auth,
    source: "supabase"
  };
}

export async function saveCurrentNekoData(data: NekoData) {
  const normalized = normalizeNekoData(data);
  const auth = await getAuthState();
  if (!auth.isConfigured || !auth.userId || !normalized.user || !normalized.pet) {
    saveNekoData(normalized);
    return "local" as const;
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    saveNekoData(normalized);
    return "local" as const;
  }

  const profile = {
    id: auth.userId,
    username: normalized.user.username,
    created_at: normalized.user.createdAt
  };
  const pets = normalized.pets.map((pet) => ({
    id: pet.id,
    user_id: auth.userId,
    name: pet.name,
    type: pet.type,
    color: pet.color,
    hunger: pet.hunger,
    cleanliness: pet.cleanliness,
    mood: pet.mood,
    is_sick: pet.isSick,
    zero_since_at: pet.zeroSinceAt,
    last_fed_at: pet.lastFedAt,
    last_bath_at: pet.lastBathAt,
    last_play_at: pet.lastPlayAt,
    updated_at: pet.updatedAt
  }));

  const { error: profileError } = await supabase.from("profiles").upsert(profile);
  if (profileError) {
    saveNekoData(normalized);
    return "local" as const;
  }

  const { error: petError } = await supabase.from("pets").upsert(pets);
  if (petError) {
    saveNekoData(normalized);
    return "local" as const;
  }

  saveNekoData(normalized);
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

  const remote = data.map((pet) => mapPetEntry(pet, pet.profiles?.username ?? "Neko 用戶", pet.user_id === auth.userId));

  return remote.length ? remote : mergeLocalLeaderboard(currentData);
}

export async function loadPublicRoom(petId: string, currentData: NekoData | null = null): Promise<LeaderboardEntry | null> {
  const localData = currentData ?? loadNekoData();
  const supabase = getSupabaseBrowserClient();

  if (supabase) {
    const auth = await getAuthState();
    const { data, error } = await supabase
      .from("pets")
      .select("*, profiles(username)")
      .eq("id", petId)
      .maybeSingle<DbPet>();

    if (!error && data) {
      return mapPetEntry(data, data.profiles?.username ?? "Neko 用戶", data.user_id === auth.userId);
    }
  }

  return localRoomEntries(localData).find((entry) => entry.id === petId) ?? null;
}

export function mergeLocalLeaderboard(data: NekoData | null) {
  const self: LeaderboardEntry[] =
    data?.user && data.pet
      ? [mapLocalPetEntry(data.user, data.pet, true)]
      : [];

  return [...FAKE_LEADERBOARD, ...self];
}

function localRoomEntries(data: NekoData | null) {
  const localEntries =
    data?.user && data.pets.length ? data.pets.map((pet) => mapLocalPetEntry(data.user as User, pet, true)) : [];
  return [...FAKE_LEADERBOARD, ...localEntries];
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

function mapPetEntry(pet: DbPet, username: string, isSelf: boolean): LeaderboardEntry {
  return {
    id: pet.id,
    username,
    petName: pet.name,
    petType: pet.type,
    petColor: pet.color,
    hunger: pet.hunger,
    cleanliness: pet.cleanliness,
    mood: pet.mood,
    isSick: pet.is_sick,
    lastCareAt: latestCareAt(mapPet(pet)),
    isSelf
  };
}

function mapLocalPetEntry(user: User, pet: Pet, isSelf: boolean): LeaderboardEntry {
  return {
    id: pet.id,
    username: user.username,
    petName: pet.name,
    petType: pet.type,
    petColor: pet.color,
    hunger: pet.hunger,
    cleanliness: pet.cleanliness,
    mood: pet.mood,
    isSick: pet.isSick,
    lastCareAt: latestCareAt(pet),
    isSelf
  };
}

function latestCareAt(pet: Pick<Pet, "lastFedAt" | "lastBathAt" | "lastPlayAt" | "updatedAt">) {
  return [pet.lastFedAt, pet.lastBathAt, pet.lastPlayAt, pet.updatedAt]
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}
