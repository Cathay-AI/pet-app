"""
Auth service — profile management after Supabase authentication.

Supabase handles all authentication (login, register, token issuance,
Google OAuth, etc.). This service is responsible for:
- Creating a profile row in public.profiles after first Supabase sign-in.
- Generating and ensuring unique friend codes.
"""
from __future__ import annotations

import random
import string
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.users.profile import Profile


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ─── Friend code ───────────────────────────────────────────────────────

    @staticmethod
    def _generate_friend_code() -> str:
        """Generate a NEKO-XXXX code (4 uppercase alphanumerics)."""
        chars = string.ascii_uppercase + string.digits
        suffix = "".join(random.choices(chars, k=4))
        return f"NEKO-{suffix}"

    async def _unique_friend_code(self) -> str:
        """Keep generating until we get one that isn't taken."""
        for _ in range(20):
            code = self._generate_friend_code()
            exists = await self.db.scalar(
                select(Profile).where(Profile.friend_code == code)
            )
            if not exists:
                return code
        raise RuntimeError("Could not generate a unique friend code")

    # ─── Profile creation (called after first Supabase login) ──────────────

    async def get_or_create_profile(
        self,
        supabase_user_id: uuid.UUID,
        email: str,
        username: str | None = None,
    ) -> tuple[Profile, bool]:
        """
        Return the existing profile, or create one on first login.

        Parameters
        ----------
        supabase_user_id  The UUID from auth.users (= Supabase JWT sub).
        email             User's email (used to derive a default username).
        username          Optional explicit username; falls back to email prefix.

        Returns
        -------
        (profile, created)  where `created` is True if a new row was inserted.
        """
        existing = await self.db.get(Profile, supabase_user_id)
        if existing:
            return existing, False

        # Derive a username from email/metadata, fall back to "Neko" if empty
        if username:
            display_name = username
        elif email and "@" in email:
            display_name = email.split("@")[0][:24]
        else:
            display_name = "Neko"

        # Ensure username uniqueness by appending a suffix if needed
        base_name = display_name
        suffix = 0
        while await self.db.scalar(
            select(Profile).where(Profile.username == display_name)
        ):
            suffix += 1
            display_name = f"{base_name[:20]}_{suffix}"

        friend_code = await self._unique_friend_code()

        profile = Profile(
            id=supabase_user_id,
            username=display_name,
            friend_code=friend_code,
        )
        self.db.add(profile)
        await self.db.commit()
        await self.db.refresh(profile)
        return profile, True
