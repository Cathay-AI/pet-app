import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


# ─── Request schemas ──────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    """Body for POST /auth/register"""

    email: EmailStr = Field(..., description="User's e-mail address (used as login ID)")
    username: str = Field(
        ...,
        min_length=1,
        max_length=24,
        description="Display name (1-24 characters)",
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Plain-text password (min 8 chars, stored as bcrypt hash)",
    )

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        if not any(c.isalpha() for c in v):
            raise ValueError("Password must contain at least one letter")
        return v


class LoginRequest(BaseModel):
    """Body for POST /auth/login"""

    email: EmailStr = Field(..., description="Registered e-mail address")
    password: str = Field(..., description="Plain-text password")


class RefreshRequest(BaseModel):
    """Body for POST /auth/refresh"""

    refresh_token: str = Field(..., description="A valid, non-revoked refresh token")


class LogoutRequest(BaseModel):
    """Body for POST /auth/logout"""

    refresh_token: str = Field(..., description="The refresh token to revoke")


# ─── Response schemas ─────────────────────────────────────────────────────────

class UserPublic(BaseModel):
    """Public-safe user fields returned in auth responses"""

    id: uuid.UUID
    email: EmailStr
    username: str
    is_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """Returned on successful login or token refresh"""

    access_token: str = Field(..., description="Short-lived JWT (Bearer token)")
    refresh_token: str = Field(..., description="Long-lived token for obtaining new access tokens")
    token_type: str = Field(default="bearer")
    user: UserPublic


class MessageResponse(BaseModel):
    """Generic success message"""

    message: str
