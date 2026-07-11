-- CreateTable
CREATE TABLE `crm_staff` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `display_name` VARCHAR(100) NOT NULL,
    `role` VARCHAR(20) NOT NULL DEFAULT 'telesales',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `crm_staff_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_daily_plans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `legacy_user_id` INTEGER NOT NULL,
    `staff_id` INTEGER NOT NULL,
    `planned_date` DATE NOT NULL,
    `bucket` VARCHAR(20) NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `crm_daily_plans_legacy_user_id_planned_date_key`(`legacy_user_id`, `planned_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_call_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `plan_id` INTEGER NULL,
    `legacy_user_id` INTEGER NOT NULL,
    `staff_id` INTEGER NOT NULL,
    `call_type` VARCHAR(20) NOT NULL,
    `call_result` VARCHAR(20) NULL,
    `duration_sec` INTEGER NULL,
    `note` TEXT NULL,
    `outcome` VARCHAR(30) NULL,
    `callback_date` DATE NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_staff_kpi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `staff_id` INTEGER NOT NULL,
    `kpi_date` DATE NOT NULL,
    `total_planned` INTEGER NOT NULL DEFAULT 0,
    `total_called` INTEGER NOT NULL DEFAULT 0,
    `total_answered` INTEGER NOT NULL DEFAULT 0,
    `total_booked` INTEGER NOT NULL DEFAULT 0,
    `total_renewed` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `crm_staff_kpi_staff_id_kpi_date_key`(`staff_id`, `kpi_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
