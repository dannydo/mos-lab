CREATE TABLE `crm_request_conversations` (
  `id` VARCHAR(36) NOT NULL,
  `reporter_staff_id` INTEGER NOT NULL,
  `preferred_request_type` VARCHAR(16) NULL,
  `description` TEXT NOT NULL,
  `context_json` LONGTEXT NOT NULL,
  `attachment_count` INTEGER NOT NULL DEFAULT 0,
  `summary_json` LONGTEXT NOT NULL,
  `messages_json` LONGTEXT NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  `next_question` TEXT NULL,
  `fallback_reason` VARCHAR(400) NULL,
  `attempt_count` INTEGER NOT NULL DEFAULT 0,
  `lease_token` VARCHAR(64) NULL,
  `leased_by` VARCHAR(100) NULL,
  `leased_at` DATETIME(0) NULL,
  `lease_expires_at` DATETIME(0) NULL,
  `ready_at` DATETIME(0) NULL,
  `consumed_at` DATETIME(0) NULL,
  `expires_at` DATETIME(0) NOT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `crm_request_conversations_reporter_staff_id_created_at_idx` (`reporter_staff_id`, `created_at`),
  INDEX `crm_request_conversations_status_expires_at_idx` (`status`, `expires_at`),
  INDEX `crm_request_conversations_lease_expires_at_idx` (`lease_expires_at`),
  CONSTRAINT `crm_request_conversations_reporter_staff_id_fkey` FOREIGN KEY (`reporter_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_request_conversation_audits` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `conversation_id` VARCHAR(36) NOT NULL,
  `action` VARCHAR(50) NOT NULL,
  `metadata_json` LONGTEXT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`),
  INDEX `crm_request_conversation_audits_conversation_id_created_at_idx` (`conversation_id`, `created_at`),
  CONSTRAINT `crm_request_conversation_audits_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `crm_request_conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
