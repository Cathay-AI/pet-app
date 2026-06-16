from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router
from app.core.config import settings

app = FastAPI(
    title="Neko Pet App API",
    description="Backend API for the Neko virtual pet app",
    version="0.1.0",
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
# 每新增一個 domain，在這裡 include 一行即可
app.include_router(auth_router, prefix="/api/v1")
# app.include_router(pets_router, prefix="/api/v1")       # 之後新增
# app.include_router(leaderboard_router, prefix="/api/v1") # 之後新增


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok"}
