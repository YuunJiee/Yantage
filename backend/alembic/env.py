import os
import sys
from logging.config import fileConfig

from sqlalchemy import create_engine
from alembic import context

# Make sure the project root is importable so `backend.*` resolves correctly.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from backend.models import Base
from backend.profile_manager import get_db_url

config = context.config
target_metadata = Base.metadata

if config.config_file_name is not None:
    fileConfig(config.config_file_name)


def run_migrations_offline() -> None:
    url = get_db_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    url = get_db_url()
    connectable = create_engine(url, connect_args={"check_same_thread": False})
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
