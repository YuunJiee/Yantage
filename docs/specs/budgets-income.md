# Budgets & Income Domain Spec

## Status
Approved — last reviewed 2026-09-11. Fourth domain in the spec-first + TDD rewrite process (see `../../CLAUDE.md`, `settings-system.md`, `assets-transactions.md`, and `goals.md`).

## Purpose
Two tightly-coupled, low-traffic subsystems that together form the "本月差額" (monthly budget) page (`app/budget/page.tsx`, reached via Settings gear):

- **Budgets** is a set of user-defined monthly spending targets (`BudgetCategory`), grouped into five fixed macro-groups (Fixed/Living/Investment/Growth/Unassigned) for reporting.
- **Income** is a flat list of expected monthly income line items (`IncomeItem`).

Bundled into one spec because Income has no independent UI surface anywhere else in the app — `IncomeItemDialog` exists solely to feed this page's numbers — matching the precedent `settings-system.md` set for bundling two small, mutually-dependent subsystems into a single pass.

**Critical framing, easy to miss from the names alone: this domain does no actual-spending or actual-income tracking.** There is no relationship between `BudgetCategory`/`IncomeItem` and `Transaction` anywhere in the schema. Every figure this page shows — 總收入, 總預算, 差額, 投資佔比 — is a comparison between two sets of user-entered *plans* (income items vs. budget categories), never against real transaction history. The one exception is 緊急預備金 (emergency fund), which does read real data — current liquid `Asset` balances from the Assets/Transactions domain — compared against a *planned* monthly survival cost derived from budget categories.

## Domain Model

### BudgetCategory
| Field | Meaning |
|---|---|
| `id` | PK |
| `name` | Required |
| `icon` | Optional lucide icon name (not emoji — the model comment calling it `# Emoji` was stale/wrong, fixed in this pass) |
| `budget_amount` | Monthly TWD target |
| `color` | One of 8 fixed swatch names (`COLOR_OPTIONS`); unrecognized values fall back to the first swatch cosmetically — this is a harmless, already-graceful fallback, unlike `group_name` below, so it stays unvalidated (see Decision 5) |
| `note` | Optional |
| `group_name` | One of `BudgetGroup` (`Fixed`/`Living`/`Investment`/`Growth`/`Unassigned`) |
| `created_at` | Stamped on create |

