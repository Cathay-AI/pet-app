"""Leaderboard response schemas."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class LeaderboardPetEntry(BaseModel):
    """A pet entry in the leaderboard."""

    id: str
    user_id: str
    username: str
    pet_name: str
    pet_type: str  # "cat" or "dog"
    pet_color: str
    hunger: int = Field(ge=0, le=100)
    cleanliness: int = Field(ge=0, le=100)
    mood: int = Field(ge=0, le=100)
    is_sick: bool
    health_score: int = Field(ge=0, le=100, description="Calculated health score")
    last_care_at: datetime
    updated_at: datetime
    is_self: bool = Field(default=False, description="Whether this is the current user's pet")
    is_friend: bool = Field(default=False, description="Whether this user is a friend")
    rank: Optional[int] = Field(default=None, description="Current rank position")
    rank_change: Optional[int] = Field(default=None, description="Rank change since last snapshot (+ up, - down)")


class FriendsLeaderboardResponse(BaseModel):
    """Friends leaderboard response with rank tracking."""

    friends: list[LeaderboardPetEntry]
    self_entry: Optional[LeaderboardPetEntry] = Field(
        default=None,
        description="Current user's entry if not in friends list"
    )
    total_friends: int
    last_updated: datetime


class SuggestedUserEntry(BaseModel):
    """A suggested user who might be a good friend."""

    id: str
    username: str
    friend_code: str
    pet_name: str
    pet_type: str
    pet_color: str
    health_score: int
    mutual_friends: int = Field(default=0, description="Number of mutual friends")
    reason: str = Field(default="Active player", description="Why this user is suggested")


class SuggestionsResponse(BaseModel):
    """Suggested users response."""

    suggestions: list[SuggestedUserEntry]
    total: int
