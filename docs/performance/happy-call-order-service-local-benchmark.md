# Happy Call Order Service — Local Optimization Benchmark

## Scope

- **User-visible flow:** Happy Call daily task generation.
- **Source:** mOS API `HappyCallService.generateDailyTasks`.
- **Out of scope:** Production rollout and Wings Control.
- **Goal:** interactive task-generation query p95 below 500 ms with identical order and staff assignments.

## Change tested

The original `COALESCE(actual_booking_date_start, booking_date_start)` predicate
prevents the database from narrowing the date range efficiently. The candidate
splits the equivalent rule into two mutually exclusive, index-friendly branches:

1. orders with an actual booking date inside the 14-day window;
2. orders without an actual booking date whose booking date is inside the window.

The existing `LIMIT 1` staff lookups are deliberately unchanged, preserving the
current Happy Call assignment semantics.

## Method

- Local Orb legacy database; 10 measured samples per case after warm-up.
- Same rolling 14-day window, query shape, and order of results.
- Complete result rows normalized for Prisma numeric types and hashed.
- A candidate is valid only when row count and result hash match.

| Window          | Canonical p95 | Candidate p95 |                    Improvement | Rows | Parity           |
| --------------- | ------------: | ------------: | -----------------------------: | ---: | ---------------- |
| Rolling 14 days |   1,266.96 ms |      17.09 ms | 74.1× faster (98.7% less time) |  568 | Exact hash match |

## Result

The candidate clears the interactive p95 target while preserving every result
row and current staff-assignment behavior. The source rewrite has passed API
typecheck, lint, and diff validation. The next step is a guarded Production
rollout with post-deploy parity and endpoint verification before considering it
fully live.
