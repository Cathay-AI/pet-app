"""
Integration tests for /api/v1/care-events endpoints.

Flow tested
-----------
1. Log care events (feed, bath, play)
2. GET /care-events/stats → daily summary
3. GET /care-events/stats/users → per-user breakdown
4. Invalid type → 422
5. No pet → 404
6. Unauthenticated → 403
"""

import base64
import uuid
from datetime import datetime, timedelta, timezone

from httpx import AsyncClient
from jose import jwt

from app.core.config import settings

AUTH = "/api/v1/auth"
PETS = "/api/v1/pets"
CARE = "/api/v1/care-events"

USER_A = {
    "id": uuid.UUID("aaaaaaaa-0000-0000-0000-000000000301"),
    "email": "care_a@example.com",
    "username": "CareUserA",
}
USER_B = {
    "id": uuid.UUID("aaaaaaaa-0000-0000-0000-000000000302"),
    "email": "care_b@example.com",
    "username": "CareUserB",
}
VALID_PET = {"name": "Mochi", "type": "cat", "color": "orange"}


def _jwt_key() -> bytes:
    try:
        return base64.b64decode(settings.supabase_jwt_secret)
    except Exception:
        return settings.supabase_jwt_secret.encode("utf-8")


def supabase_token(user: dict) -> str:
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


async def provision_and_create_pet(client: AsyncClient, user: dict) -> str:
    token = supabase_token(user)
    await client.post(f"{AUTH}/profile/setup", headers={"Authorization": f"Bearer {token}"})
    await client.post(PETS, json=VALID_PET, headers={"Authorization": f"Bearer {token}"})
    return token


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ─── POST /care-events ───────────────────────────────────────────────────────

async def test_log_care_event_feed(client: AsyncClient):
    token = await provision_and_create_pet(client, USER_A)
    resp = await client.post(CARE, json={"type": "feed"}, headers=auth_header(token))
    assert resp.status_code == 201
    data = resp.json()
    assert data["type"] == "feed"
    assert "id" in data
    assert "created_at" in data


async def test_log_care_event_bath(client: AsyncClient):
    token = await provision_and_create_pet(client, USER_A)
    resp = await client.post(CARE, json={"type": "bath"}, headers=auth_header(token))
    assert resp.status_code == 201
    assert resp.json()["type"] == "bath"


async def test_log_care_event_play(client: AsyncClient):
    token = await provision_and_create_pet(client, USER_A)
    resp = await client.post(CARE, json={"type": "play"}, headers=auth_header(token))
    assert resp.status_code == 201
    assert resp.json()["type"] == "play"


async def test_log_care_event_invalid_type(client: AsyncClient):
    token = await provision_and_create_pet(client, USER_A)
    resp = await client.post(CARE, json={"type": "dance"}, headers=auth_header(token))
    assert resp.status_code == 422


async def test_log_care_event_no_pet(client: AsyncClient):
    token = supabase_token(USER_A)
    await client.post(f"{AUTH}/profile/setup", headers=auth_header(token))
    resp = await client.post(CARE, json={"type": "feed"}, headers=auth_header(token))
    assert resp.status_code == 404


async def test_log_care_event_unauthenticated(client: AsyncClient):
    resp = await client.post(CARE, json={"type": "feed"})
    assert resp.status_code == 403


# ─── GET /care-events/stats ──────────────────────────────────────────────────

