-- ============================================================
-- LoCa Dashboard Performance: Index Migration Script
-- Phase 4: Database Index Optimization
-- Created: 2026-08-03
-- 
-- Purpose: Add composite indexes to speed up loca-stats SQL
-- which uses correlated EXISTS subqueries across these tables.
--
-- NOTE (AGENTS.md Rule #3):
-- Legacy DB (management) is READ-ONLY for transaction tables.
-- Index creation does NOT modify data, only metadata.
-- However, review impact on write performance before applying to production.
-- ============================================================

-- ============================================================
-- Legacy DB (management) - Index Optimization
-- ============================================================

-- 1. user_profile.last_order_booking index
-- Used by: touchpoint DATEDIFF(NOW(), up.last_order_booking) calculation
-- Impact: Enables index range scan instead of full table scan for touchpoint bucketing
CREATE INDEX IF NOT EXISTS idx_user_profile_last_order_booking 
  ON user_profile(last_order_booking);

-- 2. order_service composite index for has_product EXISTS subquery
-- Used by: EXISTS (SELECT 1 FROM order_service WHERE user_id = u.id AND service_group LIKE '%product%')
CREATE INDEX IF NOT EXISTS idx_order_service_user_svcgroup 
  ON order_service(user_id, service_group);

-- 3. order composite index for has_future_booking and is_new_loca EXISTS subqueries
-- Used by: EXISTS (SELECT 1 FROM `order` WHERE user_id = u.id AND booking_date_start > NOW() AND order_state IN ('New','Confirmed'))
-- Also: EXISTS (SELECT 1 FROM `order` WHERE user_id = u.id AND order_state = 'Completed')
CREATE INDEX IF NOT EXISTS idx_order_user_state_booking 
  ON `order`(user_id, order_state, booking_date_start);


-- ============================================================
-- CRM DB (mos_lab) - Index Optimization
-- ============================================================

-- 4. crm_call_logs composite index for has_callback and has_contacted EXISTS subqueries
-- Used by: EXISTS (SELECT 1 FROM crm_call_logs WHERE legacy_user_id = u.id AND callback_date >= CURDATE())
CREATE INDEX IF NOT EXISTS idx_crm_call_logs_user_callback 
  ON crm_call_logs(legacy_user_id, callback_date);

-- 5. crm_daily_plans composite index for has_callback EXISTS subquery
-- Used by: EXISTS (SELECT 1 FROM crm_daily_plans WHERE legacy_user_id = u.id AND planned_date >= CURDATE())
CREATE INDEX IF NOT EXISTS idx_crm_daily_plans_user_date 
  ON crm_daily_plans(legacy_user_id, planned_date);

-- 6. crm_loca_touchpoints composite index for has_callback EXISTS subquery
-- Used by: EXISTS (SELECT 1 FROM crm_loca_touchpoints WHERE legacy_user_id = u.id AND status = 'CALLBACK')
CREATE INDEX IF NOT EXISTS idx_crm_loca_touchpoints_user_status 
  ON crm_loca_touchpoints(legacy_user_id, status);
