-- Printing a tuition document is payment intent, not settlement. Keep an
-- append-only confirmed-payment ledger so printed-but-unpaid quotes remain
-- editable while fully paid documents are locked.
ALTER TABLE `crm_academy_talent_assessments`
  ADD COLUMN `invoice_revision` INTEGER NOT NULL DEFAULT 0;

CREATE TABLE `crm_academy_talent_payments` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `assessment_id` INTEGER NOT NULL,
  `amount_vnd` INTEGER NOT NULL,
  `reference` VARCHAR(160) NULL,
  `note` TEXT NULL,
  `received_at` DATETIME(0) NOT NULL,
  `confirmed_by_staff_id` INTEGER NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  INDEX `crm_academy_talent_payments_assessment_id_received_at_idx`(`assessment_id`, `received_at`),
  INDEX `crm_academy_talent_payments_confirmed_by_staff_id_created_at_idx`(`confirmed_by_staff_id`, `created_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `acad_talent_payment_assessment_fk`
    FOREIGN KEY (`assessment_id`) REFERENCES `crm_academy_talent_assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `acad_talent_payment_confirmer_fk`
    FOREIGN KEY (`confirmed_by_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
