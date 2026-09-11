"""Unit tests for is_provider_managed — the single rule that decides whether
an asset's balance is owned by an automated sync and must not be hand-edited
(see docs/specs/assets-transactions.md R5/Decision 3: this used to be a
MAX-only check duplicated inconsistently across the backend/frontend)."""

import pytest

from backend.utils.provider_rules import is_provider_managed


@pytest.mark.parametrize("source", ["max", "binance", "pionex", "wallet"])
def test_is_provider_managed_true_for_every_sync_provider(source):
    assert is_provider_managed(source) is True


@pytest.mark.parametrize("source", ["manual", None, "", "web3_wallet"])
def test_is_provider_managed_false_for_manual_or_unknown(source):
    """"web3_wallet" is deliberately not recognized — that was the old,
    now-migrated-away-from literal (Decision 5); an asset still carrying it
    would indicate the data migration didn't run, not a managed provider."""
    assert is_provider_managed(source) is False
