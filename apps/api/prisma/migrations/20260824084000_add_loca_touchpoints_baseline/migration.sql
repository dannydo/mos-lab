-- Historical baseline repair: LoCa touchpoints were schema-pushed before the
-- later additive index migration. This restores the pre-index table contract.
CREATE TABLE `crm_loca_touchpoints` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `legacy_user_id` INTEGER NOT NULL,
    `touchpoint_key` VARCHAR(20) NOT NULL,
    `is_checked` TINYINT(1) NOT NULL DEFAULT 0,
    `status` VARCHAR(30) NULL,
    `checked_at` DATETIME(0) NULL,
    `checked_by_staff_id` INTEGER NULL,
    `checked_by_staff_name` VARCHAR(100) NULL,
    `note` TEXT NULL,
    `cycle_date` DATE NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `crm_loca_touchpoints_legacy_user_id_cycle_date_touchpoint_ke_key` (`legacy_user_id`, `cycle_date`, `touchpoint_key`),
    INDEX `crm_loca_touchpoints_legacy_user_id_idx` (`legacy_user_id`),
    INDEX `crm_loca_touchpoints_touchpoint_key_idx` (`touchpoint_key`),
    INDEX `crm_loca_touchpoints_cycle_date_idx` (`cycle_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
