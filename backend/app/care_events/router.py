import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.care_events.schemas import (
    CareEventResponse,
    CareStatsResponse,
    LogCareEventRequest,
    UserCareStatsResponse,
    VisitPetResponse,
)
from app.care_events.service import CareEventService
from app.core.auth_dependencies import get_current_user
from app.core.database import get_db
from app.users.profile import Profile

router = APIRouter(prefix="/care-events", tags=["care-events"])


def _service(db: AsyncSession = Depends(get_db)) -> CareEventService:
    return CareEventService(db)


@router.post(
    "",
    response_model=CareEventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Log a care event (feed, bath, play)",
)
async def log_care_event(
    body: LogCareEventRequest,
    current_user: Profile = Depends(get_current_user),
    svc: CareEventService = Depends(_service),
) -> CareEventResponse:
    try:
        event = await svc.log_event(current_user.id, body.type)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return CareEventResponse.model_validate(event)


@router.get(
    "/stats",
    response_model=CareStatsResponse,
    summary="Get daily care stats (total events, unique users, avg per user)",
)
async def get_care_stats(
    target_date: date = Query(default=None, description="Date to query (defaults to today)"),
    current_user: Profile = Depends(get_current_user),
    svc: CareEventService = Depends(_service),
) -> CareStatsResponse:
    query_date = target_date or date.today()
    stats = await svc.get_daily_stats(query_date)
    return CareStatsResponse(**stats)


@router.get(
    "/stats/users",
    response_model=list[UserCareStatsResponse],
    summary="Get per-user care stats for a given day",
)
async def get_per_user_stats(
    target_date: date = Query(default=None, description="Date to query (defaults to today)"),
    current_user: Profile = Depends(get_current_user),
    svc: CareEventService = Depends(_service),
) -> list[UserCareStatsResponse]:
    query_date = target_date or date.today()
    results = await svc.get_per_user_stats(query_date)
    return [UserCareStatsResponse(**r) for r in results]


@router.post(
    "/visit/{pet_id}",
    response_model=VisitPetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Visit and pet someone else's pet (max 3 times/day per pet)",
)
async def visit_pet(
    pet_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
    svc: CareEventService = Depends(_service),
) -> VisitPetResponse:
    try:
        result = await svc.visit_pet(current_user.id, pet_id)
    except ValueError as exc:
        detail = str(exc)
        if "not found" in detail.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)
        if "own pet" in detail.lower():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=detail)
    return VisitPetResponse(**result)
