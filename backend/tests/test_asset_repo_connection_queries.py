from backend import models, schemas
from backend.repositories.asset_repo import AssetRepository


def _connection(db) -> models.CryptoConnection:
    conn = models.CryptoConnection(name="Wallet", provider="wallet", address="0xabc")
    db.add(conn)
    db.commit()
    db.refresh(conn)
    return conn


def test_find_by_connection_by_ticker(db):
    repo = AssetRepository(db)
    conn = _connection(db)
    repo.create(schemas.AssetCreate(name="BTC", ticker="BTC", category="Crypto", connection_id=conn.id))

    found = repo.find_by_connection(conn.id, ticker="BTC")
    assert found is not None
    assert found.ticker == "BTC"

    assert repo.find_by_connection(conn.id, ticker="ETH") is None


def test_find_by_connection_native_token_no_contract(db):
    repo = AssetRepository(db)
    conn = _connection(db)
    repo.create(schemas.AssetCreate(
        name="ETH", ticker="ETH", category="Crypto", network="Ethereum", connection_id=conn.id,
    ))
    repo.create(schemas.AssetCreate(
        name="USDT", ticker="USDT", category="Crypto", network="Ethereum",
        contract_address="0xdead", connection_id=conn.id,
    ))

    native = repo.find_by_connection(conn.id, network="Ethereum", contract_address_is_null=True)
    assert native is not None
    assert native.ticker == "ETH"


def test_list_by_connection_with_contract(db):
    repo = AssetRepository(db)
    conn = _connection(db)
    repo.create(schemas.AssetCreate(
        name="ETH", ticker="ETH", category="Crypto", network="Ethereum", connection_id=conn.id,
    ))
    repo.create(schemas.AssetCreate(
        name="USDT", ticker="USDT", category="Crypto", network="Ethereum",
        contract_address="0xdead", connection_id=conn.id,
    ))

    tokens = repo.list_by_connection(conn.id, network="Ethereum", contract_address_is_null=False)
    assert len(tokens) == 1
    assert tokens[0].ticker == "USDT"


def test_record_balance_diff_writes_transaction_when_over_epsilon(db):
    repo = AssetRepository(db)
    conn = _connection(db)
    asset = repo.create(schemas.AssetCreate(name="BTC", ticker="BTC", category="Crypto", connection_id=conn.id))

    wrote = repo.record_balance_diff(asset, 1.0)
    assert wrote is True
    assert sum(t.amount for t in asset.transactions) == 1.0


def test_record_balance_diff_skips_when_under_epsilon(db):
    repo = AssetRepository(db)
    conn = _connection(db)
    asset = repo.create(schemas.AssetCreate(name="BTC", ticker="BTC", category="Crypto", connection_id=conn.id))
    repo.record_balance_diff(asset, 1.0)

    wrote = repo.record_balance_diff(asset, 1.0 + 1e-10)
    assert wrote is False
    assert len(asset.transactions) == 1
