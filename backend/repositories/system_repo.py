from sqlalchemy import text
from sqlalchemy.orm import Session


class SystemRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def wipe_all_data(self) -> None:
        """Deletes all user data and reseeds the one setting the app assumes exists."""
        try:
            self.db.execute(text("DELETE FROM transactions"))
            self.db.execute(text("DELETE FROM assets"))
            self.db.execute(text("DELETE FROM goals"))
            self.db.execute(text("DELETE FROM budget_categories"))
            self.db.execute(text("DELETE FROM system_settings"))
            self.db.execute(text("DELETE FROM crypto_connections"))
            self.db.execute(text("INSERT INTO system_settings (key, value) VALUES ('budget_start_day', '1')"))
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
