# Settings & System Domain Spec

## Status
Approved — last reviewed 2026-09-11.

## Purpose
Two closely related, low-traffic subsystems that keep the rest of the app operable rather than modeling financial data themselves:

- **Settings** is a generic key/value store for app-wide preferences (price refresh cadence, budget cycle start day, which asset categories show on the dashboard, wealth-simulator and emergency-fund defaults), with some values treated as secrets for display purposes.
- **System** provides three cross-cutting operational actions that touch data owned by *other* domains: exporting a CSV snapshot of all assets, wiping all user data for a fresh start, and manually forcing the same price-update + net-worth-snapshot pipeline the scheduler normally runs on a timer.

Both are intentionally small and have no dependency on other domains' correctness to be correct themselves, which is why this is the pilot domain for the spec-first + TDD rewrite process (see `../../CLAUDE.md` and the rewrite plan for why).

## Domain Model

### SystemSetting (key/value store)
| Field | Meaning |
|---|---|
| `key` | Primary key, string. |
| `value` | Stored as a string always, even for numeric/boolean/JSON-shaped settings — callers parse/serialize as needed. |

**Known keys and built-in defaults** (used only when no row exists yet for that key — never written to the DB just by reading them):

| Key | Default | Meaning |
|---|---|---|
| `price_update_interval_minutes` | `60` | Scheduler cadence for the price-update job; writing this key live-reschedules the running job. |
| `budget_start_day` | `1` | Day-of-month the budget cycle resets on (Budgets domain). |
| `chart_theme` | `Morandi` | Cosmetic, currently unused by any read path found in the inventory — kept as a default for forward compatibility, not actively consumed today. |
| `visible_categories` | `["Fluid","Investment","Fixed","Receivables","Liabilities"]` | JSON array; drives dashboard category visibility (Assets/Dashboard domain reads this). |
| `wealth_simulator_monthly_contribution` / `_annual_return` / `_years` / `_initial_amount` | `10000` / `6` / `20` / `0` | Inputs for a wealth simulator feature — not found wired to any current UI in the frontend inventory; treated as a **Non-Goal / unimplemented default** until a consuming feature exists (see Open Questions). |
| `emergency_fund_monthly_expense` / `_target_months` / `_cash` | `30000` / `6` / `0` | Same status as above — defaults exist server-side but the Budget page's emergency-fund widget computes its "3 months" target from budget categories directly (`budgetMetrics.ts`), not from these settings keys. Likely dead/aspirational config; flagged for a decision below. |
| `exchange_rate_usdtwd` | *(no built-in default — written by the Integrations domain)* | Cache of the last known USDT/TWD rate. Not owned by this domain; only mentioned here because it lives in the same table. |

**Secret-looking keys**: any key whose name contains `key`, `secret`, `password`, or `token` (case-insensitive) is treated as sensitive for *display* purposes only — the stored value itself is never encrypted, only masked in API responses.

### System (no dedicated model)
System operations read/write rows belonging to other domains' tables directly (`assets`, `transactions`, `goals`, `budget_categories`, `system_settings`, `crypto_connections`) rather than owning any table of their own.

## Business Rules

**Settings**

- **R1**: `GET /api/settings/` returns every stored setting, with any secret-looking key's value replaced by `mask_secret_tail(value)` — `"********" + last 4 chars` if the value is longer than 4 chars, else a bare `"********"`. Non-secret keys are returned unmasked.
- **R2**: `GET /api/settings/{key}` returns the stored row if one exists; if not, returns a synthesized row using `DEFAULT_SETTINGS[key]` if `key` is a known default; if neither exists, returns 404. This endpoint does **not** mask secret values (unlike R1) — it returns the raw stored value.
- **R3**: `PUT /api/settings/{key}` upserts the given value regardless of whether `key` is a known default or an arbitrary new key (no key allowlist/validation).
- **R4**: When the updated key is exactly `price_update_interval_minutes`, the write also calls the scheduler to reschedule the live price-update job to the new interval (parsed as `int`). If parsing or rescheduling fails, the exception is caught and logged — the setting write itself still succeeds and is not rolled back.

**System**

- **R5**: `GET /api/system/export/csv` streams a CSV with header `ID, Name, Ticker, Category, Sub-Category, Source, Quantity, Current Price, Value (approx), Include in NW` for every asset, where `Quantity = sum(transaction.amount)` and `Value (approx) = Quantity * current_price` — in the asset's **native currency, not TWD-converted** (unlike `value_twd` used elsewhere in the app). `Source` defaults to `"manual"` if unset. Filename is `ymoney_assets_{YYYYMMDD_HHMMSS}.csv`.
- **R6**: `DELETE /api/system/reset` deletes all rows from `transactions`, `assets`, `goals`, `budget_categories`, `system_settings`, and `crypto_connections`, then reseeds `system_settings` with `budget_start_day=1`, in one transaction (rolls back entirely on any error).
- **R7 (bug, confirmed in `system_repo.py`)**: R6 does **not** delete `net_worth_history`, `income_items`, or any of the four subscription tables (`subscriptions`, `subscription_members`, `collection_cycles`, `cycle_payments`) — despite the frontend describing this action as "刪除所有資產、交易紀錄和目標" (delete all assets, transactions, and goals) escalating to "所有資料將永久消失" (all data will permanently disappear) in its final confirmation step. See Known Inconsistencies below for the decision.
- **R8**: `POST /api/system/refresh` runs the same pipeline the scheduler runs on a timer: `update_prices(db)` then `snapshot_net_worth(db)`, synchronously, and returns before background scheduled runs would otherwise fire.

