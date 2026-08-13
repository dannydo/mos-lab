CREATE TABLE `crm_fal_log_explanations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_service_id` BIGINT NOT NULL,
  `decision_status` VARCHAR(12) NOT NULL DEFAULT 'PENDING',
  `ledger_status` VARCHAR(16) NOT NULL DEFAULT 'NOT_APPLIED',
  `explanation` TEXT NULL,
  `explanation_channel` VARCHAR(30) NULL,
  `explained_by_staff_id` INT NULL,
  `approved_by_staff_id` INT NULL,
  `approved_at` DATETIME NULL,
  `rejection_reason` TEXT NULL,
  `applied_at` DATETIME NULL,
  `failure_reason` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `crm_fal_log_explanations_order_service_id_key` (`order_service_id`),
  KEY `crm_fal_log_explanations_decision_status_idx` (`decision_status`),
  KEY `crm_fal_log_explanations_ledger_status_idx` (`ledger_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `crm_fal_log_explanation_audits` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `decision_id` INT NOT NULL,
  `action` VARCHAR(30) NOT NULL,
  `actor_staff_id` INT NULL,
  `details` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `crm_fal_log_explanation_audits_decision_id_created_at_idx` (`decision_id`, `created_at`),
  CONSTRAINT `crm_fal_log_explanation_audits_decision_id_fkey`
    FOREIGN KEY (`decision_id`) REFERENCES `crm_fal_log_explanations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
