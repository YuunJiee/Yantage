from sqlalchemy.orm import Session

from .. import models, schemas
from ..repositories.asset_repo import AssetRepository
from ..utils.currency import is_usd_denominated
from .exchange_rate_service import get_usdt_twd_rate


class AssetService:
    """Wraps AssetRepository reads with the TWD-value/ROI enrichment they need
    for display, keeping the repository itself free of service-layer calls."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = AssetRepository(db)

    def _enrich(self, asset: models.Asset) -> models.Asset:
        """Compute value_twd, unrealized_pl, roi as transient attributes.

        invested_capital is a running remaining-cost-basis (average-cost
        method): a sell reduces it by the same fraction of the position it
        closes, so a partial sell doesn't leave stale cost basis behind for
        units no longer held. See docs/specs/assets-transactions.md R2."""
        usdt_rate = get_usdt_twd_rate(self.db)
        is_usd = is_usd_denominated(asset)

        total_qty = sum(t.amount for t in asset.transactions)
        native_value = (asset.current_price or 0.0) * total_qty
        asset.value_twd = native_value * usdt_rate if is_usd else native_value

        invested_capital = 0.0
        balance = 0.0
        for t in sorted(asset.transactions, key=lambda t: t.date):
            if t.amount > 0:
                cost = t.amount * (t.buy_price or 0.0)
                if is_usd:
                    cost *= usdt_rate
                invested_capital += cost
            elif t.amount < 0 and balance > 0:
                closed_fraction = min(1.0, abs(t.amount) / balance)
                invested_capital -= invested_capital * closed_fraction
            balance += t.amount

        if invested_capital > 0:
            asset.unrealized_pl = asset.value_twd - invested_capital
            asset.roi = (asset.unrealized_pl / invested_capital) * 100
        else:
            asset.unrealized_pl = 0.0
            asset.roi = 0.0

        return asset

    def get(self, asset_id: int) -> models.Asset | None:
        asset = self.repo.get(asset_id)
        return self._enrich(asset) if asset else None

    def list_all(self, skip: int = 0, limit: int = 100) -> list[models.Asset]:
        return [self._enrich(a) for a in self.repo.list_all(skip=skip, limit=limit)]

    def create(self, data: schemas.AssetCreate) -> models.Asset:
        return self._enrich(self.repo.create(data))

    def update(self, asset_id: int, data: schemas.AssetUpdate) -> models.Asset | None:
        asset = self.repo.update(asset_id, data)
        return self._enrich(asset) if asset else None