**Removed in this pass**: `is_active` (Decision 2 — a soft-delete flag the frontend has never once set to `False`; the app's actual delete has always been the hard `DELETE` endpoint).

### IncomeItem
| Field | Meaning |
|---|---|
| `id` | PK |
| `name` | Required |
| `amount` | Expected monthly TWD income |
| `created_at` | Stamped on create |

**Removed in this pass**: `is_active` (same rationale as above).

**Validation added in this pass (Decision 4)**: `budget_amount`/`amount` must be `>= 0` (rejects negative; `0` stays valid — unlike `Goal.target_amount`, a `0` budget/income line doesn't produce a division error anywhere downstream, and a user plausibly wants a `$0` placeholder category before filling in a real number later). `group_name`, when provided, must be a `BudgetGroup` enum value (new — see Decision 5); omitted defaults to `Unassigned`, matching current frontend behavior.

## Business Rules

**R1 — No actual-spending comparison.** `computeTotalBudget`/`computeTotalIncome`/deficit/investment-ratio are pure sums over user-entered targets, computed fresh on every render, never persisted, never compared to `Transaction` data. Unchanged — this is the domain's fundamental (and, per the discussion that produced this spec, intentional) shape, not a gap to fix.

**R2**: 差額 (deficit) = `totalIncome - totalBudget`. Status thresholds: `> 0` → 安全, `> -5,000` → 小赤字, else → 大赤字. The `5,000` threshold, along with the `20%` "healthy investment ratio" threshold and the emergency fund's `3`-month multiplier, move from inline magic numbers into named constants in `components/budget/constants.ts` (Decision 8) — no behavior change, just naming the numbers so the spec (and any future reader) can point at them.

**R3 (changed — Decision 6)**: 緊急預備金's liquid-asset total now (a) uses the shared `getAssetDisplayValue()` helper instead of a raw `value_twd || 0` read, and (b) excludes assets with `include_in_net_worth === false`, matching how every other net-worth-adjacent figure in the app already treats that flag. `survivalMonthlyCost` (sum of `Fixed`+`Living` group budgets × 3) is unchanged.

**R4 (changed — Decision 5)**: `group_name` is now a validated enum (`BudgetGroup`) at the schema layer. Previously a category with an out-of-vocabulary `group_name` (only reachable via direct API — the UI form only ever writes one of the five) would vanish from every group section in the UI while still counting toward `totalBudget`, an observable total/display mismatch. Since the value is now rejected at creation/update time instead, that state can no longer be produced going forward.

**R5**: Deleting a `BudgetCategory` or `IncomeItem` is a hard delete (unchanged — this was already the only delete path any UI ever exercised; Decision 2 just removes the parallel, unused soft-delete machinery that sat alongside it).

**R6**: `budget_start_day` (owned by Settings) remains unconsumed by this domain — see Non-Goals.

## API Contract
Full request/response schemas in `../API.md`; this spec calls out behavior not obvious from the shapes there:
- `POST/PUT /api/budgets/categories` — 422 if `budget_amount < 0` or `group_name` isn't a valid `BudgetGroup` value (both new, Decision 4/5).
- `POST/PUT /api/income/items` — 422 if `amount < 0` (new, Decision 4).
- `is_active` is no longer part of any Budget/Income request or response shape (Decision 2).
- No endpoints change shape or path beyond the schema tightening above.

## UI/UX Contract

**Error handling** (Decision 7) — every mutation in this domain now surfaces failure via the shared toast pattern (`useToast`), closing the two worst gaps found in this domain: budget-category create/update previously only `console.error`'d, and budget-category delete had no `try/catch` at all (an unhandled rejection on failure); the income-item dialog already captured an `error` value via `useFormSubmit` but never rendered it. This matches the standard already established in `assets-transactions.md` Decision 11 and `goals.md`'s equivalent fix.

**Combined loading/error gating** (Decision 9) — the page's skeleton/error state now considers all three of `useBudgetCategories()`, `useIncomeItems()`, and `useDashboard()` (the last for the emergency-fund calc), instead of only the first. Previously, a failed or slow income/dashboard fetch was invisible — the page would render as if the user had `$0` income or no liquid assets, with no error indication, while only a budget-categories failure got the dedicated `PageError`/retry treatment.

**Icon fallback consistency** (Decision 10) — a saved category with no chosen icon now renders the same fallback (the `ShoppingBag` icon) in both the form's picker button and the category card list; previously the picker previewed `ShoppingBag` while an unset saved category actually rendered a hardcoded `📦` emoji in the list — two different "no icon" glyphs for the same state.

**File organization** (Decision 11) — `IncomeItemDialog.tsx` moves from `components/views/` (the Assets domain's documented sub-component folder per `CLAUDE.md`) to `components/budget/IncomeItemDialog.tsx`, alongside the rest of this domain's components. No behavior change.

## Known Inconsistencies — Explicit Decisions

1. **Income has no independent domain surface — folded into this spec rather than deferred.**
   **Decision: FOLD IN.** Confirmed with the owner — splitting Budget/Income into two rewrite passes would mean revisiting the same file twice for no benefit, since Income has no UI or business logic outside this page.

2. **`is_active` is modeled/schema'd/DB-backed on both `BudgetCategory` and `IncomeItem`, filtered-on-read, but no code path anywhere (frontend or otherwise) has ever set it to `False` — the app's real delete has always been the hard `DELETE` endpoint running alongside it.**
   **Decision: FIX — remove `is_active` entirely.** Confirmed with the owner. This also resolves a latent base-class bug for free: `CrudRepository.update()`/`delete()` query by ID directly, bypassing `_base_query()` (and therefore the `is_active` filter) that `get()`/`list_all()` respect — with the column gone, there's no filter left to inconsistently bypass.

3. **`budget_start_day` (Settings) has no consumer anywhere in this domain — no "current month" concept exists; all categories/income items are always shown, unscoped by time.**
   **Decision: KEEP, Non-Goal for this pass.** Confirmed with the owner — implementing real month-cycle scoping is a genuine new feature (not a bug fix) and would substantially widen this pass's scope. Treated the same way `settings-system.md` treated its own confirmed-unused settings keys: documented as intentionally unbuilt, not dead code to clean up.

4. **`budget_amount`/`amount` have no validation anywhere — negative values are reachable end-to-end (the shared `MoneyInput` component explicitly allows a leading `-`), silently distorting every derived figure with no error surfaced.**
   **Decision: FIX — reject negative values (`>= 0`) at the schema layer.** Unlike `Goal.target_amount` (which required strictly `> 0` because a `0` target causes a division error), `0` stays valid here — nothing downstream divides by an individual category's or income item's amount, and a `$0` placeholder is a reasonable interim state while planning a budget.

5. **`group_name` is an unvalidated free string; an out-of-vocabulary value is reachable via direct API use and makes a category vanish from every grouped UI section while still counting toward the total.**
   **Decision: FIX — promote to a validated `BudgetGroup` enum** (`constants.py`, mirroring `AssetCategory`/`Provider`/`GoalType`), matching the five values the UI form has always been limited to. `color`'s similarly-unvalidated-but-harmless fallback is explicitly left alone (see Domain Model) — the two aren't symmetric: an unrecognized `color` degrades gracefully to a default swatch, an unrecognized `group_name` makes data disappear from view.

6. **緊急預備金's liquid-asset sum uses a raw `value_twd || 0` read (not the shared `getAssetDisplayValue()` helper) and doesn't respect `include_in_net_worth`.**
   **Decision: FIX.** This is the fourth divergent asset-value calculation `assets-transactions.md` Decision 12 and `goals.md` Decision 8 already unified elsewhere — same treatment here. Respecting `include_in_net_worth` matches every other net-worth-adjacent figure in the app; an asset the user has explicitly excluded from net worth shouldn't silently still count toward "how many months could I survive on my liquid assets."

7. **Budget-category create/update failures are silent (`console.error` only); delete has no `try/catch` at all (unhandled rejection on failure); the income-item dialog captures a `useFormSubmit` error but never renders it.**
   **Decision: FIX — toast everywhere**, per the established `assets-transactions.md`/`goals.md` precedent.

8. **The `5,000` deficit threshold, `20%` investment-ratio threshold, and `3`-month emergency-fund multiplier are inline magic numbers.**
   **Decision: FIX — name them as constants.** No behavior change, just makes the numbers legible and gives future changes one place to look.

9. **Only `useBudgetCategories()`'s loading/error state gates the page; `useIncomeItems()`/`useDashboard()` failures are invisible (numbers just silently read as `0`/empty).**
   **Decision: FIX — combine all three.**

10. **A category saved without an explicitly-chosen icon shows a different fallback glyph in the form (lucide `ShoppingBag`, preview-only) than in the saved list (`📦` emoji, actually rendered).**
    **Decision: FIX — use the same fallback in both places.**

11. **`IncomeItemDialog.tsx` is filed under `components/views/`, the Assets domain's documented sub-component folder, despite belonging to Budgets/Income.**
    **Decision: FIX — move to `components/budget/`.**

12. **`BudgetRepository`/`IncomeRepository`'s `list_all()` overrides are no-ops that just call `super().list_all(...)`.**
    **Decision: KEEP.** Explicitly documented as intentional in `repositories/base.py`'s own docstring — mirrors `GoalRepository`'s shape even when a given subclass has nothing extra to add. Not revisited here.

13. **Neither repo's `list_all()` has an `.order_by()` — card/list order is DB-insertion-order, not guaranteed.**
    **Decision: KEEP, no fix this pass.** Same pre-existing, project-wide `CrudRepository` gap `goals.md` Decision 10 already found and explicitly left unfixed for this exact reason (not domain-specific, out of scope for a single-domain pass).

## Non-Goals
- No month-cycle/period scoping (`budget_start_day` stays unconsumed — Decision 3).
- No actual-spending tracking or budget-vs-actual comparison — R1 is this domain's deliberate shape, not a gap; connecting budgets to real `Transaction` data would be a materially larger feature (essentially a category-tagged expense ledger), not in scope here.
- No change to the Settings-owned `emergency_fund_*` keys' unused status — already decided in `settings-system.md` Decision 3 (confirmed planned-but-unbuilt), not revisited.
- No single-item `GET /api/budgets/categories/{id}` or `GET /api/income/items/{id}` endpoint — nothing needs it; not added speculatively.
- `color`'s lack of validation (see Decision 5's contrast) is deliberate, not an oversight left unaddressed.

## Open Questions
None — Decisions 1–3 above were confirmed with the owner directly; the rest are low-risk engineering calls with stated rationale, consistent with how the prior three domains' decisions were recorded.
