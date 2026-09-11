# Assets & Transactions Domain Spec

## Status
Approved — last reviewed 2026-09-11. Second domain in the spec-first + TDD rewrite process (see `../../CLAUDE.md` and `settings-system.md` for the pilot this process was validated on).

## Purpose
The core domain of the app: what the user owns (`Asset`) and every quantity-changing event on it (`Transaction`). Net worth, allocation charts, top performers, and history all derive from this data. Assets are either **manual** (user-entered) or **provider-synced** (Binance/MAX/Pionex/Wallet, written by `services/providers/*` on a schedule or on-demand sync) — the domain's central tension is keeping those two origins consistent under one data model without provider syncs silently clobbering user edits, or user edits silently fighting future syncs.

## Domain Model

### Asset
| Field | Meaning |
|---|---|
| `id` | PK |
| `name` | Display name. Provider-synced assets get this rewritten on every sync (except MAX, which never rewrites `name` after creation, and Wallet's auto-discovery loop, which only sets it at creation — see Business Rules) |
| `ticker` | e.g. `AAPL`, `BTC/USDT`, `2330.TW`. Optional — cash/fixed-deposit assets typically have none |
| `category` | One of `AssetCategory` (`Fluid`/`Stock`/`Crypto`/`Fixed`/`Receivables`/`Liabilities`) |
| `sub_category` | Free string. Manual creation is constrained to a per-category dropdown (`SUB_CATEGORIES`); provider sync writes its own values — unified under this spec, see Decision 4 |
| `current_price` | Native-currency unit price; written by `price_service` (manual/provider tickers) or by provider sync directly (MAX TWD balances hardcode `1.0`) |
| `last_updated_at` | Touched on create, update, price write, and (conditionally) balance sync |
| `include_in_net_worth` | Drives net-worth calculation, snapshot, and CSV export inclusion |
| `icon` | Optional; falls back to a category/sub-category default when unset |
| `payment_due_day` | 1–31; Liabilities-only, purely informational |
| `source` | `Provider` value (`manual`/`max`/`binance`/`pionex`/`wallet`) — see Decision 5 for the `web3_wallet` literal fix |
| `network` / `contract_address` / `decimals` | Web3 token identity, Wallet-provider only |
| `connection_id` | FK → `CryptoConnection`, null for manual assets |
| `transactions` | 1:N, `cascade="all, delete-orphan"` — deleting an Asset deletes its full transaction history |

**Removed in this pass**: `is_favorite` (dead — never set by any UI), `manual_avg_cost` (dead for calculation purposes — see Decision 2).

There is no stored quantity/balance field. **Current holding is always `sum(transaction.amount)`**, computed on read wherever needed.

### Transaction
| Field | Meaning |
|---|---|
| `id` | PK |
| `asset_id` | FK → `Asset` |
| `amount` | Signed quantity delta. Positive = buy/deposit/provider-balance-increase, negative = sell/withdrawal/provider-balance-decrease |
| `buy_price` | Native-currency unit price at the time of this delta. Only meaningful (used in cost-basis math) when `amount > 0` |
| `date` | Defaults to now |
| `is_transfer` | Cosmetic tag (changes history icon); does not exclude the row from any balance/P&L math |
| `note` | Optional |

### CryptoConnection (owned by the Integrations domain, referenced here)
Deleting a connection cascades — via the SQLAlchemy relationship — to delete every `Asset` tied to it and, transitively, every `Transaction` on those assets. This spec's UI contract requires the delete-confirmation flow to say so explicitly (Decision 4).

## Business Rules

**Balance & cost basis**

- **R1**: Current holding for any asset = `sum(t.amount for t in asset.transactions)`. Every balance-changing action (manual add, quick-adjust, provider sync) is implemented as inserting a `Transaction`, never as mutating a stored quantity.
- **R2 (changed — Decision 1)**: Cost basis (`invested_capital`) is now a **running remaining-cost-basis**, not a lifetime sum of buys:
  - Processing transactions in date order, each `amount > 0` transaction adds `amount * buy_price` (× FX rate if USD-denominated) to `invested_capital`.
  - Each `amount < 0` transaction reduces `invested_capital` proportionally to the fraction of the remaining position it closes: `invested_capital -= invested_capital * (|amount| / balance_before_this_transaction)`. This keeps average cost per unit constant across partial sells, which is the standard "average cost basis" method.
  - `unrealized_pl = value_twd − invested_capital`; `roi = unrealized_pl / invested_capital × 100`; both `0` when `invested_capital ≤ 0` (e.g. fully closed position, or an asset with only provider-diff transactions at `buy_price=0`).
  - This changes reported ROI/unrealized P&L for any asset with a partial sell in its history, compared to the previous build. No realized-P&L figure is introduced by this change — realized gains/losses from sells remain unreported (Non-Goal).
- **R3 (removed — Decision 2)**: `manual_avg_cost` is deleted from the model, schema, and both Add/Edit UI. The only way to set an asset's cost basis is via `Transaction.buy_price`, entered at creation or via a subsequent adjustment/transaction edit.

**Currency conversion** — `is_usd_denominated(asset)`, unchanged from current behavior:
1. `source == "max"` → always TWD (`False`).
2. `category == Crypto` → always USD (`True`), regardless of source.
3. `category == Stock` with a ticker not ending `.TW` and not a bare 4-digit code → USD.
4. Everything else → TWD.

**Category sign handling** — unchanged: `Liabilities` is the sole negative category (`utils/category_rules.is_negative_category`), applied when summing into aggregate `net_worth`/`total_pl`/`total_roi` (`dashboard_service`, `snapshot_service`, `analytics_service`). Individual `Asset.value_twd` and all per-asset/per-category UI remain unsigned-positive, differentiated only by category — this is existing, confirmed-intentional behavior, not changed by this pass.

**Manual vs. provider-synced assets**

- **R4**: Manual creation defaults `current_price` to `0.0` if a ticker is given (price scheduler fills it in), else `1.0` (e.g. cash, where quantity IS the value).
- **R5 (changed — Decision 3)**: Provider-synced assets (`source ∈ {max, binance, pionex, wallet}`) cannot have their balance manually edited or adjusted, for **any** provider — not just MAX as before:
  - Backend: `PUT /transactions/{id}` and `DELETE /transactions/{id}` return 403 for a transaction whose asset has any provider `source`, not only `max`. `POST /assets/{id}/transactions/` (create) also gets this guard, closing the asymmetry where creation was previously unguarded even for MAX.
  - Frontend: `AssetHistoryView` hides Adjust/Edit for all four provider sources (adds `wallet`, which was previously missing from the hidden-for list — wallet balances could be hand-edited and would then get silently overwritten by the next 10-minute sync). `EditAssetView`'s read-only guard is generalized from `source === 'max'` to "any provider source", so it stays consistent with `AssetHistoryView` regardless of how the view is reached.
  - Editing non-balance fields (name, icon, category, sub-category, include-in-net-worth) remains allowed for provider-synced assets **except** where a specific provider's sync would overwrite it anyway (MAX never rewrites `name`; Wallet's auto-discovery assets keep user-set `name`/`icon` permanently once synced past creation — both unchanged, documented technical debt per root `CLAUDE.md`).