async def test_get_stats_empty(client: AsyncClient):
    token = await provision_and_create_pet(client, USER_A)
    resp = await client.get(f"{CARE}/stats", headers=auth_header(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_events"] == 0
    assert data["unique_users"] == 0
    assert data["total_users"] == 1
    assert data["avg_events_per_user"] == 0.0
    assert data["by_type"] == []


async def test_get_stats_with_events(client: AsyncClient):
    token_a = await provision_and_create_pet(client, USER_A)
    token_b = await provision_and_create_pet(client, USER_B)

    await client.post(CARE, json={"type": "feed"}, headers=auth_header(token_a))
    await client.post(CARE, json={"type": "feed"}, headers=auth_header(token_a))
    await client.post(CARE, json={"type": "bath"}, headers=auth_header(token_b))

    resp = await client.get(f"{CARE}/stats", headers=auth_header(token_a))
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_events"] == 3
    assert data["unique_users"] == 2
    assert data["total_users"] == 2
    assert data["avg_events_per_user"] == 1.5


# ─── GET /care-events/stats/users ────────────────────────────────────────────

async def test_get_per_user_stats(client: AsyncClient):
    token_a = await provision_and_create_pet(client, USER_A)
    token_b = await provision_and_create_pet(client, USER_B)

    await client.post(CARE, json={"type": "feed"}, headers=auth_header(token_a))
    await client.post(CARE, json={"type": "feed"}, headers=auth_header(token_a))
    await client.post(CARE, json={"type": "play"}, headers=auth_header(token_a))
    await client.post(CARE, json={"type": "bath"}, headers=auth_header(token_b))

    resp = await client.get(f"{CARE}/stats/users", headers=auth_header(token_a))
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2

    user_a_stats = next(d for d in data if d["username"] == "CareUserA")
    assert user_a_stats["total_events"] == 3

    user_b_stats = next(d for d in data if d["username"] == "CareUserB")
    assert user_b_stats["total_events"] == 1


# ─── POST /care-events/visit/{pet_id} ───────────────────────────────────────

async def test_visit_pet_success(client: AsyncClient):
    token_a = await provision_and_create_pet(client, USER_A)
    token_b = await provision_and_create_pet(client, USER_B)

    # Get pet B's ID
    pet_resp = await client.get("/api/v1/pets/me", headers=auth_header(token_b))
    pet_b_id = pet_resp.json()["id"]

    resp = await client.post(f"{CARE}/visit/{pet_b_id}", headers=auth_header(token_a))
    assert resp.status_code == 201
    data = resp.json()
    assert data["visits_today"] == 1
    assert data["pet_mood_boost"] == 5

    # Verify pet B's mood increased
    pet_resp2 = await client.get("/api/v1/pets/me", headers=auth_header(token_b))
    assert pet_resp2.json()["mood"] == 100  # was 100, capped at 100


async def test_visit_own_pet_rejected(client: AsyncClient):
    token_a = await provision_and_create_pet(client, USER_A)
    pet_resp = await client.get("/api/v1/pets/me", headers=auth_header(token_a))
    pet_a_id = pet_resp.json()["id"]

    resp = await client.post(f"{CARE}/visit/{pet_a_id}", headers=auth_header(token_a))
    assert resp.status_code == 400
    assert "own pet" in resp.json()["detail"].lower()


async def test_visit_pet_daily_limit(client: AsyncClient):
    token_a = await provision_and_create_pet(client, USER_A)
    token_b = await provision_and_create_pet(client, USER_B)

    pet_resp = await client.get("/api/v1/pets/me", headers=auth_header(token_b))
    pet_b_id = pet_resp.json()["id"]

    # Visit 3 times (the limit)
    for i in range(3):
        resp = await client.post(f"{CARE}/visit/{pet_b_id}", headers=auth_header(token_a))
        assert resp.status_code == 201
        assert resp.json()["visits_today"] == i + 1

    # 4th visit should fail
    resp = await client.post(f"{CARE}/visit/{pet_b_id}", headers=auth_header(token_a))
    assert resp.status_code == 429


async def test_visit_nonexistent_pet(client: AsyncClient):
    token_a = await provision_and_create_pet(client, USER_A)
    fake_id = "00000000-0000-0000-0000-000000000000"
    resp = await client.post(f"{CARE}/visit/{fake_id}", headers=auth_header(token_a))
    assert resp.status_code == 404
