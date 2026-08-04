import uuid
from datetime import date, datetime, time, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.care_events.model import CareEvent
from app.pets.pet import Pet
from app.pets.service import apply_decay
from app.users.profile import Profile


VISIT_DAILY_LIMIT = 3
VISIT_MOOD_BOOST = 5


class CareEventService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def log_event(self, user_id: uuid.UUID, care_type: str) -> CareEvent:
        pet = await self.db.scalar(select(Pet).where(Pet.user_id == user_id))
        if not pet:
            raise ValueError("You don't have a pet yet.")

        event = CareEvent(
            user_id=user_id,
            pet_id=pet.id,
            type=care_type,
        )
        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(event)
        return event

    async def visit_pet(self, visitor_id: uuid.UUID, target_pet_id: uuid.UUID) -> dict:
        target_pet = await self.db.get(Pet, target_pet_id)
        if not target_pet:
            raise ValueError("Pet not found.")
        if target_pet.user_id == visitor_id:
            raise ValueError("You can't visit your own pet.")

        today = date.today()
        start = datetime.combine(today, time.min, tzinfo=timezone.utc)
        end = datetime.combine(today, time.max, tzinfo=timezone.utc)

        visits_today = await self.db.scalar(
            select(func.count())
            .select_from(CareEvent)
            .where(
                CareEvent.user_id == visitor_id,
                CareEvent.pet_id == target_pet_id,
                CareEvent.type == "visit_pet",
                CareEvent.created_at.between(start, end),
            )
        ) or 0

        if visits_today >= VISIT_DAILY_LIMIT:
            raise ValueError(f"You've already visited this pet {VISIT_DAILY_LIMIT} times today.")

        event = CareEvent(
            user_id=visitor_id,
            pet_id=target_pet_id,
            type="visit_pet",
        )
        self.db.add(event)

        now = datetime.now(timezone.utc)
        apply_decay(target_pet, now)
        target_pet.mood = min(100, target_pet.mood + VISIT_MOOD_BOOST)
        target_pet.last_visited_at = now
        target_pet.updated_at = now
        self.db.add(target_pet)

        await self.db.commit()

        return {
            "message": f"You petted {target_pet.name}!",
            "visits_today": visits_today + 1,
            "pet_mood_boost": VISIT_MOOD_BOOST,
        }

    async def get_daily_stats(self, target_date: date) -> dict:
        start = datetime.combine(target_date, time.min, tzinfo=timezone.utc)
        end = datetime.combine(target_date, time.max, tzinfo=timezone.utc)

        date_filter = CareEvent.created_at.between(start, end)

        total = await self.db.scalar(
            select(func.count()).select_from(CareEvent).where(date_filter)
        ) or 0

        unique_users = await self.db.scalar(
            select(func.count(func.distinct(CareEvent.user_id)))
            .select_from(CareEvent)
            .where(date_filter)
        ) or 0

        total_users = await self.db.scalar(
            select(func.count()).select_from(Pet)
        ) or 0

        avg = round(total / total_users, 1) if total_users > 0 else 0.0

        by_type_rows = (
            await self.db.execute(
                select(CareEvent.type, func.count().label("count"))
                .where(date_filter)
                .group_by(CareEvent.type)
                .order_by(func.count().desc())
            )
        ).all()

        return {
            "date": target_date,
            "total_events": total,
            "unique_users": unique_users,
            "total_users": total_users,
            "avg_events_per_user": avg,
            "by_type": [{"type": row.type, "count": row.count} for row in by_type_rows],
        }

    async def get_per_user_stats(self, target_date: date) -> list[dict]:
        start = datetime.combine(target_date, time.min, tzinfo=timezone.utc)
        end = datetime.combine(target_date, time.max, tzinfo=timezone.utc)

        date_filter = CareEvent.created_at.between(start, end)

        user_totals = (
            await self.db.execute(
                select(
                    CareEvent.user_id,
                    Profile.username,
                    func.count().label("total_events"),
                )
                .join(Profile, CareEvent.user_id == Profile.id)
                .where(date_filter)
                .group_by(CareEvent.user_id, Profile.username)
                .order_by(func.count().desc())
            )
        ).all()

        results = []
        for row in user_totals:
            type_rows = (
                await self.db.execute(
                    select(CareEvent.type, func.count().label("count"))
                    .where(date_filter, CareEvent.user_id == row.user_id)
                    .group_by(CareEvent.type)
                    .order_by(func.count().desc())
                )
            ).all()

            results.append({
                "user_id": row.user_id,
                "username": row.username,
                "total_events": row.total_events,
                "by_type": [{"type": t.type, "count": t.count} for t in type_rows],
            })

        return results
