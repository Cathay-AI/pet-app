"""Leaderboard service for ranking and suggestions."""
from datetime import datetime, UTC
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.users.profile import Profile
from app.users.friendship import Friendship
from app.pets.pet import Pet as PetModel
from app.pets.service import apply_decay
from app.leaderboard.schemas import (
    LeaderboardPetEntry,
    FriendsLeaderboardResponse,
    SuggestedUserEntry,
    SuggestionsResponse,
)


class LeaderboardService:
    """Service for leaderboard operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    def _calculate_health_score(self, hunger: int, cleanliness: int, mood: int, is_sick: bool) -> int:
        """Calculate health score from pet stats."""
        base = (hunger + cleanliness + mood) / 3
        return round(base * 0.5 if is_sick else base)

    async def get_friends_leaderboard(
        self,
        current_user: Profile,
        limit: int = 50
    ) -> FriendsLeaderboardResponse:
        """
        Get leaderboard showing only accepted friends' pets.
        Returns friends sorted by health score descending.
        """
        # Get all accepted friendships
        friends_query = select(Friendship).where(
            and_(
                or_(
                    Friendship.requester_id == current_user.id,
                    Friendship.addressee_id == current_user.id
                ),
                Friendship.status == "accepted"
            )
        )
        result = await self.db.execute(friends_query)
        friendships = result.scalars().all()

        # Extract friend IDs
        friend_ids = set()
        for friendship in friendships:
            if friendship.requester_id == current_user.id:
                friend_ids.add(friendship.addressee_id)
            else:
                friend_ids.add(friendship.requester_id)

        if not friend_ids:
            # No friends yet, return empty leaderboard with self
            self_pet = await self._get_user_pet_entry(current_user.id, is_self=True)
            return FriendsLeaderboardResponse(
                friends=[],
                self_entry=self_pet,
                total_friends=0,
                last_updated=datetime.now(UTC)
            )

        # Get pets for all friends
        pets_query = (
            select(PetModel, Profile)
            .join(Profile, PetModel.user_id == Profile.id)
            .where(PetModel.user_id.in_(friend_ids))
            .order_by(PetModel.updated_at.desc())
        )
        result = await self.db.execute(pets_query)
        rows = result.all()

        # Convert to leaderboard entries
        entries = []
        now = datetime.now(UTC)
        dirty = False
        for pet, profile in rows:
            if apply_decay(pet, now):
                self.db.add(pet)
                dirty = True
            health_score = self._calculate_health_score(
                pet.hunger, pet.cleanliness, pet.mood, pet.is_sick
            )
            entries.append(
                LeaderboardPetEntry(
                    id=str(pet.id),
                    user_id=str(pet.user_id),
                    username=profile.username,
                    pet_name=pet.name,
                    pet_type=pet.type,
                    pet_color=pet.color,
                    hunger=pet.hunger,
                    cleanliness=pet.cleanliness,
                    mood=pet.mood,
                    is_sick=pet.is_sick,
                    health_score=health_score,
                    last_care_at=self._get_last_care_time(pet),
                    updated_at=pet.updated_at,
                    is_self=False,
                    is_friend=True,
                )
            )

        # Sort by health score descending
        entries.sort(key=lambda x: x.health_score, reverse=True)

        # Assign ranks
        for rank, entry in enumerate(entries, start=1):
            entry.rank = rank

        if dirty:
            await self.db.commit()

        # Get current user's pet
        self_pet = await self._get_user_pet_entry(current_user.id, is_self=True)

        # Check if self is in friends list (shouldn't happen, but handle it)
        self_in_list = any(e.user_id == str(current_user.id) for e in entries)

        return FriendsLeaderboardResponse(
            friends=entries[:limit],
            self_entry=None if self_in_list else self_pet,
            total_friends=len(entries),
            last_updated=datetime.now(UTC)
        )

    async def get_suggestions(
        self,
        current_user: Profile,
        limit: int = 10
    ) -> SuggestionsResponse:
        """
        Get suggested users based on activity and mutual connections.
        Excludes existing friends and self.
        """
        # Get current friend IDs
        friends_query = select(Friendship).where(
            and_(
                or_(
                    Friendship.requester_id == current_user.id,
                    Friendship.addressee_id == current_user.id
                ),
                Friendship.status.in_(["pending", "accepted"])
            )
        )
        result = await self.db.execute(friends_query)
        friendships = result.scalars().all()

        # Extract all related user IDs (friends + pending)
        excluded_ids = {current_user.id}
        for friendship in friendships:
            excluded_ids.add(friendship.requester_id)
            excluded_ids.add(friendship.addressee_id)

        # Fetch recent candidates, then apply server-side decay before deciding
        # whether they are healthy enough to recommend.
        suggestions_query = (
            select(PetModel, Profile)
            .join(Profile, PetModel.user_id == Profile.id)
            .where(
                and_(
                    PetModel.user_id.notin_(excluded_ids),
                    Profile.friend_code.is_not(None),
                )
            )
            .order_by(PetModel.updated_at.desc())
            .limit(limit * 5)
        )
        result = await self.db.execute(suggestions_query)
        rows = result.all()

        suggestions = []
        now = datetime.now(UTC)
        dirty = False
        for pet, profile in rows:
            if apply_decay(pet, now):
                self.db.add(pet)
                dirty = True
            if pet.is_sick or pet.hunger < 50:
                continue
            health_score = self._calculate_health_score(
                pet.hunger, pet.cleanliness, pet.mood, pet.is_sick
            )
            suggestions.append(
                SuggestedUserEntry(
                    id=str(profile.id),
                    username=profile.username,
                    friend_code=profile.friend_code,
                    pet_name=pet.name,
                    pet_type=pet.type,
                    pet_color=pet.color,
                    health_score=health_score,
                    mutual_friends=0,  # TODO: Calculate mutual friends
                    reason="Active and caring player"
                )
            )
            if len(suggestions) == limit:
                break

        if dirty:
            await self.db.commit()

        return SuggestionsResponse(
            suggestions=suggestions,
            total=len(suggestions)
        )

    async def _get_user_pet_entry(
        self,
        user_id: str,
        is_self: bool = False
    ) -> LeaderboardPetEntry | None:
        """Get a single user's pet as a leaderboard entry."""
        query = (
            select(PetModel, Profile)
            .join(Profile, PetModel.user_id == Profile.id)
            .where(PetModel.user_id == user_id)
            .limit(1)
        )
        result = await self.db.execute(query)
        row = result.first()

        if not row:
            return None

        pet, profile = row
        if apply_decay(pet):
            self.db.add(pet)
            await self.db.commit()
        health_score = self._calculate_health_score(
            pet.hunger, pet.cleanliness, pet.mood, pet.is_sick
        )

        return LeaderboardPetEntry(
            id=str(pet.id),
            user_id=str(pet.user_id),
            username=profile.username,
            pet_name=pet.name,
            pet_type=pet.type,
            pet_color=pet.color,
            hunger=pet.hunger,
            cleanliness=pet.cleanliness,
            mood=pet.mood,
            is_sick=pet.is_sick,
            health_score=health_score,
            last_care_at=self._get_last_care_time(pet),
            updated_at=pet.updated_at,
            is_self=is_self,
            is_friend=False,
        )

    def _get_last_care_time(self, pet: PetModel) -> datetime | None:
        """Get the most recent care timestamp from a pet."""
        times = [
            pet.last_fed_at,
            pet.last_bath_at,
            pet.last_play_at,
        ]
        valid_times = [t for t in times if t is not None]
        return max(valid_times) if valid_times else None
