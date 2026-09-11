# Yantage Backend API

Manually-curated reference, grouped by domain. For the full auto-generated schema (try-it-out, exact field types) use the FastAPI Swagger UI at `/docs` (e.g. `http://localhost:8000/docs`) — this file exists to give a fast, readable overview that Swagger doesn't: what each endpoint is *for*, and how the domains relate.

All routes are prefixed `/api`. Request/response bodies reference Pydantic model names from `backend/schemas.py` — look there for exact field types.

---

## Assets — `/api/assets`

The core resource: things with a value that roll up into net worth.

| Method | Path | Purpose | Body → Response |
|---|---|---|---|
| GET | `/` | List assets (enriched with `value_twd`/`unrealized_pl`/`roi`) | — → `Asset[]` |
| POST | `/` | Create an asset | `AssetCreate` → `Asset` (not enriched — see note below) |
| PUT | `/{asset_id}` | Update asset fields | `AssetUpdate` → `Asset` (not enriched) |
| DELETE | `/{asset_id}` | Delete an asset (cascades its transactions) | — → 204 |
| GET | `/lookup/{ticker}` | Look up a name/price for a ticker via yfinance, for the add-asset autofill | — → `TickerLookupResult` |
| POST | `/{asset_id}/transactions/` | Add a transaction (buy/sell/adjustment) to an asset | `TransactionCreate` → `Transaction` |
| PUT | `/transactions/{transaction_id}` | Edit a transaction (blocked for MAX-synced assets) | `TransactionUpdate` → `Transaction` |
| DELETE | `/transactions/{transaction_id}` | Delete a transaction | — → 204 |

**Enrichment note**: `value_twd`/`unrealized_pl`/`roi` are computed at read time (`AssetService`, see `backend/services/asset_service.py`) from `current_price × Σtransactions` plus the live USDT/TWD rate — they aren't stored columns. `POST`/`PUT` return the raw (un-enriched) row since the frontend re-fetches the list afterward. There is no `GET /{asset_id}` single-asset endpoint — the frontend always works off the full list from `GET /api/dashboard/`.

## Dashboard — `/api/dashboard`

| Method | Path | Purpose | Body → Response |
|---|---|---|---|
| GET | `/` | Net worth, total P/L, ROI, FX rate, and the full enriched asset list in one call | — → `DashboardData` |

## Stats — `/api/stats`

| Method | Path | Purpose | Body → Response |
|---|---|---|---|
| GET | `/history?range=30d\|3mo\|6mo\|1y\|ytd\|all` | Net-worth time series. Serves from daily `NetWorthHistory` snapshots when coverage is good, else rebuilds from transactions + Yahoo Finance price history | — → `[{date, value, breakdown}]` |
| GET | `/forecast` | FIRE-goal forecast: 6-month growth rate + predicted date each `NET_WORTH` goal is reached | — → `ForecastResponse` |

## Goals — `/api/goals`

| Method | Path | Purpose | Body → Response |
|---|---|---|---|
| GET | `/` | List goals | — → `Goal[]` |
| POST | `/` | Create a goal (`NET_WORTH` target or `ASSET_ALLOCATION` percentages) | `GoalCreate` → `Goal` |
| PUT | `/{goal_id}` | Update a goal | `GoalUpdate` → `Goal` |
| DELETE | `/{goal_id}` | Delete a goal | — → 204 |

## Budgets — `/api/budgets`

| Method | Path | Purpose | Body → Response |
|---|---|---|---|
| GET | `/categories` | List active budget categories | — → `BudgetCategory[]` |
| POST | `/categories` | Create a category | `BudgetCategoryCreate` → `BudgetCategory` |
| PUT | `/categories/{category_id}` | Update a category | `BudgetCategoryUpdate` → `BudgetCategory` |
| DELETE | `/categories/{category_id}` | Delete a category | — → 204 |

## Income — `/api/income`

| Method | Path | Purpose | Body → Response |
|---|---|---|---|
| GET | `/items` | List active expected-income items | — → `IncomeItem[]` |
| POST | `/items` | Create an income item | `IncomeItemCreate` → `IncomeItem` |
| PUT | `/items/{item_id}` | Update an income item | `IncomeItemUpdate` → `IncomeItem` |
| DELETE | `/items/{item_id}` | Delete an income item | — → 204 |

