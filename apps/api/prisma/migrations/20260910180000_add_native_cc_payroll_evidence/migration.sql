-- Phase 4: mOS-owned CC payroll evidence.  Additive only; no historical
-- payroll is copied, recalculated, or mutated.
CREATE TABLE `crm_payroll_cc_evidence` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `evidence_key` VARCHAR(191) NOT NULL,
  `payroll_period_id` INTEGER NOT NULL,
  `subject_key` VARCHAR(191) NOT NULL,
  `evidence_kind` VARCHAR(32) NOT NULL,
  `component` VARCHAR(64) NOT NULL,
  `amount_half_dong` INTEGER NOT NULL,
  `source_reference` VARCHAR(191) NOT NULL,
  `source_hash` VARCHAR(128) NOT NULL,
  `source_occurred_at` DATETIME(0) NOT NULL,
  `policy_version` VARCHAR(64) NULL,
  `policy_hash` VARCHAR(128) NULL,
  `payload_json` LONGTEXT NOT NULL,
  `created_by_staff_id` INTEGER NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  UNIQUE INDEX `crm_payroll_cc_evidence_evidence_key_key` (`evidence_key`),
  INDEX `payroll_cc_evidence_period_subject_time_idx` (`payroll_period_id`, `subject_key`, `source_occurred_at`),
  INDEX `payroll_cc_evidence_source_reference_idx` (`source_reference`),
  PRIMARY KEY (`id`),
  CONSTRAINT `crm_payroll_cc_evidence_payroll_period_id_fkey`
    FOREIGN KEY (`payroll_period_id`) REFERENCES `crm_payroll_periods`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TRIGGER `crm_payroll_cc_evidence_no_update`
BEFORE UPDATE ON `crm_payroll_cc_evidence`
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Native CC payroll evidence is append-only';

CREATE TRIGGER `crm_payroll_cc_evidence_no_delete`
BEFORE DELETE ON `crm_payroll_cc_evidence`
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Native CC payroll evidence is append-only';
