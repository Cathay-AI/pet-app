"""
Integration tests for /api/v1/pets endpoints.

Flow tested
-----------
1. Register a user → get access_token
2. Create pet → 201
3. Create second pet → 409 (1-per-user rule)
4. GET /pets/me → 200
5. GET /pets/{id} own pet → 200
6. GET /pets/{id} other user's pet → 403
7. GET /pets/{id} non-existent → 404
8. Unauthenticated requests → 403
"""

import pytest
from httpx import AsyncClient

AUTH = "/api/v1/auth"
PETS = "/api/v1/pets"

VALID_USER_A = {
    "email": "neko_a@example.com",
    "username": "NekoA",
    "password": "NekoPass1",
}
VALID_USER_B = {
    "email": "neko_b@example.com",
    "username": "NekoB",
    "password": "NekoPass2",
}
VALID_PET = {"name": "Mochi", "type": "cat", "color": "orange"}


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def register_and_token(client: AsyncClient, user: dict) -> str:
    """Register user and return access_token."""
    resp = await client.post(f"{AUTH}/register", json=user)
    assert resp.status_code == 201, resp.text
    return resp.json()["access_token"]


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ─── Create pet ───────────────────────────────────────────────────────────────

async def test_create_pet_success(client: AsyncClient):
    token = await register_and_token(client, VALID_USER_A)
    resp = await client.post(PETS, json=VALID_PET, headers=auth_header(token))
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Mochi"
    assert data["type"] == "cat"
    assert data["color"] == "orange"
    assert data["hunger"] == 100
    assert data["cleanliness"] == 100
    assert data["mood"] == 100
    assert data["is_sick"] is False
    assert "id" in data
    assert "user_id" in data


async def test_create_second_pet_is_rejected(client: AsyncClient):
    """1-pet-per-user: creating a second pet must return 409."""
    token = await register_and_token(client, VALID_USER_A)
    await client.post(PETS, json=VALID_PET, headers=auth_header(token))
    resp = await client.post(PETS, json={"name": "Kumo", "type": "dog", "color": "gray"},
                             headers=auth_header(token))
    assert resp.status_code == 409
    assert "already have a pet" in resp.json()["detail"]


async def test_create_pet_unauthenticated(client: AsyncClient):
    resp = await client.post(PETS, json=VALID_PET)
    assert resp.status_code == 403


async def test_create_pet_invalid_type(client: AsyncClient):
    token = await register_and_token(client, VALID_USER_A)
    resp = await client.post(PETS, json={"name": "X", "type": "hamster", "color": "orange"},
                             headers=auth_header(token))
    assert resp.status_code == 422


async def test_create_pet_invalid_color(client: AsyncClient):
    token = await register_and_token(client, VALID_USER_A)
    resp = await client.post(PETS, json={"name": "X", "type": "cat", "color": "pink"},
                             headers=auth_header(token))
    assert resp.status_code == 422


async def test_create_pet_name_too_long(client: AsyncClient):
    token = await register_and_token(client, VALID_USER_A)
    resp = await client.post(PETS, json={"name": "A" * 25, "type": "cat", "color": "orange"},
                             headers=auth_header(token))
    assert resp.status_code == 422


# ─── GET /pets/me ─────────────────────────────────────────────────────────────

async def test_get_my_pet_success(client: AsyncClient):
    token = await register_and_token(client, VALID_USER_A)
    await client.post(PETS, json=VALID_PET, headers=auth_header(token))
    resp = await client.get(f"{PETS}/me", headers=auth_header(token))
    assert resp.status_code == 200
    assert resp.json()["name"] == "Mochi"


async def test_get_my_pet_not_yet_created(client: AsyncClient):
    token = await register_and_token(client, VALID_USER_A)
    resp = await client.get(f"{PETS}/me", headers=auth_header(token))
    assert resp.status_code == 404


async def test_get_my_pet_unauthenticated(client: AsyncClient):
    resp = await client.get(f"{PETS}/me")
    assert resp.status_code == 403


# ─── GET /pets/{pet_id} ───────────────────────────────────────────────────────

async def test_get_pet_by_id_success(client: AsyncClient):
    token = await register_and_token(client, VALID_USER_A)
    create_resp = await client.post(PETS, json=VALID_PET, headers=auth_header(token))
    pet_id = create_resp.json()["id"]

    resp = await client.get(f"{PETS}/{pet_id}", headers=auth_header(token))
    assert resp.status_code == 200
    assert resp.json()["id"] == pet_id


async def test_get_pet_by_id_other_user_is_forbidden(client: AsyncClient):
    """User B cannot access User A's pet."""
    token_a = await register_and_token(client, VALID_USER_A)
    token_b = await register_and_token(client, VALID_USER_B)

    create_resp = await client.post(PETS, json=VALID_PET, headers=auth_header(token_a))
    pet_id = create_resp.json()["id"]

    resp = await client.get(f"{PETS}/{pet_id}", headers=auth_header(token_b))
    assert resp.status_code == 403


async def test_get_pet_by_id_not_found(client: AsyncClient):
    token = await register_and_token(client, VALID_USER_A)
    fake_id = "00000000-0000-0000-0000-000000000000"
    resp = await client.get(f"{PETS}/{fake_id}", headers=auth_header(token))
    assert resp.status_code == 404


# ─── PUT /pets/me ─────────────────────────────────────────────────────────────

async def test_update_pet_success(client: AsyncClient):
    token = await register_and_token(client, VALID_USER_A)
    await client.post(PETS, json=VALID_PET, headers=auth_header(token))
    
    update_data = {
        "hunger": 80,
        "cleanliness": 70,
        "mood": 90,
        "is_sick": True,
        "zero_since_at": "2026-06-16T12:00:00Z",
        "last_fed_at": "2026-06-16T12:10:00Z",
        "last_bath_at": "2026-06-16T12:20:00Z",
        "last_play_at": "2026-06-16T12:30:00Z",
    }
    resp = await client.put(f"{PETS}/me", json=update_data, headers=auth_header(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["hunger"] == 80
    assert data["cleanliness"] == 70
    assert data["mood"] == 90
    assert data["is_sick"] is True
    assert data["zero_since_at"].startswith("2026-06-16T12:00:00")


async def test_update_pet_not_found(client: AsyncClient):
    token = await register_and_token(client, VALID_USER_A)
    update_data = {
        "hunger": 80,
        "cleanliness": 70,
        "mood": 90,
        "is_sick": False,
    }
    resp = await client.put(f"{PETS}/me", json=update_data, headers=auth_header(token))
    assert resp.status_code == 404


# ─── GET /pets/leaderboard ────────────────────────────────────────────────────

async def test_get_leaderboard_success(client: AsyncClient):
    token_a = await register_and_token(client, VALID_USER_A)
    await client.post(PETS, json=VALID_PET, headers=auth_header(token_a))
    
    token_b = await register_and_token(client, VALID_USER_B)
    await client.post(PETS, json={"name": "Pochi", "type": "dog", "color": "brown"}, headers=auth_header(token_b))
    
    resp = await client.get(f"{PETS}/leaderboard")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert any(d["name"] == "Mochi" and d["username"] == "NekoA" for d in data)
    assert any(d["name"] == "Pochi" and d["username"] == "NekoB" for d in data)
