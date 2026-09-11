import pytest

from backend import models
from backend.services.providers.common import sync_asset_balance


def _connection(db, provider: str = "binance") -> models.CryptoConnection:
    conn = models.CryptoConnection(name="Test", provider=provider, api_key="k", api_secret="s")
    db.add(conn)
    db.commit()
    db.refresh(conn)
    return conn


def test_sync_asset_balance_creates_new_asset(db):
    conn = _connection(db)

    sync_asset_balance(
        db, connection_id=conn.id, ticker="BTC", target_name="BTC (Test)",
        current_price=50_000.0, source="binance", icon="btc-icon", amount=1.5,
    )

    asset = db.query(models.Asset).filter_by(connection_id=conn.id, ticker="BTC").first()
    assert asset is not None
    assert asset.name == "BTC (Test)"
    assert asset.current_price == pytest.approx(50_000.0)
    assert sum(t.amount for t in asset.transactions) == pytest.approx(1.5)


def test_sync_asset_balance_updates_existing_with_diff(db):
    conn = _connection(db)
    sync_asset_balance(
        db, connection_id=conn.id, ticker="ETH", target_name="ETH (Test)",
        current_price=2_000.0, source="binance", icon="eth-icon", amount=2.0,
    )

    sync_asset_balance(
        db, connection_id=conn.id, ticker="ETH", target_name="ETH (Test v2)",
        current_price=2_500.0, source="binance", icon="eth-icon-2", amount=3.0,
    )

    asset = db.query(models.Asset).filter_by(connection_id=conn.id, ticker="ETH").first()
    assert asset.name == "ETH (Test v2)"
    assert asset.current_price == pytest.approx(2_500.0)
    assert asset.icon == "eth-icon-2"
    assert sum(t.amount for t in asset.transactions) == pytest.approx(3.0)
    assert len(asset.transactions) == 2  # initial + diff


def test_sync_asset_balance_no_diff_writes_no_extra_transaction(db):
    conn = _connection(db)
    sync_asset_balance(
        db, connection_id=conn.id, ticker="SOL", target_name="SOL (Test)",
        current_price=100.0, source="binance", icon="sol-icon", amount=5.0,
    )
    sync_asset_balance(
        db, connection_id=conn.id, ticker="SOL", target_name="SOL (Test)",
        current_price=110.0, source="binance", icon="sol-icon", amount=5.0,
    )

    asset = db.query(models.Asset).filter_by(connection_id=conn.id, ticker="SOL").first()
    assert len(asset.transactions) == 1
    assert asset.current_price == pytest.approx(110.0)
