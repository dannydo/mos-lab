CREATE TABLE `crm_academy_workshop_equipment_templates` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(180) NOT NULL,
  `description` TEXT NULL,
  `created_by_staff_id` INT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `crm_academy_workshop_equipment_templates_title_key` (`title`),
  INDEX `crm_academy_equipment_tpl_creator_idx` (`created_by_staff_id`, `updated_at`),
  CONSTRAINT `crm_academy_equipment_tpl_creator_fk`
    FOREIGN KEY (`created_by_staff_id`) REFERENCES `crm_staff` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_academy_workshop_equipment_template_packages` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `template_id` INT NOT NULL,
  `name` VARCHAR(180) NOT NULL,
  `description` TEXT NULL,
  `included_items_json` TEXT NOT NULL,
  `price_vnd` INT NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_available` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `crm_academy_equipment_tpl_pkg_sort_idx` (`template_id`, `sort_order`),
  CONSTRAINT `crm_academy_equipment_tpl_pkg_fk`
    FOREIGN KEY (`template_id`) REFERENCES `crm_academy_workshop_equipment_templates` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_academy_workshop_equipment_template_package_images` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `template_package_id` INT NOT NULL,
  `image_url` VARCHAR(512) NOT NULL,
  `alt_text` VARCHAR(180) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `crm_academy_equipment_tpl_img_sort_idx` (`template_package_id`, `sort_order`),
  CONSTRAINT `crm_academy_equipment_tpl_img_fk`
    FOREIGN KEY (`template_package_id`) REFERENCES `crm_academy_workshop_equipment_template_packages` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
