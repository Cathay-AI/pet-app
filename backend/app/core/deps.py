"""
Shared FastAPI dependencies used across all domain routers.

Usage
-----
    from app.core.deps import get_current_user

    @router.get("/something")
    async def endpoint(profile: Profile = Depends(get_current_user)):
        ...
"""

import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Profile
from app.core.database import get_db
from app.core.security import decode_supabase_token

_bearer = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> Profile:
    """
    Validate the Supabase Bearer token and return the authenticated profile.

    1. Decodes and verifies the Supabase JWT.
    2. Extracts the user UUID from the 'sub' claim.
    3. Looks up the matching row in public.profiles.

    Raises HTTP 401 if the token is missing, invalid, expired,
    or no profile exists for the user yet.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        claims = decode_supabase_token(credentials.credentials)
    except JWTError:
        raise credentials_exception

    sub = claims.get("sub")
    if not sub:
        raise credentials_exception

    try:
        user_id = uuid.UUID(sub)
    except ValueError:
        raise credentials_exception

    profile = await db.scalar(select(Profile).where(Profile.id == user_id))
    if not profile:
        from app.auth.service import AuthService
        email = claims.get("email", "")
        # Try to extract display name from user_metadata in token if available
        user_metadata = claims.get("user_metadata", {})
        username = user_metadata.get("username") or user_metadata.get("full_name")
        
        svc = AuthService(db)
        profile, _ = await svc.get_or_create_profile(
            supabase_user_id=user_id,
            email=email,
            username=username,
        )

    return profile
