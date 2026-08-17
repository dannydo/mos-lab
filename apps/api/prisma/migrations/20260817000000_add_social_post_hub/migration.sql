-- CreateTable
CREATE TABLE `crm_social_post_submissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `source_spreadsheet_id` VARCHAR(100) NOT NULL,
    `source_record_id` INTEGER NOT NULL,
    `staff_id` INTEGER NOT NULL,
    `source_author_name` VARCHAR(100) NOT NULL,
    `content_type` VARCHAR(30) NOT NULL,
    `channel` VARCHAR(150) NOT NULL,
    `source_url` TEXT NOT NULL,
    `posted_at` DATETIME NOT NULL,
    `review_status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `reviewer_comment` TEXT NULL,
    `reviewed_at` DATETIME NULL,
    `reviewed_by_staff_id` INTEGER NULL,
    `source_reviewer_name` VARCHAR(100) NULL,
    `imported_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL,

    UNIQUE INDEX `crm_social_post_submissions_source_spreadsheet_id_source_rec_key`(`source_spreadsheet_id`, `source_record_id`),
    INDEX `crm_social_post_submissions_posted_at_idx`(`posted_at`),
    INDEX `crm_social_post_submissions_staff_id_posted_at_idx`(`staff_id`, `posted_at`),
    INDEX `crm_social_post_submissions_review_status_posted_at_idx`(`review_status`, `posted_at`),
    INDEX `crm_social_post_submissions_reviewed_by_staff_id_fkey`(`reviewed_by_staff_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `crm_social_post_submissions`
  ADD CONSTRAINT `crm_social_post_submissions_staff_id_fkey`
  FOREIGN KEY (`staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_social_post_submissions`
  ADD CONSTRAINT `crm_social_post_submissions_reviewed_by_staff_id_fkey`
  FOREIGN KEY (`reviewed_by_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
