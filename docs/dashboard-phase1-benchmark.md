# Dashboard SQL & Index — Phase 1 benchmark

Date: 2026-08-12 (local MariaDB 10.6, Fastify local only).

## Method

- Fixed data and filters for all 79 page-load/tab endpoints.
- Final measurement: 3 warm-up requests, then 20 sequential measurements per endpoint.
- HTTP success rate: **79 / 79 (100%)**.
- Final p95 distribution: 51 below 50 ms, 12 from 50–199 ms, 9 from 200–499 ms, and 7 at or above 500 ms.
- Baseline was the earlier local 5-sample run, so the deltas are directional; final p50/p95/max are the authoritative Phase 1 measurements.

## APIs that were above 500 ms at baseline

| Endpoint             | Baseline p95 |  Final p50 |  Final p95 |        Max |  Response |  Δ p95 | HTTP |
| -------------------- | -----------: | ---------: | ---------: | ---------: | --------: | -----: | ---: |
| Shell CV status      |   1,219.7 ms |   301.7 ms |   321.1 ms |   323.5 ms |   8,849 B | -73.7% |  200 |
| Appointments missed  |     544.3 ms |   343.8 ms |   359.5 ms |   359.7 ms |   1,614 B | -34.0% |  200 |
| Today dashboard      |   1,097.9 ms |   643.3 ms |   689.3 ms |   703.6 ms |  67,912 B | -37.2% |  200 |
| Today hourly revenue |     954.1 ms |     4.4 ms |     6.2 ms |     6.4 ms |   4,330 B | -99.4% |  200 |
| LoCa stats           |   1,832.3 ms |   282.5 ms |   315.2 ms |   324.0 ms |     228 B | -82.8% |  200 |
| CC paystub           |   2,124.1 ms |   646.1 ms |   712.2 ms |   761.7 ms |   2,306 B | -66.5% |  200 |
| CC tip leaderboard   |     969.5 ms |   601.7 ms |   626.8 ms |   632.0 ms |     738 B | -35.3% |  200 |
| CC bonus consultants |     875.9 ms |   515.7 ms |   530.6 ms |   551.0 ms |   1,593 B | -39.4% |  200 |
| CV tip leaderboard   |     682.8 ms |   670.3 ms |   712.4 ms |   714.5 ms |   2,171 B |  +4.3% |  200 |
| CV speed matrix      |   1,814.2 ms |   450.2 ms |   485.3 ms |   487.0 ms |  97,167 B | -73.2% |  200 |
| CV speed ranking     |   3,975.9 ms | 2,104.0 ms | 2,410.9 ms | 2,660.1 ms |   4,659 B | -39.4% |  200 |
| BK paystub           |     587.7 ms |   226.9 ms |   262.1 ms |   272.3 ms |   1,876 B | -55.4% |  200 |
| Catalog stats        |   8,367.1 ms | 1,500.3 ms | 1,856.5 ms | 2,646.9 ms | 106,353 B | -77.8% |  200 |
| Catalog branches     |     798.0 ms |   225.2 ms |   254.1 ms |   276.6 ms |   2,539 B | -68.2% |  200 |

## Target assessment

- Achieved: Catalog stats (≤ 2.5 s), CV matrix (≤ 1.0 s), CC paystub and LoCa stats (≤ 1.1 s), CV realtime status/Today dashboard/revenue-hourly (≤ 700 ms), and several remaining routes at ≤ 400 ms.
- Not reached without changing architecture: CV speed ranking remains 2.41 s p95. It still performs broad historical computation; Phase 2 should use a versioned materialized snapshot or cache, which is intentionally out of scope here.
- Still candidates for a focused Phase 1.1 query pass: CV tip (712 ms), CC tip (627 ms), and CC bonus (531 ms). No cache was introduced.

## Query-plan evidence

- The completed-order date query now chooses `idx_order_state_booking_date_id`; `report_order` remains joined by `order_id`, so the composite actual-date index is not forced for that join shape.
- The active-CV fallback query chooses `idx_staff_bonus_type_date_user` with `Using index`; this removes the prior broad staff-bonus scan.
- Fixed-data comparisons preserved Catalog count/revenue (`9`, `1,912,680 VND`) and missed-appointment count (`53`) before and after the sargable date rewrite.

Production rollout instructions and exact rollback index names are in `docs/dashboard-sql-index-phase1-runbook.md`. The migration was applied only to the local database.
