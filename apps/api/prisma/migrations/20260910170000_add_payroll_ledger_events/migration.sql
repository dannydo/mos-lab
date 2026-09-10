CREATE TABLE `crm_payroll_ledger_events` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `event_key` VARCHAR(191) NOT NULL,
  `payroll_period_id` INTEGER NOT NULL,
  `subject_key` VARCHAR(191) NOT NULL,
  `source_type` VARCHAR(32) NOT NULL,
  `component` VARCHAR(64) NOT NULL,
  `amount_half_dong` INTEGER NOT NULL,
  `source_reference` VARCHAR(191) NOT NULL,
  `source_hash` VARCHAR(128) NOT NULL,
  `source_occurred_at` DATETIME(0) NOT NULL,
  `metadata_json` LONGTEXT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  UNIQUE INDEX `crm_payroll_ledger_events_event_key_key` (`event_key`),
  INDEX `payroll_ledger_period_subject_time_idx` (`payroll_period_id`, `subject_key`, `source_occurred_at`),
  INDEX `payroll_ledger_source_reference_idx` (`source_reference`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `crm_payroll_ledger_events`
  ADD CONSTRAINT `crm_payroll_ledger_events_payroll_period_id_fkey`
  FOREIGN KEY (`payroll_period_id`) REFERENCES `crm_payroll_periods`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER `crm_payroll_ledger_events_no_update`
BEFORE UPDATE ON `crm_payroll_ledger_events`
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Payroll ledger events are append-only';

CREATE TRIGGER `crm_payroll_ledger_events_no_delete`
BEFORE DELETE ON `crm_payroll_ledger_events`
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Payroll ledger events are append-only';
