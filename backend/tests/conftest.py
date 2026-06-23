"""
Shared pytest fixtures for the entire test suite.

Database strategy
-----------------
Tests use SQLite in-memory (aiosqlite) so they never touch the real Postgres.
Each test gets its own isolated database created from scratch via SQLAlchemy's
`create_all`, and torn down after the test finishes.

HTTP client
-----------
`httpx.AsyncClient` with `transport=ASGITransport(app)` lets us call the
FastAPI app directly without starting a real server.
"""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.main import app as fastapi_app

# Import all models so SQLAlchemy knows about every table before create_all
import app.pets.pet  # noqa: F401
import app.users.friendship  # noqa: F401
import app.users.profile  # noqa: F401

# ─── In-memory SQLite engine (per test) ──────────────────────────────────────
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def db_session():
    """Fresh SQLite session for each test."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession):
    """
    HTTPX async client wired to the FastAPI app.
    Overrides the `get_db` dependency to use the in-memory session.
    """
    async def override_get_db():
        yield db_session

    fastapi_app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as ac:
        yield ac
    fastapi_app.dependency_overrides.clear()
