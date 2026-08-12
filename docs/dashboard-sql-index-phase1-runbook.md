# Dashboard SQL/index phase 1 production runbook

This runbook is for promoting `20260812_dashboard_phase1_indexes.sql` after local verification. It does not authorize a production change by itself.

## Preflight

1. Schedule a low-write window and confirm a recent backup of `management`.
2. Record `SELECT VERSION()` and `SHOW INDEX` output for every target table.
3. Run the query-specific `EXPLAIN` captures from the local benchmark on production read-only credentials. Do not create an index already covered by an equivalent left-prefix index.
4. Check available disk space and the table engine/online-DDL support. If the server cannot honour online index creation, use an approved maintenance window.

## Rollout

1. Apply one index at a time, starting with `report_order`, `order`, `order_service`, then the `staff_bonus` reporting indexes.
2. After each index, wait for the DDL to finish, run `SHOW INDEX`, then execute the corresponding read-only `EXPLAIN`.
3. Monitor write latency, metadata locks, replication lag, API error rate, and the fourteen dashboard API p95 values for 30 minutes.
4. Continue only if writes and API error rate remain normal; otherwise stop before the next index.

## Verification and rollback

1. Compare fixed-date API payload counts and VND totals against the pre-rollout capture.
2. Re-run the 79-endpoint benchmark using the same request matrix.
3. If an added index causes an unacceptable write regression, remove only that named index, for example:

   ```sql
   DROP INDEX idx_order_service_checkin_order ON order_service;
   ```

4. Never drop an index until `SHOW INDEX` confirms its exact name and owner table.
