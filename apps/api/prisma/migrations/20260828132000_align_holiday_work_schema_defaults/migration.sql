ALTER TABLE `crm_holiday_candidate_snapshots`
  MODIFY `data_sufficient` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `crm_holiday_coverage`
  ALTER COLUMN `updated_at` DROP DEFAULT;

ALTER TABLE `crm_holiday_payroll_ledger`
  MODIFY `base_included_in_monthly_salary` BOOLEAN NOT NULL DEFAULT false,
  ALTER COLUMN `updated_at` DROP DEFAULT;

ALTER TABLE `crm_holiday_periods`
  ALTER COLUMN `updated_at` DROP DEFAULT;

ALTER TABLE `crm_holiday_roster`
  MODIFY `is_approved_leave` BOOLEAN NOT NULL DEFAULT false,
  ALTER COLUMN `updated_at` DROP DEFAULT;

ALTER TABLE `crm_staff_performance_events`
  ALTER COLUMN `updated_at` DROP DEFAULT;
