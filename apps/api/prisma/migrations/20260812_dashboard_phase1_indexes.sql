-- Dashboard SQL/index phase 1 (local first; production requires the companion runbook).
-- MariaDB 10.6 supports IF NOT EXISTS. These indexes change metadata only; no transaction data is changed.

CREATE INDEX IF NOT EXISTS idx_report_order_actual_order
  ON report_order (actual_booking_date_start, order_id);

CREATE INDEX IF NOT EXISTS idx_order_state_booking_date_id
  ON `order` (order_state, booking_date_start, id);

-- Revenue-hourly keeps booking_date_end as its first-priority operational timestamp.
CREATE INDEX IF NOT EXISTS idx_order_state_booking_end_id
  ON `order` (order_state, booking_date_end, id);

CREATE INDEX IF NOT EXISTS idx_order_service_assigned_order
  ON order_service (assigned_staff_id, order_id);

CREATE INDEX IF NOT EXISTS idx_order_service_checkin_order
  ON order_service (check_in_staff_id, order_id);

CREATE INDEX IF NOT EXISTS idx_order_service_checkout_order
  ON order_service (check_out_staff_id, order_id);

CREATE INDEX IF NOT EXISTS idx_staff_bonus_user_order_service
  ON staff_bonus (user_id, order_service_id);

-- CV Speed active-staff fallback filters by Banana + a recent date before joining profiles.
CREATE INDEX IF NOT EXISTS idx_staff_bonus_type_date_user
  ON staff_bonus (bonus_type, date_created, user_id);

CREATE INDEX IF NOT EXISTS idx_order_staff_queue_user_created_store_position
  ON order_staff_queue (user_id, date_created, client_store_id, position);

CREATE INDEX IF NOT EXISTS idx_user_profile_store_group_active
  ON user_profile (client_store_id, user_group_id, is_disabled, is_deleted);
