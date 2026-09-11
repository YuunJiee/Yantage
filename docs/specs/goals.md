# Goals Domain Spec

## Status
Approved — last reviewed 2026-09-11. Third domain in the spec-first + TDD rewrite process (see `../../CLAUDE.md`, `settings-system.md`, and `assets-transactions.md`).

## Purpose
User-defined financial targets tracked against the Assets/Transactions domain's live data: a **net-worth target** (reach $X) or an **asset-allocation target** (hold categories in roughly these proportions). Goals own no data of their own beyond the target definition — all progress/forecast math is a read-only comparison against current asset state, computed fresh on every request/render rather than stored.

## Domain Model

### Goal
| Field | Meaning |
|---|---|
| `id` | PK |
| `name` | Display name, required |
| `goal_type` | `NET_WORTH` \| `ASSET_ALLOCATION` (`GoalType` enum) |
| `target_amount` | TWD amount to reach, for `NET_WORTH` goals. For `ASSET_ALLOCATION` goals this is unused by any calculation — the frontend always sends `100`, a leftover from a schema that predates the two goal types diverging this much (see Decision 6) |
| `allocation_data` | JSON string `{category: percent}`, `ASSET_ALLOCATION`-only. `null` for `NET_WORTH` goals |
| `created_at` | Stamped on create |

**Removed in this pass**: `currency` (Decision 3 — always `"TWD"` in practice, no UI ever reads or sets it) and `description` (Decision 3 — no UI ever reads or sets it; historically it held pre-migration allocation data, see below, but that migration already completed).

**Validation added in this pass (Decision 7)**: `target_amount` must be `> 0` for `NET_WORTH` goals (previously unvalidated at any layer — `0` or negative values produced `Infinity`/`NaN` in the progress calculation). `allocation_data`, when present, must be valid JSON mapping category names to numbers summing to 100 ± 0.01 — this moves the existing frontend-only check (`GoalDialog`'s `isValid`) to also be enforced server-side, closing the gap where a goal in an invalid state was reachable via direct API use.

### Historical note
Migration `c85dd4dd1135` added `allocation_data` and copied any existing `ASSET_ALLOCATION` goal's `description` into it (pre-migration, `description` was overloaded to hold the allocation JSON). `GoalDialog`'s `parseAllocation` keeps a legacy fallback for a goal whose `allocation_data` is a bare category-name string rather than JSON — unchanged, low-risk, not revisited here (see Non-Goals).

## Business Rules

**R1 — Balance/progress model**: Goals store no computed state. `NET_WORTH` progress reads the live `net_worth` figure from the Assets/Transactions domain (`dashboard_service.calculate_dashboard_metrics`) on every render. `ASSET_ALLOCATION` progress sums current per-category asset value on every render, client-side.

**R2 (changed — Decision 1)**: `ASSET_ALLOCATION` progress's percentage denominator changes from "all assets including Liabilities, unsigned" to **positive assets only** (`POSITIVE_CATEGORIES` — everything except `Liabilities`), matching how "assets" is defined everywhere else that isn't specifically "net worth" (e.g. the dashboard's own category-percentage rows in `assets-transactions.md`). A `Liabilities` category cannot be added to an allocation goal through the UI (unchanged), so this only affects the denominator, not addable categories.

**R3 (changed — Decision 2)**: The forecast's `current_amount` (used internally to decide `Achieved`/`N/A`/normal prediction) switches from `get_net_worth_history`'s last snapshot to the same live `net_worth` figure `dashboard_service` computes — eliminating the staleness window where the forecast's completion state could disagree with the dashboard's own live progress bar (previously reachable: forecast says "Achieved" from a stale snapshot while the live progress bar, computed from current data, still shows incomplete). `growth_rate_6mo` keeps using the 6-month history window (that's the point of it — a trend, not a point-in-time value); only the "current position" side of the comparison changes.

**R4**: Only `NET_WORTH` goals get a forecast; `ASSET_ALLOCATION` goals are excluded from `/api/stats/forecast`'s response entirely (unchanged — there's no meaningful "forecast" for a proportion target the way there is for an amount target).

**R5 (changed)**: Forecast sentinel values are translated to zh-TW: `predicted_date` is `"已達成"` (was `"Achieved"`) when the target is already met, `"成長趨勢不明"` (was `"N/A (No Growth)"`) when 6-month growth is flat or negative, or a `"YYYY年M月"`-formatted date (was `strftime("%b %Y")`, e.g. `"Mar 2027"`) otherwise — closing the same class of zh-TW-violation bug fixed in `assets-transactions.md` Decision 11.

**R6 (changed — Decision 4)**: `goal_type` can no longer be changed on an existing goal. `PUT /api/goals/{id}` rejects (422) a request whose `goal_type` differs from the goal's current type; the frontend disables the type selector whenever editing an existing goal (it's only choosable at creation). Repurposing a goal from one type to the other now requires deleting and recreating it — this was previously possible through the same dropdown used at creation, silently discarding the goal's `target_amount` or `allocation_data` with no warning.

**R7**: `ASSET_ALLOCATION` progress percentage now goes through the same `getAssetDisplayValue()` helper (`assets-transactions.md` Decision 12) that every other per-asset value calculation in the app uses, instead of `GoalWidget`'s own `a.value_twd || 0` — closing the fourth divergent implementation the frontend inventory flagged (in today's data this produces the same numbers, since `value_twd` is never structurally `undefined`, but it removes a maintenance trap and matches the "one way to compute asset value" convention the prior domain established).

