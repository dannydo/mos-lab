# CC KPI Daily Sales — Local Optimization Benchmark

## Scope

- **User-visible flow:** CC KPI Daily Sales / Leaderboard report.
- **Source:** mOS API `CcKpiService.getCcDailySalesBonus`.
- **Out of scope:** Production rollout and Wings Control.
- **Goal:** interactive query p95 below 500 ms with identical response data.

## Change tested

The canonical semantics are unchanged. The five component queries now share the
same index-friendly eligible-order definition: completed orders are selected from
either the actual check-in date or, when that is absent, the booking date. Each
component query then joins that smaller set instead of repeating a broad,
non-sargable date predicate over `order` and `report_order`.

## Method

- Local Orb databases; 10 measured samples per case.
- Same API service and input window before and after.
- Response normalized by sorting rows by CC id, then hashing `{ data, summary }`.
- A candidate is valid only when row count and normalized response hash match.

| Window                  | Canonical p95 | Candidate p95 |                    Improvement | Rows | Parity           |
| ----------------------- | ------------: | ------------: | -----------------------------: | ---: | ---------------- |
| 3 days (Sep 9–11)       |   1,863.82 ms |      21.66 ms | 86.0× faster (98.8% less time) |    9 | Exact hash match |
| 30 days (Aug 13–Sep 11) |   1,702.67 ms |      65.78 ms | 25.9× faster (96.1% less time) |   97 | Exact hash match |

## Result

The candidate clears the interactive p95 target in both tested windows while
preserving the complete normalized API response exactly. The next safe step is
review, then guarded shadow rollout on Production; do not enable it directly.

## Verification

- API TypeScript typecheck: passed.
- API lint: passed with one existing unrelated warning in Experience Journal.
- `git diff --check`: passed.
