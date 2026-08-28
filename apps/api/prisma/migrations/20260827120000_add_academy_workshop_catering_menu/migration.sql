CREATE TABLE `crm_academy_workshop_menu_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `workshop_id` INT NOT NULL,
  `category` VARCHAR(24) NOT NULL,
  `name` VARCHAR(180) NOT NULL,
  `description` TEXT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_available` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `crm_academy_workshop_menu_items_workshop_id_category_sort_order_idx` (`workshop_id`, `category`, `sort_order`),
  INDEX `crm_academy_workshop_menu_items_workshop_id_is_available_idx` (`workshop_id`, `is_available`),
  CONSTRAINT `crm_academy_workshop_menu_items_workshop_id_fkey`
    FOREIGN KEY (`workshop_id`) REFERENCES `crm_academy_workshops` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_academy_workshop_participant_menu_selections` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `participant_id` INT NOT NULL,
  `menu_item_id` INT NULL,
  `category` VARCHAR(24) NOT NULL,
  `item_name` VARCHAR(180) NOT NULL,
  `selected_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `crm_academy_workshop_participant_menu_selections_participant_id_category_key` (`participant_id`, `category`),
  INDEX `crm_academy_workshop_participant_menu_selections_menu_item_id_idx` (`menu_item_id`),
  CONSTRAINT `crm_academy_workshop_participant_menu_selections_participant_id_fkey`
    FOREIGN KEY (`participant_id`) REFERENCES `crm_academy_workshop_participants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `crm_academy_workshop_participant_menu_selections_menu_item_id_fkey`
    FOREIGN KEY (`menu_item_id`) REFERENCES `crm_academy_workshop_menu_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
