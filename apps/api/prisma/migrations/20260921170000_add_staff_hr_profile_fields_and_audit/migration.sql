-- AlterTable crm_staff
ALTER TABLE `crm_staff` 
    ADD COLUMN `staff_code` VARCHAR(50) NULL,
    ADD COLUMN `employment_status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN `contract_status` VARCHAR(20) NOT NULL DEFAULT 'OFFICIAL',
    ADD COLUMN `contract_start_date` DATE NULL,
    ADD COLUMN `contract_end_date` DATE NULL,
    ADD COLUMN `national_id` VARCHAR(50) NULL,
    ADD COLUMN `social_insurance_no` VARCHAR(50) NULL,
    ADD COLUMN `bank_name` VARCHAR(100) NULL,
    ADD COLUMN `bank_account_number` VARCHAR(50) NULL;

-- CreateTable crm_staff_audits
CREATE TABLE `crm_staff_audits` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `staff_id` INTEGER NOT NULL,
    `actor_staff_id` INTEGER NULL,
    `action` VARCHAR(50) NOT NULL DEFAULT 'UPDATE_PROFILE',
    `field_name` VARCHAR(50) NOT NULL,
    `old_value` TEXT NULL,
    `new_value` TEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `crm_staff_audits_staff_id_idx`(`staff_id`),
    INDEX `crm_staff_audits_actor_staff_id_idx`(`actor_staff_id`),
    INDEX `crm_staff_audits_field_name_idx`(`field_name`),
    INDEX `crm_staff_audits_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `crm_staff_audits` ADD CONSTRAINT `crm_staff_audits_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `crm_staff_audits` ADD CONSTRAINT `crm_staff_audits_actor_staff_id_fkey` FOREIGN KEY (`actor_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
