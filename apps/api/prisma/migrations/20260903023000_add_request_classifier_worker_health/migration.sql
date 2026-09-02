CREATE TABLE `crm_request_classifier_worker_health` (
  `worker_id` VARCHAR(100) NOT NULL,
  `worker_version` VARCHAR(100) NOT NULL,
  `session_id` VARCHAR(64) NOT NULL,
  `last_sequence` INTEGER NOT NULL DEFAULT 0,
  `last_client_sent_at` DATETIME(3) NOT NULL,
  `last_heartbeat_at` DATETIME(0) NOT NULL,
  `connection_mode` VARCHAR(20) NOT NULL,
  `active_job_kind` VARCHAR(32) NULL,
  `active_job_started_at` DATETIME(0) NULL,
  `last_outcome_kind` VARCHAR(32) NULL,
  `last_outcome_status` VARCHAR(16) NULL,
  `last_outcome_severity` VARCHAR(16) NULL,
  `last_outcome_code` VARCHAR(100) NULL,
  `last_outcome_client_at` DATETIME(3) NULL,
  `last_outcome_at` DATETIME(0) NULL,
  `last_completed_at` DATETIME(0) NULL,
  `last_failed_at` DATETIME(0) NULL,
  `consecutive_failure_count` INTEGER NOT NULL DEFAULT 0,
  `state` VARCHAR(16) NOT NULL DEFAULT 'OFFLINE',
  `state_reason` VARCHAR(100) NOT NULL DEFAULT 'NO_HEARTBEAT',
  `state_changed_at` DATETIME(0) NOT NULL,
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`worker_id`),
  INDEX `request_classifier_worker_health_seen_idx` (`last_heartbeat_at`),
  INDEX `request_classifier_worker_health_state_seen_idx` (`state`, `last_heartbeat_at`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_request_classifier_worker_health_transitions` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `worker_id` VARCHAR(100) NOT NULL,
  `from_state` VARCHAR(16) NULL,
  `to_state` VARCHAR(16) NOT NULL,
  `reason` VARCHAR(100) NOT NULL,
  `occurred_at` DATETIME(0) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `request_classifier_worker_transition_worker_time_idx` (`worker_id`, `occurred_at`),
  CONSTRAINT `request_classifier_worker_transition_worker_fkey`
    FOREIGN KEY (`worker_id`) REFERENCES `crm_request_classifier_worker_health`(`worker_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
