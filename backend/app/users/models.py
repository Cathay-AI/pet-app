"""Users domain — Friendship ORM model."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.auth.models import Profile


class Friendship(Base):
    """
    Directional friend request between two profiles.

    Columns
    -------
    id            UUID primary key.
    requester_id  The profile who sent the friend request.
    addressee_id  The profile who received the friend request.
    status        'pending' | 'accepted' | 'declined'
    created_at    When the request was sent.
    updated_at    Last status change.
    """

    __tablename__ = "friendships"
    __table_args__ = (
        UniqueConstraint("requester_id", "addressee_id", name="friendships_pair_unique"),
        CheckConstraint("requester_id <> addressee_id", name="friendships_no_self"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    requester_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    addressee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(10), nullable=False, default="pending", index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    requester: Mapped["Profile"] = relationship(
        "Profile", foreign_keys=[requester_id], back_populates="sent_requests"
    )
    addressee: Mapped["Profile"] = relationship(
        "Profile", foreign_keys=[addressee_id], back_populates="received_requests"
    )
