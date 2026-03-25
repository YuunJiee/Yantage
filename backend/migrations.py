"""Programmatic Alembic migration runner.

Call ``run_migrations()`` at startup (and after a profile switch) to apply
any pending schema migrations against the current profile's database.
"""
import logging
import os

from alembic import command as alembic_command
from alembic.config import Config

logger = logging.getLogger(__name__)

_ALEMBIC_INI = os.path.join(os.path.dirname(__file__), "alembic.ini")


def run_migrations() -> None:
    """Upgrade the current profile's database to the latest Alembic revision."""
    cfg = Config(_ALEMBIC_INI)
    alembic_command.upgrade(cfg, "head")
    logger.info("Database migrations applied (alembic upgrade head).")
