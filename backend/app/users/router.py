"""FastAPI router for user profile and friend system endpoints."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.users.profile import Profile
from app.core.schemas import MessageResponse
from app.core.database import get_db
from app.core.auth_dependencies import get_current_user
from app.users.schemas import (
    FriendRequestAction,
    FriendRequestCreate,
    FriendshipPublic,
    MyProfileResponse,
    UpdateProfileRequest,
    UserProfilePublic,
)
from app.users.service import UsersService

router = APIRouter(prefix="/users", tags=["users"])


def _service(db: AsyncSession = Depends(get_db)) -> UsersService:
    return UsersService(db)


# ─── Self profile ─────────────────────────────────────────────────────────────

@router.get(
    "/me/profile",
    response_model=MyProfileResponse,
    summary="Get my full profile",
)
async def get_my_profile(
    current_user: Profile = Depends(get_current_user),
    svc: UsersService = Depends(_service),
) -> MyProfileResponse:
    return await svc.get_my_profile(current_user)


@router.patch(
    "/me/profile",
    response_model=MyProfileResponse,
    summary="Update username / avatar / bio",
)
async def update_profile(
    body: UpdateProfileRequest,
    current_user: Profile = Depends(get_current_user),
    svc: UsersService = Depends(_service),
) -> MyProfileResponse:
    try:
        return await svc.update_profile(current_user, body)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


# ─── User search ──────────────────────────────────────────────────────────────

@router.get(
    "/search",
    response_model=UserProfilePublic,
    summary="Search a user by friend code (e.g. ?friend_code=NEKO-A3B7)",
)
async def search_by_friend_code(
    friend_code: str = Query(..., pattern=r"^NEKO-[A-Z0-9]{4}$", description="Friend code"),
    current_user: Profile = Depends(get_current_user),
    svc: UsersService = Depends(_service),
) -> UserProfilePublic:
    try:
        return await svc.get_profile_by_friend_code(friend_code)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ─── Friends ──────────────────────────────────────────────────────────────────

@router.get(
    "/me/friends",
    response_model=list[FriendshipPublic],
    summary="List all accepted friends",
)
async def list_friends(
    current_user: Profile = Depends(get_current_user),
    svc: UsersService = Depends(_service),
) -> list[FriendshipPublic]:
    return await svc.list_friends(current_user)


@router.get(
    "/me/friends/pending",
    response_model=list[FriendshipPublic],
    summary="List incoming pending friend requests",
)
async def list_pending_requests(
    current_user: Profile = Depends(get_current_user),
    svc: UsersService = Depends(_service),
) -> list[FriendshipPublic]:
    return await svc.list_pending_requests(current_user)


@router.post(
    "/me/friends",
    response_model=FriendshipPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Send a friend request via friend code",
)
async def send_friend_request(
    body: FriendRequestCreate,
    current_user: Profile = Depends(get_current_user),
    svc: UsersService = Depends(_service),
) -> FriendshipPublic:
    try:
        return await svc.send_friend_request(current_user, body.friend_code)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.patch(
    "/me/friends/{friendship_id}",
    response_model=FriendshipPublic,
    summary="Accept or decline a pending friend request",
)
async def respond_friend_request(
    friendship_id: uuid.UUID,
    body: FriendRequestAction,
    current_user: Profile = Depends(get_current_user),
    svc: UsersService = Depends(_service),
) -> FriendshipPublic:
    try:
        return await svc.respond_friend_request(current_user, friendship_id, body.action)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete(
    "/me/friends/{friend_id}",
    response_model=MessageResponse,
    summary="Remove an accepted friend",
)
async def remove_friend(
    friend_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
    svc: UsersService = Depends(_service),
) -> MessageResponse:
    try:
        await svc.remove_friend(current_user, friend_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return MessageResponse(message="Friend removed successfully")
