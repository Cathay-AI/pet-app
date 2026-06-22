import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Profile
from app.core.database import get_db
from app.core.deps import get_current_user
from app.pets.schemas import CreatePetRequest, PetResponse, UpdatePetRequest, LeaderboardPetResponse
from app.pets.service import PetService

router = APIRouter(prefix="/pets", tags=["pets"])


def _service(db: AsyncSession = Depends(get_db)) -> PetService:
    return PetService(db)


# ─── POST /pets ───────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=PetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create your pet (one per account)",
)
async def create_pet(
    body: CreatePetRequest,
    current_user: Profile = Depends(get_current_user),
    svc: PetService = Depends(_service),
) -> PetResponse:
    try:
        pet = await svc.create(current_user.id, body)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    return PetResponse.model_validate(pet)


# ─── GET /pets/me ─────────────────────────────────────────────────────────────

@router.get(
    "/me",
    response_model=PetResponse,
    summary="Get your pet",
)
async def get_my_pet(
    current_user: Profile = Depends(get_current_user),
    svc: PetService = Depends(_service),
) -> PetResponse:
    try:
        pet = await svc.get_my_pet(current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return PetResponse.model_validate(pet)


# ─── PUT /pets/me ─────────────────────────────────────────────────────────────

@router.put(
    "/me",
    response_model=PetResponse,
    summary="Update care stats of your pet",
)
async def update_pet(
    body: UpdatePetRequest,
    current_user: Profile = Depends(get_current_user),
    svc: PetService = Depends(_service),
) -> PetResponse:
    try:
        pet = await svc.update_pet(current_user.id, body)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return PetResponse.model_validate(pet)


# ─── GET /pets/leaderboard ────────────────────────────────────────────────────

@router.get(
    "/leaderboard",
    response_model=list[LeaderboardPetResponse],
    summary="Get top 50 pets and their owners' usernames for the leaderboard",
)
async def get_leaderboard(
    svc: PetService = Depends(_service),
) -> list[LeaderboardPetResponse]:
    entries = await svc.get_leaderboard()
    return [LeaderboardPetResponse.model_validate(entry) for entry in entries]


# ─── GET /pets/{pet_id} ───────────────────────────────────────────────────────

@router.get(
    "/{pet_id}",
    response_model=PetResponse,
    summary="Get a pet by ID (owner only)",
)
async def get_pet(
    pet_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
    svc: PetService = Depends(_service),
) -> PetResponse:
    try:
        pet = await svc.get_by_id(pet_id, current_user.id)
    except ValueError as exc:
        detail = str(exc)
        if "not found" in detail:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)
    return PetResponse.model_validate(pet)
