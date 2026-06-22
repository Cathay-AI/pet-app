from __future__ import annotations

"""
Auth domain ORM models.

With Supabase Auth, we no longer manage passwords or refresh tokens.
Instead we maintain a public.profiles table that mirrors auth.users (1:1).
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.pets.models import Pet
    from app.users.models import Friendship


class Profile(Base):
    """
    User profile — mirrors auth.users (1:1 relationship via shared UUID PK).

    Created by the app on first login (after Supabase Auth creates the auth.users row).

    Columns
    -------
    id           UUID — same as auth.users.id (FK managed by Supabase).
    username     Display name shown in the app (1-24 chars).
    friend_code  Unique NEKO-XXXX code for adding friends.
    avatar       Optional avatar identifier string.
    bio          Optional short bio (max 160 chars).
    created_at   Row creation timestamp (UTC).
    updated_at   Last modification timestamp (UTC).
    """

    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True
        # No default — must equal auth.users.id, set explicitly on insert
    )
    username: Mapped[str] = mapped_column(
        String(24), nullable=False, index=True
    )
    friend_code: Mapped[Optional[str]] = mapped_column(
        String(12), unique=True, nullable=True, index=True
    )
    avatar: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    pet: Mapped[Optional["Pet"]] = relationship(
        "Pet", back_populates="user", cascade="all, delete-orphan", uselist=False
    )
    sent_requests: Mapped[list["Friendship"]] = relationship(
        "Friendship",
        foreign_keys="Friendship.requester_id",
        back_populates="requester",
        cascade="all, delete-orphan",
    )
    received_requests: Mapped[list["Friendship"]] = relationship(
        "Friendship",
        foreign_keys="Friendship.addressee_id",
        back_populates="addressee",
        cascade="all, delete-orphan",
    )
