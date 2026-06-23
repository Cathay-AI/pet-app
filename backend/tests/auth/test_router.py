"""
Integration tests for /api/v1/auth endpoints.

The app delegates sign-up/login/logout to Supabase Auth. Backend auth endpoints
only validate Supabase-style bearer tokens and provision/read local profiles.
"""

import base64
import uuid
from datetime import datetime, timedelta, timezone

from httpx import AsyncClient
from jose import jwt

from app.core.config import settings

BASE = "/api/v1/auth"

VALID_PROFILE = {
    "id": uuid.UUID("aaaaaaaa-0000-0000-0000-000000000101"),
    "email": "neko@example.com",
    "username": "Neko",
}


def _jwt_key() -> bytes:
    try:
        return base64.b64decode(settings.supabase_jwt_secret)
    except Exception:
        return settings.supabase_jwt_secret.encode("utf-8")


def supabase_token(
    *,
    user_id: uuid.UUID = VALID_PROFILE["id"],
    email: str = VALID_PROFILE["email"],
    username: str | None = VALID_PROFILE["username"],
    expires_delta: timedelta = timedelta(minutes=30),
) -> str:
    claims = {
        "sub": str(user_id),
        "email": email,
        "aud": "authenticated",
        "exp": datetime.now(timezone.utc) + expires_delta,
    }
    if username is not None:
        claims["user_metadata"] = {"username": username}
    return jwt.encode(claims, _jwt_key(), algorithm="HS256")


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def setup_profile(
    client: AsyncClient,
    *,
    profile: dict = VALID_PROFILE,
) -> dict:
    token = supabase_token(
        user_id=profile["id"],
        email=profile["email"],
        username=profile["username"],
    )
    resp = await client.post(f"{BASE}/profile/setup", headers=auth_header(token))
    assert resp.status_code == 200, resp.text
    return resp.json()


async def test_profile_setup_creates_profile(client: AsyncClient):
    data = await setup_profile(client)
    assert data["id"] == str(VALID_PROFILE["id"])
    assert data["username"] == VALID_PROFILE["username"]
    assert data["friend_code"].startswith("NEKO-")
    assert data["created_at"]


async def test_profile_setup_is_idempotent(client: AsyncClient):
    first = await setup_profile(client)
    second = await setup_profile(client)
    assert second["id"] == first["id"]
    assert second["friend_code"] == first["friend_code"]


async def test_profile_setup_derives_username_from_email(client: AsyncClient):
    profile = {
        "id": uuid.UUID("aaaaaaaa-0000-0000-0000-000000000102"),
        "email": "mochi@example.com",
        "username": None,
    }
    token = supabase_token(
        user_id=profile["id"],
        email=profile["email"],
        username=None,
    )
    resp = await client.post(f"{BASE}/profile/setup", headers=auth_header(token))
    assert resp.status_code == 200, resp.text
    assert resp.json()["username"] == "mochi"


async def test_profile_setup_missing_token(client: AsyncClient):
    resp = await client.post(f"{BASE}/profile/setup")
    assert resp.status_code == 403


async def test_profile_setup_invalid_token(client: AsyncClient):
    resp = await client.post(
        f"{BASE}/profile/setup",
        headers=auth_header("invalid.token"),
    )
    assert resp.status_code == 401


async def test_profile_setup_missing_sub(client: AsyncClient):
    token = jwt.encode(
        {
            "email": VALID_PROFILE["email"],
            "aud": "authenticated",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=30),
        },
        _jwt_key(),
        algorithm="HS256",
    )
    resp = await client.post(f"{BASE}/profile/setup", headers=auth_header(token))
    assert resp.status_code == 401


async def test_me_success(client: AsyncClient):
    await setup_profile(client)
    token = supabase_token()
    resp = await client.get(f"{BASE}/me", headers=auth_header(token))
    assert resp.status_code == 200
    assert resp.json()["id"] == str(VALID_PROFILE["id"])
    assert resp.json()["username"] == VALID_PROFILE["username"]


async def test_me_auto_creates_profile_from_token(client: AsyncClient):
    user_id = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000103")
    token = supabase_token(
        user_id=user_id,
        email="auto@example.com",
        username="AutoNeko",
    )
    resp = await client.get(f"{BASE}/me", headers=auth_header(token))
    assert resp.status_code == 200
    assert resp.json()["id"] == str(user_id)
    assert resp.json()["username"] == "AutoNeko"


async def test_me_no_token(client: AsyncClient):
    resp = await client.get(f"{BASE}/me")
    assert resp.status_code == 403


async def test_me_invalid_token(client: AsyncClient):
    resp = await client.get(f"{BASE}/me", headers=auth_header("invalid.token"))
    assert resp.status_code == 401