## Subscriptions (split-bill tracking) — `/api/subscriptions`

Tracks shared subscriptions (e.g. a streaming plan) where the user fronts the cost and collects shares back from other members each billing cycle.

| Method | Path | Purpose | Body → Response |
|---|---|---|---|
| GET | `/` | List subscriptions with members + cycles + payments nested | — → `Subscription[]` |
| POST | `/` | Create a subscription (with initial member list) | `SubscriptionCreate` → `Subscription` |
| PUT | `/{subscription_id}` | Update cost/shares/period | `SubscriptionUpdate` → `Subscription` |
| DELETE | `/{subscription_id}` | Delete a subscription (cascades members/cycles/payments) | — → 204 |
| POST | `/{subscription_id}/members` | Add a member to collect payment from | `SubscriptionMemberCreate` → `SubscriptionMember` |
| DELETE | `/members/{member_id}` | Remove a member | — → 204 |
| POST | `/{subscription_id}/cycles` | Open a new collection cycle (auto-creates one pending payment per member) | `CollectionCycleCreate` → `CollectionCycle` |
| DELETE | `/cycles/{cycle_id}` | Delete a cycle (cascades its payments) | — → 204 |
| PATCH | `/payments/{payment_id}` | Mark a payment paid/unpaid (`paid_at: null` = unpaid) | `CyclePaymentUpdate` → `CyclePayment` |

## Settings — `/api/settings`

Generic key-value store for app-wide preferences (visible categories, chart theme, price-update interval, wealth-simulator/emergency-fund inputs, and the cached exchange rate). Secret-looking keys (containing `key`/`secret`/`password`/`token`) are masked in list responses.

| Method | Path | Purpose | Body → Response |
|---|---|---|---|
| GET | `/` | List all settings (masked where secret-like) | — → `SystemSetting[]` |
| GET | `/{key}` | Get one setting, falling back to a built-in default if unset | — → `SystemSetting` |
| PUT | `/{key}` | Upsert a setting. Setting `price_update_interval_minutes` also reschedules the background price-update job | `SystemSettingBase` → `SystemSetting` |

## Integrations — `/api/integrations`

Exchange/wallet connections used to auto-sync crypto asset balances.

| Method | Path | Purpose | Body → Response |
|---|---|---|---|
| GET | `/` | List connections (API keys masked) | — → `ConnectionResponse[]` |
| POST | `/` | Add a connection (`provider`: `pionex`\|`max`\|`binance`\|`wallet`) | `ConnectionCreate` → `ConnectionResponse` |
| DELETE | `/{conn_id}` | Remove a connection (cascades its synced assets) | — → `{"message": str}` |
| POST | `/sync/{provider}` | Trigger an on-demand sync for all active connections of that provider | — → `{"status", "message"}` |

## System — `/api/system`

| Method | Path | Purpose | Body → Response |
|---|---|---|---|
| GET | `/export/csv` | Export all assets as CSV (id/name/ticker/category/quantity/price/value) | — → CSV file |
| DELETE | `/reset` | **Wipe all data** (transactions, assets, goals, budgets, settings, connections) and reseed `budget_start_day` | — → `{"message": str}` |
| POST | `/refresh` | Manually trigger a price update + net-worth snapshot (same job the scheduler runs nightly) | — → `{"message": str}` |

---

## Domain notes

- **Layering** (see `CLAUDE.md`): routers only do HTTP concerns and delegate to services or repositories directly for simple CRUD; services own business logic and I/O (yfinance, exchange APIs, exchange-rate caching); repositories own all SQLAlchemy queries. `AssetService` sits above `AssetRepository` specifically to compute `value_twd`/`roi` without the repository depending on `exchange_rate_service`.
- **Providers** (`backend/services/providers/`): `binance`/`max`/`pionex`/`wallet` each implement `ExchangeProvider.sync(db) -> bool`, invoked via `POST /api/integrations/sync/{provider}` or the nightly scheduler job. Binance/Pionex share their "find-or-create asset + diff transaction" logic via `services/providers/common.py::sync_asset_balance`; MAX and the wallet provider have different-enough update rules that they call `AssetRepository` directly instead.
- **Scheduler** (`backend/scheduler.py`, not modified by the refactor): runs price updates + a net-worth snapshot + all provider syncs on an interval controlled by the `price_update_interval_minutes` setting.
