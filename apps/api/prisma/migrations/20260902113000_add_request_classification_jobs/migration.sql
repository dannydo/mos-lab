CREATE TABLE `crm_request_classification_jobs` (
  `id` VARCHAR(36) NOT NULL,
  `reporter_staff_id` INTEGER NOT NULL,
  `description` TEXT NOT NULL,
  `context_json` LONGTEXT NOT NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  `attempt_count` INTEGER NOT NULL DEFAULT 0,
  `lease_token` VARCHAR(64) NULL,
  `leased_by` VARCHAR(100) NULL,
  `leased_at` DATETIME(0) NULL,
  `lease_expires_at` DATETIME(0) NULL,
  `recommendation_json` LONGTEXT NULL,
  `fallback_reason` VARCHAR(400) NULL,
  `consumed_at` DATETIME(0) NULL,
  `expires_at` DATETIME(0) NOT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  INDEX `request_classification_reporter_created_idx` (`reporter_staff_id`, `created_at`),
  INDEX `request_classification_status_expires_idx` (`status`, `expires_at`),
  INDEX `request_classification_lease_expires_idx` (`lease_expires_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `request_classification_reporter_fkey` FOREIGN KEY (`reporter_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_request_classification_job_attachments` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `job_id` VARCHAR(36) NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `storage_path` VARCHAR(500) NOT NULL,
  `mime_type` VARCHAR(50) NOT NULL,
  `size_bytes` INTEGER NOT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `deleted_at` DATETIME(0) NULL,
  UNIQUE INDEX `request_classification_attachment_storage_path_key` (`storage_path`),
  INDEX `request_classification_attachment_job_created_idx` (`job_id`, `created_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `request_classification_attachment_job_fkey` FOREIGN KEY (`job_id`) REFERENCES `crm_request_classification_jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_request_classification_worker_heartbeats` (
  `worker_id` VARCHAR(100) NOT NULL,
  `last_seen_at` DATETIME(0) NOT NULL,
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  INDEX `request_classification_worker_last_seen_idx` (`last_seen_at`),
  PRIMARY KEY (`worker_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
