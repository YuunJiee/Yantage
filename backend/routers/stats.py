from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..services import analytics_service

router = APIRouter(
    prefix="/api/stats",
    tags=["stats"],
)


@router.get("/history")
def get_net_worth_history(range: str = "30d", db: Session = Depends(get_db)):
    return analytics_service.get_net_worth_history(db, range_str=range)


@router.get("/forecast")
def get_goal_forecast(db: Session = Depends(get_db)):
    return analytics_service.compute_goal_forecast(db)
