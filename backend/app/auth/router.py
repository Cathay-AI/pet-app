"""
Auth router.

With Supabase Auth, the frontend handles login/register/logout via the
Supabase client SDK. The backend only provides:

  POST /auth/profile/setup  — provision a profile row on first Supabase login
  GET  /auth/me             — return the authenticated user's profile
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Profile
from app.auth.schemas import ProfilePublic
from app.auth.service import AuthService
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import decode_supabase_token

router = APIRouter(prefix="/auth", tags=["auth"])

_bearer = HTTPBearer()


def _service(db: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(db)


@router.post(
    "/profile/setup",
    response_model=ProfilePublic,
    status_code=status.HTTP_200_OK,
    summary="Initialize or return profile for the authenticated Supabase user",
    description=(
        "Call this endpoint immediately after every Supabase login/signup. "
        "It creates a public.profiles row on first login, or returns the "
        "existing one on subsequent logins. Idempotent."
    ),
)
async def setup_profile(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    svc: AuthService = Depends(_service),
) -> ProfilePublic:
    try:
        claims = decode_supabase_token(credentials.credentials)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Supabase token",
        )

    sub = claims.get("sub")
    email = claims.get("email", "")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing 'sub' claim",
        )

    profile, _ = await svc.get_or_create_profile(
        supabase_user_id=uuid.UUID(sub),
        email=email,
    )
    return ProfilePublic.model_validate(profile)


@router.get(
    "/me",
    response_model=ProfilePublic,
    summary="Return the currently authenticated user's profile",
)
async def me(
    current_user: Profile = Depends(get_current_user),
) -> ProfilePublic:
    return ProfilePublic.model_validate(current_user)
