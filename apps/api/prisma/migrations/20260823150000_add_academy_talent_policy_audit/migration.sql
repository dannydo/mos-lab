-- Preserve who changed the global Academy scholarship ladder and link future
-- invoice snapshots to that policy version for finance/audit reporting.
CREATE TABLE `crm_academy_talent_policy_audits` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `config_key` VARCHAR(80) NOT NULL,
  `policy_snapshot_json` LONGTEXT NOT NULL,
  `changed_by_staff_id` INTEGER NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  INDEX `acad_policy_audit_config_created_idx`(`config_key`, `created_at`),
  INDEX `acad_policy_audit_changer_created_idx`(`changed_by_staff_id`, `created_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `acad_talent_policy_audit_changer_fk`
    FOREIGN KEY (`changed_by_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `crm_academy_talent_assessments`
  ADD COLUMN `promotion_policy_audit_id` INTEGER NULL,
  ADD INDEX `crm_academy_talent_assessments_promotion_policy_audit_id_idx`(`promotion_policy_audit_id`),
  ADD CONSTRAINT `acad_talent_assessment_policy_audit_fk`
    FOREIGN KEY (`promotion_policy_audit_id`) REFERENCES `crm_academy_talent_policy_audits`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
