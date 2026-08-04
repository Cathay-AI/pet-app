from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Literal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.users.profile import Profile

PetType = Literal["cat", "dog"]
PetColor = Literal["orange", "brown", "gray", "blue", "mint", "lavender"]


class Pet(Base):
    """
    A virtual pet owned by exactly one user.

    Rules
    -----
    - One user can have at most ONE pet (enforced in PetService.create).
    - Stats (hunger, cleanliness, mood) are stored as last-known values;
      real-time decay is computed by the client when reading, not on a timer.
    - is_sick becomes true when any stat hits 0 (managed by the client / future
      care-event endpoint).

    Columns
    -------
    id            UUID PK
    user_id       FK → users.id (cascade delete)
    name          1–24 chars
    type          'cat' | 'dog'
    color         one of the six palette options
    hunger        0–100, starts at 100
    cleanliness   0–100, starts at 100
    mood          0–100, starts at 100
    is_sick       set to true when zero_since_at is set
    zero_since_at timestamp when all stats first hit 0
    last_fed_at   last feed action
    last_bath_at  last bath action
    last_play_at  last play action
    updated_at    auto-updated on every write
    """

    __tablename__ = "pets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,   # ← enforces 1-pet-per-user at DB level
        index=True,
    )
    name: Mapped[str] = mapped_column(String(24), nullable=False)
    type: Mapped[str] = mapped_column(String(3), nullable=False)    # cat | dog
    color: Mapped[str] = mapped_column(String(10), nullable=False)  # palette id

    hunger: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    cleanliness: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    mood: Mapped[int] = mapped_column(Integer, nullable=False, default=100)

    is_sick: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    zero_since_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    last_fed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    last_bath_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    last_play_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    last_visited_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationship (lazy-loaded by default)
    user: Mapped["Profile"] = relationship("Profile", back_populates="pet")
