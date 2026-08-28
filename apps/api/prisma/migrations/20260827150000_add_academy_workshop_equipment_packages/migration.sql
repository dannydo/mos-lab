CREATE TABLE `crm_academy_workshop_equipment_packages` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `workshop_id` INT NOT NULL,
  `name` VARCHAR(180) NOT NULL,
  `description` TEXT NULL,
  `included_items_json` TEXT NOT NULL,
  `price_vnd` INT NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_available` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `crm_academy_workshop_equipment_packages_workshop_id_sort_order_idx` (`workshop_id`, `sort_order`),
  INDEX `crm_academy_workshop_equipment_packages_workshop_id_is_available_idx` (`workshop_id`, `is_available`),
  CONSTRAINT `crm_academy_workshop_equipment_packages_workshop_id_fkey`
    FOREIGN KEY (`workshop_id`) REFERENCES `crm_academy_workshops` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_academy_workshop_participant_equipment_selections` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `participant_id` INT NOT NULL,
  `equipment_package_id` INT NULL,
  `package_name` VARCHAR(180) NOT NULL,
  `package_contents_json` TEXT NOT NULL,
  `price_vnd` INT NOT NULL,
  `selected_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `crm_academy_workshop_participant_equipment_selections_participant_id_key` (`participant_id`),
  INDEX `crm_academy_workshop_participant_equipment_selections_equipment_package_id_idx` (`equipment_package_id`),
  CONSTRAINT `crm_academy_workshop_participant_equipment_selections_participant_id_fkey`
    FOREIGN KEY (`participant_id`) REFERENCES `crm_academy_workshop_participants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `crm_academy_workshop_participant_equipment_selections_equipment_package_id_fkey`
    FOREIGN KEY (`equipment_package_id`) REFERENCES `crm_academy_workshop_equipment_packages` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
