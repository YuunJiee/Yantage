from datetime import datetime
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas


class SubscriptionRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_all(self) -> list[models.Subscription]:
        return (
            self.db.query(models.Subscription)
            .options(
                joinedload(models.Subscription.members),
                joinedload(models.Subscription.cycles).joinedload(
                    models.CollectionCycle.payments
                ).joinedload(models.CyclePayment.member),
            )
            .order_by(models.Subscription.created_at)
            .all()
        )

    def get(self, subscription_id: int) -> models.Subscription | None:
        return (
            self.db.query(models.Subscription)
            .options(
                joinedload(models.Subscription.members),
                joinedload(models.Subscription.cycles).joinedload(
                    models.CollectionCycle.payments
                ).joinedload(models.CyclePayment.member),
            )
            .filter(models.Subscription.id == subscription_id)
            .first()
        )

    def create(self, data: schemas.SubscriptionCreate) -> models.Subscription:
        sub = models.Subscription(
            name=data.name,
            total_cost=data.total_cost,
            total_shares=data.total_shares,
            my_shares=data.my_shares,
            collection_period_months=data.collection_period_months,
            created_at=datetime.now(),
        )
        self.db.add(sub)
        self.db.flush()

        for m in data.members:
            self.db.add(models.SubscriptionMember(subscription_id=sub.id, name=m.name))

        self.db.commit()
        self.db.refresh(sub)
        return self.get(sub.id)

    def update(self, subscription_id: int, data: schemas.SubscriptionUpdate) -> models.Subscription | None:
        sub = self.db.query(models.Subscription).filter(models.Subscription.id == subscription_id).first()
        if not sub:
            return None
        for key, value in data.dict(exclude_unset=True).items():
            setattr(sub, key, value)
        self.db.commit()
        return self.get(subscription_id)

    def delete(self, subscription_id: int) -> bool:
        sub = self.db.query(models.Subscription).filter(models.Subscription.id == subscription_id).first()
        if not sub:
            return False
        self.db.delete(sub)
        self.db.commit()
        return True

    # --- Members ---

    def add_member(self, subscription_id: int, data: schemas.SubscriptionMemberCreate) -> models.SubscriptionMember | None:
        sub = self.db.query(models.Subscription).filter(models.Subscription.id == subscription_id).first()
        if not sub:
            return None
        member = models.SubscriptionMember(subscription_id=subscription_id, name=data.name)
        self.db.add(member)
        self.db.commit()
        self.db.refresh(member)
        return member

    def delete_member(self, member_id: int) -> bool:
        member = self.db.query(models.SubscriptionMember).filter(models.SubscriptionMember.id == member_id).first()
        if not member:
            return False
        self.db.delete(member)
        self.db.commit()
        return True

    # --- Cycles ---

    def create_cycle(self, subscription_id: int, data: schemas.CollectionCycleCreate) -> models.CollectionCycle | None:
        sub = self.db.query(models.Subscription).options(joinedload(models.Subscription.members)).filter(
            models.Subscription.id == subscription_id
        ).first()
        if not sub:
            return None

        cycle = models.CollectionCycle(
            subscription_id=subscription_id,
            cycle_start=data.cycle_start,
            note=data.note,
            created_at=datetime.now(),
        )
        self.db.add(cycle)
        self.db.flush()

        # 自動為每位成員建立未付款記錄
        for member in sub.members:
            self.db.add(models.CyclePayment(cycle_id=cycle.id, member_id=member.id))

        self.db.commit()
        self.db.refresh(cycle)
        return (
            self.db.query(models.CollectionCycle)
            .options(joinedload(models.CollectionCycle.payments).joinedload(models.CyclePayment.member))
            .filter(models.CollectionCycle.id == cycle.id)
            .first()
        )

    def delete_cycle(self, cycle_id: int) -> bool:
        cycle = self.db.query(models.CollectionCycle).filter(models.CollectionCycle.id == cycle_id).first()
        if not cycle:
            return False
        self.db.delete(cycle)
        self.db.commit()
        return True

    # --- Payments ---

    def update_payment(self, payment_id: int, data: schemas.CyclePaymentUpdate) -> models.CyclePayment | None:
        payment = self.db.query(models.CyclePayment).filter(models.CyclePayment.id == payment_id).first()
        if not payment:
            return None
        for key, value in data.dict(exclude_unset=True).items():
            setattr(payment, key, value)
        self.db.commit()
        self.db.refresh(payment)
        return payment
