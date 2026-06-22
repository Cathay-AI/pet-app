import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, Base, engine
from app.auth.models import User
from app.pets.models import Pet
from app.core.security import hash_password

async def seed_db():
    async with engine.begin() as conn:
        # Ensure tables exist
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        print("Starting seeding process...")
        
        # Define mock users
        mock_users = [
            {"email": "alice@example.com", "username": "Alice", "password": "password123"},
            {"email": "bob@example.com", "username": "Bob_Dev", "password": "password123"},
            {"email": "charlie@example.com", "username": "Charlie", "password": "password123"},
            {"email": "david@example.com", "username": "David_DogLover", "password": "password123"},
            {"email": "eva@example.com", "username": "Eva_CatLover", "password": "password123"},
        ]
        
        created_users = []
        for u_data in mock_users:
            existing = await session.scalar(select(User).where(User.email == u_data["email"]))
            if not existing:
                user = User(
                    email=u_data["email"],
                    username=u_data["username"],
                    hashed_password=hash_password(u_data["password"]),
                    is_active=True
                )
                session.add(user)
                await session.flush()
                print(f"Created user: {u_data['username']}")
                created_users.append(user)
            else:
                print(f"User already exists: {u_data['username']}")
                created_users.append(existing)
        
        # Define mock pets for the users
        # Alice gets a happy cat
        # Bob gets a hungry dog
        # Charlie gets a sick cat (zero_since_at is set)
        # David gets a clean dog
        # Eva gets a sad cat
        now = datetime.now(timezone.utc)
        
        mock_pets = [
            {
                "user": created_users[0],
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
                "user": created_users[1],
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
                "user": created_users[2],
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
                "user": created_users[3],
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
                "user": created_users[4],
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
            user = p_data["user"]
            existing_pet = await session.scalar(select(Pet).where(Pet.user_id == user.id))
            if not existing_pet:
                pet = Pet(
                    user_id=user.id,
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
                print(f"Created pet {p_data['name']} for user {user.username}")
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
                print(f"Updated pet {p_data['name']} stats for user {user.username}")
        
        await session.commit()
        print("Seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_db())
