-- Composite Index Migration Script for mos-lab / Wings Lashes CRM Databases

-- 1. Index on legacy DB `report_order`
ALTER TABLE management.report_order ADD INDEX idx_report_order_booking (actual_booking_date_start, order_id);

-- 2. Index on legacy DB `order`
ALTER TABLE management.`order` ADD INDEX idx_order_state_created (order_state, date_created, id);

-- 3. Index on legacy DB `order_service`
ALTER TABLE management.order_service ADD INDEX idx_order_service_type (order_id, service_type, id);

-- 4. Index on legacy DB `staff_bonus`
ALTER TABLE management.staff_bonus ADD INDEX idx_staff_bonus_rule_type (bonus_type, staff_bonus_rule_id, user_id, date_created);

-- 5. Index on legacy DB `staff_tip`
ALTER TABLE management.staff_tip ADD INDEX idx_staff_tip_share (user_id, tip_percentage, order_id);

-- 6. Index on legacy DB `user_service_balance`
ALTER TABLE management.user_service_balance ADD INDEX idx_user_balance (user_id);

-- 7. Index on legacy DB `user_profile`
ALTER TABLE management.user_profile ADD INDEX idx_user_profile_booking (last_order_booking);

-- 8. Index on crm DB `crm_call_logs`
ALTER TABLE mos_lab.crm_call_logs ADD INDEX idx_call_logs_staff_created (staff_id, created_at);

-- 9. Index on crm DB `crm_omicall_logs`
ALTER TABLE mos_lab.crm_omicall_logs ADD INDEX idx_omicall_status_created (status, created_at);

-- 10. Index on crm DB `crm_daily_plans`
ALTER TABLE mos_lab.crm_daily_plans ADD INDEX idx_daily_plans_staff_date (staff_id, planned_date);
