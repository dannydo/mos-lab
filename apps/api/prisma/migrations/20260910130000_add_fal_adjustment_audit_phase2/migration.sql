CREATE TABLE `crm_payroll_settlements` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `payroll_period_id` INTEGER NOT NULL,
  `version` INTEGER NOT NULL,
  `status` VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  `calculator_version` VARCHAR(64) NOT NULL,
  `source_cutoff_at` DATETIME(0) NULL,
  `input_hash` VARCHAR(128) NOT NULL,
  `created_by_staff_id` INTEGER NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL,

  UNIQUE INDEX `payroll_settlement_period_version`(`payroll_period_id`, `version`),
  INDEX `payroll_settlement_period_status_idx`(`payroll_period_id`, `status`),
  PRIMARY KEY (`id`),
  CONSTRAINT `crm_payroll_settlements_payroll_period_id_fkey`
    FOREIGN KEY (`payroll_period_id`) REFERENCES `crm_payroll_periods`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_fal_adjustment_cases` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `event_key` VARCHAR(191) NOT NULL,
  `fal_type` VARCHAR(16) NOT NULL,
  `origin_order_service_id` INTEGER NOT NULL,
  `remediation_order_service_id` INTEGER NOT NULL,
  `origin_occurred_at` DATETIME(0) NOT NULL,
  `source_period_id` INTEGER NOT NULL,
  `target_period_id` INTEGER NOT NULL,
  `source_period_status` VARCHAR(24) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  `reason` TEXT NULL,
  `source_fingerprint` VARCHAR(128) NOT NULL,
  `calculator_version` VARCHAR(64) NOT NULL,
  `settlement_version` INTEGER NOT NULL,
  `requested_by_staff_id` INTEGER NULL,
  `approved_by_staff_id` INTEGER NULL,
  `approved_at` DATETIME(0) NULL,
  `rejected_at` DATETIME(0) NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL,

  UNIQUE INDEX `crm_fal_adjustment_cases_event_key_key`(`event_key`),
  INDEX `fal_adjustment_source_period_status_idx`(`source_period_id`, `status`),
  INDEX `fal_adjustment_target_period_status_idx`(`target_period_id`, `status`),
  INDEX `fal_adjustment_remediation_service_idx`(`remediation_order_service_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `crm_fal_adjustment_cases_source_period_id_fkey`
    FOREIGN KEY (`source_period_id`) REFERENCES `crm_payroll_periods`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `crm_fal_adjustment_cases_target_period_id_fkey`
    FOREIGN KEY (`target_period_id`) REFERENCES `crm_payroll_periods`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_fal_adjustment_snapshots` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `case_id` INTEGER NOT NULL,
  `revision` INTEGER NOT NULL,
  `input_json` LONGTEXT NOT NULL,
  `source_ledger_json` LONGTEXT NOT NULL,
  `shadow_settlement_json` LONGTEXT NOT NULL,
  `before_net_amount` INTEGER NOT NULL,
  `after_net_amount` INTEGER NOT NULL,
  `net_delta` INTEGER NOT NULL,
  `input_hash` VARCHAR(128) NOT NULL,
  `computed_by_staff_id` INTEGER NULL,
  `computed_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

  UNIQUE INDEX `fal_adjustment_snapshot_case_revision`(`case_id`, `revision`),
  INDEX `fal_adjustment_snapshot_case_computed_idx`(`case_id`, `computed_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `crm_fal_adjustment_snapshots_case_id_fkey`
    FOREIGN KEY (`case_id`) REFERENCES `crm_fal_adjustment_cases`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_fal_adjustment_lines` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `case_id` INTEGER NOT NULL,
  `snapshot_id` INTEGER NOT NULL,
  `line_key` VARCHAR(191) NOT NULL,
  `recipient_legacy_staff_id` INTEGER NOT NULL,
  `recipient_role` VARCHAR(16) NOT NULL,
  `component` VARCHAR(64) NOT NULL,
  `before_amount` INTEGER NOT NULL,
  `after_amount` INTEGER NOT NULL,
  `delta_amount` INTEGER NOT NULL,
  `effect` VARCHAR(40) NOT NULL,
  `posting_state` VARCHAR(24) NOT NULL DEFAULT 'NOT_POSTED',
  `posted_at` DATETIME(0) NULL,
  `target_payroll_reference` VARCHAR(191) NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

  UNIQUE INDEX `fal_adjustment_line_snapshot_key`(`snapshot_id`, `line_key`),
  INDEX `fal_adjustment_line_case_posting_idx`(`case_id`, `posting_state`),
  PRIMARY KEY (`id`),
  CONSTRAINT `crm_fal_adjustment_lines_case_id_fkey`
    FOREIGN KEY (`case_id`) REFERENCES `crm_fal_adjustment_cases`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `crm_fal_adjustment_lines_snapshot_id_fkey`
    FOREIGN KEY (`snapshot_id`) REFERENCES `crm_fal_adjustment_snapshots`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_fal_adjustment_audits` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `case_id` INTEGER NOT NULL,
  `action` VARCHAR(50) NOT NULL,
  `actor_staff_id` INTEGER NULL,
  `reason` TEXT NULL,
  `before_json` LONGTEXT NULL,
  `after_json` LONGTEXT NULL,
  `correlation_key` VARCHAR(128) NOT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

  INDEX `fal_adjustment_audit_case_created_idx`(`case_id`, `created_at`),
  INDEX `fal_adjustment_audit_correlation_idx`(`correlation_key`),
  PRIMARY KEY (`id`),
  CONSTRAINT `crm_fal_adjustment_audits_case_id_fkey`
    FOREIGN KEY (`case_id`) REFERENCES `crm_fal_adjustment_cases`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