- **R6**: Wallet's two sync loops (known-token update vs. new-token auto-discovery) intentionally do not share a single find-or-create function, so a manually-renamed auto-discovered token survives future syncs. Unchanged — this is existing, deliberate behavior (root `CLAUDE.md`), not revisited here.

**Provider sync quirks** — unchanged from current behavior except Decision 4/5 above and the `source` literal fix (Decision 5 below): MAX computes real average cost from trade history but that value is no longer stored anywhere (R3 removes the field it used to write to — MAX sync simply stops writing an avg-cost field); Binance/Pionex refresh `name`/`icon`/`sub_category`/`current_price` every sync via the shared `sync_asset_balance()`; MAX never rewrites `name`; Wallet auto-discovery only sets display fields at creation.

**Snapshot / price update / history** — unchanged: `snapshot_net_worth` skips writing when the computed total rounds to exactly `0`; `update_prices` only writes back prices fetched as `> 0`; `get_net_worth_history`'s slow path replays transactions per day with historical price lookups.

## API Contract
Full request/response schemas in `../API.md`; this spec calls out behavior not obvious from the shapes there:
- `POST/PUT /api/assets/{id}/transactions` and `DELETE /api/assets/transactions/{id}` — 403 for **any** provider-sourced asset (R5, changed from MAX-only).
- `POST /api/assets/` — no longer accepts `manual_avg_cost` (R3; removed from `AssetCreate`/`AssetUpdate` schemas).
- `DELETE /api/integrations/{conn_id}` — unchanged cascade behavior; UI contract below adds the warning copy this endpoint's blast radius requires (Decision 4).
- `GET /api/system/export/csv` (owned by the System domain, referenced here) — **changed**: `Value (approx)` now uses the same `value_twd` computation as the dashboard, instead of a separate native-currency formula (Decision 6). Flagged here because it's this domain's valuation logic being reused, not a System-domain rule change.

