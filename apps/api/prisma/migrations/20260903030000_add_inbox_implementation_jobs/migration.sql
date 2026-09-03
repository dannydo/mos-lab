ALTER TABLE `crm_bug_reports`
  ADD COLUMN `implementation_approved_by_staff_id` INTEGER NULL AFTER `approved_at`,
  ADD COLUMN `implementation_approved_at` DATETIME(0) NULL AFTER `implementation_approved_by_staff_id`,
  ADD COLUMN `implementation_approval_source_version` VARCHAR(80) NULL AFTER `implementation_approved_at`,
  ADD COLUMN `implementation_active_job_id` VARCHAR(36) NULL AFTER `implementation_approval_source_version`;

ALTER TABLE `crm_inbox_plan_jobs`
  ADD COLUMN `source_version` VARCHAR(80) NULL AFTER `result_action`,
  ADD COLUMN `plan_version` VARCHAR(80) NULL AFTER `source_version`,
  ADD COLUMN `review_comment_id` INTEGER NULL AFTER `plan_version`;

CREATE TABLE `crm_inbox_implementation_jobs` (
  `id` VARCHAR(36) NOT NULL,
  `report_id` INTEGER NOT NULL,
  `source_version` VARCHAR(80) NOT NULL,
  `plan_version` VARCHAR(80) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  `attempt_count` INTEGER NOT NULL DEFAULT 0,
  `lease_token` VARCHAR(64) NULL,
  `leased_by` VARCHAR(100) NULL,
  `lease_expires_at` DATETIME(0) NULL,
  `branch_name` VARCHAR(160) NOT NULL,
  `worktree_path` VARCHAR(500) NULL,
  `summary` TEXT NULL,
  `changed_files_json` LONGTEXT NULL,
  `tests_json` LONGTEXT NULL,
  `diff_stat` TEXT NULL,
  `risks_and_rollback` TEXT NULL,
  `failure_code` VARCHAR(100) NULL,
  `retain_until` DATETIME(0) NULL,
  `started_at` DATETIME(0) NULL,
  `completed_at` DATETIME(0) NULL,
  `expires_at` DATETIME(0) NOT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `crm_inbox_implementation_jobs_report_source_plan_key` (`report_id`, `source_version`, `plan_version`),
  INDEX `crm_inbox_implementation_jobs_status_expires_idx` (`status`, `expires_at`),
  INDEX `crm_inbox_implementation_jobs_lease_expires_idx` (`lease_expires_at`),
  CONSTRAINT `crm_inbox_implementation_jobs_report_id_fkey`
    FOREIGN KEY (`report_id`) REFERENCES `crm_bug_reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_inbox_implementation_worker_lock` (
  `id` INTEGER NOT NULL,
  `active_job_id` VARCHAR(36) NULL,
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `crm_inbox_implementation_worker_lock` (`id`, `active_job_id`) VALUES (1, NULL);
