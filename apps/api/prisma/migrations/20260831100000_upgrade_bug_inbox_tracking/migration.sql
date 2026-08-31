ALTER TABLE `crm_bug_reports`
  ADD COLUMN `started_at` DATETIME(0) NULL AFTER `approved_at`;

CREATE TABLE `crm_bug_report_resolutions` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `report_id` INTEGER NOT NULL,
  `problem_summary` TEXT NOT NULL,
  `root_cause` TEXT NOT NULL,
  `solution_summary` TEXT NOT NULL,
  `verification_summary` TEXT NOT NULL,
  `changed_files_json` LONGTEXT NOT NULL,
  `commit_sha` VARCHAR(64) NULL,
  `release_url` VARCHAR(500) NULL,
  `search_normalized` TEXT NOT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  UNIQUE INDEX `crm_bug_report_resolutions_report_id_key` (`report_id`),
  INDEX `crm_bug_report_resolutions_updated_at_idx` (`updated_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `crm_bug_report_resolutions_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `crm_bug_reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_bug_report_notifications` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `report_id` INTEGER NOT NULL,
  `recipient_staff_id` INTEGER NOT NULL,
  `type` VARCHAR(40) NOT NULL,
  `title` VARCHAR(180) NOT NULL,
  `message` TEXT NOT NULL,
  `action_url` VARCHAR(500) NOT NULL,
  `read_at` DATETIME(0) NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  INDEX `bug_notification_recipient_unread_idx` (`recipient_staff_id`, `read_at`, `created_at`),
  INDEX `bug_notification_report_created_idx` (`report_id`, `created_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `crm_bug_report_notifications_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `crm_bug_reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `crm_bug_report_notifications_recipient_staff_id_fkey` FOREIGN KEY (`recipient_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
