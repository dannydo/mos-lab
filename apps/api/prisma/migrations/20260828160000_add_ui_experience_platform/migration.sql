CREATE TABLE `crm_ui_experience_activations` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `series_key` CHAR(36) NOT NULL,
  `revision` INTEGER NOT NULL DEFAULT 1,
  `supersedes_id` INTEGER NULL,
  `surface` VARCHAR(32) NOT NULL,
  `route_scope` VARCHAR(255) NOT NULL,
  `experience_key` VARCHAR(80) NULL,
  `experience_version` VARCHAR(30) NULL,
  `accent_preset_key` VARCHAR(80) NULL,
  `lifecycle` VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
  `starts_at` DATETIME(0) NULL,
  `ends_at` DATETIME(0) NULL,
  `cta_label` VARCHAR(100) NULL,
  `cta_url` VARCHAR(600) NULL,
  `tracking_key` VARCHAR(100) NULL,
  `created_by_staff_id` INTEGER NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),

  UNIQUE INDEX `crm_ui_experience_activations_series_key_revision_key` (`series_key`, `revision`),
  INDEX `ui_experience_resolver` (`surface`, `route_scope`, `lifecycle`),
  INDEX `ui_experience_schedule` (`starts_at`, `ends_at`),
  INDEX `crm_ui_experience_activations_supersedes_id_idx` (`supersedes_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_ui_experience_audits` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `activation_id` INTEGER NOT NULL,
  `series_key` CHAR(36) NOT NULL,
  `action` VARCHAR(40) NOT NULL,
  `actor_staff_id` INTEGER NULL,
  `before_json` LONGTEXT NULL,
  `after_json` LONGTEXT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

  INDEX `crm_ui_experience_audits_series_key_created_at_idx` (`series_key`, `created_at`),
  INDEX `crm_ui_experience_audits_actor_staff_id_created_at_idx` (`actor_staff_id`, `created_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `crm_ui_experience_audits_activation_id_fkey`
    FOREIGN KEY (`activation_id`) REFERENCES `crm_ui_experience_activations` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_ui_experience_metrics` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `activation_id` INTEGER NOT NULL,
  `metric_date` DATE NOT NULL,
  `event_type` VARCHAR(20) NOT NULL,
  `event_count` INTEGER NOT NULL DEFAULT 0,
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),

  UNIQUE INDEX `ui_experience_metric_unique` (`activation_id`, `metric_date`, `event_type`),
  INDEX `ui_experience_metric_date_event_idx` (`metric_date`, `event_type`),
  PRIMARY KEY (`id`),
  CONSTRAINT `crm_ui_experience_metrics_activation_id_fkey`
    FOREIGN KEY (`activation_id`) REFERENCES `crm_ui_experience_activations` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
