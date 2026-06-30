"use client";

import { FAKE_LEADERBOARD, initialNekoData } from "@/lib/constants";
import { loadNekoData, saveNekoData } from "@/lib/storage";
import { normalizeNekoData } from "@/lib/petCollection";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { LeaderboardEntry, NekoData, Pet, PetColorId, PetType, User } from "@/types";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "");

// ─── HTTP Client Helper (uses Supabase session token) ────────────────────────

async function getSupabaseToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch (err) {
    console.warn("Failed to retrieve Supabase session token:", err);
    return null;
  }
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  if (!BACKEND_URL) {
    throw new Error("NEXT_PUBLIC_BACKEND_URL is not configured.");
  }

  const url = `${BACKEND_URL.replace(/\/$/, "")}${path}`;
  const headers = new Headers(options.headers || {});

  const token = await getSupabaseToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (
    (options.method === "POST" || options.method === "PUT" || options.method === "PATCH") &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, { ...options, headers });
}

// ─── Authentication API ──────────────────────────────────────────────────────

export type AuthState = {
  isConfigured: boolean;
  userId: string | null;
  email: string | null;
};

export async function getAuthState(): Promise<AuthState> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { isConfigured: false, userId: null, email: null };

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { isConfigured: true, userId: null, email: null };

    return {
      isConfigured: true,
      userId: user.id,
      email: user.email ?? null,
    };
  } catch (err) {
    console.warn("Failed to retrieve auth state from Supabase:", err);
    return {
      isConfigured: true,
      userId: null,
      email: null,
    };
  }
}

function parseBackendError(errorObj: any): string {
  if (!errorObj) return "發生未知錯誤。";
  const detail = errorObj.detail;
  if (!detail) return typeof errorObj === "string" ? errorObj : "發生未知錯誤。";
  
  if (typeof detail === "string") {
    if (detail === "Email already registered") return "該電子信箱已被使用。";
    if (detail === "Username already registered") return "該使用者名稱已被使用。";
    if (detail === "Invalid email or password") return "信箱或密碼錯誤。";
    if (detail === "Account is disabled") return "帳號已被停用。";
    return detail;
  }
  
  if (Array.isArray(detail)) {
    return detail
      .map((err: any) => {
        const field = err.loc?.[1];
        let fieldLabel = "";
        if (field === "email") fieldLabel = "電子信箱";
        else if (field === "username") fieldLabel = "使用者名稱";
        else if (field === "password") fieldLabel = "密碼";
        
        let msg = err.msg || "";
        if (msg.includes("Password must contain at least one digit")) {
          msg = "必須包含至少一個數字。";
        } else if (msg.includes("Password must contain at least one letter")) {
          msg = "必須包含至少一個英文字母。";
        } else if (msg.includes("value is not a valid email address")) {
          msg = "格式不正確。";
        } else if (msg.includes("should have at least")) {
          msg = "長度不足。";
        } else if (msg.startsWith("Value error, ")) {
          msg = msg.replace("Value error, ", "");
        }
        
        return fieldLabel ? `${fieldLabel}${msg}` : msg;
      })
      .join(" ");
  }
  
  return typeof detail === "string" ? detail : JSON.stringify(detail);
}

export async function signInWithEmailAndPassword(email: string, password: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { error: "Supabase 未設定。" };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.includes("Invalid login credentials")) return { error: "信箱或密碼錯誤。" };
    if (error.message.includes("Email not confirmed")) return { error: "請先確認您的電子信箱。" };
    return { error: error.message };
  }

  // Ensure profile exists on backend
  try {
    await apiFetch("/api/v1/auth/profile/setup", { method: "POST" });
  } catch (err) {
    console.warn("Failed to setup profile", err);
  }

  return { error: null };
}

