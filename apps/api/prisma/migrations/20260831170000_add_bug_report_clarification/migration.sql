ALTER TABLE `crm_bug_reports`
  ADD COLUMN `clarification_status` VARCHAR(24) NOT NULL DEFAULT 'PENDING_AGENT' AFTER `triage_note`,
  ADD COLUMN `clarification_summary` TEXT NULL AFTER `clarification_status`,
  ADD COLUMN `clarified_at` DATETIME(0) NULL AFTER `clarification_summary`;

UPDATE `crm_bug_reports`
SET
  `clarification_status` = 'READY',
  `clarification_summary` = COALESCE(
    NULLIF(`business_context`, ''),
    'Ticket đã được triage trước khi clarification gate được áp dụng.'
  ),
  `clarified_at` = COALESCE(`approved_at`, `updated_at`)
WHERE `status` IN ('APPROVED', 'IN_PROGRESS', 'FIXED', 'CLOSED', 'REJECTED', 'DUPLICATE');

CREATE TABLE `crm_bug_report_comments` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `report_id` INTEGER NOT NULL,
  `author_staff_id` INTEGER NULL,
  `author_type` VARCHAR(16) NOT NULL,
  `kind` VARCHAR(32) NOT NULL,
  `body` TEXT NOT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  INDEX `crm_bug_report_comments_report_id_created_at_idx` (`report_id`, `created_at`),
  INDEX `crm_bug_report_comments_author_staff_id_created_at_idx` (`author_staff_id`, `created_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `crm_bug_report_comments_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `crm_bug_reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `crm_bug_report_comments_author_staff_id_fkey` FOREIGN KEY (`author_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `crm_bug_report_attachments`
  ADD COLUMN `comment_id` INTEGER NULL AFTER `report_id`,
  ADD INDEX `crm_bug_report_attachments_comment_id_created_at_idx` (`comment_id`, `created_at`),
  ADD CONSTRAINT `crm_bug_report_attachments_comment_id_fkey` FOREIGN KEY (`comment_id`) REFERENCES `crm_bug_report_comments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
