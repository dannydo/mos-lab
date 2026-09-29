-- AlterTable
ALTER TABLE `crm_academy_workshops`
  ADD COLUMN `parent_workshop_id` INTEGER NULL,
  ADD COLUMN `series_key` VARCHAR(64) NULL;

-- CreateIndex
CREATE INDEX `idx_crm_academy_workshop_series_key` ON `crm_academy_workshops`(`series_key`);
CREATE INDEX `idx_crm_academy_workshop_parent` ON `crm_academy_workshops`(`parent_workshop_id`);

-- AddForeignKey
ALTER TABLE `crm_academy_workshops` ADD CONSTRAINT `crm_academy_workshops_parent_workshop_id_fkey` FOREIGN KEY (`parent_workshop_id`) REFERENCES `crm_academy_workshops`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
