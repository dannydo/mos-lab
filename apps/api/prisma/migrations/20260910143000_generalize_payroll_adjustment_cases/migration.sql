ALTER TABLE `crm_fal_adjustment_cases`
  ADD COLUMN `source_type` VARCHAR(24) NOT NULL DEFAULT 'FAL' AFTER `event_key`,
  ADD COLUMN `adjustment_type` VARCHAR(64) NOT NULL DEFAULT 'FAL_LEGACY' AFTER `source_type`,
  MODIFY COLUMN `source_period_id` INTEGER NULL,
  MODIFY COLUMN `source_period_status` VARCHAR(24) NULL,
  MODIFY COLUMN `origin_order_service_id` INTEGER NULL,
  MODIFY COLUMN `remediation_order_service_id` INTEGER NULL,
  MODIFY COLUMN `origin_occurred_at` DATETIME(0) NULL;
