-- Durable mOS read model. Legacy transaction tables remain read-only.
CREATE TABLE `crm_customer_visit_projections` (
  `legacy_user_id` INTEGER NOT NULL,
  `last_visit_at` DATETIME(0) NULL,
  `source_revision` VARCHAR(191) NOT NULL,
  `formula_version` VARCHAR(40) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'FRESH',
  `computed_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `reconciled_at` DATETIME(0) NULL,
  `last_error` VARCHAR(500) NULL,
  INDEX `crm_customer_visit_projections_status_computed_at_idx` (`status`, `computed_at`),
  PRIMARY KEY (`legacy_user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_projection_jobs` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `projection_key` VARCHAR(80) NOT NULL,
  `entity_key` VARCHAR(100) NOT NULL,
  `source_revision` VARCHAR(191) NOT NULL,
  `reason` VARCHAR(80) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `available_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `leased_by` VARCHAR(100) NULL,
  `lease_expires_at` DATETIME(0) NULL,
  `last_error` VARCHAR(500) NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL,
  UNIQUE INDEX `crm_projection_jobs_projection_key_entity_key_key` (`projection_key`, `entity_key`),
  INDEX `crm_projection_jobs_status_available_at_idx` (`status`, `available_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

