import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, Base, engine
from app.pets.pet import Pet
from app.users.profile import Profile

async def seed_db():
    async with engine.begin() as conn:
        # Ensure tables exist
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        print("Starting seeding process...")
        
        # Define mock profiles. In production these IDs mirror Supabase auth.users.id.
        mock_profiles = [
            {"id": uuid.UUID("00000000-0000-0000-0000-000000000001"), "username": "Alice", "friend_code": "NEKO-AL1C"},
            {"id": uuid.UUID("00000000-0000-0000-0000-000000000002"), "username": "Bob_Dev", "friend_code": "NEKO-B0B1"},
            {"id": uuid.UUID("00000000-0000-0000-0000-000000000003"), "username": "Charlie", "friend_code": "NEKO-CH4R"},
            {"id": uuid.UUID("00000000-0000-0000-0000-000000000004"), "username": "David_DogLover", "friend_code": "NEKO-D4V1"},
            {"id": uuid.UUID("00000000-0000-0000-0000-000000000005"), "username": "Eva_CatLover", "friend_code": "NEKO-EV4A"},
        ]
        
        created_profiles = []
        for profile_data in mock_profiles:
            existing = await session.get(Profile, profile_data["id"])
            if not existing:
                profile = Profile(
                    id=profile_data["id"],
                    username=profile_data["username"],
                    friend_code=profile_data["friend_code"],
                )
                session.add(profile)
                await session.flush()
                print(f"Created profile: {profile_data['username']}")
                created_profiles.append(profile)
            else:
                existing.username = profile_data["username"]
                existing.friend_code = profile_data["friend_code"]
                session.add(existing)
                await session.flush()
                print(f"Profile already exists: {profile_data['username']}")
                created_profiles.append(existing)
        
        # Define mock pets for the users
        # Alice gets a happy cat
        # Bob gets a hungry dog
        # Charlie gets a sick cat (zero_since_at is set)
        # David gets a clean dog
        # Eva gets a sad cat
        now = datetime.now(timezone.utc)
        
        mock_pets = [
            {
                "profile": created_profiles[0],
                "name": "Mimi",
                "type": "cat",
                "color": "orange",
                "hunger": 90,
                "cleanliness": 95,
                "mood": 85,
                "is_sick": False,
                "last_fed_at": now - timedelta(hours=1),
                "last_bath_at": now - timedelta(hours=4),
                "last_play_at": now - timedelta(minutes=30),
            },
            {
                "profile": created_profiles[1],
                "name": "Barky",
                "type": "dog",
                "color": "brown",
                "hunger": 15,
                "cleanliness": 50,
                "mood": 40,
                "is_sick": False,
                "last_fed_at": now - timedelta(hours=8),
                "last_bath_at": now - timedelta(hours=12),
                "last_play_at": now - timedelta(hours=6),
            },
            {
                "profile": created_profiles[2],
                "name": "NekoSick",
                "type": "cat",
                "color": "gray",
                "hunger": 0,
                "cleanliness": 10,
                "mood": 0,
                "is_sick": True,
                "zero_since_at": now - timedelta(hours=3),
                "last_fed_at": now - timedelta(hours=24),
                "last_bath_at": now - timedelta(hours=36),
                "last_play_at": now - timedelta(hours=24),
            },
            {
                "profile": created_profiles[3],
                "name": "Buddy",
                "type": "dog",
                "color": "mint",
                "hunger": 70,
                "cleanliness": 100,
                "mood": 80,
                "is_sick": False,
                "last_fed_at": now - timedelta(hours=2),
                "last_bath_at": now - timedelta(hours=1),
                "last_play_at": now - timedelta(hours=2),
            },
            {
                "profile": created_profiles[4],
                "name": "Lulu",
                "type": "cat",
                "color": "lavender",
                "hunger": 60,
                "cleanliness": 60,
                "mood": 25,
                "is_sick": False,
                "last_fed_at": now - timedelta(hours=4),
                "last_bath_at": now - timedelta(hours=5),
                "last_play_at": now - timedelta(hours=8),
            },
        ]
        
        for p_data in mock_pets:
            profile = p_data["profile"]
            existing_pet = await session.scalar(select(Pet).where(Pet.user_id == profile.id))
            if not existing_pet:
                pet = Pet(
                    user_id=profile.id,
                    name=p_data["name"],
                    type=p_data["type"],
                    color=p_data["color"],
                    hunger=p_data["hunger"],
                    cleanliness=p_data["cleanliness"],
                    mood=p_data["mood"],
                    is_sick=p_data["is_sick"],
                    zero_since_at=p_data.get("zero_since_at"),
                    last_fed_at=p_data["last_fed_at"],
                    last_bath_at=p_data["last_bath_at"],
                    last_play_at=p_data["last_play_at"],
                    updated_at=now
                )
                session.add(pet)
                print(f"Created pet {p_data['name']} for profile {profile.username}")
            else:
                # Update existing pet stats to match seed to allow re-running
                existing_pet.hunger = p_data["hunger"]
                existing_pet.cleanliness = p_data["cleanliness"]
                existing_pet.mood = p_data["mood"]
                existing_pet.is_sick = p_data["is_sick"]
                existing_pet.zero_since_at = p_data.get("zero_since_at")
                existing_pet.last_fed_at = p_data["last_fed_at"]
                existing_pet.last_bath_at = p_data["last_bath_at"]
                existing_pet.last_play_at = p_data["last_play_at"]
                existing_pet.updated_at = now
                session.add(existing_pet)
                print(f"Updated pet {p_data['name']} stats for profile {profile.username}")
        
        await session.commit()
        print("Seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_db())
