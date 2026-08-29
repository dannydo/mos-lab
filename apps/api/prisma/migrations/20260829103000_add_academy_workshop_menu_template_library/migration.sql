CREATE TABLE `crm_academy_workshop_menu_templates` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(180) NOT NULL,
  `description` TEXT NULL,
  `created_by_staff_id` INT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `crm_academy_workshop_menu_templates_title_key` (`title`),
  INDEX `crm_academy_menu_tpl_creator_updated_idx` (`created_by_staff_id`, `updated_at`),
  CONSTRAINT `crm_academy_workshop_menu_templates_created_by_staff_id_fkey`
    FOREIGN KEY (`created_by_staff_id`) REFERENCES `crm_staff` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_academy_workshop_menu_template_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `template_id` INT NOT NULL,
  `category` VARCHAR(24) NOT NULL,
  `name` VARCHAR(180) NOT NULL,
  `description` TEXT NULL,
  `image_url` VARCHAR(512) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_available` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `crm_academy_menu_tpl_item_sort_idx` (`template_id`, `category`, `sort_order`),
  CONSTRAINT `crm_academy_workshop_menu_template_items_template_id_fkey`
    FOREIGN KEY (`template_id`) REFERENCES `crm_academy_workshop_menu_templates` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
