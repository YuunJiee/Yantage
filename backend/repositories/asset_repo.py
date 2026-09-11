from datetime import datetime
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas


class AssetRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    # ── Asset CRUD ────────────────────────────────────────────────────────────

    def get(self, asset_id: int) -> models.Asset | None:
        return (
            self.db.query(models.Asset)
            .options(joinedload(models.Asset.transactions))
            .filter(models.Asset.id == asset_id)
            .first()
        )

    def list_all(self, skip: int = 0, limit: int = 100) -> list[models.Asset]:
        return (
            self.db.query(models.Asset)
            .options(joinedload(models.Asset.transactions))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def find_by_connection(
        self,
        connection_id: int,
        *,
        ticker: str | None = None,
        network: str | None = None,
        contract_address_is_null: bool | None = None,
    ) -> models.Asset | None:
        """Look up an integration-synced asset by its connection + (ticker, or network/contract-address)."""
        query = (
            self.db.query(models.Asset)
            .options(joinedload(models.Asset.transactions))
            .filter(models.Asset.connection_id == connection_id)
        )
        if ticker is not None:
            query = query.filter(models.Asset.ticker == ticker)
        if network is not None:
            query = query.filter(models.Asset.network == network)
        if contract_address_is_null is True:
            query = query.filter(models.Asset.contract_address.is_(None))
        elif contract_address_is_null is False:
            query = query.filter(models.Asset.contract_address.isnot(None))
        return query.first()

    def list_by_connection(
        self,
        connection_id: int,
        *,
        network: str | None = None,
        contract_address_is_null: bool | None = None,
    ) -> list[models.Asset]:
        """Like find_by_connection but returns every match (e.g. all known wallet tokens on a network)."""
        query = (
            self.db.query(models.Asset)
            .options(joinedload(models.Asset.transactions))
            .filter(models.Asset.connection_id == connection_id)
        )
        if network is not None:
            query = query.filter(models.Asset.network == network)
        if contract_address_is_null is True:
            query = query.filter(models.Asset.contract_address.is_(None))
        elif contract_address_is_null is False:
            query = query.filter(models.Asset.contract_address.isnot(None))
        return query.all()

    def record_balance_diff(
        self,
        asset: models.Asset,
        target_qty: float,
        epsilon: float = 1e-8,
        touch_last_updated_on_write: bool = False,
    ) -> bool:
        """Insert a balancing Transaction so the asset's summed quantity reaches target_qty.

        Returns whether a transaction was actually written (diff exceeded epsilon).
        """
        current_qty = sum(t.amount for t in asset.transactions)
        diff = target_qty - current_qty
        wrote_diff = abs(diff) > epsilon
        if wrote_diff:
            self.db.add(models.Transaction(
                asset_id=asset.id, amount=diff, buy_price=0, date=datetime.now(), is_transfer=False,
            ))
            if touch_last_updated_on_write:
                asset.last_updated_at = datetime.now()
        self.db.commit()
        return wrote_diff

    def create(self, data: schemas.AssetCreate) -> models.Asset:
        db_asset = models.Asset(
            name=data.name,
            ticker=data.ticker,
            category=data.category,
            sub_category=data.sub_category,
            include_in_net_worth=data.include_in_net_worth,
            icon=data.icon,
            current_price=data.current_price if data.current_price is not None else (0.0 if data.ticker else 1.0),
            last_updated_at=datetime.now(),
            network=data.network,
            contract_address=data.contract_address,
            decimals=data.decimals,
            connection_id=data.connection_id,
            source=data.source or "manual",
        )
        self.db.add(db_asset)
        self.db.commit()
        self.db.refresh(db_asset)
        return db_asset

    def update(self, asset_id: int, data: schemas.AssetUpdate) -> models.Asset | None:
        db_asset = self.db.query(models.Asset).filter(models.Asset.id == asset_id).first()
        if db_asset:
            for key, value in data.model_dump(exclude_unset=True).items():
                setattr(db_asset, key, value)
            db_asset.last_updated_at = datetime.now()
            self.db.commit()
            self.db.refresh(db_asset)
        return db_asset

    def delete(self, asset_id: int) -> bool:
        db_asset = self.db.query(models.Asset).filter(models.Asset.id == asset_id).first()
        if db_asset:
            self.db.delete(db_asset)
            self.db.commit()
            return True
        return False

    def update_price(self, asset_id: int, price: float) -> models.Asset | None:
        db_asset = self.db.query(models.Asset).filter(models.Asset.id == asset_id).first()
        if db_asset:
            db_asset.current_price = price
            db_asset.last_updated_at = datetime.now()
            self.db.commit()
            self.db.refresh(db_asset)
        return db_asset

    # ── Transaction CRUD ──────────────────────────────────────────────────────

    def get_transaction(self, transaction_id: int) -> models.Transaction | None:
        return self.db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()

    def create_transaction(self, transaction: schemas.TransactionCreate, asset_id: int) -> models.Transaction:
        tx_data = transaction.model_dump()
        if not tx_data.get('date'):
            tx_data['date'] = datetime.now()

        db_tx = models.Transaction(**tx_data, asset_id=asset_id)
        self.db.add(db_tx)

        asset = self.db.query(models.Asset).filter(models.Asset.id == asset_id).first()
        if asset:
            asset.last_updated_at = datetime.now()

        self.db.commit()
        self.db.refresh(db_tx)
        return db_tx

    def delete_transaction(self, transaction_id: int) -> bool:
        tx = self.db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
        if tx:
            self.db.delete(tx)
            self.db.commit()
            return True
        return False

    def update_transaction(self, transaction_id: int, data: schemas.TransactionUpdate) -> models.Transaction | None:
        tx = self.db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
        if tx:
            for key, value in data.model_dump(exclude_unset=True).items():
                setattr(tx, key, value)
            self.db.commit()
            self.db.refresh(tx)
        return tx
