from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session
from datetime import datetime
from .. import database
from ..services import system_service

router = APIRouter(
    prefix="/api/system",
    tags=["system"],
    responses={404: {"description": "Not found"}},
)

@router.get("/export/csv")
def export_assets_csv(db: Session = Depends(database.get_db)):
    csv_content = system_service.build_assets_csv(db)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"ymoney_assets_{timestamp}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.delete("/reset")
def reset_database(db: Session = Depends(database.get_db)):
    try:
        system_service.reset_database(db)
        return {"message": "System reset successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/refresh")
def refresh_prices(db: Session = Depends(database.get_db)):
    """Manually trigger price update + net worth snapshot."""
    system_service.refresh_and_snapshot(db)
    return {"message": "報價已更新"}
