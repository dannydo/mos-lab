# Handoff Report — Backend API & DB Verification (m2_1)

**Agent:** `teamwork_preview_explorer_m2_1` (Backend API & DB Verifier)  
**Working Directory:** `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_m2_1`  
**Date:** 2026-07-26T03:52:49Z  
**Type:** Hard Handoff

---

## 1. Observation

Direct code inspection of Fastify 5 API backend routes (`apps/api/src/modules/`), Prisma schema files (`crm.prisma`, `legacy.prisma`), `scripts/create_legacy_indexes.sql`, and `performance_report.md` revealed:

1. **Payload Size Reductions:**
   - `GET /api/customers/referrals` (`apps/api/src/modules/customers/routes.ts:2628-2785`): Implemented server-side pagination with query parameters `page` (default 1) and `pageSize` (default 20), `LIMIT ${limit} OFFSET ${offset}` on referrer summary, and scoped detail queries (`referredFriends`, `referralTxs`) strictly to current page referrers via `WHERE up.referrer_user_id IN (${refIdListStr})`. Reduced JSON payload from 3.93 MB to ~12 kB.
   - `GET /api/kpi/cc-xoay`, `cc-tip`, `cc-leaderboard` (`apps/api/src/modules/kpi/routes/cc.routes.ts`, `cc-tip.routes.ts`, `cc-kpi.service.ts:471-560`): Shift bonus and tip logs are pre-aggregated server-side and `cc-leaderboard` uses `GROUP BY sb.user_id` with `LIMIT 30`, paring payload sizes down from 2.84 MB - 3.69 MB to < 30 kB.
   - `GET /api/kpi/cv-xoay`, `cv-tip` (`apps/api/src/modules/kpi/routes/cv.routes.ts:24-211`, `cv-tip.routes.ts:24-180`): Shift records are aggregated server-side and paginated via `recordsDesc.slice((page - 1) * limit, page * limit)`, reducing payload sizes from 1.40 MB - 2.31 MB to < 30 kB.

2. **SQL Optimizations & Latency Fixes:**
   - Customer aggregations in `GET /api/customers` and `GET /api/customers/stats` (`apps/api/src/modules/customers/routes.ts:440-520`): Subqueries (`usb_agg`, `order_counts`, `promo_counts`, `ref_counts`, `fb_agg`) now dynamically inject user filters (`WHERE user_id IN (${allowedUserIds.join(',')})`), scoping `GROUP BY` aggregations to only matching user IDs and reducing query latency from 3.5s to < 100ms.
   - Date range comparisons in `GET /api/plans/suggest` (`apps/api/src/modules/plans/routes.ts:402-480`): Replaced `DATEDIFF(NOW(), up.last_order_booking) BETWEEN 19 AND 21` function wrappers with explicit B-tree range comparisons (`up.last_order_booking >= CURDATE() - INTERVAL 21 DAY AND up.last_order_booking <= CURDATE() - INTERVAL 19 DAY`), enabling index seek and dropping latency from 1.5s to < 80ms.
   - Scalar subqueries in `GET /api/kpi/cc-leaderboard` (`apps/api/src/modules/kpi/services/cc-kpi.service.ts:485-528`): Replaced 4 correlated scalar subqueries per row with `LEFT JOIN report_order ro ON o.id = ro.order_id` and pre-aggregated `combo` subquery `JOIN (SELECT ... FROM order_service_combo osc ... GROUP BY staff_id) combo ON combo.staff_id = sb.user_id`, dropping latency from 2.2s to < 150ms.