## API Contract
Full request/response schemas are in `../API.md` under the Settings and System sections; this spec only calls out behavior not obvious from the shapes there:
- `GET/PUT /api/settings/{key}` — see R1–R4 for masking and reschedule side effects.
- `GET /api/system/export/csv` — see R5 for the currency caveat (native, not TWD).
- `DELETE /api/system/reset` — see R6/R7 for exact table scope.
- `POST /api/system/refresh` — see R8; synchronous, blocks until both steps complete.

## UI/UX Contract
(Settings page only — System actions are UI-triggered from the same page.)

- Page sections, top to bottom: Quick links (Budget/History/Subscriptions — **not** Integrations, see Known Inconsistencies), Preferences (price refresh interval dropdown: 15/30/60/1440 min), Budget cycle (monthly reset day input, 1–31, clamped on blur), Asset display settings (`CategoryVisibility` — per-category show/hide toggle backed by `visible_categories`), Data management (Backup: JSON export via client-side fetch+download, and CSV export via opening `/system/export/csv` in a new tab; System reset).
- **System reset is a 3-step confirmation ladder**: step 0 (红 "重置" button, describes "刪除所有資產、交易紀錄和目標") → step 1 ("此操作無法復原" / cannot be undone, 取消/確定) → step 2 ("所有資料將永久消失" / all data permanently disappears, 取消/確定清除) → calls `DELETE /system/reset` → hard-redirects to `/` via `window.location.href`. On failure, silently resets to step 0 (logs to console only, no user-facing error).
- If either the `budget_start_day` or `price_update_interval_minutes` fetch errors, the whole page renders `PageError` with a combined retry — not per-section error states.
- `useCategoryVisibility` caches its last known value in `localStorage` (`setting_visible_categories`) so the dashboard can paint category visibility instantly without waiting on the settings round-trip; falls back to "all visible" if nothing cached and the setting hasn't loaded yet.

## Known Inconsistencies — Explicit Decisions

1. **Reset asymmetry (R7)** — `wipe_all_data()` skips `net_worth_history`, `income_items`, and all four subscription tables, contradicting the UI's own "all data will permanently disappear" copy.
   **Decision: FIX.** Reset should delete from every user-data table that exists at the time it runs, not a hardcoded list — otherwise every future domain that adds a table silently reintroduces this bug (this is exactly why the rewrite plan schedules a Settings/System revisit after all domains land). For this pilot, fix it to include the currently-known full table set (`net_worth_history`, `income_items`, `subscriptions`, `subscription_members`, `collection_cycles`, `cycle_payments`) in addition to the six already wiped.

2. **No Settings → Integrations navigation link** — Integrations (exchange/wallet connections) is only reachable from the dashboard's Crypto category icon, not from the Settings page's Quick Links, even though every other secondary feature (Budget/History/Subscriptions) is linked from Settings.
   **Decision: FIX.** Add an Integrations quick link to the Settings page for discoverability. This is UI-only, no backend change.

3. **`chart_theme` and wealth-simulator / emergency-fund settings keys appear unused** — defaults exist in `DEFAULT_SETTINGS` but no current frontend read path was found consuming them (emergency fund math in the Budget page derives its target from budget categories directly, not from these settings).
   **Decision: KEEP.** Confirmed with the owner: these are planned-but-unbuilt features (a future wealth simulator / emergency-fund settings UI), not dead code to clean up. Kept as-is in `DEFAULT_SETTINGS`; see Non-Goals.

4. **`GET /api/settings/{key}` does not mask secret values (R2), while `GET /api/settings/` does (R1)** — inconsistent masking between the list and single-item endpoints.
   **Decision: KEEP.** No current caller of the single-key endpoint reads a secret-looking key (it's used for `visible_categories`, `budget_start_day`, `price_update_interval_minutes` — none secret), so this is latent, not exploited. Fixing it now would be speculative hardening outside this domain's observed behavior; revisit if a future domain starts storing/reading a secret through the single-key endpoint.

## Non-Goals
- No authentication/authorization on any of these endpoints (standing project-wide non-goal per `CLAUDE.md`).
- No encryption at rest for secret-looking setting values — masking is display-only, per existing behavior.
- No settings schema/allowlist validation (arbitrary keys can be written) — unchanged from current behavior, not in scope for this pass.
- Building the wealth-simulator or emergency-fund-settings UI/consumers is out of scope for this domain pass — `chart_theme`, `wealth_simulator_*`, and `emergency_fund_*` keys stay as reserved defaults for a future feature (confirmed with owner), not implemented or removed here.

## Open Questions
None.
