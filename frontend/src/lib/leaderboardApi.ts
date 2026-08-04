import type { FriendsLeaderboard, SuggestionsResponse } from "@/types";

// Allow localhost only in development; fail clearly in production when backend URL is missing
const getBackendUrl = () => {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!url) {
    if (process.env.NODE_ENV === "development") {
      return "http://localhost:8000";
    }
    throw new Error("NEXT_PUBLIC_BACKEND_URL is not configured for production");
  }
  return url;
};

/**
 * Fetch friends leaderboard from backend API
 */
export async function fetchFriendsLeaderboard(token: string): Promise<FriendsLeaderboard> {
  const response = await fetch(`${getBackendUrl()}/api/v1/leaderboard/friends`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch friends leaderboard: ${response.statusText}`);
  }

  const data = await response.json();

  // Transform backend response to frontend format
  return {
    friends: data.friends.map((entry: any) => ({
      id: entry.id,
      userId: entry.user_id,
      username: entry.username,
      petName: entry.pet_name,
      petType: entry.pet_type,
      petColor: entry.pet_color,
      hunger: entry.hunger,
      cleanliness: entry.cleanliness,
      mood: entry.mood,
      isSick: entry.is_sick,
      lastCareAt: entry.last_care_at,
      isSelf: entry.is_self,
      isFriend: entry.is_friend,
      rank: entry.rank,
      rankChange: entry.rank_change,
      healthScore: entry.health_score
    })),
    selfEntry: data.self_entry
      ? {
          id: data.self_entry.id,
          userId: data.self_entry.user_id,
          username: data.self_entry.username,
          petName: data.self_entry.pet_name,
          petType: data.self_entry.pet_type,
          petColor: data.self_entry.pet_color,
          hunger: data.self_entry.hunger,
          cleanliness: data.self_entry.cleanliness,
          mood: data.self_entry.mood,
          isSick: data.self_entry.is_sick,
          lastCareAt: data.self_entry.last_care_at,
          isSelf: data.self_entry.is_self,
          healthScore: data.self_entry.health_score
        }
      : null,
    totalFriends: data.total_friends,
    lastUpdated: data.last_updated
  };
}

/**
 * Fetch suggested users from backend API
 */
export async function fetchSuggestions(token: string, limit = 10): Promise<SuggestionsResponse> {
  const response = await fetch(`${getBackendUrl()}/api/v1/leaderboard/suggestions?limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch suggestions: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    suggestions: data.suggestions.map((suggestion: any) => ({
      id: suggestion.id,
      username: suggestion.username,
      friendCode: suggestion.friend_code,
      petName: suggestion.pet_name,
      petType: suggestion.pet_type,
      petColor: suggestion.pet_color,
      healthScore: suggestion.health_score,
      mutualFriends: suggestion.mutual_friends,
      reason: suggestion.reason
    })),
    total: data.total
  };
}

/**
 * Send friend request via friend code
 */
export async function sendFriendRequest(token: string, friendCode: string): Promise<void> {
  const response = await fetch(`${getBackendUrl()}/api/v1/users/me/friends`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ friend_code: friendCode })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to send friend request");
  }
}
