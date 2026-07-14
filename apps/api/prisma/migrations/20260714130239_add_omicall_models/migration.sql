-- AlterTable
ALTER TABLE `crm_staff` ADD COLUMN `address` TEXT NULL,
    ADD COLUMN `avatar_url` VARCHAR(255) NULL,
    ADD COLUMN `birth_date` DATE NULL,
    ADD COLUMN `email` VARCHAR(100) NULL,
    ADD COLUMN `emergency_contact` VARCHAR(100) NULL,
    ADD COLUMN `emergency_phone` VARCHAR(20) NULL,
    ADD COLUMN `gender` VARCHAR(10) NULL,
    ADD COLUMN `joined_at` DATE NULL,
    ADD COLUMN `last_active_at` DATETIME(0) NULL,
    ADD COLUMN `last_login_at` DATETIME(0) NULL,
    ADD COLUMN `legacy_staff_id` INTEGER NULL,
    ADD COLUMN `notes` TEXT NULL,
    ADD COLUMN `phone` VARCHAR(20) NULL;

-- CreateTable
CREATE TABLE `crm_config` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(50) NOT NULL,
    `value` TEXT NOT NULL,
    `updated_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `crm_config_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_customer_assignments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `legacy_user_id` INTEGER NOT NULL,
    `staff_id` INTEGER NOT NULL,
    `assigned_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `assigned_by` INTEGER NULL,

    UNIQUE INDEX `crm_customer_assignments_legacy_user_id_key`(`legacy_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_roles` (
    `key` VARCHAR(20) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `color` VARCHAR(20) NOT NULL DEFAULT 'default',
    `view_kpi` BOOLEAN NOT NULL DEFAULT false,
    `view_team_kpi` BOOLEAN NOT NULL DEFAULT false,
    `manage_staff` BOOLEAN NOT NULL DEFAULT false,
    `is_system` BOOLEAN NOT NULL DEFAULT false,
    `description` TEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_assignment_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `batch_id` VARCHAR(50) NOT NULL,
    `legacy_user_id` INTEGER NOT NULL,
    `prev_staff_id` INTEGER NULL,
    `new_staff_id` INTEGER NULL,
    `assigned_by` INTEGER NOT NULL,
    `assigned_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_undone` BOOLEAN NOT NULL DEFAULT false,
    `undone_at` DATETIME(0) NULL,

    INDEX `crm_assignment_history_batch_id_idx`(`batch_id`),
    INDEX `crm_assignment_history_legacy_user_id_idx`(`legacy_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_omicall_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `call_uuid` VARCHAR(100) NOT NULL,
    `direction` VARCHAR(10) NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `source_number` VARCHAR(20) NOT NULL,
    `destination_number` VARCHAR(20) NOT NULL,
    `duration` INTEGER NOT NULL DEFAULT 0,
    `bill_sec` INTEGER NOT NULL DEFAULT 0,
    `recording_url` VARCHAR(500) NULL,
    `time_start_call` DATETIME(0) NULL,
    `time_end_call` DATETIME(0) NULL,
    `staff_id` INTEGER NULL,
    `legacy_user_id` INTEGER NULL,
    `call_log_id` INTEGER NULL,
    `analysis_status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `analysis_retry_count` INTEGER NOT NULL DEFAULT 0,
    `analysis_error` TEXT NULL,
    `laugh_count` INTEGER NULL,
    `laugh_timestamps` TEXT NULL,
    `transcript` LONGTEXT NULL,
    `happy_call_status` VARCHAR(20) NOT NULL DEFAULT 'NONE',
    `happy_call_reason` VARCHAR(30) NULL,
    `qa_verified` BOOLEAN NOT NULL DEFAULT false,
    `qa_verified_by` INTEGER NULL,
    `qa_verified_at` DATETIME(0) NULL,
    `qa_laugh_verifications` TEXT NULL,
    `qa_notes` TEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `crm_omicall_logs_call_uuid_key`(`call_uuid`),
    INDEX `crm_omicall_logs_staff_id_idx`(`staff_id`),
    INDEX `crm_omicall_logs_legacy_user_id_idx`(`legacy_user_id`),
    INDEX `crm_omicall_logs_analysis_status_idx`(`analysis_status`),
    INDEX `crm_omicall_logs_happy_call_status_idx`(`happy_call_status`),
    INDEX `crm_omicall_logs_created_at_idx`(`created_at`),
    INDEX `crm_omicall_logs_destination_number_idx`(`destination_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_omicall_config` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `staff_id` INTEGER NOT NULL,
    `extension` VARCHAR(20) NOT NULL,
    `phone_number` VARCHAR(20) NULL,

    UNIQUE INDEX `crm_omicall_config_staff_id_key`(`staff_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `crm_call_logs_legacy_user_id_idx` ON `crm_call_logs`(`legacy_user_id`);

-- CreateIndex
CREATE INDEX `crm_call_logs_staff_id_idx` ON `crm_call_logs`(`staff_id`);

-- CreateIndex
CREATE INDEX `crm_call_logs_created_at_idx` ON `crm_call_logs`(`created_at`);

-- CreateIndex
CREATE INDEX `crm_daily_plans_staff_id_planned_date_idx` ON `crm_daily_plans`(`staff_id`, `planned_date`);

-- AddForeignKey
ALTER TABLE `crm_customer_assignments` ADD CONSTRAINT `crm_customer_assignments_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_assignment_history` ADD CONSTRAINT `crm_assignment_history_prev_staff_id_fkey` FOREIGN KEY (`prev_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_assignment_history` ADD CONSTRAINT `crm_assignment_history_new_staff_id_fkey` FOREIGN KEY (`new_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_assignment_history` ADD CONSTRAINT `crm_assignment_history_assigned_by_fkey` FOREIGN KEY (`assigned_by`) REFERENCES `crm_staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