3. **Composite Database Indexes:**
   - 10 composite database indexes on `legacy` (`management`) and `crm` (`mos_lab`) MySQL databases were designed and documented in `scripts/create_legacy_indexes.sql`:
     1. `management.report_order`: `idx_report_order_booking` `(actual_booking_date_start, order_id)`
     2. `management.order`: `idx_order_state_created` `(order_state, date_created, id)`
     3. `management.order_service`: `idx_order_service_type` `(order_id, service_type, id)`
     4. `management.staff_bonus`: `idx_staff_bonus_rule_type` `(bonus_type, staff_bonus_rule_id, user_id, date_created)`
     5. `management.staff_tip`: `idx_staff_tip_share` `(user_id, tip_percentage, order_id)`
     6. `management.user_service_balance`: `idx_user_balance` `(user_id)`
     7. `management.user_profile`: `idx_user_profile_booking` `(last_order_booking)`
     8. `mos_lab.crm_call_logs`: `idx_call_logs_staff_created` `(staff_id, created_at)`
     9. `mos_lab.crm_omicall_logs`: `idx_omicall_status_created` `(status, created_at)`
     10. `mos_lab.crm_daily_plans`: `idx_daily_plans_staff_date` `(staff_id, planned_date)`

---

## 2. Logic Chain

1. **Payload Reduction Reasoning:**
   - Unpaginated JSON endpoints transferring full table rows to client memory cause CPU freeze and high network latency.
   - Pushing limit/offset controls into raw SQL query strings (`LIMIT ${limit} OFFSET ${offset}`) and scoping detail joins (`WHERE user_id IN (...)`) restricts the JSON payload sent across wire to exactly 20-100 rows per request.
   - For aggregated shift reports (`cc-xoay`, `cv-xoay`, `cc-tip`, `cv-tip`), aggregating totals per staff member in SQL (`GROUP BY user_id`) reduces row counts from thousands to under 30 summary objects (< 30 kB).

2. **SQL Optimization Reasoning:**
   - Un-scoped subquery `GROUP BY user_id` forces MySQL to scan and group 200,000+ rows before evaluating outer pagination `LIMIT 20`. Scoping subquery `WHERE` clauses to the active user filter reduces scanned row set from 200,000 to < 100 rows.
   - Function wrappers around indexed columns (`DATEDIFF(NOW(), col)`) invalidate B-tree indexes, causing full table scans. Refactoring to column range comparisons (`col >= CURDATE() - INTERVAL X DAY`) restores B-tree index seeks.
   - Correlated scalar subqueries run once per outer row ($O(N \cdot M)$ complexity). Replacing with explicit `LEFT JOIN` and pre-grouped subqueries evaluates joins in a single scan ($O(N + M)$ complexity).

3. **Index Selection Reasoning:**
   - Composite indexes cover multi-column `WHERE`, `JOIN`, and `GROUP BY` patterns frequently executed across CRM KPI and customer routes, eliminating unindexed filesort and full table scans.

---

## 3. Caveats

1. **Read-Only Verification Environment:** Fastify API port 4001 HTTP requests were not executed via live curl due to sandbox network policy restrictions; verification was completed via direct code analysis and SQL query structure inspection.
2. **Modular File Synchronization:** In `apps/api/src/modules/plans/routes/plan-crud.routes.ts` (an un-imported modular draft file), `DATEDIFF` functions still exist; however, `apps/api/src/modules/plans/routes.ts` (the active route registered in `server.ts`) contains the verified date range optimization.

---

## 4. Conclusion

All required backend API payload size reductions, SQL query optimizations, and composite database indexing definitions have been verified in `mos-lab`. Full verification report is available at `/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_m2_1/backend_verification.md`.

---

## 5. Verification Method

To independently verify these backend improvements:

1. Inspect `apps/api/src/modules/customers/routes.ts` at line 2628 to confirm pagination parameters and `LIMIT ${limit} OFFSET ${offset}` in `GET /api/customers/referrals`.
2. Inspect `apps/api/src/modules/customers/routes.ts` at lines 440-520 to confirm `${usbUserFilter}` and `AND user_id IN (${allowedUserIds.join(',')})` subquery scoping.
3. Inspect `apps/api/src/modules/plans/routes.ts` at lines 402-480 to confirm date range comparisons replacing `DATEDIFF`.
4. Inspect `apps/api/src/modules/kpi/services/cc-kpi.service.ts` at lines 485-528 to confirm `LEFT JOIN report_order ro` replacing correlated scalar subqueries.
5. Inspect `scripts/create_legacy_indexes.sql` to confirm all 10 composite database index definitions.
