-- AlterTable
ALTER TABLE `crm_pilot_sessions`
  ADD COLUMN `assessment_status` VARCHAR(20) NULL,
  ADD COLUMN `assessment_reason` TEXT NULL,
  ADD COLUMN `assessment_notes` TEXT NULL,
  ADD COLUMN `assessment_criteria_json` LONGTEXT NULL,
  ADD COLUMN `assessed_at` DATETIME(0) NULL;

-- CreateTable
CREATE TABLE `crm_pilot_assessment_criteria` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pilot_code` VARCHAR(50) NOT NULL DEFAULT 'DARK_LASHES',
    `name` VARCHAR(120) NOT NULL,
    `description` TEXT NULL,
    `step_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),

    INDEX `crm_pilot_assessment_criteria_pilot_code_is_active_step_order_idx`(`pilot_code`, `is_active`, `step_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
