import asyncio
import os
import uuid
from typing import AsyncGenerator
from unittest.mock import patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_async_session
from app.core.security import create_access_token, hash_password
from app.models.user import User

# Use SQLite for testing if no test DB configured
TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "sqlite+aiosqlite:///./test.db",
)

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
test_session_factory = async_sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with test_session_factory() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_session():
        yield db_session

    # Patch celery task to not actually dispatch
    with patch("app.services.document_service.process_document") as mock_task:
        mock_task.delay.return_value = type("Task", (), {"id": str(uuid.uuid4())})()

        from app.main import app
        from app.api.deps import get_db

        app.dependency_overrides[get_db] = override_get_session

        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as ac:
            yield ac

        app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    user = User(
        id=uuid.uuid4(),
        email="testuser@example.com",
        hashed_password=hash_password("testpassword123"),
        full_name="Test User",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def auth_headers(test_user: User) -> dict[str, str]:
    token = create_access_token(subject=str(test_user.id))
    return {"Authorization": f"Bearer {token}"}
