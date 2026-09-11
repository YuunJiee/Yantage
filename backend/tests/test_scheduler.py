"""Tests for scheduler.py's data-driven provider job registration — pins
the fix where adding a new provider used to require editing scheduler.py
(a hardcoded run_X_sync function + add_job call per provider); now it
reads sync_interval_minutes off each ExchangeProvider in PROVIDERS."""

from unittest.mock import MagicMock, PropertyMock, patch

from backend import scheduler
from backend.services.providers import PROVIDERS


def test_all_providers_declare_a_sync_interval():
    for name, provider in PROVIDERS.items():
        assert isinstance(provider.sync_interval_minutes, int), name
        assert provider.sync_interval_minutes > 0, name


def test_wallet_provider_overrides_default_interval():
    assert PROVIDERS["wallet"].sync_interval_minutes == 10


def test_start_scheduler_registers_one_job_per_provider():
    with patch("backend.scheduler.SessionLocal") as mock_session_local, \
         patch.object(type(scheduler.scheduler), "running", new_callable=PropertyMock, return_value=False), \
         patch.object(scheduler.scheduler, "add_job") as mock_add_job, \
         patch.object(scheduler.scheduler, "start") as mock_start:

        mock_db = MagicMock()
        mock_db.query.return_value.filter_by.return_value.first.return_value = None
        mock_session_local.return_value = mock_db

        scheduler.start_scheduler()

        mock_start.assert_called_once()
        registered_job_ids = {call.kwargs.get("id") for call in mock_add_job.call_args_list}
        for name in PROVIDERS:
            assert f"{name}_sync_job" in registered_job_ids

        # Each provider job was registered with that provider's own interval.
        jobs_by_id = {call.kwargs.get("id"): call for call in mock_add_job.call_args_list}
        for name, provider in PROVIDERS.items():
            job_call = jobs_by_id[f"{name}_sync_job"]
            assert job_call.kwargs.get("minutes") == provider.sync_interval_minutes


def test_run_provider_sync_closes_db_session_even_on_error():
    mock_db = MagicMock()
    broken_provider = MagicMock()
    broken_provider.sync.side_effect = RuntimeError("boom")

    with patch("backend.scheduler.SessionLocal", return_value=mock_db), \
         patch.dict(PROVIDERS, {"broken": broken_provider}):
        scheduler._run_provider_sync("broken")

    mock_db.close.assert_called_once()