## API Contract
Full request/response schemas in `../API.md`; this spec calls out behavior not obvious from the shapes there:
- `PUT /api/goals/{id}` — 422 if the request's `goal_type` differs from the existing goal's `goal_type` (R6); 422 if `target_amount <= 0` for a `NET_WORTH` goal, or if `allocation_data` isn't valid JSON summing to 100 for an `ASSET_ALLOCATION` goal.
- `POST /api/goals/` — same `target_amount`/`allocation_data` validation as above.
- `GET /api/stats/forecast` — now has a `response_model` (new `schemas.ForecastResponse`/`schemas.GoalForecast`, see Decision 8) instead of returning a raw untyped `dict`; `predicted_date` values per R5.

## UI/UX Contract

**Create/edit goal** (`GoalDialog`) — goal-type selector is disabled when editing an existing goal (R6); a short caption explains why ("刪除後可重新建立不同類型的目標" or similar) so the disabled state doesn't look broken. `currency`/`description` fields, never surfaced, stay absent (Decision 3 removes them at the data layer too). `target_amount`'s validation now also rejects `0`/negative amounts client-side (matching the new backend rule), with the submit button disabled and no separate error copy needed (same pattern as the existing allocation-total check). Create/update/delete failures now show a toast (Decision, mirrors `assets-transactions.md` Decision 11) instead of failing completely silently — previously `useFormSubmit`'s `error` was captured but never rendered anywhere in this dialog.

**Goal progress** (`GoalWidget`) — `ASSET_ALLOCATION` percentages are no longer hidden under privacy mode; `NET_WORTH`'s progress percentage was never hidden, and per the Assets/Transactions frontend inventory, percentages generally aren't masked anywhere else in the app (only raw amounts are) — this domain's two goal types now agree with that convention instead of disagreeing with each other. Progress percentage gains a floor clamp (`Math.max(0, ...)`, in addition to the existing `Math.min(..., 100)`) so a negative net worth no longer renders a negative percentage.

**Forecast display** — unchanged mechanically (still only shown for `NET_WORTH` goals, still just the `predicted_date` line), but the string it shows is now always zh-TW (R5) and always consistent with the goal's own live progress state (R3), so the "預計 Achieved" / "預計 N/A (No Growth)" leak described in the frontend inventory can no longer occur.

## Known Inconsistencies — Explicit Decisions

1. **`ASSET_ALLOCATION` progress denominator includes Liabilities unsigned, unlike "net worth" everywhere else in the app.**
   **Decision: FIX.** Denominator becomes positive-assets-only (R2), consistent with the rest of the app's asset/net-worth vocabulary.

2. **Forecast's "current net worth" is a potentially-stale history snapshot, while the dashboard's own progress bar uses the live figure — the two can disagree on whether a goal is complete.**
   **Decision: FIX.** Forecast's current-position comparison switches to the live figure (R3); the growth-rate trend keeps using history (that's a legitimate, different use of history — a trend needs a window, a position doesn't).

