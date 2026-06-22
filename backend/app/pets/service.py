import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.pets.models import Pet
from app.pets.schemas import CreatePetRequest, UpdatePetRequest


class PetService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ─── Create ───────────────────────────────────────────────────────────────

    async def create(self, user_id: uuid.UUID, payload: CreatePetRequest) -> Pet:
        """
        Create a pet for the given user.

        Raises
        ------
        ValueError  if the user already has a pet (1-pet-per-user rule).
        """
        existing = await self.db.scalar(
            select(Pet).where(Pet.user_id == user_id)
        )
        if existing:
            raise ValueError("You already have a pet. Each account can only have one pet.")

        pet = Pet(
            user_id=user_id,
            name=payload.name,
            type=payload.type,
            color=payload.color,
        )
        self.db.add(pet)
        await self.db.commit()
        await self.db.refresh(pet)
        return pet

    # ─── Get my pet ───────────────────────────────────────────────────────────

    async def get_my_pet(self, user_id: uuid.UUID) -> Pet:
        """
        Return the authenticated user's pet.

        Raises
        ------
        ValueError  if the user has no pet yet.
        """
        pet = await self.db.scalar(
            select(Pet).where(Pet.user_id == user_id)
        )
        if not pet:
            raise ValueError("You don't have a pet yet.")
        return pet

    # ─── Get by ID ────────────────────────────────────────────────────────────

    async def get_by_id(self, pet_id: uuid.UUID, requester_id: uuid.UUID) -> Pet:
        """
        Return a pet by its ID.
        Only the owner can access their pet.

        Raises
        ------
        ValueError  if the pet doesn't exist or the requester doesn't own it.
        """
        pet = await self.db.get(Pet, pet_id)
        if not pet:
            raise ValueError("Pet not found.")
        if pet.user_id != requester_id:
            raise ValueError("You don't have permission to access this pet.")
        return pet

    # ─── Update Pet ───────────────────────────────────────────────────────────

    async def update_pet(self, user_id: uuid.UUID, payload: UpdatePetRequest) -> Pet:
        """
        Update the pet stats.
        """
        pet = await self.db.scalar(
            select(Pet).where(Pet.user_id == user_id)
        )
        if not pet:
            raise ValueError("Pet not found.")

        # Update stats
        pet.hunger = payload.hunger
        pet.cleanliness = payload.cleanliness
        pet.mood = payload.mood
        pet.is_sick = payload.is_sick
        pet.zero_since_at = payload.zero_since_at
        pet.last_fed_at = payload.last_fed_at
        pet.last_bath_at = payload.last_bath_at
        pet.last_play_at = payload.last_play_at

        # Save to database
        self.db.add(pet)
        await self.db.commit()
        await self.db.refresh(pet)
        return pet

    # ─── Leaderboard ──────────────────────────────────────────────────────────

    async def get_leaderboard(self) -> list[dict]:
        """
        Fetch top 50 pets ordered by updated_at descending with owner's username.
        """
        from app.auth.models import Profile
        # Query pets joining profiles to get username
        query = (
            select(Pet, Profile.username)
            .join(Profile, Pet.user_id == Profile.id)
            .order_by(Pet.updated_at.desc())
            .limit(50)
        )
        result = await self.db.execute(query)
        entries = []
        for pet, username in result.all():
            entry = {
                "id": pet.id,
                "username": username,
                "name": pet.name,
                "type": pet.type,
                "color": pet.color,
                "hunger": pet.hunger,
                "cleanliness": pet.cleanliness,
                "mood": pet.mood,
                "is_sick": pet.is_sick,
                "last_fed_at": pet.last_fed_at,
                "last_bath_at": pet.last_bath_at,
                "last_play_at": pet.last_play_at,
                "updated_at": pet.updated_at,
            }
            entries.append(entry)
        return entries
