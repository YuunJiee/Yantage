from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import schemas
from ..database import get_db
from ..repositories.connection_repo import ConnectionRepository
from ..services.providers import PROVIDERS
from ..utils.secrets import mask_api_key_ends

router = APIRouter(
    prefix="/api/integrations",
    tags=["integrations"]
)

@router.get("/", response_model=list[schemas.ConnectionResponse])
def get_connections(db: Session = Depends(get_db)):
    conns = ConnectionRepository(db).list_active()
    return [
        schemas.ConnectionResponse(
            id=c.id,
            name=c.name,
            provider=c.provider,
            api_key_masked=mask_api_key_ends(c.api_key),
            address=c.address,
            is_active=c.is_active,
        )
        for c in conns
    ]

@router.post("/", response_model=schemas.ConnectionResponse)
def create_connection(conn: schemas.ConnectionCreate, db: Session = Depends(get_db)):
    new_conn = ConnectionRepository(db).create(conn)
    return schemas.ConnectionResponse(
        id=new_conn.id,
        name=new_conn.name,
        provider=new_conn.provider,
        api_key_masked=mask_api_key_ends(new_conn.api_key),
        address=new_conn.address,
        is_active=new_conn.is_active,
    )

@router.delete("/{conn_id}")
def delete_connection(conn_id: int, db: Session = Depends(get_db)):
    if not ConnectionRepository(db).delete(conn_id):
        raise HTTPException(status_code=404, detail="Connection not found")
    return {"message": "Connection deleted"}

@router.post("/sync/{provider}")
def sync_provider(provider: str, db: Session = Depends(get_db)):
    p = PROVIDERS.get(provider)
    if not p:
        raise HTTPException(status_code=400, detail="Unknown provider")
    if not p.sync(db):
        raise HTTPException(status_code=400, detail="Sync failed or no active connections")
    return {"status": "success", "message": f"{provider} synced successfully"}
