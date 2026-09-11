"""HTTP-level contract tests using the `client` fixture (real FastAPI
dependency injection, request validation, and routing) — everything else
in this test suite calls router/service functions directly as plain
Python, which never exercises this layer at all. A handful of smoke tests
here, not exhaustive coverage: proving the wiring works end-to-end."""

from unittest.mock import patch


def test_list_assets_empty(client):
    res = client.get("/api/assets/")
    assert res.status_code == 200
    assert res.json() == []


def test_create_asset_rejects_invalid_category(client):
    res = client.post("/api/assets/", json={"name": "Cash", "category": "stok"})
    assert res.status_code == 422


def test_create_asset_returns_enriched_shape(client):
    res = client.post("/api/assets/", json={"name": "Cash", "category": "Fluid", "current_price": 1.0})
    assert res.status_code == 200
    body = res.json()
    assert body["name"] == "Cash"
    assert "value_twd" in body
    assert "id" in body


def test_update_asset_sub_category_persists(client):
    """Pins the B1 fix at the real HTTP layer: PUT with sub_category used to
    silently no-op because AssetUpdate didn't declare the field."""
    created = client.post("/api/assets/", json={"name": "Savings", "category": "Fluid"}).json()

    res = client.put(f"/api/assets/{created['id']}", json={"sub_category": "Cash"})
    assert res.status_code == 200
    assert res.json()["sub_category"] == "Cash"

    refetched = client.get("/api/assets/").json()
    assert refetched[0]["sub_category"] == "Cash"


def test_delete_missing_asset_returns_404(client):
    res = client.delete("/api/assets/9999")
    assert res.status_code == 404


def test_dashboard_returns_200(client):
    res = client.get("/api/dashboard/")
    assert res.status_code == 200
    body = res.json()
    assert "net_worth" in body
    assert body["assets"] == []


def test_create_connection_rejects_invalid_provider(client):
    res = client.post("/api/integrations/", json={"name": "X", "provider": "coinbase"})
    assert res.status_code == 422


def test_delete_transaction_for_max_synced_asset_returns_403(client, db):
    """Transaction creation on a provider-synced asset is itself blocked
    (R5) — seed the transaction directly via the repo, as a MAX sync would,
    to test the DELETE guard in isolation from the CREATE guard."""
    from datetime import datetime
    from backend import schemas
    from backend.repositories.asset_repo import AssetRepository

    repo = AssetRepository(db)
    asset = repo.create(schemas.AssetCreate(name="BTC", category="Crypto", source="max"))
    tx = repo.create_transaction(
        schemas.TransactionCreate(amount=1.0, buy_price=0, date=datetime.now()), asset.id
    )

    res = client.delete(f"/api/assets/transactions/{tx.id}")
    assert res.status_code == 403


# --- Settings & System (docs/specs/settings-system.md) ---


def test_list_settings_masks_secret_looking_keys(client):
    """Pins R1: GET /api/settings/ masks any key whose name looks like a secret."""
    client.put("/api/settings/binance_api_secret", json={"key": "binance_api_secret", "value": "abcd1234efgh"})
    client.put("/api/settings/budget_start_day", json={"key": "budget_start_day", "value": "5"})

    res = client.get("/api/settings/")
    assert res.status_code == 200
    settings = {s["key"]: s["value"] for s in res.json()}
    assert settings["binance_api_secret"] == "********efgh"
    assert settings["budget_start_day"] == "5"


def test_get_setting_falls_back_to_default_when_unset(client):
    """Pins R2: unknown-but-recognized keys synthesize a default; unrecognized keys 404."""
    res = client.get("/api/settings/chart_theme")
    assert res.status_code == 200
    assert res.json()["value"] == "Morandi"

    res = client.get("/api/settings/not_a_real_key")
    assert res.status_code == 404


def test_put_price_update_interval_reschedules_the_scheduler(client):
    """Pins R4: writing price_update_interval_minutes live-reschedules the job,
    but writing any other key must not touch the scheduler at all."""
    with patch("backend.services.settings_service.scheduler.reschedule_updates") as mock_reschedule:
        res = client.put("/api/settings/budget_start_day", json={"key": "budget_start_day", "value": "10"})
        assert res.status_code == 200
        mock_reschedule.assert_not_called()

        res = client.put("/api/settings/price_update_interval_minutes", json={"key": "price_update_interval_minutes", "value": "30"})
        assert res.status_code == 200
        mock_reschedule.assert_called_once_with(30)


def test_export_csv_returns_twd_converted_value(client):
    """Pins docs/specs/assets-transactions.md Decision 6: CSV 'Value (approx)'
    now reuses the same value_twd computation as the dashboard, instead of
    the export's own separate quantity * native-price formula — so a USD
    stock's exported value matches what the app shows everywhere else."""
    client.post(
        "/api/assets/", json={"name": "AAPL", "category": "Stock", "ticker": "AAPL", "current_price": 150.0}
    )
    asset = client.get("/api/assets/").json()[0]
    client.post(f"/api/assets/{asset['id']}/transactions/", json={"amount": 2.0, "buy_price": 150.0})

    res = client.get("/api/system/export/csv")
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    assert "attachment; filename=ymoney_assets_" in res.headers["content-disposition"]
    lines = res.text.strip().splitlines()
    assert lines[0] == "ID,Name,Ticker,Category,Sub-Category,Source,Quantity,Current Price,Value (approx),Include in NW"
    # AAPL is USD-denominated (Stock, non-.TW ticker) -> value_twd = 300 * 32.0 (mocked rate)
    assert ",AAPL,AAPL,Stock,,manual,2.0,150.0,9600.0,True" in lines[1]


def test_reset_wipes_data_across_domains_added_after_the_original_six_tables(client):
    """Pins R6/R7 (docs/specs/settings-system.md Known Inconsistency #1): reset
    must not spare net_worth_history/income_items/subscription tables just
    because they were added to the schema after wipe_all_data was written."""
    client.post("/api/assets/", json={"name": "Cash", "category": "Fluid"})
    client.post("/api/income/items", json={"name": "Salary", "amount": 50000})
    client.post(
        "/api/subscriptions/",
        json={
            "name": "Netflix", "total_cost": 390, "total_shares": 4, "my_shares": 1,
            "members": [{"name": "Alice"}],
        },
    )

    res = client.delete("/api/system/reset")
    assert res.status_code == 200

    assert client.get("/api/assets/").json() == []
    assert client.get("/api/income/items").json() == []
    assert client.get("/api/subscriptions/").json() == []


def test_refresh_endpoint_returns_200(client):
    """Pins R8: manual refresh is synchronous and returns a success message."""
    res = client.post("/api/system/refresh")
    assert res.status_code == 200
