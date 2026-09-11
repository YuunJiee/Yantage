"""Regression tests for routers/integrations.py.

Pins the fix for a bug where GET/POST /api/integrations/ always raised
``NameError: name '_mask_api_key' is not defined`` (the masking helper was
defined under a different name and never actually called correctly).
"""

from backend import schemas
from backend.routers import integrations as integrations_router


def test_get_connections_empty(db):
    assert integrations_router.get_connections(db=db) == []


def test_create_and_list_connection_masks_api_key(db):
    created = integrations_router.create_connection(
        schemas.ConnectionCreate(name="My Binance", provider="binance", api_key="abcd1234efgh"),
        db=db,
    )
    assert created.api_key_masked == "abcd...efgh"

    listed = integrations_router.get_connections(db=db)
    assert len(listed) == 1
    assert listed[0].api_key_masked == "abcd...efgh"


def test_create_connection_short_api_key_masks_fully(db):
    created = integrations_router.create_connection(
        schemas.ConnectionCreate(name="Short Key", provider="max", api_key="short"),
        db=db,
    )
    assert created.api_key_masked == "****"
