-- Historical baseline repair: the assignment lifecycle fields were introduced
-- in the Prisma schema before the later performance-index migration consumed
-- them. Recreate the original lifecycle contract before adding those indexes.
ALTER TABLE `crm_customer_assignments`
    DROP FOREIGN KEY `crm_customer_assignments_staff_id_fkey`,
    MODIFY `staff_id` INTEGER NULL,
    ADD COLUMN `expires_at` DATETIME(0) NULL,
    ADD COLUMN `assigned_duration_days` INTEGER NULL,
    ADD COLUMN `is_retained` TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN `retained_at` DATETIME(0) NULL;

ALTER TABLE `crm_customer_assignments`
    ADD CONSTRAINT `crm_customer_assignments_staff_id_fkey`
    FOREIGN KEY (`staff_id`) REFERENCES `crm_staff`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `crm_assignment_history`
    ADD COLUMN `expires_at` DATETIME(0) NULL,
    ADD COLUMN `source_type` VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    ADD COLUMN `source_filter_json` TEXT NULL,
    ADD COLUMN `source_filter_summary` TEXT NULL,
    ADD COLUMN `action_type` VARCHAR(20) NOT NULL DEFAULT 'ASSIGN',
    ADD COLUMN `reason` TEXT NULL;
