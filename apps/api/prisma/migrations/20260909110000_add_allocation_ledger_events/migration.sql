CREATE TABLE `crm_allocation_ledger_events` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `legacy_user_id` INTEGER NOT NULL,
  `event_type` VARCHAR(40) NOT NULL,
  `previous_staff_id` INTEGER NULL,
  `next_staff_id` INTEGER NULL,
  `actor_staff_id` INTEGER NULL,
  `actor_kind` VARCHAR(16) NOT NULL DEFAULT 'USER',
  `previous_staff_label` VARCHAR(150) NULL,
  `next_staff_label` VARCHAR(150) NULL,
  `actor_label` VARCHAR(150) NULL,
  `reason` TEXT NULL,
  `source_type` VARCHAR(40) NOT NULL DEFAULT 'MANUAL',
  `action_context` VARCHAR(80) NULL,
  `batch_id` VARCHAR(80) NULL,
  `campaign_id` INTEGER NULL,
  `correlation_id` VARCHAR(100) NULL,
  `metadata_json` LONGTEXT NULL,
  `legacy_history_id` INTEGER NULL,
  `occurred_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  UNIQUE INDEX `crm_allocation_ledger_events_legacy_history_id_key` (`legacy_history_id`),
  INDEX `crm_allocation_ledger_events_legacy_user_id_occurred_at_idx` (`legacy_user_id`, `occurred_at`),
  INDEX `crm_allocation_ledger_events_batch_id_idx` (`batch_id`),
  INDEX `crm_allocation_ledger_events_campaign_id_idx` (`campaign_id`),
  INDEX `crm_allocation_ledger_events_correlation_id_idx` (`correlation_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_allocation_ledger_backfills` (
  `id` VARCHAR(80) NOT NULL,
  `last_legacy_history_id` INTEGER NOT NULL DEFAULT 0,
  `processed_count` INTEGER NOT NULL DEFAULT 0,
  `last_batch_count` INTEGER NOT NULL DEFAULT 0,
  `state` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  `started_at` DATETIME(0) NULL,
  `completed_at` DATETIME(0) NULL,
  `last_error` TEXT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TRIGGER `crm_allocation_ledger_events_no_update`
BEFORE UPDATE ON `crm_allocation_ledger_events`
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Allocation ledger events are append-only';

CREATE TRIGGER `crm_allocation_ledger_events_no_delete`
BEFORE DELETE ON `crm_allocation_ledger_events`
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Allocation ledger events are append-only';
