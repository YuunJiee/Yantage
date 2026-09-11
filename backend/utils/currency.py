from typing import TYPE_CHECKING

from ..constants import AssetCategory, Provider

if TYPE_CHECKING:
    from ..models import Asset


def is_usd_denominated(asset: "Asset") -> bool:
    """Return True if the asset's price is quoted in USD (needs TWD conversion)."""
    if asset.source == Provider.MAX.value:
        return False
    if asset.category == AssetCategory.CRYPTO:
        return True
    if asset.category == AssetCategory.STOCK and asset.ticker:
        if asset.ticker.endswith(".TW") or (
            asset.ticker.isdigit() and len(asset.ticker) == 4
        ):
            return False
        return True
    return False
