from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
import csv
import io
import os
from .. import database
from ..repositories.asset_repo import AssetRepository
from ..services.price_service import update_prices
from ..services.snapshot_service import snapshot_net_worth

router = APIRouter(
    prefix="/api/system",
    tags=["system"],
    responses={404: {"description": "Not found"}},
)

@router.get("/backup")
def download_backup():
    db_path = str(database.DATABASE_URL).replace("sqlite:///", "")
    if not os.path.exists(db_path):
        raise HTTPException(status_code=404, detail="Database file not found")
    return FileResponse(
        path=db_path,
        filename="yantage_backup.db",
        media_type='application/x-sqlite3'
    )

@router.get("/export/csv")
def export_assets_csv(db: Session = Depends(database.get_db)):
    assets = AssetRepository(db).list_all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['ID', 'Name', 'Ticker', 'Category', 'Sub-Category', 'Source', 'Quantity', 'Current Price', 'Value (approx)', 'Include in NW'])

    for asset in assets:
        quantity = sum(t.amount for t in asset.transactions)
        value = quantity * (asset.current_price or 0)
        writer.writerow([
            asset.id, asset.name, asset.ticker or '', asset.category,
            asset.sub_category or '', asset.source or 'manual',
            quantity, asset.current_price, round(value, 2), asset.include_in_net_worth
        ])

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"ymoney_assets_{timestamp}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.delete("/reset")
def reset_database(db: Session = Depends(database.get_db)):
    try:
        db.execute(text("DELETE FROM transactions"))
        db.execute(text("DELETE FROM assets"))
        db.execute(text("DELETE FROM goals"))
        db.execute(text("DELETE FROM budget_categories"))
        db.execute(text("DELETE FROM system_settings"))
        db.execute(text("DELETE FROM crypto_connections"))
        db.execute(text("INSERT INTO system_settings (key, value) VALUES ('budget_start_day', '1')"))
        db.commit()
        return {"message": "System reset successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/refresh")
def refresh_prices(db: Session = Depends(database.get_db)):
    """Manually trigger price update + net worth snapshot."""
    update_prices(db)
    snapshot_net_worth(db)
    return {"message": "報價已更新"}
