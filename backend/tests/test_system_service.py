from datetime import datetime

from backend import models, schemas
from backend.repositories.asset_repo import AssetRepository
from backend.services import system_service


def test_wipe_all_data_empties_tables_and_reseeds_budget_start_day(db):
    repo = AssetRepository(db)
    asset = repo.create(schemas.AssetCreate(name="Cash", category="Fluid", current_price=1.0))
    repo.create_transaction(schemas.TransactionCreate(amount=100.0, buy_price=1.0, date=datetime(2025, 1, 1)), asset.id)
    db.add(models.Goal(name="Retire", target_amount=1000, goal_type="NET_WORTH", created_at=datetime.now()))
    db.add(models.SystemSetting(key="budget_start_day", value="15"))
    db.commit()

    system_service.reset_database(db)

    assert db.query(models.Asset).count() == 0
    assert db.query(models.Transaction).count() == 0
    assert db.query(models.Goal).count() == 0
    settings = {s.key: s.value for s in db.query(models.SystemSetting).all()}
    assert settings == {"budget_start_day": "1"}


def test_wipe_all_data_also_empties_net_worth_history_income_and_subscriptions(db):
    """Regression test for the reset asymmetry documented in
    docs/specs/settings-system.md (R7 / Known Inconsistency #1): the UI tells
    the user reset makes "all data" permanently disappear, so wipe_all_data
    must not silently spare tables just because they belong to domains added
    after reset_database was first written.
    """
    db.add(models.NetWorthHistory(date="2025-01-01", value=1000.0))
    db.add(models.IncomeItem(name="Salary", amount=50000.0))
    sub = models.Subscription(name="Netflix", total_cost=390, total_shares=4, my_shares=1)
    db.add(sub)
    db.flush()
    member = models.SubscriptionMember(subscription_id=sub.id, name="Alice")
    db.add(member)
    db.flush()
    cycle = models.CollectionCycle(subscription_id=sub.id, cycle_start="2025-01-01")
    db.add(cycle)
    db.flush()
    db.add(models.CyclePayment(cycle_id=cycle.id, member_id=member.id))
    db.commit()

    system_service.reset_database(db)

    assert db.query(models.NetWorthHistory).count() == 0
    assert db.query(models.IncomeItem).count() == 0
    assert db.query(models.Subscription).count() == 0
    assert db.query(models.SubscriptionMember).count() == 0
    assert db.query(models.CollectionCycle).count() == 0
    assert db.query(models.CyclePayment).count() == 0


def test_build_assets_csv_includes_header_and_asset_row(db):
    repo = AssetRepository(db)
    asset = repo.create(schemas.AssetCreate(name="Cash", category="Fluid", current_price=1.0))
    repo.create_transaction(schemas.TransactionCreate(amount=100.0, buy_price=1.0, date=datetime(2025, 1, 1)), asset.id)

    csv_content = system_service.build_assets_csv(db)

    lines = csv_content.strip().splitlines()
    assert lines[0] == "ID,Name,Ticker,Category,Sub-Category,Source,Quantity,Current Price,Value (approx),Include in NW"
    assert f"{asset.id},Cash,,Fluid,,manual,100.0,1.0,100.0,True" in lines[1]
