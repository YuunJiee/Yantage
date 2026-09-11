from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import schemas
from ..database import get_db
from ..services import settings_service

router = APIRouter(
    prefix="/api/settings",
    tags=["settings"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[schemas.SystemSetting])
def read_settings(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return settings_service.list_settings_masked(db, skip, limit)

@router.get("/{key}", response_model=schemas.SystemSetting)
def read_setting(key: str, db: Session = Depends(get_db)):
    setting = settings_service.get_setting_or_default(db, key)
    if setting is None:
        raise HTTPException(status_code=404, detail="Setting not found")
    return setting

@router.put("/{key}", response_model=schemas.SystemSetting)
def update_setting(key: str, setting: schemas.SystemSettingBase, db: Session = Depends(get_db)):
    return settings_service.update_setting(db, key, setting.value)
