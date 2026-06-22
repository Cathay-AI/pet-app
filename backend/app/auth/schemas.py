"""
Auth domain Pydantic schemas.

With Supabase Auth, register/login/refresh/logout are handled by the
Supabase client SDK on the frontend. The backend only needs:
- ProfilePublic: returned by GET /auth/me
- MessageResponse: generic success response
"""
import uuid
from datetime import datetime

from pydantic import BaseModel


class ProfilePublic(BaseModel):
    """Public-safe profile fields returned in auth responses."""

    id: uuid.UUID
    username: str
    friend_code: str | None = None
    avatar: str | None = None
    bio: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    """Generic success message."""

    message: str
