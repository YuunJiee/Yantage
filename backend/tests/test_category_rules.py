import pytest

from backend.constants import AssetCategory
from backend.utils.category_rules import is_negative_category


@pytest.mark.parametrize("category,expected", [
    (AssetCategory.FLUID, False),
    (AssetCategory.STOCK, False),
    (AssetCategory.CRYPTO, False),
    (AssetCategory.FIXED, False),
    (AssetCategory.RECEIVABLES, False),
    (AssetCategory.LIABILITIES, True),
])
def test_is_negative_category(category, expected):
    assert is_negative_category(category) == expected
    assert is_negative_category(category.value) == expected
