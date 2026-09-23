-- Add lash design templates and workshop lash design models

CREATE TABLE `crm_academy_workshop_design_templates` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(180) NOT NULL,
  `description` TEXT NULL,
  `created_by_staff_id` INT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `crm_academy_workshop_design_templates_title_key` (`title`),
  INDEX `crm_academy_design_tpl_creator_idx` (`created_by_staff_id`, `updated_at`),
  CONSTRAINT `crm_academy_design_tpl_creator_fk`
    FOREIGN KEY (`created_by_staff_id`) REFERENCES `crm_staff` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_academy_workshop_design_template_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `template_id` INT NOT NULL,
  `name` VARCHAR(180) NOT NULL,
  `description` TEXT NULL,
  `difficulty_level` VARCHAR(24) NOT NULL DEFAULT 'BASIC',
  `price_vnd` INT NOT NULL DEFAULT 0,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_available` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `crm_academy_design_tpl_item_sort_idx` (`template_id`, `sort_order`),
  CONSTRAINT `crm_academy_design_tpl_item_fk`
    FOREIGN KEY (`template_id`) REFERENCES `crm_academy_workshop_design_templates` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_academy_workshop_design_template_item_images` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `template_item_id` INT NOT NULL,
  `image_url` VARCHAR(512) NOT NULL,
  `alt_text` VARCHAR(180) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `crm_academy_design_tpl_img_sort_idx` (`template_item_id`, `sort_order`),
  CONSTRAINT `crm_academy_design_tpl_img_fk`
    FOREIGN KEY (`template_item_id`) REFERENCES `crm_academy_workshop_design_template_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `crm_academy_workshops`
  ADD COLUMN `design_agenda_item_id` INT NULL AFTER `equipment_agenda_item_id`,
  ADD COLUMN `design_selection_deadline` DATETIME(0) NULL AFTER `equipment_selection_deadline`,
  ADD COLUMN `design_template_id` INT NULL AFTER `equipment_template_id`,
  ADD UNIQUE INDEX `crm_academy_workshops_design_agenda_item_id_key` (`design_agenda_item_id`),
  ADD INDEX `crm_academy_workshops_design_template_id_idx` (`design_template_id`),
  ADD CONSTRAINT `crm_academy_workshops_design_agenda_item_id_fkey`
    FOREIGN KEY (`design_agenda_item_id`) REFERENCES `crm_academy_workshop_agenda_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `crm_academy_workshops_design_template_id_fkey`
    FOREIGN KEY (`design_template_id`) REFERENCES `crm_academy_workshop_design_templates` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `crm_academy_workshop_design_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `workshop_id` INT NOT NULL,
  `name` VARCHAR(180) NOT NULL,
  `description` TEXT NULL,
  `difficulty_level` VARCHAR(24) NOT NULL DEFAULT 'BASIC',
  `price_vnd` INT NOT NULL DEFAULT 0,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_available` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `crm_academy_workshop_design_items_workshop_id_sort_order_idx` (`workshop_id`, `sort_order`),
  INDEX `crm_academy_workshop_design_items_workshop_id_is_available_idx` (`workshop_id`, `is_available`),
  CONSTRAINT `crm_academy_workshop_design_items_workshop_id_fkey`
    FOREIGN KEY (`workshop_id`) REFERENCES `crm_academy_workshops` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_academy_workshop_design_item_images` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `design_item_id` INT NOT NULL,
  `image_url` VARCHAR(512) NOT NULL,
  `alt_text` VARCHAR(180) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `crm_academy_workshop_design_item_images_sort_idx` (`design_item_id`, `sort_order`),
  CONSTRAINT `crm_academy_workshop_design_item_images_design_item_id_fkey`
    FOREIGN KEY (`design_item_id`) REFERENCES `crm_academy_workshop_design_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_academy_workshop_participant_design_selections` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `participant_id` INT NOT NULL,
  `design_item_id` INT NULL,
  `design_name` VARCHAR(180) NOT NULL,
  `difficulty_level` VARCHAR(24) NOT NULL DEFAULT 'BASIC',
  `price_vnd` INT NOT NULL DEFAULT 0,
  `selected_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `crm_ac_ws_part_design_sel_part_id_key` (`participant_id`),
  INDEX `crm_ac_ws_part_design_sel_item_id_idx` (`design_item_id`),
  CONSTRAINT `crm_ac_ws_part_design_sel_part_id_fk`
    FOREIGN KEY (`participant_id`) REFERENCES `crm_academy_workshop_participants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `crm_ac_ws_part_design_sel_item_id_fk`
    FOREIGN KEY (`design_item_id`) REFERENCES `crm_academy_workshop_design_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
