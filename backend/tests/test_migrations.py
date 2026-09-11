"""Smoke test: alembic upgrade head must succeed against a fresh SQLite
file. Run against a disposable tmp_path DB (never the real sql_app.db) so a
bad batch-alter in a future migration is caught here instead of on someone's
real data."""

import os
from pathlib import Path

from alembic import command
from alembic.config import Config


def test_alembic_upgrade_head_succeeds(tmp_path, monkeypatch):
    monkeypatch.setenv("YANTAGE_DATA_DIR", str(tmp_path))

    backend_dir = Path(__file__).parent.parent
    cfg = Config(str(backend_dir / "alembic.ini"))
    cfg.set_main_option("script_location", str(backend_dir / "alembic"))

    command.upgrade(cfg, "head")

    assert (tmp_path / "sql_app.db").exists()
