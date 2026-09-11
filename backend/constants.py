"""Single source of truth for the app's fixed vocabularies.

Uses `str, Enum` (not a SQLAlchemy Enum column — see CLAUDE.md's Known
Technical Debt for why) so every existing `asset.category == "Crypto"`
style string comparison keeps working unchanged, while Pydantic schemas
that type a field as one of these enums now reject invalid values with a
422 instead of silently persisting a typo.
"""

from enum import Enum


class AssetCategory(str, Enum):
    FLUID = "Fluid"
    STOCK = "Stock"
    CRYPTO = "Crypto"
    FIXED = "Fixed"
    RECEIVABLES = "Receivables"
    LIABILITIES = "Liabilities"


class Provider(str, Enum):
    MANUAL = "manual"
    MAX = "max"
    BINANCE = "binance"
    PIONEX = "pionex"
    WALLET = "wallet"


class GoalType(str, Enum):
    NET_WORTH = "NET_WORTH"
    ASSET_ALLOCATION = "ASSET_ALLOCATION"


NEGATIVE_CATEGORIES = {AssetCategory.LIABILITIES}
