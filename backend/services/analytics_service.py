import math
import json
import traceback
import logging
import yfinance as yf
import pandas as pd
from collections import defaultdict
from datetime import datetime, timedelta, date
from sqlalchemy.orm import Session

from .. import models
from ..repositories.asset_repo import AssetRepository
from ..repositories.goal_repo import GoalRepository
from ..utils.math import safe_float
from ..utils.currency import is_usd_denominated
from ..services.exchange_rate_service import get_usdt_twd_rate

logger = logging.getLogger(__name__)


# ── Range parsing ─────────────────────────────────────────────────────────────

def parse_range(range_str: str) -> date:
    today = datetime.now().date()
    if range_str == "30d":  return today - timedelta(days=30)
    if range_str == "3mo":  return today - timedelta(days=90)
    if range_str == "6mo":  return today - timedelta(days=180)
    if range_str == "1y":   return today - timedelta(days=365)
    if range_str == "ytd":  return date(today.year, 1, 1)
    if range_str == "all":  return date(2020, 1, 1)
    return today - timedelta(days=365)


# ── Yahoo Finance helpers ─────────────────────────────────────────────────────

def fetch_yahoo_history(symbols, start_date: date) -> dict:
    try:
        fetch_start = (start_date - timedelta(days=7)).strftime("%Y-%m-%d")
        today = datetime.now().date()
        data = yf.download(
            symbols,
            start=fetch_start,
            end=str(today + timedelta(days=1)),
            progress=False,
        )['Close']
        history_map = {}
        if isinstance(data, pd.DataFrame) and not data.empty:
            for col in data.columns:
                series = data[col].ffill().bfill()
                history_map[col] = {d.strftime("%Y-%m-%d"): val for d, val in series.items()}
        elif isinstance(data, pd.Series) and not data.empty:
            symbol = symbols[0] if isinstance(symbols, list) else symbols
            series = data.ffill().bfill()
            history_map[symbol] = {d.strftime("%Y-%m-%d"): val for d, val in series.items()}
        return history_map
    except Exception as e:
        logger.error(f"fetch_yahoo_history failed for {symbols}: {e}")
        return {}


def _yf_ticker_for_asset(asset) -> str | None:
    """Return the Yahoo Finance symbol for an asset, or None if not applicable."""
    if asset.category not in ('Stock', 'Crypto') or not asset.ticker:
        return None
    t = asset.ticker
    if t.isdigit() and len(t) == 4:
        t = f"{t}.TW"
    if ("Crypto" in (asset.sub_category or "") or asset.category == 'Crypto') and "-" not in t:
        t = f"{t}-USD"
    return t


# ── Net worth history ─────────────────────────────────────────────────────────

