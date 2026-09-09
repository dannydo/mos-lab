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
  UNIQUE INDEX `crm_allocation_ledger_events_legacy_history_id_key`(`legacy_history_id`),
  INDEX `crm_allocation_ledger_events_legacy_user_id_occurred_at_idx`(`legacy_user_id`, `occurred_at`),
  INDEX `crm_allocation_ledger_events_batch_id_idx`(`batch_id`),
  INDEX `crm_allocation_ledger_events_campaign_id_idx`(`campaign_id`),
  INDEX `crm_allocation_ledger_events_correlation_id_idx`(`correlation_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `crm_allocation_ledger_events` (`legacy_user_id`, `event_type`, `previous_staff_id`, `next_staff_id`, `actor_staff_id`, `reason`, `source_type`, `action_context`, `batch_id`, `metadata_json`, `legacy_history_id`, `occurred_at`)
SELECT h.`legacy_user_id`, CASE h.`action_type`
  WHEN 'ACCEPT' THEN 'ACCEPTED' WHEN 'ACCEPT_ALLOCATION' THEN 'ACCEPTED'
  WHEN 'DECLINE_ALLOCATION' THEN 'DECLINED' WHEN 'RECALL_ALLOCATION' THEN 'RECALLED'
  WHEN 'REVOKE' THEN 'RETURNED_TO_POOL' WHEN 'TRANSFER' THEN 'TRANSFERRED'
  WHEN 'EXPIRE' THEN 'EXPIRED' WHEN 'RANDOM_SELECT' THEN 'RANDOM_SELECTED' ELSE 'SYSTEM_REPAIR' END,
  h.`prev_staff_id`, h.`new_staff_id`, h.`assigned_by`, h.`reason`, h.`source_type`,
  'LEGACY_ASSIGNMENT_HISTORY_BACKFILL', h.`batch_id`,
  JSON_OBJECT('legacyActionType', h.`action_type`, 'legacyIsUndone', h.`is_undone`, 'legacyUndoneAt', h.`undone_at`), h.`id`, h.`assigned_at`
FROM `crm_assignment_history` h;
