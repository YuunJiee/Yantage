from datetime import datetime
from unittest.mock import MagicMock

from backend import schemas
from backend.repositories.asset_repo import AssetRepository
from backend.services import ticker_lookup_service


def test_lookup_ticker_returns_name_and_price(mocker):
    ticker_mock = MagicMock()
    ticker_mock.info = {"longName": "Apple Inc.", "currentPrice": 200.0}
    mocker.patch("backend.services.ticker_lookup_service.yf.Ticker", return_value=ticker_mock)

    result = ticker_lookup_service.lookup_ticker("AAPL")
    assert result == {"name": "Apple Inc.", "symbol": "AAPL", "price": 200.0}


def test_lookup_ticker_4digit_appends_tw(mocker):
    ticker_mock = MagicMock()
    ticker_mock.info = {"shortName": "台積電", "regularMarketPrice": 950.0}
    yf_mock = mocker.patch("backend.services.ticker_lookup_service.yf.Ticker", return_value=ticker_mock)

    result = ticker_lookup_service.lookup_ticker("2330")
    yf_mock.assert_called_once_with("2330.TW")
    assert result["symbol"] == "2330.TW"
    assert result["price"] == 950.0


def test_lookup_ticker_error_returns_error_dict(mocker):
    mocker.patch("backend.services.ticker_lookup_service.yf.Ticker", side_effect=RuntimeError("boom"))

    result = ticker_lookup_service.lookup_ticker("BROKEN")
    assert result["name"] == ""
    assert "boom" in result["error"]


def test_asset_repo_get_transaction(db):
    repo = AssetRepository(db)
    asset = repo.create(schemas.AssetCreate(name="Cash", category="Fluid", current_price=1.0))
    tx = repo.create_transaction(
        schemas.TransactionCreate(amount=100.0, buy_price=1.0, date=datetime(2025, 1, 1)), asset.id
    )

    fetched = repo.get_transaction(tx.id)
    assert fetched is not None
    assert fetched.id == tx.id


def test_asset_repo_get_transaction_missing_returns_none(db):
    assert AssetRepository(db).get_transaction(9999) is None
