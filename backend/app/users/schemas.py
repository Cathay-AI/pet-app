"""Pydantic schemas for the users / friends domain."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


# ─── Avatar enum ─────────────────────────────────────────────────────────────

VALID_AVATARS = {
    "cat_orange", "cat_gray", "cat_lavender",
    "dog_brown", "dog_gray", "dog_blue",
}


# ─── Profile requests ─────────────────────────────────────────────────────────

class UpdateProfileRequest(BaseModel):
    """Body for PATCH /users/me/profile"""

    username: str | None = Field(
        default=None, min_length=1, max_length=24,
        description="New display name (1-24 chars)"
    )
    avatar: str | None = Field(
        default=None,
        description=f"Avatar code, one of: {sorted(VALID_AVATARS)}"
    )
    bio: str | None = Field(
        default=None, max_length=160,
        description="Short personal bio (max 160 chars)"
    )

    @field_validator("avatar")
    @classmethod
    def validate_avatar(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_AVATARS:
            raise ValueError(f"Invalid avatar. Must be one of: {sorted(VALID_AVATARS)}")
        return v


# ─── Friend requests ──────────────────────────────────────────────────────────

class FriendRequestCreate(BaseModel):
    """Body for POST /users/me/friends"""

    friend_code: str = Field(
        ..., pattern=r"^NEKO-[A-Z0-9]{4}$",
        description="Target user's friend code, e.g. NEKO-A3B7"
    )


class FriendRequestAction(BaseModel):
    """Body for PATCH /users/me/friends/{friendship_id}"""

    action: Literal["accept", "decline"]


# ─── Response schemas ─────────────────────────────────────────────────────────

class PetSnapshot(BaseModel):
    """Minimal pet info embedded in user profiles."""

    name: str
    type: str
    color: str
    mood: int

    model_config = {"from_attributes": True}


class UserProfilePublic(BaseModel):
    """Public profile of any user (returned on search / friend list)."""

    id: uuid.UUID
    username: str
    friend_code: str | None = None
    avatar: str | None = None
    bio: str | None = None
    pet: PetSnapshot | None = None

    model_config = {"from_attributes": True}


class FriendshipPublic(BaseModel):
    """Friendship row with embedded profile of the other party."""

    id: uuid.UUID
    status: str
    created_at: datetime

    # The other user (requester or addressee depending on context)
    user: UserProfilePublic

    model_config = {"from_attributes": True}


class MyProfileResponse(BaseModel):
    """Full self-profile response."""

    id: uuid.UUID
    username: str
    friend_code: str | None = None
    avatar: str | None = None
    bio: str | None = None
    pet: PetSnapshot | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
