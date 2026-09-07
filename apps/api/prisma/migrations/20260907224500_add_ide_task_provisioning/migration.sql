ALTER TABLE `crm_inbox_implementation_jobs`
  ADD COLUMN `ide_provisioning_request_id` VARCHAR(36) NULL AFTER `ide_task_bound_at`,
  ADD COLUMN `ide_provisioning_state` VARCHAR(32) NOT NULL DEFAULT 'PENDING' AFTER `ide_provisioning_request_id`,
  ADD COLUMN `ide_provisioning_lease_token` VARCHAR(64) NULL AFTER `ide_provisioning_state`,
  ADD COLUMN `ide_provisioning_lease_expires_at` DATETIME(0) NULL AFTER `ide_provisioning_lease_token`,
  ADD COLUMN `ide_provisioning_attempt_count` INTEGER NOT NULL DEFAULT 0 AFTER `ide_provisioning_lease_expires_at`,
  ADD COLUMN `ide_provisioning_failure_code` VARCHAR(100) NULL AFTER `ide_provisioning_attempt_count`,
  ADD INDEX `crm_inbox_implementation_jobs_ide_provisioning_state_ide_provisioning_lease_expires_at_idx` (`ide_provisioning_state`, `ide_provisioning_lease_expires_at`),
  ADD INDEX `crm_inbox_implementation_jobs_ide_provisioning_request_id_idx` (`ide_provisioning_request_id`);
