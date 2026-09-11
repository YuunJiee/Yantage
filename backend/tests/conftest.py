"""Shared fixtures for backend tests."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from unittest.mock import patch

from backend.database import get_db
from backend.main import app
from backend.models import Base


@pytest.fixture
def db():
    """Provide an isolated **in-memory** SQLite session for each test.

    All tables are created fresh for every test and torn down afterwards,
    so tests are fully independent and leave no state on disk.

    StaticPool (a single shared connection) is required, not just
    check_same_thread=False: FastAPI's TestClient runs sync route handlers
    in a worker thread, and the default SQLite pool hands out a *new*
    per-thread connection — for a `:memory:` URL that means a second,
    completely empty database with no tables, causing every `client`
    fixture request to fail with "no such table". StaticPool ensures the
    `client` fixture's HTTP requests see the same tables/data the `db`
    fixture set up.
    """
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(engine)


@pytest.fixture
def client(db):
    """A real HTTP-level test client (FastAPI dependency injection, request
    validation, routing all actually run) backed by the same in-memory `db`
    fixture. Deliberately NOT used as `with TestClient(app) as client:` —
    that would run main.py's lifespan (real alembic migration + real
    APScheduler start), which tests must never touch.
    """
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def mock_exchange_rate():
    """Stub out the live exchange-rate lookup so tests never hit the network.

    ``get_usdt_twd_rate`` is imported in ``asset_service.py``; patching the
    name in that module's namespace is the correct approach.
    """
    with patch("backend.services.asset_service.get_usdt_twd_rate", return_value=32.0), \
         patch("backend.services.analytics_service.get_usdt_twd_rate", return_value=32.0):
        yield
