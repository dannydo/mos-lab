CREATE TABLE `crm_payroll_settlement_subjects` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `settlement_id` INTEGER NOT NULL,
  `subject_key` VARCHAR(191) NOT NULL,
  `input_json` LONGTEXT NOT NULL,
  `result_json` LONGTEXT NOT NULL,
  `input_hash` VARCHAR(128) NOT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

  UNIQUE INDEX `payroll_settlement_subject_key`(`settlement_id`, `subject_key`),
  INDEX `payroll_settlement_subject_lookup_idx`(`subject_key`),
  PRIMARY KEY (`id`),
  CONSTRAINT `crm_payroll_settlement_subjects_settlement_id_fkey`
    FOREIGN KEY (`settlement_id`) REFERENCES `crm_payroll_settlements`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