def get_net_worth_history(db: Session, range_str: str = "30d") -> list[dict]:
    try:
        today = datetime.now().date()
        start_date = parse_range(range_str)

        # Fast path: serve from pre-computed daily snapshots when coverage ≥ 80%.
        snapshots = (
            db.query(models.NetWorthHistory)
            .filter(models.NetWorthHistory.date >= start_date.strftime("%Y-%m-%d"))
            .order_by(models.NetWorthHistory.date)
            .all()
        )
        expected_days = (today - start_date).days + 1
        if snapshots and len(snapshots) >= max(1, int(expected_days * 0.8)):
            return [
                {
                    "date": s.date,
                    "value": safe_float(s.value),
                    "breakdown": json.loads(s.breakdown) if s.breakdown else {},
                }
                for s in snapshots
            ]

        # Slow path: rebuild from transactions + Yahoo Finance price history.
        assets = AssetRepository(db).list_all()

        yf_ticker_map: dict[int, str] = {}
        tickers = []
        for asset in assets:
            t = _yf_ticker_for_asset(asset)
            if t:
                yf_ticker_map[asset.id] = t
                tickers.append(t)

        price_history = fetch_yahoo_history(tickers, start_date) if tickers else {}
        usdtwd_history = fetch_yahoo_history("USDTWD=X", start_date).get("USDTWD=X", {})
        current_usdtwd = 32.0

        all_txns = []
        for asset in assets:
            for txn in asset.transactions:
                t_date = txn.date.date() if isinstance(txn.date, datetime) else txn.date
                all_txns.append((t_date, asset.id, txn.amount))
        all_txns.sort(key=lambda x: x[0])

        balances: dict[int, float] = defaultdict(float)
        txn_idx = 0
        while txn_idx < len(all_txns) and all_txns[txn_idx][0] < start_date:
            _, aid, amt = all_txns[txn_idx]
            balances[aid] += amt
            txn_idx += 1

        result = []
        current_date = start_date
        while current_date <= today:
            date_str = current_date.strftime("%Y-%m-%d")

            while txn_idx < len(all_txns) and all_txns[txn_idx][0] == current_date:
                _, aid, amt = all_txns[txn_idx]
                balances[aid] += amt
                txn_idx += 1

            rate = usdtwd_history.get(date_str) or current_usdtwd
            day_total = 0.0
            cat_totals: dict[str, float] = defaultdict(float)

            for asset in assets:
                if not asset.include_in_net_worth:
                    continue
                qty = balances[asset.id]
                if qty == 0:
                    continue

                price = 1.0
                t = yf_ticker_map.get(asset.id)
                if t:
                    hist = price_history.get(t, {})
                    yf_price = hist.get(date_str)
                    if yf_price is not None and (math.isnan(yf_price) or math.isinf(yf_price)):
                        yf_price = None
                    if yf_price is not None:
                        price = yf_price if t.endswith('.TW') else yf_price * rate
                    else:
                        fallback = asset.current_price
                        price = fallback * rate if is_usd_denominated(asset) else fallback
                elif asset.category in ('Stock', 'Crypto'):
                    price = asset.current_price

                val = qty * price
                if asset.category == 'Liabilities':
                    day_total -= val
                    cat_totals[asset.category] -= val
                else:
                    day_total += val
                    cat_totals[asset.category] += val

            result.append({
                "date": date_str,
                "value": safe_float(round(day_total, 0)),
                "breakdown": {k: safe_float(round(v, 0)) for k, v in cat_totals.items()},
            })
            current_date += timedelta(days=1)

        return result
    except Exception as e:
        logger.error(f"get_net_worth_history failed: {e}")
        traceback.print_exc()
        return []


# ── Goal forecast ─────────────────────────────────────────────────────────────

def compute_goal_forecast(db: Session) -> dict:
    try:
        today = datetime.now().date()
        history_data = get_net_worth_history(db, range_str="6mo")

        avg_growth = 0.0
        if history_data and len(history_data) > 10:
            avg_growth = (history_data[-1]['value'] - history_data[0]['value']) / 6.0

        goals = GoalRepository(db).list_all()
        nw_goals = [g for g in goals if g.goal_type == 'NET_WORTH']
        current_nw = history_data[-1]['value'] if history_data else 0

        forecasts = []
        for goal in nw_goals:
            remaining = goal.target_amount - current_nw
            if remaining <= 0:
                prediction, months_to_go = "Achieved", 0
            elif avg_growth <= 0:
                prediction, months_to_go = "N/A (No Growth)", 999
            else:
                months_to_go = remaining / avg_growth
                future_date = today + timedelta(days=int(months_to_go * 30))
                prediction = future_date.strftime("%b %Y")

            forecasts.append({
                "goal_id":            goal.id,
                "current_amount":     current_nw,
                "target_amount":      goal.target_amount,
                "avg_monthly_growth": round(avg_growth, 0),
                "months_to_reach":    round(months_to_go, 1),
                "predicted_date":     prediction,
            })

        return {"growth_rate_6mo": round(avg_growth, 0), "forecasts": forecasts}
    except Exception as e:
        logger.error(f"compute_goal_forecast failed: {e}")
        traceback.print_exc()
        return {"growth_rate_6mo": 0, "forecasts": []}


