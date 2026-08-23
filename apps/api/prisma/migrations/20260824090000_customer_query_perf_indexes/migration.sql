-- CRM customer-query performance indexes.
-- Additive only: this migration does not alter customer or operational data.

CREATE INDEX `crm_call_logs_legacy_user_id_created_at_idx`
  ON `crm_call_logs`(`legacy_user_id`, `created_at`);

CREATE INDEX `crm_customer_assignments_staff_id_expires_at_idx`
  ON `crm_customer_assignments`(`staff_id`, `expires_at`);

CREATE INDEX `crm_customer_assignments_staff_id_assigned_at_idx`
  ON `crm_customer_assignments`(`staff_id`, `assigned_at`);

CREATE INDEX `crm_assignment_history_legacy_user_id_is_undone_assigned_at_idx`
  ON `crm_assignment_history`(`legacy_user_id`, `is_undone`, `assigned_at`);

CREATE INDEX `crm_loca_touchpoints_is_checked_checked_at_checked_by_staff_id_idx`
  ON `crm_loca_touchpoints`(`is_checked`, `checked_at`, `checked_by_staff_id`);

CREATE INDEX `crm_loca_touchpoints_is_checked_created_at_checked_by_staff_id_idx`
  ON `crm_loca_touchpoints`(`is_checked`, `created_at`, `checked_by_staff_id`);
