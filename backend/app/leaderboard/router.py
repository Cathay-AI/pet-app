"""FastAPI router for leaderboard endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth_dependencies import get_current_user
from app.users.profile import Profile
from app.leaderboard.service import LeaderboardService
from app.leaderboard.schemas import FriendsLeaderboardResponse, SuggestionsResponse

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


def _service(db: AsyncSession = Depends(get_db)) -> LeaderboardService:
    return LeaderboardService(db)


@router.get(
    "/friends",
    response_model=FriendsLeaderboardResponse,
    summary="Get friends leaderboard with rank tracking",
)
async def get_friends_leaderboard(
    limit: int = Query(default=50, ge=1, le=100, description="Max number of entries"),
    current_user: Profile = Depends(get_current_user),
    svc: LeaderboardService = Depends(_service),
) -> FriendsLeaderboardResponse:
    """
    Returns leaderboard showing only accepted friends' pets,
    sorted by health score descending.

    Includes:
    - Friends list with current ranks
    - Current user's entry if not in friends list
    - Last update timestamp
    """
    return await svc.get_friends_leaderboard(current_user, limit)


@router.get(
    "/suggestions",
    response_model=SuggestionsResponse,
    summary="Get suggested users to add as friends",
)
async def get_suggestions(
    limit: int = Query(default=10, ge=1, le=50, description="Max number of suggestions"),
    current_user: Profile = Depends(get_current_user),
    svc: LeaderboardService = Depends(_service),
) -> SuggestionsResponse:
    """
    Returns suggested users based on:
    - Recent activity
    - Healthy pets (not sick, decent stats)
    - Mutual friends (future enhancement)

    Excludes:
    - Current user
    - Existing friends
    - Pending friend requests
    """
    return await svc.get_suggestions(current_user, limit)
