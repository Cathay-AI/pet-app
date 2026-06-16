from datetime import datetime, timezone

from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import RefreshToken, User
from app.auth.schemas import LoginRequest, RegisterRequest
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ─── Register ─────────────────────────────────────────────────────────────

    async def register(self, payload: RegisterRequest) -> tuple[User, str, str]:
        """
        Create a new user account.

        Returns
        -------
        (user, access_token, refresh_token)

        Raises
        ------
        ValueError  if the e-mail is already registered.
        """
        existing = await self.db.scalar(select(User).where(User.email == payload.email))
        if existing:
            raise ValueError("Email already registered")

        user = User(
            email=payload.email,
            username=payload.username,
            hashed_password=hash_password(payload.password),
        )
        self.db.add(user)
        await self.db.flush()  # get user.id before commit

        access_token, refresh_token = await self._issue_tokens(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user, access_token, refresh_token

    # ─── Login ────────────────────────────────────────────────────────────────

    async def login(self, payload: LoginRequest) -> tuple[User, str, str]:
        """
        Authenticate with email + password.

        Returns
        -------
        (user, access_token, refresh_token)

        Raises
        ------
        ValueError  if credentials are invalid or account is inactive.
        """
        user = await self.db.scalar(select(User).where(User.email == payload.email))
        if not user or not verify_password(payload.password, user.hashed_password):
            raise ValueError("Invalid email or password")
        if not user.is_active:
            raise ValueError("Account is disabled")

        access_token, refresh_token = await self._issue_tokens(user)
        await self.db.commit()
        return user, access_token, refresh_token

    # ─── Refresh ──────────────────────────────────────────────────────────────

    async def refresh(self, raw_token: str) -> tuple[User, str, str]:
        """
        Exchange a valid refresh token for a new token pair (rotation).

        The old refresh token is revoked immediately; a new one is issued.

        Raises
        ------
        ValueError  if the token is invalid, expired, revoked, or the user
                    no longer exists / is inactive.
        """
        try:
            claims = decode_token(raw_token)
        except JWTError:
            raise ValueError("Invalid or expired refresh token")

        if claims.get("type") != "refresh":
            raise ValueError("Token is not a refresh token")

        stored: RefreshToken | None = await self.db.scalar(
            select(RefreshToken).where(RefreshToken.token == raw_token)
        )
        if not stored or stored.revoked:
            raise ValueError("Refresh token has been revoked")

        user = await self.db.get(User, stored.user_id)
        if not user or not user.is_active:
            raise ValueError("User not found or inactive")

        # Revoke old token
        stored.revoked = True
        self.db.add(stored)

        access_token, refresh_token = await self._issue_tokens(user)
        await self.db.commit()
        return user, access_token, refresh_token

    # ─── Logout ───────────────────────────────────────────────────────────────

    async def logout(self, raw_token: str) -> None:
        """
        Revoke a refresh token (idempotent – silently ignores unknown tokens).
        """
        stored: RefreshToken | None = await self.db.scalar(
            select(RefreshToken).where(RefreshToken.token == raw_token)
        )
        if stored and not stored.revoked:
            stored.revoked = True
            self.db.add(stored)
            await self.db.commit()

    # ─── Get current user ─────────────────────────────────────────────────────

    async def get_current_user(self, access_token: str) -> User:
        """
        Validate an access token and return the authenticated user.

        Raises
        ------
        ValueError  if the token is invalid, expired, or user not found.
        """
        try:
            claims = decode_token(access_token)
        except JWTError:
            raise ValueError("Invalid or expired access token")

        if claims.get("type") != "access":
            raise ValueError("Token is not an access token")

        user = await self.db.get(User, claims["sub"])
        if not user or not user.is_active:
            raise ValueError("User not found or inactive")

        return user

    # ─── Private helpers ──────────────────────────────────────────────────────

    async def _issue_tokens(self, user: User) -> tuple[str, str]:
        access_token = create_access_token(str(user.id))
        refresh_token = create_refresh_token(str(user.id))

        claims = decode_token(refresh_token)
        expires_at = datetime.fromtimestamp(claims["exp"], tz=timezone.utc)

        rt = RefreshToken(
            user_id=user.id,
            token=refresh_token,
            expires_at=expires_at,
        )
        self.db.add(rt)
        return access_token, refresh_token
