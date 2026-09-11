from sqlalchemy import text
from sqlalchemy.orm import Session


class SystemRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    # Deleted in child-before-parent order so FK constraints never block a
    # row. Every user-data table belongs here — docs/specs/settings-system.md
    # (Known Inconsistency #1) tracks a past bug where tables added after
    # this list was first written (net_worth_history, income_items, the
    # subscription tables) were silently spared by "reset everything".
    _TABLES_TO_WIPE = (
        "cycle_payments",
        "collection_cycles",
        "subscription_members",
        "subscriptions",
        "income_items",
        "net_worth_history",
        "transactions",
        "assets",
        "goals",
        "budget_categories",
        "system_settings",
        "crypto_connections",
    )

    def wipe_all_data(self) -> None:
        """Deletes all user data and reseeds the one setting the app assumes exists."""
        try:
            for table in self._TABLES_TO_WIPE:
                self.db.execute(text(f"DELETE FROM {table}"))
            self.db.execute(text("INSERT INTO system_settings (key, value) VALUES ('budget_start_day', '1')"))
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