## UI/UX Contract

**Add Asset** (`AddAssetDialog`) — category dropdown order changed to match `DASHBOARD_CATEGORY_ORDER` (`Fluid, Stock, Crypto, Fixed, Receivables, Liabilities`) instead of its own divergent order (Decision 9). `manual_avg_cost` field removed; the existing "平均成本" field that feeds `Transaction.buy_price` at creation is unchanged and remains the only cost-basis input. Asset creation + initial transaction creation failure handling changed (Decision 10): if the transaction-create step fails after the asset was created, the dialog now deletes the just-created asset and reports a single clear error, instead of leaving a zero-balance orphan asset behind.

**Edit Asset** (`EditAssetView`) — gains a category selector (Decision 7), matching Add Asset. `manual_avg_cost` field removed. Read-only guard (banner + disabled fieldset) generalized to all provider sources (R5). Error handling switches from native `alert()` to the shared toast pattern already used by `AddAssetDialog` (Decision 11), which also fixes the one untranslated English string (`"Delete failed"`).

**Quick Adjust** (`QuickAdjustView`) — invalid (non-numeric) input now disables the submit button and shows inline validation feedback instead of silently no-op'ing on submit (Decision 8a). A zero-diff adjustment still closes the dialog without an API call — this is correct as-is (nothing needs to be saved) and is not changed (Decision 8b).

