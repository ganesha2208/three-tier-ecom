"""Pytest fixtures: a fresh in-memory SQLite database and an API client per test.

Why SQLite in-memory: the suite needs no Docker and no real Postgres, so it runs
in milliseconds both locally and in CI. Each test gets a brand-new database, so
tests stay fully isolated from one another.
"""
import os

# config.py reads these at import time and fails fast if SECRET_KEY is missing,
# so it must be set BEFORE the app package is imported below.
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app


@pytest.fixture
def client():
    """A FastAPI TestClient wired to a fresh in-memory SQLite database."""
    # StaticPool keeps a single connection alive so the in-memory schema and
    # data survive for the whole test (a normal pool would drop them).
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)

    TestSession = sessionmaker(
        bind=engine, autocommit=False, autoflush=False, future=True
    )

    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    # Swap the real Postgres-backed get_db for the SQLite one, just for tests.
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    engine.dispose()
