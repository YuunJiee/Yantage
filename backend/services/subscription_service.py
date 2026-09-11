from sqlalchemy.orm import Session

from .. import schemas, models
from ..repositories.subscription_repo import SubscriptionRepository


class SubscriptionService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = SubscriptionRepository(db)

    def create_cycle(self, subscription_id: int, data: schemas.CollectionCycleCreate) -> models.CollectionCycle | None:
        """Open a new collection cycle and auto-create one unpaid CyclePayment
        per subscription member — the business rule that used to live
        directly inside SubscriptionRepository.create_cycle()."""
        sub = self.repo.get_with_members(subscription_id)
        if not sub:
            return None

        cycle = self.repo.create_cycle_row(subscription_id, data)
        for member in sub.members:
            self.repo.create_payment_row(cycle.id, member.id)

        self.repo.commit()
        return self.repo.get_cycle(cycle.id)
