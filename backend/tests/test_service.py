"""Unit tests for price_service.

External I/O (yfinance, ccxt) is fully mocked so the tests are fast and
deterministic — no internet access required.
"""

import pandas as pd
import pytest
from datetime import datetime
from unittest.mock import MagicMock, patch

from backend import schemas
from backend.repositories.asset_repo import AssetRepository
from backend.services import price_service


# ── Helpers ──────────────────────────────────────────────────────────────────

def _make_history(close_price: float) -> pd.DataFrame:
    """Return a minimal one-row DataFrame that yfinance would produce."""
    return pd.DataFrame({"Close": [close_price]})


# ── fetch_stock_price ─────────────────────────────────────────────────────────

def test_fetch_stock_price_returns_close(mocker):
    ticker_mock = MagicMock()
    ticker_mock.history.return_value = _make_history(850.0)
    mocker.patch("backend.services.price_service.yf.Ticker", return_value=ticker_mock)

    price = price_service.fetch_stock_price("2330.TW")
    assert price == pytest.approx(850.0)


def test_fetch_stock_price_4digit_appends_tw(mocker):
    """4-digit pure-numeric ticker (TWSE) should be looked up as XXXX.TW."""
    ticker_mock = MagicMock()
    ticker_mock.history.return_value = _make_history(600.0)
    yf_mock = mocker.patch("backend.services.price_service.yf.Ticker", return_value=ticker_mock)

    price = price_service.fetch_stock_price("2317")
    assert price == pytest.approx(600.0)
    yf_mock.assert_called_once_with("2317.TW")


def test_fetch_stock_price_empty_history_returns_zero(mocker):
    ticker_mock = MagicMock()
    ticker_mock.history.return_value = pd.DataFrame()  # empty
    mocker.patch("backend.services.price_service.yf.Ticker", return_value=ticker_mock)

    price = price_service.fetch_stock_price("FAKE")
    assert price == 0.0


def test_fetch_stock_price_exception_returns_zero(mocker):
    mocker.patch("backend.services.price_service.yf.Ticker", side_effect=Exception("network error"))
    price = price_service.fetch_stock_price("AAPL")
    assert price == 0.0


# ── fetch_crypto_price ────────────────────────────────────────────────────────

def test_fetch_crypto_price_stablecoin_usdt():
    """USDT is hardcoded to 1.0 — no exchange call should be made."""
    price = price_service.fetch_crypto_price("USDT")
    assert price == pytest.approx(1.0)


def test_fetch_crypto_price_stablecoin_usdc():
    price = price_service.fetch_crypto_price("USDC")
    assert price == pytest.approx(1.0)


def test_fetch_crypto_price_btc(mocker):
    mocker.patch.object(price_service._binance, "fetch_ticker", return_value={"last": 3_000_000.0})

    price = price_service.fetch_crypto_price("BTC")
    assert price == pytest.approx(3_000_000.0)
    price_service._binance.fetch_ticker.assert_called_once_with("BTC/USDT")


def test_fetch_crypto_price_eth(mocker):
    mocker.patch.object(price_service._binance, "fetch_ticker", return_value={"last": 120_000.0})

    price = price_service.fetch_crypto_price("ETH")
    assert price == pytest.approx(120_000.0)


def test_fetch_crypto_price_weth_normalised_to_eth(mocker):
    """WETH should be looked up as ETH/USDT."""
    mocker.patch.object(price_service._binance, "fetch_ticker", return_value={"last": 120_000.0})

    price_service.fetch_crypto_price("WETH")
    price_service._binance.fetch_ticker.assert_called_once_with("ETH/USDT")


def test_fetch_crypto_price_exception_returns_zero(mocker):
    mocker.patch.object(price_service._binance, "fetch_ticker", side_effect=Exception("api error"))
    price = price_service.fetch_crypto_price("SOL")
    assert price == 0.0
