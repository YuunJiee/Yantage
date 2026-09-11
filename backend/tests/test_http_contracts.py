"""HTTP-level contract tests using the `client` fixture (real FastAPI
dependency injection, request validation, and routing) — everything else
in this test suite calls router/service functions directly as plain
Python, which never exercises this layer at all. A handful of smoke tests
here, not exhaustive coverage: proving the wiring works end-to-end."""


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


def test_delete_transaction_for_max_synced_asset_returns_403(client):
    asset = client.post(
        "/api/assets/", json={"name": "BTC", "category": "Crypto", "source": "max"}
    ).json()
    tx = client.post(
        f"/api/assets/{asset['id']}/transactions/",
        json={"amount": 1.0, "buy_price": 0},
    ).json()

    res = client.delete(f"/api/assets/transactions/{tx['id']}")
    assert res.status_code == 403
