from sqlalchemy.orm import Session

from .. import schemas, models
from ..repositories.subscription_repo import SubscriptionRepository


def compute_per_member_amount(sub) -> float:
    """Each member's charge for one full collection cycle: their equal
    share of the monthly cost, times how many months the cycle covers.
    Mirrors frontend/components/subscriptions/helpers.ts::perMemberAmount —
    kept in sync deliberately, not shared code, since one is Python and one
    is TypeScript (see docs/specs/subscriptions.md R1)."""
    if not sub.total_shares:
        return 0
    return (sub.total_cost / sub.total_shares) * sub.collection_period_months


class SubscriptionService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = SubscriptionRepository(db)

    def create_cycle(self, subscription_id: int, data: schemas.CollectionCycleCreate) -> models.CollectionCycle | None:
        """Open a new collection cycle and auto-create one unpaid CyclePayment
        per subscription member — the business rule that used to live
        directly inside SubscriptionRepository.create_cycle().

        Each payment's amount is computed once here, from the subscription's
        fields at this exact moment, and then frozen (docs/specs/
        subscriptions.md R2) — editing the subscription's total_cost later
        must not retroactively change what an already-created cycle billed."""
        sub = self.repo.get_with_members(subscription_id)
        if not sub:
            return None

        amount = compute_per_member_amount(sub)
        cycle = self.repo.create_cycle_row(subscription_id, data)
        for member in sub.members:
            self.repo.create_payment_row(cycle.id, member.id, amount)

        self.repo.commit()
        return self.repo.get_cycle(cycle.id)
