from sqlalchemy.orm import Session

from .. import models, schemas


class ConnectionRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_active(self) -> list[models.CryptoConnection]:
        return self.db.query(models.CryptoConnection).filter(models.CryptoConnection.is_active == True).all()

    def list_active_by_provider(self, provider: str) -> list[models.CryptoConnection]:
        return (
            self.db.query(models.CryptoConnection)
            .filter(models.CryptoConnection.provider == provider, models.CryptoConnection.is_active == True)
            .all()
        )

    def get(self, conn_id: int) -> models.CryptoConnection | None:
        return self.db.query(models.CryptoConnection).filter(models.CryptoConnection.id == conn_id).first()

    def create(self, data: schemas.ConnectionCreate) -> models.CryptoConnection:
        db_conn = models.CryptoConnection(**data.model_dump())
        self.db.add(db_conn)
        self.db.commit()
        self.db.refresh(db_conn)
        return db_conn

    def delete(self, conn_id: int) -> bool:
        db_conn = self.get(conn_id)
        if db_conn:
            self.db.delete(db_conn)
            self.db.commit()
            return True
        return False
