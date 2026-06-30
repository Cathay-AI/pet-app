from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router
from app.core.config import settings
from app.pets.router import router as pets_router
from app.users.router import router as users_router

# Import all models so SQLAlchemy can resolve relationships
import app.pets.pet  # noqa: F401
import app.users.friendship  # noqa: F401
import app.users.profile  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Schema is managed by Supabase migrations — no create_all here
    yield


app = FastAPI(
    title="Neko Pet App API",
    description="Backend API for the Neko virtual pet app",
    version="0.2.0",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth_router, prefix="/api/v1")
app.include_router(pets_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok"}
