import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.pets.pet import Pet
from app.pets.schemas import CreatePetRequest, UpdatePetRequest

DECAY_PER_HOUR = {"hunger": 8, "cleanliness": 5, "mood": 3}
SICK_GRACE_HOURS = 2


def apply_decay(pet: Pet, now: datetime | None = None) -> bool:
    """
    Apply time-based stat decay to a pet in-place.
    Returns True if any field changed.
    """
    now = now or datetime.now(timezone.utc)
    if not pet.updated_at:
        return False

    updated_at = pet.updated_at if pet.updated_at.tzinfo else pet.updated_at.replace(tzinfo=timezone.utc)
    elapsed_hours = max(0, (now - updated_at).total_seconds()) / 3600
    if elapsed_hours < 0.01:
        return False

    new_hunger = max(0, min(100, round(pet.hunger - DECAY_PER_HOUR["hunger"] * elapsed_hours)))
    new_cleanliness = max(0, min(100, round(pet.cleanliness - DECAY_PER_HOUR["cleanliness"] * elapsed_hours)))
    new_mood = max(0, min(100, round(pet.mood - DECAY_PER_HOUR["mood"] * elapsed_hours)))

    changed = (new_hunger != pet.hunger or new_cleanliness != pet.cleanliness or new_mood != pet.mood)

    pet.hunger = new_hunger
    pet.cleanliness = new_cleanliness
    pet.mood = new_mood

    has_zero = pet.hunger == 0 or pet.cleanliness == 0 or pet.mood == 0
    if has_zero and not pet.zero_since_at:
        hours_to_zero = _hours_until_first_zero(
            pet.hunger + DECAY_PER_HOUR["hunger"] * elapsed_hours,
            pet.cleanliness + DECAY_PER_HOUR["cleanliness"] * elapsed_hours,
            pet.mood + DECAY_PER_HOUR["mood"] * elapsed_hours,
        )
        from datetime import timedelta
        pet.zero_since_at = updated_at + timedelta(hours=hours_to_zero)
        changed = True
    elif not has_zero and pet.zero_since_at:
        pet.zero_since_at = None
        changed = True

    if pet.zero_since_at:
        zero_at = pet.zero_since_at if pet.zero_since_at.tzinfo else pet.zero_since_at.replace(tzinfo=timezone.utc)
        zero_hours = (now - zero_at).total_seconds() / 3600
        if zero_hours >= SICK_GRACE_HOURS and not pet.is_sick:
            pet.is_sick = True
            changed = True

    if changed:
        pet.updated_at = now

    return changed


def _hours_until_first_zero(hunger: float, cleanliness: float, mood: float) -> float:
    """Calculate how many hours from updated_at until the first stat hits 0."""
    times = []
    if DECAY_PER_HOUR["hunger"] > 0:
        times.append(hunger / DECAY_PER_HOUR["hunger"])
    if DECAY_PER_HOUR["cleanliness"] > 0:
        times.append(cleanliness / DECAY_PER_HOUR["cleanliness"])
    if DECAY_PER_HOUR["mood"] > 0:
        times.append(mood / DECAY_PER_HOUR["mood"])
    return min(times) if times else 0


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
        if apply_decay(pet):
            self.db.add(pet)
            await self.db.commit()
            await self.db.refresh(pet)
        return pet

    # ─── Get by ID (public) ──────────────────────────────────────────────────

    async def get_by_id_public(self, pet_id: uuid.UUID) -> Pet:
        pet = await self.db.get(Pet, pet_id)
        if not pet:
            raise ValueError("Pet not found.")
        if apply_decay(pet):
            self.db.add(pet)
            await self.db.commit()
            await self.db.refresh(pet)
        return pet

    # ─── Get by ID (owner only) ──────────────────────────────────────────────

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
        Update the pet stats (owner action).
        """
        pet = await self.db.scalar(
            select(Pet).where(Pet.user_id == user_id)
        )
        if not pet:
            raise ValueError("Pet not found.")

        pet.hunger = payload.hunger
        pet.cleanliness = payload.cleanliness
        pet.mood = payload.mood
        pet.is_sick = payload.is_sick
        pet.zero_since_at = payload.zero_since_at
        pet.last_fed_at = payload.last_fed_at
        pet.last_bath_at = payload.last_bath_at
        pet.last_play_at = payload.last_play_at
        pet.updated_at = datetime.now(timezone.utc)

        self.db.add(pet)
        await self.db.commit()
        await self.db.refresh(pet)
        return pet

    # ─── Leaderboard ──────────────────────────────────────────────────────────

    async def get_leaderboard(self) -> list[dict]:
        """
        Fetch top 50 pets ordered by updated_at descending with owner's username.
        Applies decay to each pet so scores reflect real-time state.
        """
        from app.users.profile import Profile
        query = (
            select(Pet, Profile.username)
            .join(Profile, Pet.user_id == Profile.id)
            .order_by(Pet.updated_at.desc())
            .limit(50)
        )
        result = await self.db.execute(query)
        now = datetime.now(timezone.utc)
        dirty = False
        entries = []
        for pet, username in result.all():
            if apply_decay(pet, now):
                self.db.add(pet)
                dirty = True
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
                "last_visited_at": pet.last_visited_at,
                "updated_at": pet.updated_at,
            }
            entries.append(entry)
        if dirty:
            await self.db.commit()
        return entries