**Asset value display** — the three independent implementations of "what is this asset's value" (`getAssetDisplayValue`, `DashboardClient.getCategoryTotal`, `AssetAllocationWidget`'s inline calc) are unified into one shared function in `AssetAccordion/helpers.ts`, used by all three call sites (Decision 12). Behavior settles on the more defensive of the previous three: fall back to `current_price × Σamount` whenever `value_twd` is `undefined` **or** `0`.

**Sub-category display** — `AssetAllocationWidget`'s locally-duplicated `SUBCATEGORY_ZH` map is removed in favor of the shared `getSubCategoryLabel`/`SUB_CATEGORY_ZH` from `lib/constants.ts` (Decision 13), so the same sub-category always renders the same Chinese label everywhere.

**Icon defaults** — `getDefaultIcon`'s dead `cat === 'investment'` branch is corrected to check the real category values (`'stock'`/`'crypto'`), so Stock/Crypto assets without a manually-picked icon get their intended category-specific default instead of always falling through to the generic icon (Decision 14).

**Delete-connection warning** (Decision 4, `IntegrationManager`) — confirmation copy changes from the generic "確定刪除？" to explicitly state the action deletes all assets and transaction history synced from that connection, and cannot be undone. `IntegrationManager` also now calls `mutate(SWR_KEYS.dashboard)` after a successful delete (previously only the local connection list refreshed, leaving stale assets visible until the next periodic revalidation) (Decision 15).

**Data fetching** — `AddAssetDialog` and `IntegrationManager`'s raw `useEffect`/`fetch` calls for the wallet-connection/connection list are replaced with a new `useIntegrations()` SWR hook in `lib/hooks.ts` (Decision 16), closing the domain's only two deviations from the project's stated SWR-only data-fetching convention.

**Delete confirmation UI** — `TransactionEditDialog`'s and `IntegrationManager`'s hand-rolled inline "確定刪除？/確定/取消" pairs are replaced with the shared `components/ui/confirm-delete.tsx` component already used by `EditAssetView` (Decision 17).

## Known Inconsistencies — Explicit Decisions

1. **ROI/unrealized-P&L computed against lifetime buy cost, never reduced by sells (R2).**
   **Decision: FIX.** Switch to running remaining-cost-basis (average-cost method) so ROI reflects the currently-held position's actual cost, not a blended lifetime figure that understates ROI after any partial sell. See R2.

2. **`manual_avg_cost` field written by MAX sync and editable in the UI, read by nothing (R3).**
   **Decision: FIX — remove the field.** Two identically-labeled "平均成本" inputs (one that works, on Add Asset via `buy_price`; one that silently does nothing, on Edit Asset) is a correctness trap for the user. Removing is simpler and safer than wiring it in, since MAX's computed average cost isn't necessarily what should override transaction-derived cost basis for an asset that also has manual adjustments.

3. **Provider-edit guard is MAX-only and inconsistent between backend/frontend/EditAssetView (R5).**
   **Decision: FIX — unify across all four providers, at every layer.** A user manually editing a Wallet-synced balance today gets silently overwritten by the next 10-minute sync with no guard anywhere; Pionex/Binance are guarded on the frontend but not the backend. One rule, enforced consistently, removes both the silent-overwrite trap and the frontend/backend drift.

4. **Deleting a `CryptoConnection` silently cascades to delete all its Assets + Transactions, with a generic confirmation.**
   **Decision: FIX — explicit warning copy**, per the same reasoning as the Settings/System pilot's reset-confirmation requirement (`settings-system.md` R6/R7): an action this destructive needs its actual scope stated, not a generic "確定刪除？".

5. **`Asset.source` for Wallet-provider assets is the literal string `"web3_wallet"`, not `Provider.WALLET.value` (`"wallet"`).**
   **Decision: FIX.** Standardize to `"wallet"`. Requires a data migration updating any existing rows with `source = "web3_wallet"`, and updating every place that currently special-cases the `"web3_wallet"` string (the frontend's provider-guard lists, per Decision 3, are being rewritten anyway — this lands in the same change).

6. **CSV export values assets in native currency; every other view uses `value_twd` (originally flagged in `settings-system.md` R5, unresolved there since it's this domain's valuation logic).**
   **Decision: FIX.** Reuse `AssetService`'s `value_twd` computation for the CSV export instead of the export's own separate `quantity * current_price` formula, so there's exactly one definition of "an asset's value" in the system.

7. **`is_favorite` field, `CATEGORY_ICON_BG`/`CATEGORY_ICON_TEXT` exports — dead code, never read or set by any current UI.**
   **Decision: FIX — remove.** No feature depends on them; unlike the Settings/System pilot's unused settings keys (which were confirmed as planned-but-unbuilt), there's no stated future plan for these.

8. **`EditAssetView` has no category selector; `AddAssetDialog` does.**
   **Decision: FIX — add one to `EditAssetView`.** The backend already accepts `category` changes via `PUT`; the omission looks like an oversight rather than an intentional restriction, and parity between Add/Edit reduces surprise.

9. **`AddAssetDialog`'s category order (`Fluid, Crypto, Stock, ...`) differs from `DASHBOARD_CATEGORY_ORDER` (`Fluid, Stock, Crypto, ...`) used everywhere else.**
   **Decision: FIX.** Reorder to match; purely cosmetic, no behavior change.

10. **Add-asset flow issues two non-atomic requests (create asset, then create initial transaction); a second-request failure leaves an orphaned zero-balance asset with only a generic error toast.**
    **Decision: FIX.** On initial-transaction failure, delete the just-created asset and surface one clear error, rather than leaving inconsistent partial state.

11. **`EditAssetView`/`TransactionEditDialog` use native `alert()` (including one untranslated `"Delete failed"` string); `AddAssetDialog` uses a toast.**
    **Decision: FIX — standardize on the toast pattern** across this domain's error handling, incidentally fixing the zh-TW violation.

12. **Three divergent implementations of "asset display value" (`getAssetDisplayValue`, `getCategoryTotal`, `AssetAllocationWidget`'s inline calc), disagreeing on the `value_twd === 0` fallback case.**
    **Decision: FIX — unify into one shared function**, all three call sites use it. See UI/UX Contract.

13. **`AssetAllocationWidget`'s local `SUBCATEGORY_ZH` map diverges from `lib/constants.ts`'s `SUB_CATEGORY_ZH` for at least `Token`/`Coin`.**
    **Decision: FIX — remove the duplicate**, use the shared map everywhere.

14. **`getDefaultIcon`'s Stock/Crypto-specific default-icon branch checks `cat === 'investment'`, a value that never occurs — dead branch, every Stock/Crypto asset falls through to the generic icon.**
    **Decision: FIX** — correct the category check.

15. **`IntegrationManager`'s connection delete doesn't refresh the dashboard**, leaving stale (already-cascade-deleted) assets visible until the next periodic SWR revalidation.
    **Decision: FIX** — add `mutate(SWR_KEYS.dashboard)` after a successful delete.

16. **`AddAssetDialog` and `IntegrationManager` fetch integration data via raw `useEffect`, contradicting the project's stated SWR-only data-fetching convention.**
    **Decision: FIX** — add `useIntegrations()` to `lib/hooks.ts`, use it in both places.

17. **Three independent implementations of the delete-confirmation UI** (`components/ui/confirm-delete.tsx`, plus hand-rolled copies in `TransactionEditDialog` and `IntegrationManager`).
    **Decision: FIX** — consolidate onto the shared component.

18. **`QuickAdjustView` silently no-ops on unparseable input (submit button stays enabled, click does nothing).**
    **Decision: FIX** — disable submit / show inline validation for non-numeric input. The existing zero-diff-closes-without-a-call behavior is correct as-is and unchanged.

19. **Liabilities' percentage-of-total (shown per accordion row) is computed against total *positive* assets, not total liabilities or net worth — a ratio whose denominator isn't labeled.**
    **Decision: KEEP, no fix this pass.** Not incorrect, just under-labeled; a copy-only clarification is easy to add later and isn't a data-correctness issue. Noted for a future UI pass, not blocking this domain's rewrite.

20. **`TopPerformersWidget` excludes assets with exactly `roi === 0` from both Winners and Losers, not just from ranking prominently.**
    **Decision: KEEP.** A flat-performing asset genuinely belongs in neither list; treated as intentional, not a bug.

21. **`useCategoryVisibility`'s optimistic toggle has no rollback/error surfacing on a failed setting write; `TopBar`'s manual refresh silently swallows all errors.**
    **Decision: OUT OF SCOPE for this pass** — both concern the Settings/System domain's write path (`visible_categories`, `/system/refresh`), which is already Approved and merged (`settings-system.md`). Flagged here since both surfaces live in Assets/Transactions-adjacent components, but the fix belongs in a Settings/System revisit, not this domain's spec.

22. **`formatMoney` renders negatives as `"$-500"` rather than `"-$500"`, visible in `TopPerformersWidget`'s Losers list.**
    **Decision: OUT OF SCOPE for this pass** — `formatMoney` is a shared, cross-domain utility with an existing passing test pinning current behavior (`lib/utils.test.ts`); changing it is a cross-cutting formatting decision, not specific to this domain.

## Non-Goals
- No realized-P&L tracking. R2's cost-basis fix makes *unrealized* ROI more accurate after a partial sell, but the system still doesn't record or report gains/losses that were actually realized at the time of a sell — that would be a materially larger feature (a proper lot/tax-lot ledger), out of scope here.
- No change to `is_usd_denominated`'s category/ticker-shape heuristic, or to the fact that currency is inferred rather than stored explicitly per asset — unchanged, not revisited.
- No change to the Wallet provider's two-loop (update-only vs. create-only) split — existing, deliberate technical debt per root `CLAUDE.md`, not touched here.
- No authentication/authorization (standing project-wide non-goal).
- No multi-currency support beyond the existing USD/TWD inference — unchanged.
- `formatMoney`'s negative-number formatting and the Settings/System write-path error-handling gaps (Decision 21/22) are explicitly deferred, not fixed in this pass.

## Open Questions
None — all decisions above were either confirmed with the owner (1–4, via direct discussion) or made as low-risk, low-ambiguity engineering calls with stated rationale (5–22), consistent with how `settings-system.md`'s pilot decisions were recorded.
