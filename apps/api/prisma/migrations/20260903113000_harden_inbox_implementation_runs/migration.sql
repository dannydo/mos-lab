ALTER TABLE `crm_inbox_implementation_jobs`
  DROP INDEX `crm_inbox_implementation_jobs_report_source_plan_key`,
  ADD COLUMN `retry_of_job_id` VARCHAR(36) NULL AFTER `plan_version`,
  ADD COLUMN `retry_sequence` INTEGER NOT NULL DEFAULT 0 AFTER `retry_of_job_id`,
  ADD COLUMN `lease_heartbeat_at` DATETIME(0) NULL AFTER `lease_expires_at`,
  ADD COLUMN `process_pid` INTEGER NULL AFTER `lease_heartbeat_at`,
  ADD COLUMN `execution_phase` VARCHAR(32) NOT NULL DEFAULT 'QUEUED' AFTER `process_pid`,
  ADD UNIQUE INDEX `crm_inbox_implementation_jobs_report_source_plan_retry_key` (`report_id`, `source_version`, `plan_version`, `retry_sequence`),
  ADD INDEX `crm_inbox_implementation_jobs_retry_of_idx` (`retry_of_job_id`);
