"""Business logic for user profile management and friend system."""
from __future__ import annotations

import uuid

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.users.profile import Profile
from app.users.friendship import Friendship
from app.users.schemas import (
    FriendshipPublic,
    MyProfileResponse,
    UpdateProfileRequest,
    UserProfilePublic,
)


class UsersService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ─── Profile ──────────────────────────────────────────────────────────────

    async def get_my_profile(self, profile: Profile) -> MyProfileResponse:
        """Return the authenticated user's own profile (with pet)."""
        profile = await self._load_profile_with_pet(profile.id)
        return MyProfileResponse.model_validate(profile)

    async def update_profile(
        self, profile: Profile, payload: UpdateProfileRequest
    ) -> MyProfileResponse:
        """
        Update username / avatar / bio.

        Raises
        ------
        ValueError  if the new username is already taken by another user.
        """
        if payload.username is not None and payload.username != profile.username:
            taken = await self.db.scalar(
                select(Profile).where(Profile.username == payload.username)
            )
            if taken:
                raise ValueError("Username already taken")
            profile.username = payload.username

        if payload.avatar is not None:
            profile.avatar = payload.avatar

        if payload.bio is not None:
            profile.bio = payload.bio

        self.db.add(profile)
        await self.db.commit()
        await self.db.refresh(profile)
        profile = await self._load_profile_with_pet(profile.id)
        return MyProfileResponse.model_validate(profile)

    # ─── User search ──────────────────────────────────────────────────────────

    async def get_profile_by_friend_code(self, friend_code: str) -> UserProfilePublic:
        """
        Look up any user's public profile by friend_code.

        Raises
        ------
        ValueError  if not found.
        """
        profile = await self.db.scalar(
            select(Profile)
            .where(Profile.friend_code == friend_code.upper())
            .options(selectinload(Profile.pet))
        )
        if not profile:
            raise ValueError(f"No user found with friend code '{friend_code}'")
        return UserProfilePublic.model_validate(profile)

    # ─── Friend requests ──────────────────────────────────────────────────────

    async def send_friend_request(
        self, requester: Profile, friend_code: str
    ) -> FriendshipPublic:
        """
        Send a friend request to the user identified by friend_code.

        Raises
        ------
        ValueError  for self-request, user-not-found, duplicate, or already friends.
        """
        addressee = await self.db.scalar(
            select(Profile)
            .where(Profile.friend_code == friend_code.upper())
            .options(selectinload(Profile.pet))
        )
        if not addressee:
            raise ValueError(f"No user found with friend code '{friend_code}'")

        if addressee.id == requester.id:
            raise ValueError("You cannot add yourself as a friend")

        existing = await self.db.scalar(
            select(Friendship).where(
                or_(
                    and_(
                        Friendship.requester_id == requester.id,
                        Friendship.addressee_id == addressee.id,
                    ),
                    and_(
                        Friendship.requester_id == addressee.id,
                        Friendship.addressee_id == requester.id,
                    ),
                )
            )
        )
        if existing:
            if existing.status == "accepted":
                raise ValueError("You are already friends with this user")
            if existing.status == "pending":
                raise ValueError("A friend request already exists between you two")
            if existing.status == "declined":
                existing.status = "pending"
                existing.requester_id = requester.id
                existing.addressee_id = addressee.id
                self.db.add(existing)
                await self.db.commit()
                await self.db.refresh(existing)
                return FriendshipPublic(
                    id=existing.id,
                    status=existing.status,
                    created_at=existing.created_at,
                    user=UserProfilePublic.model_validate(addressee),
                )

        friendship = Friendship(
            requester_id=requester.id,
            addressee_id=addressee.id,
        )
        self.db.add(friendship)
        await self.db.commit()
        await self.db.refresh(friendship)

        return FriendshipPublic(
            id=friendship.id,
            status=friendship.status,
            created_at=friendship.created_at,
            user=UserProfilePublic.model_validate(addressee),
        )

    async def respond_friend_request(
        self, profile: Profile, friendship_id: uuid.UUID, action: str
    ) -> FriendshipPublic:
        """Accept or decline an incoming friend request."""
        friendship = await self.db.scalar(
            select(Friendship)
            .where(Friendship.id == friendship_id)
            .options(
                selectinload(Friendship.requester).selectinload(Profile.pet),
                selectinload(Friendship.addressee),
            )
        )
        if not friendship:
            raise ValueError("Friend request not found")
        if friendship.addressee_id != profile.id:
            raise ValueError("You are not the addressee of this request")
        if friendship.status != "pending":
            raise ValueError(f"Request is already '{friendship.status}'")

        friendship.status = "accepted" if action == "accept" else "declined"
        self.db.add(friendship)
        await self.db.commit()
        await self.db.refresh(friendship)

        return FriendshipPublic(
            id=friendship.id,
            status=friendship.status,
            created_at=friendship.created_at,
            user=UserProfilePublic.model_validate(friendship.requester),
        )

    async def list_friends(self, profile: Profile) -> list[FriendshipPublic]:
        """Return all accepted friendships for the current user."""
        rows = await self.db.scalars(
            select(Friendship)
            .where(
                and_(
                    Friendship.status == "accepted",
                    or_(
                        Friendship.requester_id == profile.id,
                        Friendship.addressee_id == profile.id,
                    ),
                )
            )
            .options(
                selectinload(Friendship.requester).selectinload(Profile.pet),
                selectinload(Friendship.addressee).selectinload(Profile.pet),
            )
        )
        result = []
        for f in rows:
            other = f.addressee if f.requester_id == profile.id else f.requester
            result.append(
                FriendshipPublic(
                    id=f.id,
                    status=f.status,
                    created_at=f.created_at,
                    user=UserProfilePublic.model_validate(other),
                )
            )
        return result

    async def list_pending_requests(self, profile: Profile) -> list[FriendshipPublic]:
        """Return all pending requests where the current user is the addressee."""
        rows = await self.db.scalars(
            select(Friendship)
            .where(
                and_(
                    Friendship.status == "pending",
                    Friendship.addressee_id == profile.id,
                )
            )
            .options(
                selectinload(Friendship.requester).selectinload(Profile.pet),
            )
        )
        return [
            FriendshipPublic(
                id=f.id,
                status=f.status,
                created_at=f.created_at,
                user=UserProfilePublic.model_validate(f.requester),
            )
            for f in rows
        ]

    async def remove_friend(self, profile: Profile, friend_id: uuid.UUID) -> None:
        """Delete an accepted friendship."""
        friendship = await self.db.scalar(
            select(Friendship).where(
                and_(
                    Friendship.status == "accepted",
                    or_(
                        and_(
                            Friendship.requester_id == profile.id,
                            Friendship.addressee_id == friend_id,
                        ),
                        and_(
                            Friendship.requester_id == friend_id,
                            Friendship.addressee_id == profile.id,
                        ),
                    ),
                )
            )
        )
        if not friendship:
            raise ValueError("No accepted friendship found with this user")

        await self.db.delete(friendship)
        await self.db.commit()

    # ─── Private helpers ──────────────────────────────────────────────────────

    async def _load_profile_with_pet(self, profile_id: uuid.UUID) -> Profile:
        return await self.db.scalar(
            select(Profile)
            .where(Profile.id == profile_id)
            .options(selectinload(Profile.pet))
        )
