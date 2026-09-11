import yfinance as yf


def lookup_ticker(ticker: str) -> dict:
    """Looks up a display name/current price for a ticker via yfinance.

    Auto-suffixes 4-digit numeric tickers with '.TW' (Taiwan stock exchange
    convention). Returns an {"error": ...} dict instead of raising, since the
    caller (add-asset autofill) just falls back to manual entry on failure.
    """
    try:
        if ticker.isdigit() and len(ticker) == 4:
            ticker = f"{ticker}.TW"
        t = yf.Ticker(ticker)
        info = t.info
        name = info.get('longName') or info.get('shortName') or ticker
        current_price = info.get('currentPrice') or info.get('regularMarketPrice') or info.get('previousClose')
        return {"name": name, "symbol": ticker, "price": current_price}
    except Exception as e:
        return {"name": "", "error": str(e)}
