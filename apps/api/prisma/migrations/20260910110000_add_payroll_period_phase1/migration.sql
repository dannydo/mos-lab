CREATE TABLE `crm_payroll_periods` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `period_key` VARCHAR(20) NOT NULL,
  `label` VARCHAR(160) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `timezone` VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  `status` VARCHAR(24) NOT NULL DEFAULT 'OPEN',
  `calculation_version` VARCHAR(64) NOT NULL,
  `locked_by_staff_id` INTEGER NULL,
  `locked_at` DATETIME(0) NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL,

  UNIQUE INDEX `crm_payroll_periods_period_key_key`(`period_key`),
  INDEX `payroll_period_status_start_idx`(`status`, `start_date`),
  INDEX `payroll_period_date_range_idx`(`start_date`, `end_date`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
