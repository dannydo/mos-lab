-- Native Wings Academy "Tố Chất" workshop sessions. These records replace
-- portal note/localStorage state and retain immutable snapshots for issued
-- tuition documents.
CREATE TABLE `crm_academy_talent_assessments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lead_id` INTEGER NOT NULL,
    `evaluator_staff_id` INTEGER NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    `eye_score` INTEGER NOT NULL DEFAULT 0,
    `hand_score` INTEGER NOT NULL DEFAULT 0,
    `strands_5_min` INTEGER NOT NULL DEFAULT 0,
    `error_root` INTEGER NOT NULL DEFAULT 0,
    `error_skin` INTEGER NOT NULL DEFAULT 0,
    `error_stickies` INTEGER NOT NULL DEFAULT 0,
    `error_direction` INTEGER NOT NULL DEFAULT 0,
    `offer_expires_at` DATETIME(0) NOT NULL,
    `selected_course_ids` LONGTEXT NULL,
    `course_snapshot_json` LONGTEXT NULL,
    `quote_snapshot_json` LONGTEXT NULL,
    `payment_mode` VARCHAR(20) NOT NULL DEFAULT 'THINKING',
    `deposit_vnd` INTEGER NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `invoice_number` VARCHAR(80) NULL,
    `invoice_snapshot_json` LONGTEXT NULL,
    `invoice_printed_at` DATETIME(0) NULL,
    `invoice_printed_by_staff_id` INTEGER NULL,
    `invoice_print_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `crm_academy_talent_assessments_invoice_number_key`(`invoice_number`),
    INDEX `crm_academy_talent_assessments_lead_id_created_at_idx`(`lead_id`, `created_at`),
    INDEX `crm_academy_talent_assessments_lead_id_status_idx`(`lead_id`, `status`),
    INDEX `crm_academy_talent_assessments_offer_expires_at_idx`(`offer_expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `crm_academy_talent_assessments`
  ADD CONSTRAINT `acad_talent_assessment_lead_fk`
  FOREIGN KEY (`lead_id`) REFERENCES `crm_academy_leads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `acad_talent_assessment_evaluator_fk`
  FOREIGN KEY (`evaluator_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `acad_talent_assessment_invoice_printer_fk`
  FOREIGN KEY (`invoice_printed_by_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
