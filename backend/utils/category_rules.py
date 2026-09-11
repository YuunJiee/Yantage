from ..constants import NEGATIVE_CATEGORIES


def is_negative_category(category: str) -> bool:
    """Whether a category should be subtracted from net-worth totals (e.g. Liabilities)."""
    return category in {c.value for c in NEGATIVE_CATEGORIES}
