-- Daily mOS-owned CC KPI read model. Legacy transaction tables remain read-only.
CREATE TABLE `crm_cc_kpi_daily_projections` (
  `business_date` DATE NOT NULL,
  `store_scope` VARCHAR(40) NOT NULL,
  `payload` JSON NOT NULL,
  `source_revision` VARCHAR(191) NOT NULL,
  `formula_version` VARCHAR(40) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'FRESH',
  `computed_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `reconciled_at` DATETIME(0) NULL,
  `last_error` VARCHAR(500) NULL,
  INDEX `crm_cc_kpi_daily_projections_store_scope_status_computed_at_idx` (`store_scope`, `status`, `computed_at`),
  PRIMARY KEY (`business_date`, `store_scope`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
