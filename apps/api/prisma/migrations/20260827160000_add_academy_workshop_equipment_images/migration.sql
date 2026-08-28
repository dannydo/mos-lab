CREATE TABLE `crm_academy_workshop_equipment_package_images` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `equipment_package_id` INT NOT NULL,
  `image_url` VARCHAR(512) NOT NULL,
  `alt_text` VARCHAR(180) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `crm_academy_workshop_equipment_package_images_equipment_package_id_sort_order_idx` (`equipment_package_id`, `sort_order`),
  CONSTRAINT `crm_academy_workshop_equipment_package_images_equipment_package_id_fkey`
    FOREIGN KEY (`equipment_package_id`) REFERENCES `crm_academy_workshop_equipment_packages` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
