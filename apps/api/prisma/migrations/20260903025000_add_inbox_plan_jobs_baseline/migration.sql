-- Historical baseline repair: planning jobs were introduced by a schema push
-- before implementation jobs added review-version links to the table.
CREATE TABLE `crm_inbox_plan_jobs` (
    `id` VARCHAR(36) NOT NULL,
    `report_id` INTEGER NOT NULL,
    `event_kind` VARCHAR(32) NOT NULL,
    `event_version` VARCHAR(80) NOT NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    `attempt_count` INTEGER NOT NULL DEFAULT 0,
    `lease_token` VARCHAR(64) NULL,
    `leased_by` VARCHAR(100) NULL,
    `lease_expires_at` DATETIME(0) NULL,
    `result_action` VARCHAR(32) NULL,
    `fallback_reason` VARCHAR(400) NULL,
    `expires_at` DATETIME(0) NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `crm_inbox_plan_jobs_report_id_event_kind_event_version_key` (`report_id`, `event_kind`, `event_version`),
    INDEX `crm_inbox_plan_jobs_status_expires_at_idx` (`status`, `expires_at`),
    INDEX `crm_inbox_plan_jobs_lease_expires_at_idx` (`lease_expires_at`),
    PRIMARY KEY (`id`),
    CONSTRAINT `crm_inbox_plan_jobs_report_id_fkey`
      FOREIGN KEY (`report_id`) REFERENCES `crm_bug_reports`(`id`)
      ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
