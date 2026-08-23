-- Legacy customer-query performance indexes.
-- Review and apply with `legacy:indexes:customers`; this file is never applied
-- automatically because the legacy database is operationally read-only.

CREATE INDEX IF NOT EXISTS idx_usb_user_created_expiry
  ON user_service_balance (user_id, date_created, date_expired);

CREATE INDEX IF NOT EXISTS idx_usbt_balance_created_id
  ON user_service_balance_transaction (user_service_balance_id, date_created, id);

CREATE INDEX IF NOT EXISTS idx_order_service_combo_order_total
  ON order_service_combo (order_id, total_price);

CREATE INDEX IF NOT EXISTS idx_order_service_order
  ON order_service (order_id);
