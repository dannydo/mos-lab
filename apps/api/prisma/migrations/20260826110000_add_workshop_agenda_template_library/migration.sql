CREATE TABLE `crm_academy_workshop_agenda_templates` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(180) NOT NULL,
  `description` TEXT NULL,
  `created_by_staff_id` INT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL,
  UNIQUE INDEX `crm_academy_workshop_agenda_templates_title_key` (`title`),
  INDEX `crm_academy_workshop_agenda_templates_created_by_staff_id_updated_at_idx` (`created_by_staff_id`, `updated_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `crm_academy_workshop_agenda_templates_created_by_staff_id_fkey`
    FOREIGN KEY (`created_by_staff_id`) REFERENCES `crm_staff` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_academy_workshop_agenda_template_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `template_id` INT NOT NULL,
  `title` VARCHAR(180) NOT NULL,
  `description` TEXT NULL,
  `kind` VARCHAR(24) NOT NULL DEFAULT 'CONTENT',
  `planned_duration_seconds` INT NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL,
  INDEX `crm_academy_workshop_agenda_template_items_template_id_sort_order_idx` (`template_id`, `sort_order`),
  PRIMARY KEY (`id`),
  CONSTRAINT `crm_academy_workshop_agenda_template_items_template_id_fkey`
    FOREIGN KEY (`template_id`) REFERENCES `crm_academy_workshop_agenda_templates` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `crm_academy_workshops`
  ADD COLUMN `agenda_template_id` INT NULL AFTER `agenda_preset_key`,
  ADD INDEX `crm_academy_workshops_agenda_template_id_idx` (`agenda_template_id`),
  ADD CONSTRAINT `crm_academy_workshops_agenda_template_id_fkey`
    FOREIGN KEY (`agenda_template_id`) REFERENCES `crm_academy_workshop_agenda_templates` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