3. **`Goal.currency`/`Goal.description` are modeled end-to-end but never surfaced by any UI, with no comment or plan indicating future use (unlike Settings/System's confirmed-planned-but-unbuilt keys).**
   **Decision: FIX — remove.** No signal these are planned; same treatment as Assets/Transactions Decision 7's dead-field removals.

4. **Editing an existing goal allows freely switching `goal_type`, silently discarding the other type's data (target amount or allocation) with no warning.**
   **Decision: FIX — block it.** `goal_type` becomes create-time-only; changing a goal's fundamental kind now requires delete + recreate, an explicit action rather than a side effect of an edit.

5. **`target_amount`/`allocation_data` have no validation anywhere (schema, repo, or backend business logic) — a `0`/negative target or a malformed/non-100%-summing allocation is only prevented by the frontend form, bypassable via direct API use, and produces `Infinity`/`NaN` in the progress display.**
   **Decision: FIX.** Add schema-level validation for both (see API Contract) — this is real financial-tracking data, not cosmetic, so worth enforcing at the boundary even though the project generally accepts "no runtime validation layer" as a tradeoff elsewhere (that tradeoff is about not building a parallel zod schema to mirror Pydantic — this is tightening the existing Pydantic schema itself, not adding a new layer).

6. **Backend forecast sentinel strings (`"Achieved"`, `"N/A (No Growth)"`) and the `strftime("%b %Y")` date format are untranslated English, reachable in the zh-TW-only UI.**
   **Decision: FIX** — translate (R5), same class of fix as `assets-transactions.md` Decision 11.

7. **No `GoalForecast`/`ForecastResponse` Pydantic schema exists; `/api/stats/forecast` has no `response_model`, unlike every other endpoint in this and adjacent domains — the shape is only documented as a hand-maintained TypeScript type that could silently drift.**
   **Decision: FIX** — add the schema, wire it as the endpoint's `response_model`.

8. **`GoalWidget`'s `ASSET_ALLOCATION` math computes asset value inline (`a.value_twd || 0`) instead of using the shared `getAssetDisplayValue()` helper `assets-transactions.md` Decision 12 established as the one way to do this.**
   **Decision: FIX** — use the shared helper (R7).

9. **`useForecast()`'s error/loading state is fetched but never surfaced by its only consumer (`GoalWidget`) — a forecast-fetch failure silently degrades to "no ETA shown," unlike the adjacent `useGoals()` error state, which does get a dedicated error UI.**
   **Decision: KEEP, no fix this pass.** The two aren't equivalent: a failed goals fetch means the whole widget has nothing true to show (worth an explicit retry affordance), while a failed forecast fetch just means one supplementary line is missing from an otherwise-correct goal card — graceful degradation, not a blocking error. Not worth a dedicated error UI for a single optional line.
10. **The `ASSET_ALLOCATION` legacy `parseAllocation` fallback (bare category-name string) and the goal-list's lack of `.order_by()` (nondeterministic card order, shared pattern with Budget/Income repos).**
    **Decision: KEEP, no fix this pass.** The legacy fallback is inert now that the data migration that necessitated it already ran; the ordering gap is a pre-existing, project-wide repository pattern (not goal-specific), out of scope for a single-domain pass.

## Non-Goals
- No realized-goal history/achievement log — a goal that's met just shows "已達成"; there's no record of *when* it was first met or a list of past-achieved goals.
- No multi-currency goals — `currency`'s removal (Decision 3) forecloses this for now; if it's ever wanted, it comes back as a real feature with actual UI, not a resurrected dead field.
- No change to `get_net_worth_history`'s fast/slow-path selection or its own historical-accuracy tradeoffs (Yahoo Finance lookups, snapshot skip-on-zero) — those are Assets/Transactions-domain-owned and already specified there.
- No change to the legacy `parseAllocation` string-fallback or goal list ordering (Decision 10).

## Open Questions
None — decisions 1, 2, 3, 4 above were confirmed with the owner directly; the rest are low-risk engineering calls with stated rationale, consistent with how the prior two domains' decisions were recorded.
