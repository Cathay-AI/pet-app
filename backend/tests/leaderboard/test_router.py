import base64
import uuid
from datetime import datetime, timedelta, timezone

from httpx import AsyncClient
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.pets.pet import Pet
from app.users.friendship import Friendship
from app.users.profile import Profile


AUTH = "/api/v1/auth"
PETS = "/api/v1/pets"
LEADERBOARD = "/api/v1/leaderboard"

USER_A = {
    "id": uuid.UUID("aaaaaaaa-0000-0000-0000-000000000401"),
    "email": "leaderboard_a@example.com",
    "username": "LeaderboardA",
}
USER_B = {
    "id": uuid.UUID("aaaaaaaa-0000-0000-0000-000000000402"),
    "email": "leaderboard_b@example.com",
    "username": "LeaderboardB",
}
USER_C = {
    "id": uuid.UUID("aaaaaaaa-0000-0000-0000-000000000403"),
    "email": "leaderboard_c@example.com",
    "username": "LeaderboardC",
}


def _jwt_key() -> bytes:
    try:
        return base64.b64decode(settings.supabase_jwt_secret)
    except Exception:
        return settings.supabase_jwt_secret.encode("utf-8")


def _token(user: dict) -> str:
    return jwt.encode(
        {
            "sub": str(user["id"]),
            "email": user["email"],
            "aud": "authenticated",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=30),
            "user_metadata": {"username": user["username"]},
        },
        _jwt_key(),
        algorithm="HS256",
    )


def _headers(user: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {_token(user)}"}


async def _provision(client: AsyncClient, user: dict, pet_name: str) -> None:
    await client.post(f"{AUTH}/profile/setup", headers=_headers(user))
    await client.post(
        PETS,
        json={"name": pet_name, "type": "cat", "color": "orange"},
        headers=_headers(user),
    )


async def test_friends_leaderboard_applies_decay_and_preserves_actual_care_time(
    client: AsyncClient,
    db_session: AsyncSession,
):
    await _provision(client, USER_A, "SelfPet")
    await _provision(client, USER_B, "FriendPet")

    db_session.add(
        Friendship(
            requester_id=USER_A["id"],
            addressee_id=USER_B["id"],
            status="accepted",
        )
    )
    friend_pet = await db_session.scalar(select(Pet).where(Pet.user_id == USER_B["id"]))
    assert friend_pet is not None
    now = datetime.now(timezone.utc)
    friend_pet.updated_at = now - timedelta(hours=1)
    friend_pet.last_fed_at = now - timedelta(days=2)
    db_session.add(friend_pet)
    await db_session.commit()

    response = await client.get(f"{LEADERBOARD}/friends", headers=_headers(USER_A))

    assert response.status_code == 200
    data = response.json()
    assert [entry["username"] for entry in data["friends"]] == ["LeaderboardB"]
    assert data["self_entry"]["username"] == "LeaderboardA"
    assert data["friends"][0]["hunger"] < 100
    assert data["friends"][0]["last_care_at"].startswith(
        (now - timedelta(days=2)).date().isoformat()
    )


async def test_friends_leaderboard_reports_no_care_time_for_new_pet(
    client: AsyncClient,
):
    await _provision(client, USER_A, "SelfPet")

    response = await client.get(f"{LEADERBOARD}/friends", headers=_headers(USER_A))

    assert response.status_code == 200
    assert response.json()["self_entry"]["last_care_at"] is None


async def test_suggestions_skip_profiles_without_friend_codes(
    client: AsyncClient,
    db_session: AsyncSession,
):
    await _provision(client, USER_A, "SelfPet")
    await _provision(client, USER_C, "CandidatePet")
    candidate = await db_session.get(Profile, USER_C["id"])
    assert candidate is not None
    candidate.friend_code = None
    db_session.add(candidate)
    await db_session.commit()

    response = await client.get(f"{LEADERBOARD}/suggestions", headers=_headers(USER_A))

    assert response.status_code == 200
    assert response.json()["suggestions"] == []
