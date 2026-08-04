import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel

CareType = Literal["feed", "bath", "play"]


class LogCareEventRequest(BaseModel):
    type: CareType


class CareEventResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    pet_id: uuid.UUID
    type: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TypeCount(BaseModel):
    type: str
    count: int


class CareStatsResponse(BaseModel):
    date: date
    total_events: int
    unique_users: int
    total_users: int
    avg_events_per_user: float
    by_type: list[TypeCount]


class UserCareStatsResponse(BaseModel):
    user_id: uuid.UUID
    username: str
    total_events: int
    by_type: list[TypeCount]


class VisitPetResponse(BaseModel):
    message: str
    visits_today: int
    pet_mood_boost: int
