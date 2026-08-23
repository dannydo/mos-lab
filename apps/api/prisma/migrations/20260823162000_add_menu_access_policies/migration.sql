-- Menu visibility is an organizational discovery layer. API/route guards
-- remain authoritative for data access, even when a menu is visible.
CREATE TABLE `crm_menu_access_policies` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `menu_key` VARCHAR(80) NOT NULL,
  `is_restricted` TINYINT NOT NULL DEFAULT 0,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  UNIQUE INDEX `crm_menu_access_policies_menu_key_key`(`menu_key`),
  INDEX `crm_menu_access_policies_is_restricted_idx`(`is_restricted`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_menu_access_rules` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `policy_id` INTEGER NOT NULL,
  `subject_type` VARCHAR(16) NOT NULL,
  `subject_id` INTEGER NOT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  UNIQUE INDEX `crm_menu_access_rules_policy_id_subject_type_subject_id_key`(`policy_id`, `subject_type`, `subject_id`),
  INDEX `crm_menu_access_rules_subject_type_subject_id_idx`(`subject_type`, `subject_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `crm_menu_access_rules_policy_id_fkey`
    FOREIGN KEY (`policy_id`) REFERENCES `crm_menu_access_policies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_menu_access_audits` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `menu_key` VARCHAR(80) NOT NULL,
  `actor_staff_id` INTEGER NULL,
  `before_json` TEXT NULL,
  `after_json` TEXT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  INDEX `crm_menu_access_audits_menu_key_created_at_idx`(`menu_key`, `created_at`),
  INDEX `crm_menu_access_audits_actor_staff_id_created_at_idx`(`actor_staff_id`, `created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
