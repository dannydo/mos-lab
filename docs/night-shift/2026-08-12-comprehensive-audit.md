# Night Shift Comprehensive Audit — 2026-08-12

## Scope and safety boundary

- Branch: `night-shift/2026-08-12`
- Base: `main` / `origin/main` at `518be4e83ab459d6598fcdaeb5461e818fdb68b4`
- Modules audited: Customers, KPI/CC/CV, OmiCall/AI, Today UI, Catalog, shared/API contracts
- Only changes with a reproducible test, bundle measurement, or directly provable invariant were implemented.
- No deployment, production write, financial reconciliation, or unapproved role-policy change was performed.

## Implemented and verified

### Frontend performance audit carried into Night Shift

The pre-existing `codex/frontend-perf-audit` work was saved as the required Night Shift preparation commit before the branch switch. It defers the full Lucide/Ant Design icon registries and stabilizes Dashboard/KPI effects.

- Customers production route JS: 2,564,488 B → 1,527,400 B raw (`-40.4%`); 706,260 B → 480,396 B gzip (`-32.0%`).
- Customers/Dashboard browser JS transfer: 1,222,180 B → 948,866 B (`-22.4%`).
- KPI browser JS transfer: 1,070,105 B → 837,998 B (`-21.7%`).
- Initial API calls: Dashboard/Customers 17 → 15; KPI 15 → 10. Measured duplicate endpoints: 2/5 → 0.
- Full metrics and Lighthouse evidence: `docs/frontend-performance-audit-2026-08-12.md`.

### KPI productivity ranking

- Replaced earnings/check-in-dependent Telesales ordering with the business invariant `totalBooked DESC`, with deterministic check-in/name/id tie-breakers.
- Added a pure sorter and two regression tests, including a high-earner with zero bookings.
- No KPI amounts, salary, permissions, or source data were changed.

### FAL `Replace` recognition

- Added one source of truth for `Fix`, `Adjust`, `Log`, and `Replace` across CC/CV reporting classifiers.
- Added five precedence/classification tests covering all four rules.
- No bonus, cash, points, level, or fallback formula was changed.

### OmiCall analyzer concurrency

- Pending analysis jobs are now claimed atomically with a conditional `updateMany` transition to `PROCESSING`.
- Three competing workers now produce exactly one successful claimant in the concurrency fixture.
- A failed claim no longer consumes a retry or invokes Gemini.

### Customers render/timer stability

- Removed whole custom-hook objects from the affected dependency graph and retained only stable setters/values.
- Assignment history now refreshes its expiry reference time on open and once per minute, and clears debounce/interval timers on close/unmount.
- Added two fake-timer regression tests.

### Today deferred alternate view

- `TodayCalendarSummary` is dynamically loaded only after switching to Calendar Summary.
- `BookerTeamConfigModal` is dynamically loaded and only mounted while visible.
- Today initial route manifest: 1,645,643 B → 1,588,376 B raw (`-57,267 B`, `-3.48%`); 508,908 B → 495,958 B gzip (`-12,950 B`, `-2.54%`).
- Browser QA covered Operations → Calendar Summary → Booker configuration modal without saving; 0 console errors.

## Verification result

- Workspace Night Shift runner: passed in 29 seconds.
  - Lint: 4/4 packages passed.
  - Shared build: passed.
  - Next.js production build: passed compile, type validation, and 29 generated routes.
- API TypeScript: passed with `tsc --noEmit`.
- New API regression suite: 8/8 passed (5 FAL, 2 ranking, 1 atomic claim).
- Frontend tests: 30/31 passed. Baseline was 28/29; the same pre-existing QA Shop test remains the only failure.
- Browser QA: Today, KPI, and Customers rendered authenticated live local data with 0 console errors.
- Local services restored after build: Web `:4000`, API `:4001`, Ads portal `:8000`; existing WingsApp `:3000` and legacy `:80` were left intact.

## Residual findings, ordered by risk

### P0 — requires explicit policy or data reconciliation

1. **OmiCall recording authorization:** `/omicall/logs` accepts an arbitrary `staffId`, and `/omicall/logs/:id/play` fetches by ID with authentication only. A normal user may be able to enumerate another employee's recording/transcript. Define the allowed roles and ownership rule, then add list/play authorization tests before changing behavior.
2. **Unified Combo Recognition drift:** the current query does not require `user_service_balance` and falls back to `order.date_created`, contrary to the completed/check-in recognition invariant. Reconcile sample order IDs against legacy/WingsLashes before correcting the shared service.
3. **CC leaderboard financial/date drift:** the query ignores `storeId` in both SQL and cache key, derives CC ownership through nullable/fallback fields, and uses `booking_date_start`/`staff_bonus.date_created`. This must be reconciled to accounting fixtures before any change.
4. **Catalog over-fetch:** every service/product search fetches services, combos, and products at up to 1,000 rows each. Measure the active tab and implement debounced, active-tab-scoped requests with preserved summary counts.

### P1 — bounded cleanup candidates

1. **Misleading OmiCall diagnostic:** `isTestMode = true` always reports PBX 480/simulation fallback without a real SIP probe. Replace only when a real adapter and capture fixtures are available.
2. **Dead retention control:** Customers allocation UI lets an operator choose 1–365 days, but `durationDays` is not sent in the batch payload. Product must decide whether to remove the control or make retention configurable at the allocation contract.
3. **OmiCall API contract drift:** UI sends direction/analysis status filters that the active backend route does not apply; SDK typing is still loose. Align shared DTO, SDK, route parsing, and tests together.
4. **CSV importer correctness:** OmiCall Excel/CSV import uses comma splitting, without quoted-field handling, schema validation, or dry-run. Use a real CSV parser and failure report before expanding imports.
5. **Catalog light theme:** Combo Live cards contain hard-coded dark surfaces. Fix with theme tokens and validate both themes in the browser.

### P2 — cleanup after route smoke coverage

1. Five unregistered route snapshots total about 5,879 LOC (`customer-base`, `booking`, `assignment`, `filter`, and `kpi-data`). No active imports/callers were found, but deletion should wait for API route registration/smoke coverage.
2. The QA Shop empirical test still cannot observe the FAIL-note input. An attempted mock/deprecation cleanup was rolled back because it did not make the assertion pass; no partial fix was kept.
3. Dev-mode Today QA showed repeated live-data requests around view changes/auto-refresh. Production tracing or repeated profiling is needed before attributing them to a duplicate effect.

## Commits on the branch

- `19aa548 chore(prep): save WIP changes before starting Night Shift`
- `cb4753c fix(kpi): rank telesales by booked productivity`
- `460aaf5 fix(kpi): recognize Replace across FAL reports`
- `7882ef6 fix(omicall): claim analysis jobs atomically`
- `6c628ae fix(customers): stabilize selection and expiry timers`
- `d78d177 perf(today): defer alternate calendar view`

## Recommended next approval batch

1. Decide OmiCall recording visibility for `admin`, `manager`, `qa/qc`, and normal staff, then implement ownership checks first.
2. Reconcile Combo Recognition and CC leaderboard against named legacy orders/accounting totals before changing SQL.
3. Fix Catalog over-fetch with per-tab measurements and browser QA.
4. Repair the single QA Shop test harness so the full frontend suite becomes green.

No commit was merged, pushed, or deployed from this branch.
