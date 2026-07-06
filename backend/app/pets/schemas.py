import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

PetType = Literal["cat", "dog"]
PetColor = Literal["orange", "brown", "gray", "blue", "mint", "lavender"]


# ─── Request ──────────────────────────────────────────────────────────────────

class CreatePetRequest(BaseModel):
    """Body for POST /pets"""

    name: str = Field(..., min_length=1, max_length=24, description="Pet display name")
    type: PetType = Field(..., description="'cat' or 'dog'")
    color: PetColor = Field(
        ...,
        description="Palette colour ID: orange | brown | gray | blue | mint | lavender",
    )


# ─── Response ─────────────────────────────────────────────────────────────────

class PetResponse(BaseModel):
    """Full pet data returned from the API – mirrors frontend Pet type."""

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    type: PetType
    color: PetColor
    hunger: int
    cleanliness: int
    mood: int
    is_sick: bool
    zero_since_at: datetime | None
    last_fed_at: datetime | None
    last_bath_at: datetime | None
    last_play_at: datetime | None
    last_visited_at: datetime | None = None
    updated_at: datetime

    model_config = {"from_attributes": True}


class UpdatePetRequest(BaseModel):
    """Body for PUT /pets/me to update care stats"""

    hunger: int = Field(..., ge=0, le=100)
    cleanliness: int = Field(..., ge=0, le=100)
    mood: int = Field(..., ge=0, le=100)
    is_sick: bool
    zero_since_at: datetime | None = None
    last_fed_at: datetime | None = None
    last_bath_at: datetime | None = None
    last_play_at: datetime | None = None


class LeaderboardPetResponse(BaseModel):
    """Pet data returned in leaderboard including owner's username"""

    id: uuid.UUID
    username: str
    name: str
    type: PetType
    color: PetColor
    hunger: int
    cleanliness: int
    mood: int
    is_sick: bool
    last_fed_at: datetime | None = None
    last_bath_at: datetime | None = None
    last_play_at: datetime | None = None
    last_visited_at: datetime | None = None
    updated_at: datetime

    model_config = {"from_attributes": True}
