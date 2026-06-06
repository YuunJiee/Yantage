from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from .. import schemas, database
from ..repositories.subscription_repo import SubscriptionRepository

router = APIRouter(
    prefix="/api/subscriptions",
    tags=["subscriptions"],
    responses={404: {"description": "Not found"}},
)


@router.get("", include_in_schema=False)
@router.get("/", response_model=List[schemas.Subscription])
def list_subscriptions(db: Session = Depends(database.get_db)):
    return SubscriptionRepository(db).list_all()


@router.post("", include_in_schema=False)
@router.post("/", response_model=schemas.Subscription)
def create_subscription(data: schemas.SubscriptionCreate, db: Session = Depends(database.get_db)):
    return SubscriptionRepository(db).create(data)


@router.put("/{subscription_id}", response_model=schemas.Subscription)
def update_subscription(subscription_id: int, data: schemas.SubscriptionUpdate, db: Session = Depends(database.get_db)):
    result = SubscriptionRepository(db).update(subscription_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return result


@router.delete("/{subscription_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subscription(subscription_id: int, db: Session = Depends(database.get_db)):
    if not SubscriptionRepository(db).delete(subscription_id):
        raise HTTPException(status_code=404, detail="Subscription not found")


# --- Members ---

@router.post("/{subscription_id}/members", response_model=schemas.SubscriptionMember)
def add_member(subscription_id: int, data: schemas.SubscriptionMemberCreate, db: Session = Depends(database.get_db)):
    result = SubscriptionRepository(db).add_member(subscription_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return result


@router.delete("/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_member(member_id: int, db: Session = Depends(database.get_db)):
    if not SubscriptionRepository(db).delete_member(member_id):
        raise HTTPException(status_code=404, detail="Member not found")


# --- Cycles ---

@router.post("/{subscription_id}/cycles", response_model=schemas.CollectionCycle)
def create_cycle(subscription_id: int, data: schemas.CollectionCycleCreate, db: Session = Depends(database.get_db)):
    result = SubscriptionRepository(db).create_cycle(subscription_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return result


@router.delete("/cycles/{cycle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cycle(cycle_id: int, db: Session = Depends(database.get_db)):
    if not SubscriptionRepository(db).delete_cycle(cycle_id):
        raise HTTPException(status_code=404, detail="Cycle not found")


# --- Payments ---

@router.patch("/payments/{payment_id}", response_model=schemas.CyclePayment)
def update_payment(payment_id: int, data: schemas.CyclePaymentUpdate, db: Session = Depends(database.get_db)):
    result = SubscriptionRepository(db).update_payment(payment_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Payment not found")
    return result
