"""
Integration tests for /api/v1/auth endpoints.

Each test is a standalone async function – no setUp/tearDown needed because
the `client` fixture provides a fresh in-memory DB per test.
"""

import pytest
from httpx import AsyncClient

BASE = "/api/v1/auth"

# ─── Helpers ──────────────────────────────────────────────────────────────────

VALID_USER = {
    "email": "neko@example.com",
    "username": "Neko",
    "password": "Neko1234",
}


async def register(client: AsyncClient, payload: dict | None = None) -> dict:
    """Register a user and return the parsed response JSON."""
    resp = await client.post(f"{BASE}/register", json=payload or VALID_USER)
    assert resp.status_code == 201, resp.text
    return resp.json()


# ─── Register ─────────────────────────────────────────────────────────────────

async def test_register_success(client: AsyncClient):
    data = await register(client)
    assert data["user"]["email"] == VALID_USER["email"]
    assert data["user"]["username"] == VALID_USER["username"]
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


async def test_register_duplicate_email(client: AsyncClient):
    await register(client)
    resp = await client.post(f"{BASE}/register", json=VALID_USER)
    assert resp.status_code == 409
    assert "already registered" in resp.json()["detail"]


async def test_register_weak_password_no_digit(client: AsyncClient):
    payload = {**VALID_USER, "password": "NoDigitPass"}
    resp = await client.post(f"{BASE}/register", json=payload)
    assert resp.status_code == 422


async def test_register_weak_password_no_letter(client: AsyncClient):
    payload = {**VALID_USER, "password": "12345678"}
    resp = await client.post(f"{BASE}/register", json=payload)
    assert resp.status_code == 422


async def test_register_username_too_long(client: AsyncClient):
    payload = {**VALID_USER, "username": "a" * 25}
    resp = await client.post(f"{BASE}/register", json=payload)
    assert resp.status_code == 422


# ─── Login ────────────────────────────────────────────────────────────────────

async def test_login_success(client: AsyncClient):
    await register(client)
    resp = await client.post(
        f"{BASE}/login",
        json={"email": VALID_USER["email"], "password": VALID_USER["password"]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


async def test_login_wrong_password(client: AsyncClient):
    await register(client)
    resp = await client.post(
        f"{BASE}/login",
        json={"email": VALID_USER["email"], "password": "WrongPass9"},
    )
    assert resp.status_code == 401


async def test_login_unknown_email(client: AsyncClient):
    resp = await client.post(
        f"{BASE}/login",
        json={"email": "ghost@example.com", "password": "Pass1234"},
    )
    assert resp.status_code == 401


# ─── Refresh ──────────────────────────────────────────────────────────────────

async def test_refresh_success(client: AsyncClient):
    data = await register(client)
    old_refresh = data["refresh_token"]
    old_access = data["access_token"]

    resp = await client.post(f"{BASE}/refresh", json={"refresh_token": old_refresh})
    assert resp.status_code == 200
    new_data = resp.json()
    # Tokens must be new (rotated)
    assert new_data["access_token"] != old_access
    assert new_data["refresh_token"] != old_refresh


async def test_refresh_token_rotation_revokes_old(client: AsyncClient):
    """Using a refresh token twice (after rotation) must fail."""
    data = await register(client)
    old_refresh = data["refresh_token"]

    # First use – OK
    await client.post(f"{BASE}/refresh", json={"refresh_token": old_refresh})

    # Second use of the *same* token – must be rejected
    resp = await client.post(f"{BASE}/refresh", json={"refresh_token": old_refresh})
    assert resp.status_code == 401


async def test_refresh_invalid_token(client: AsyncClient):
    resp = await client.post(f"{BASE}/refresh", json={"refresh_token": "not.a.token"})
    assert resp.status_code == 401


# ─── Logout ───────────────────────────────────────────────────────────────────

async def test_logout_success(client: AsyncClient):
    data = await register(client)
    resp = await client.post(f"{BASE}/logout", json={"refresh_token": data["refresh_token"]})
    assert resp.status_code == 200
    assert resp.json()["message"] == "Logged out successfully"


async def test_logout_revokes_refresh_token(client: AsyncClient):
    """After logout, the refresh token must not work anymore."""
    data = await register(client)
    refresh = data["refresh_token"]

    await client.post(f"{BASE}/logout", json={"refresh_token": refresh})

    resp = await client.post(f"{BASE}/refresh", json={"refresh_token": refresh})
    assert resp.status_code == 401


# ─── Me ───────────────────────────────────────────────────────────────────────

async def test_me_success(client: AsyncClient):
    data = await register(client)
    resp = await client.get(
        f"{BASE}/me",
        headers={"Authorization": f"Bearer {data['access_token']}"},
    )
    assert resp.status_code == 200
    assert resp.json()["email"] == VALID_USER["email"]


async def test_me_no_token(client: AsyncClient):
    resp = await client.get(f"{BASE}/me")
    assert resp.status_code == 403  # HTTPBearer returns 403 when header is missing


async def test_me_invalid_token(client: AsyncClient):
    resp = await client.get(f"{BASE}/me", headers={"Authorization": "Bearer invalid.token"})
    assert resp.status_code == 401
