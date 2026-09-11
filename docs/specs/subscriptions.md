# Subscriptions Domain Spec

## Status
Approved — last reviewed 2026-09-11. Fifth and final domain in the spec-first + TDD rewrite process (see `../../CLAUDE.md`, `settings-system.md`, `assets-transactions.md`, `goals.md`, and `budgets-income.md`).

## Purpose
Split-billing for recurring shared subscriptions (e.g. a streaming plan shared with roommates): a `Subscription` defines a monthly cost divided into shares, `SubscriptionMember`s are the people who owe the owner money (never including the owner's own share), and each `CollectionCycle` is one manually-created billing round producing one `CyclePayment` per current member. There is no automation — no scheduler, no due dates, no reminders; every cycle is created by hand.

This domain had the weakest error handling of any domain in this rewrite series (every mutation handler in `SubscriptionCard.tsx` had no `try/catch` at all) and a genuine amount-semantics ambiguity between backend and frontend — both addressed below.

## Domain Model

### Subscription
| Field | Meaning |
|---|---|
| `id` | PK |
| `name` | Required, editable any time |
| `total_cost` | **Monthly** TWD cost covering all shares combined (Decision 1 — resolves a real backend/frontend disagreement; the model's comment previously said "per collection cycle," contradicting the frontend's always-multiply-by-period behavior). Editable any time; changes apply only to cycles created after the change (R2) |
| `total_shares` | Total number of shares the cost is split into. **Immutable after creation** (Decision 3) |
| `my_shares` | The owner's own share count, excluded from `SubscriptionMember` billing. **Immutable after creation** |
| `collection_period_months` | How many months one cycle covers (default 6). **Immutable after creation** |
| `created_at` | Stamped on create |

Per-share monthly rate is `total_cost / total_shares`; a full cycle charges `(total_cost / total_shares) * collection_period_months` per share, applied uniformly to every member (equal-per-share split, not custom-per-member — unchanged, this is the domain's fundamental shape).

### SubscriptionMember
| Field | Meaning |
|---|---|
| `id` | PK |
| `subscription_id` | FK |
| `name` | Required. **Now renamable** (Decision 4 — was previously add/delete only; a typo forced a destructive delete-and-recreate that cascaded away that member's entire payment history) |

### CollectionCycle
| Field | Meaning |
|---|---|
| `id` | PK |
| `subscription_id` | FK |
| `cycle_start` | `YYYY-MM-DD` |
| `note` | Optional |
| `created_at` | Stamped on create |

Immutable after creation (unchanged) — no `Update` schema/endpoint. On creation, one `CyclePayment` is auto-created per **current** `SubscriptionMember` (unchanged business rule, see R2).

### CyclePayment
| Field | Meaning |
|---|---|
| `id` | PK |
| `cycle_id` / `member_id` | FKs |
| `amount` | **New field (Decision 2).** The per-member charge for this specific cycle, computed once from the subscription's fields at the moment the cycle was created, then frozen. Editing the subscription's `total_cost` afterward never changes an already-created cycle's payments |
| `paid_at` | `null` = unpaid; a date string = paid. The entire status model — no separate status enum |

**Removed in this pass**: `note` (Decision 7 — schema'd and API-reachable via `PATCH`, but no UI anywhere ever read, displayed, or set it; same class of dead field as `Goal.currency`/`description` in `goals.md` Decision 3, and `BudgetCategory`/`IncomeItem.is_active` in `budgets-income.md` Decision 2).

## Business Rules

**R1 (Decision 1 — clarified, not changed in effect)**: `total_cost` is a monthly figure. `perMemberAmount = (total_cost / total_shares) * collection_period_months`, `0` if `total_shares` is `0`. This was already the frontend's actual behavior; this pass fixes the backend model comment that contradicted it and makes the semantics explicit in the spec so it can't drift again.

**R2 (changed — Decision 2)**: `SubscriptionService.create_cycle` now computes `perMemberAmount` from the subscription's *current* fields once, at cycle-creation time, and stores it on every `CyclePayment` row it creates for that cycle. Editing `total_cost` afterward only affects cycles created *after* the edit — every existing cycle, paid or unpaid, keeps the amount it was actually billed at. This closes the retroactive-amount-drift gap the inventory found (editing the subscription used to silently change what every past cycle displayed as owed).

**R3 (changed — Decision 3)**: `total_shares`, `my_shares`, and `collection_period_months` can no longer be changed after creation. `PUT /api/subscriptions/{id}` rejects (422) a request whose value for any of these three differs from the subscription's current value — mirroring `goals.md` R6's `goal_type`-immutability guard exactly. `name` and `total_cost` remain freely editable. Since these three were already not editable through any UI (only reachable via direct `PUT`), this closes a real gap rather than removing a working feature: the split structure could previously be changed via direct API with zero validation against member count, silently invalidating the "one member = one implied share" assumption the create form enforces.

**R4 (changed — Decision 4)**: A member can now be renamed via `PUT /api/subscriptions/members/{id}` (new `SubscriptionMemberUpdate{name}` schema/endpoint) and an inline rename control in `SubscriptionCard`'s edit mode. Existing `CyclePayment` rows referencing that member are unaffected (the FK doesn't change, only the member's `name`).

**R5 (changed)**: Deleting a member requires confirmation via the shared `ConfirmDelete` component with explicit copy stating the scope — deleting a member permanently deletes every payment record tied to them, across every cycle, past and present (the cascade was already this destructive; it previously had zero confirmation of any kind, unlike subscription/cycle deletion which already used `ConfirmDelete`). Matches the `assets-transactions.md` Decision 4 precedent for cascade-scope warnings.

**R6 (changed — Decision "validation")**: `total_cost >= 0`, `total_shares >= 1`, `my_shares >= 1`, and `my_shares <= total_shares` are now enforced at the schema layer (`SubscriptionCreate`; `SubscriptionUpdate` keeps the same `Field` constraints for type-safety even though R3 blocks the latter two from actually changing). Previously none of `Subscription`'s numeric fields had any constraint — reachable only via direct API, but genuinely unvalidated, the same class of gap `goals.md` Decision 5 and `budgets-income.md` Decision 4 already closed for their own domains.

**R7**: No invariant is enforced between `total_shares` and the actual `SubscriptionMember` count after creation — members can still be freely added or removed, and the per-share amount keeps dividing by the original `total_shares`. This is deliberately kept (see Non-Goals) — shares represent an agreed split independent of headcount at any given moment (e.g. a share can go uncollected if that person left, without renegotiating everyone else's rate).

**R8**: `total_shares`/`my_shares` are now surfaced in `SubscriptionCard`'s summary (e.g. "共 4 份 · 我負責 1 份") — previously write-only after creation (stored but never displayed anywhere once the create dialog closed).

## API Contract
Full request/response schemas in `../API.md`; this spec calls out behavior not obvious from the shapes there:
- `POST /api/subscriptions/` — 422 if `total_cost < 0`, `total_shares < 1`, `my_shares < 1`, or `my_shares > total_shares` (R6).
- `PUT /api/subscriptions/{id}` — 422 if it attempts to change `total_shares`/`my_shares`/`collection_period_months` (R3); same numeric validation as create applies to any field it does update.
- `PUT /api/subscriptions/members/{id}` — new endpoint (R4).
- `POST /api/subscriptions/{id}/cycles` — response payments now include `amount` (R2).
- `PATCH /api/subscriptions/payments/{id}` — no longer accepts `note` (removed, see Domain Model).

## UI/UX Contract

**Error handling (Decision — matches every prior domain's precedent)** — every mutation in this domain now surfaces failure via toast: `SubscriptionCard`'s six handlers (delete subscription, save edit, add member, delete member, rename member, toggle payment, delete cycle) all gain `try/catch` (previously **none** had any — the worst gap found across all five domains in this series), and `NewCycleDialog`'s existing `finally`-without-`catch` gains a `catch`. Two concrete stuck-UI bugs this fixes: a failed add-member request used to leave the add button permanently disabled (no `finally` to reset it); a failed inline edit-save used to leave the edit form stuck open with no feedback.

**Cancel-edit state reset** — `SubscriptionCard`'s inline name/cost edit draft now resyncs from the subscription's actual current values whenever editing is (re-)entered, instead of persisting a stale abandoned draft from a previous cancelled edit session (confirmed bug: the local edit-state was never resynced from props).

**Payment toggle race guard** — the paid/unpaid toggle now disables itself while its request is in flight, closing a double-click race where two rapid clicks (intended as toggle-on-then-off) could both read the same stale `paid_at` value from a closure and send the same target state instead of netting out correctly.

**Privacy mode & formatting** — all amounts in this domain (`total_cost`, the per-share rate, per-payment amounts) now go through `usePrivateMoney()`/`formatMoney()` like every other domain, instead of a hand-rolled `` `NT$${Math.round(x).toLocaleString()}` `` with no privacy-mode masking at all — this was the one domain where privacy mode had zero effect.

**Delete confirmations get a loading state** — `ConfirmDelete`'s `loading` prop, previously omitted for subscription-delete and cycle-delete (member-delete didn't even have a confirm step, see R5), is now wired through everywhere, preventing a double-click double-delete window.

**Payment display order** — payments within an expanded cycle are now sorted by member name client-side (previously unsorted, in whatever order the DB happened to return).

## Known Inconsistencies — Explicit Decisions

1. **`total_cost`'s meaning disagreed between the backend model comment ("per cycle total") and the frontend's actual behavior (treats it as monthly, multiplies by `collection_period_months`).**
   **Decision: the frontend's behavior is correct — monthly.** Confirmed with the owner. Fixed the backend comment; no behavior change, since the frontend was already the one place users actually interact with this number.

2. **No cycle/payment amount is ever persisted — every display recomputes from the subscription's current fields, so editing the subscription retroactively changes what past (including fully-paid) cycles show as owed.**
   **Decision: FIX — pin the amount at cycle-creation time** (R2). Confirmed with the owner: historical billing records should reflect what was actually charged at the time, not silently drift with later edits.

3. **`total_shares`/`my_shares`/`collection_period_months` have no UI to edit post-creation, but the `PUT` endpoint has always silently accepted changes to them with zero validation against the actual member list.**
   **Decision: FIX — lock them server-side, matching current UI reality**, rather than building edit UI for them. Confirmed with the owner. Mirrors `goals.md` R6's identical "this compound structure is create-time-only; to truly change it, delete and recreate" precedent.

4. **A member can only be added or deleted, never renamed — a typo forces a destructive delete+recreate that cascades away all of that member's payment history.**
   **Decision: FIX — add rename.** Confirmed with the owner; the alternative (accepting the data loss as the cost of fixing a typo) was clearly worse than adding a small, well-scoped mutation.

5. **Deleting a member cascades to delete their entire cross-cycle payment history with zero confirmation of any kind — the only undconfirmed destructive action in this domain (subscription/cycle delete both already used `ConfirmDelete`).**
   **Decision: FIX — add confirmation with explicit cascade-scope copy**, matching `assets-transactions.md` Decision 4.

6. **`Subscription`'s numeric fields (`total_cost`, `total_shares`, `my_shares`) have no validation anywhere — negative cost, zero/negative shares, or `my_shares > total_shares` are all reachable via direct API use (the create form validates client-side only).**
   **Decision: FIX**, per the same pattern `goals.md` Decision 5 and `budgets-income.md` Decision 4 already established for their domains.

7. **`CyclePayment.note` is modeled and API-reachable (`PATCH`) but has no UI anywhere — never displayed, never settable through normal use.**
   **Decision: FIX — remove.** No comment or plan indicates future use; same treatment as the dead fields removed in `goals.md` Decision 3 and `budgets-income.md` Decision 2.

8. **No `try/catch` anywhere in `SubscriptionCard.tsx`'s six mutation handlers; `NewCycleDialog` has a `finally` but no `catch`; `NewSubscriptionDialog` shows errors inline instead of via toast.**
   **Decision: FIX — toast everywhere**, per the established precedent in every prior domain of this series.

9. **Privacy mode has zero effect on any amount in this domain; amounts are formatted ad hoc instead of via the shared `formatMoney()`.**
   **Decision: FIX**, for consistency with every other domain.

10. **No invariant enforced between `total_shares` and actual `SubscriptionMember` count after creation.**
    **Decision: KEEP, not a bug.** A share can legitimately go uncollected (e.g. a member left) without forcing a renegotiation of everyone else's rate — the split is against an agreed share count, not a live headcount. See Non-Goals.

11. **`total_shares`/`my_shares` are stored but never displayed anywhere once the create dialog closes.**
    **Decision: FIX — surface them** in the subscription summary (R8). Cheap, closes a write-only-field gap, consistent with not leaving user-entered data invisible.

12. **Cycles/payments have no `.order_by()` at the repository layer (cycles are re-sorted client-side already; payments aren't sorted at all, server or client).**
    **Decision: FIX payment ordering only (client-side, by member name)**; leave the repository-layer gap itself unfixed — same pre-existing, project-wide `CrudRepository`/raw-repo ordering gap `budgets-income.md` Decision 13 already found and explicitly left for a future cross-cutting pass, not a single-domain fix.

## Non-Goals
- No recurring/automated cycle creation, due dates, overdue detection, or reminders — every cycle is still created manually; this domain's whole shape (a manual ledger, not a billing engine) is unchanged.
- No custom per-member split (still equal-per-share) — a materially larger feature, not attempted here.
- No enforcement that member count matches `total_shares - my_shares` after creation (Decision 10) — deliberately flexible.
- No backfill/reconstruction of *true* historical amounts for cycles created before this pass — the migration backfills `CyclePayment.amount` for existing rows using each subscription's *current* fields at migration time (the best available approximation, since the true historical `total_cost` at each past cycle's creation was never recorded). This is a one-time, best-effort backfill, not a guarantee of historical accuracy for pre-existing data.
- No change to the project-wide repository-ordering gap (Decision 12) or the nullable=False drift between fresh-install and migrated schemas (both pre-existing, documented technical debt, out of scope for a single-domain pass).

## Open Questions
None — Decisions 1–4 above (and the confirmation policy in Decision 5) were confirmed with the owner directly; the rest are low-risk engineering calls with stated rationale, consistent with how the prior four domains' decisions were recorded.
