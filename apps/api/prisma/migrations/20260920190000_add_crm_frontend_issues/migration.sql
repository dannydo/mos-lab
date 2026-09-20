-- CreateTable
CREATE TABLE `crm_frontend_issues` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fingerprint` VARCHAR(191) NOT NULL,
    `issue_type` VARCHAR(32) NOT NULL,
    `path` VARCHAR(500) NOT NULL,
    `target` VARCHAR(255) NULL,
    `message` TEXT NOT NULL,
    `occurrence_count` INTEGER NOT NULL DEFAULT 1,
    `first_seen_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `last_seen_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `last_user_id` INTEGER NULL,
    `last_user_name` VARCHAR(100) NULL,
    `status` VARCHAR(24) NOT NULL DEFAULT 'NEW',
    `resolved_at` DATETIME(0) NULL,
    `resolved_by_staff_id` INTEGER NULL,
    `resolution_notes` TEXT NULL,
    `latest_payload_json` LONGTEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `crm_frontend_issues_fingerprint_key`(`fingerprint`),
    INDEX `crm_frontend_issues_status_last_seen_at_idx`(`status`, `last_seen_at`),
    INDEX `crm_frontend_issues_issue_type_status_idx`(`issue_type`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `crm_frontend_issues` ADD CONSTRAINT `crm_frontend_issues_resolved_by_staff_id_fkey` FOREIGN KEY (`resolved_by_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