export async function signUpWithEmailAndPassword(email: string, username: string, password: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { error: "Supabase 未設定。" };

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } }
  });

  if (error) {
    if (error.message.includes("already registered")) return { error: "該電子信箱已被使用。" };
    return { error: error.message };
  }

  // Create profile row on backend (uses the new Supabase session)
  try {
    await apiFetch("/api/v1/auth/profile/setup", { method: "POST" });
  } catch (err) {
    console.warn("Failed to setup profile after signup", err);
  }

  return { error: null };
}

export async function signOut() {
  const supabase = getSupabaseBrowserClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
}

export async function forgotPassword(email: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { error: "Supabase 未設定。" };

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_FRONTEND_URL ?? "http://localhost:3000"}/reset-password`
  });
  if (error) return { error: error.message };
  return { error: null, message: "密碼重設連結已發送至您的信箱。" };
}

export async function resetPassword(token: string, newPassword: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { error: "Supabase 未設定。" };

  // token is handled by Supabase session after redirect; just update password
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };
  return { error: null, message: "密碼已重設成功！" };
}

// ─── Pet & Data Loading/Saving ───────────────────────────────────────────────

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
};

export async function loadCurrentNekoData(): Promise<{ data: NekoData; auth: AuthState; source: "supabase" | "local" }> {
  const auth = await getAuthState();
  if (!auth.userId) {
    return { data: loadNekoData(), auth, source: "local" };
  }

  try {
    // 1. Fetch user info
    const meResponse = await apiFetch("/api/v1/auth/me");
    if (!meResponse.ok) return { data: loadNekoData(), auth, source: "local" };
    const me = await meResponse.json();
    const user: User = {
      id: me.id,
      username: me.username,
      createdAt: me.created_at
    };

    // 2. Fetch pet info
    const petResponse = await apiFetch("/api/v1/pets/me");
    if (petResponse.status === 404) {
      // User has no pet yet
      return {
        data: normalizeNekoData({
          version: 1,
          user,
          pets: [],
          activePetId: null,
          pet: null
        }),
        auth,
        source: "supabase"
      };
    }

    if (petResponse.ok) {
      const dbPet: DbPet = await petResponse.json();
      const mappedPet = mapPet(dbPet);
      return {
        data: normalizeNekoData({
          version: 1,
          user,
          pets: [mappedPet],
          activePetId: mappedPet.id,
          pet: mappedPet
        }),
        auth,
        source: "supabase"
      };
    }
  } catch (err) {
    console.error("Failed to load neko data from backend", err);
  }

  return { data: loadNekoData(), auth, source: "local" };
}

export async function saveCurrentNekoData(data: NekoData) {
  const normalized = normalizeNekoData(data);
  const auth = await getAuthState();
  
  if (!auth.userId || !normalized.user || !normalized.pet) {
    saveNekoData(normalized);
    return "local" as const;
  }

  try {
    // Check if the pet already exists on the backend
    const checkResponse = await apiFetch("/api/v1/pets/me");
    
    if (checkResponse.status === 404) {
      // Create pet
      const createResponse = await apiFetch("/api/v1/pets", {
        method: "POST",
        body: JSON.stringify({
          name: normalized.pet.name,
          type: normalized.pet.type,
          color: normalized.pet.color
        })
      });
      if (!createResponse.ok) {
        saveNekoData(normalized);
        return "local" as const;
      }
      const dbPet = await createResponse.json();
      const mappedPet = mapPet(dbPet);
      normalized.pet = mappedPet;
      normalized.pets = [mappedPet];
      normalized.activePetId = mappedPet.id;
    } else if (checkResponse.ok) {
      // Update pet care stats
      const updateResponse = await apiFetch("/api/v1/pets/me", {
        method: "PUT",
        body: JSON.stringify({
          hunger: normalized.pet.hunger,
          cleanliness: normalized.pet.cleanliness,
          mood: normalized.pet.mood,
          is_sick: normalized.pet.isSick,
          zero_since_at: normalized.pet.zeroSinceAt,
          last_fed_at: normalized.pet.lastFedAt,
          last_bath_at: normalized.pet.lastBathAt,
          last_play_at: normalized.pet.lastPlayAt
        })
      });
      if (!updateResponse.ok) {
        saveNekoData(normalized);
        return "local" as const;
      }
    } else {
      saveNekoData(normalized);
      return "local" as const;
    }

    saveNekoData(normalized);
    return "supabase" as const;
  } catch (err) {
    console.error("Failed to save neko data to backend", err);
    saveNekoData(normalized);
    return "local" as const;
  }
}

// ─── Leaderboard API ─────────────────────────────────────────────────────────

export async function loadLeaderboard(currentData: NekoData | null): Promise<LeaderboardEntry[]> {
  const auth = await getAuthState();

  try {
    const response = await apiFetch("/api/v1/pets/leaderboard");
    if (response.ok) {
      const data = await response.json();
      const remote = data.map((pet: DbPet & { username: string }) => 
        mapPetEntry(pet, pet.username, pet.user_id === auth.userId)
      );
      return remote.length ? remote : mergeLocalLeaderboard(currentData);
    }
  } catch (err) {
    console.error("Failed to load leaderboard from backend", err);
  }

  return mergeLocalLeaderboard(currentData);
}

export async function loadPublicRoom(petId: string, currentData: NekoData | null = null): Promise<LeaderboardEntry | null> {
  const localData = currentData ?? loadNekoData();
  
  try {
    const response = await apiFetch(`/api/v1/pets/${petId}`);
    if (response.ok) {
      const pet = await response.json();
      // Since public room needs owner username, and /pets/{pet_id} doesn't return username,
      // we can either fetch leaderboard or fallback to "Neko 用戶". Let's check leaderboard first.
      const leaderboard = await loadLeaderboard(localData);
      const matched = leaderboard.find(e => e.id === pet.id);
      if (matched) return matched;

      const auth = await getAuthState();
      return mapPetEntry(pet, "Neko 用戶", pet.user_id === auth.userId);
    }
  } catch (err) {
    console.error("Failed to load public room", err);
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

// ─── Settings & Friends API ──────────────────────────────────────────────────

export async function getMyProfile() {
  const response = await apiFetch("/api/v1/users/me/profile");
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "無法載入個人資料。");
  }
  return response.json();
}

export async function updateProfile(data: { username?: string; avatar?: string; bio?: string }) {
  const response = await apiFetch("/api/v1/users/me/profile", {
    method: "PATCH",
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "更新個人資料失敗。");
  }
  return response.json();
}

export async function changePassword(data: any) {
  const response = await apiFetch("/api/v1/users/me/password", {
    method: "POST",
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "變更密碼失敗。");
  }
  return response.json();
}

export async function searchUserByFriendCode(friendCode: string) {
  const response = await apiFetch(`/api/v1/users/search?friend_code=${encodeURIComponent(friendCode)}`);
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "找不到該好友碼的使用者。");
  }
  return response.json();
}

export async function listFriends() {
  const response = await apiFetch("/api/v1/users/me/friends");
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "無法載入好友列表。");
  }
  return response.json();
}

export async function listPendingFriendRequests() {
  const response = await apiFetch("/api/v1/users/me/friends/pending");
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "無法載入待處理的好友邀請。");
  }
  return response.json();
}

export async function sendFriendRequest(friendCode: string) {
  const response = await apiFetch("/api/v1/users/me/friends", {
    method: "POST",
    body: JSON.stringify({ friend_code: friendCode })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "送出好友邀請失敗。");
  }
  return response.json();
}

export async function respondFriendRequest(friendshipId: string, action: "accept" | "decline") {
  const response = await apiFetch(`/api/v1/users/me/friends/${friendshipId}`, {
    method: "PATCH",
    body: JSON.stringify({ action })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "回覆好友邀請失敗。");
  }
  return response.json();
}

export async function removeFriend(friendId: string) {
  const response = await apiFetch(`/api/v1/users/me/friends/${friendId}`, {
    method: "DELETE"
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "刪除好友失敗。");
  }
  return response.json();
}

// ─── Mapping Helpers ─────────────────────────────────────────────────────────

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
