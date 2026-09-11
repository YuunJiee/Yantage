from abc import ABC, abstractmethod
from sqlalchemy.orm import Session


class ExchangeProvider(ABC):
    #: Minutes between scheduled syncs. Override per-provider (see wallet.py)
    #: — scheduler.py reads this instead of hardcoding an interval per provider,
    #: so adding a new provider needs no scheduler.py changes.
    sync_interval_minutes: int = 60

    @abstractmethod
    def sync(self, db: Session) -> bool:
        """Sync balances from exchange to DB. Returns True on success."""
        ...
