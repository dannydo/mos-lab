CREATE TABLE `crm_impersonation_audits` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `actor_staff_id` INTEGER NULL,
  `target_staff_id` INTEGER NULL,
  `actor_username` VARCHAR(100) NOT NULL,
  `actor_display_name` VARCHAR(100) NOT NULL,
  `target_username` VARCHAR(100) NOT NULL,
  `target_display_name` VARCHAR(100) NOT NULL,
  `expires_at` DATETIME(0) NOT NULL,
  `ended_at` DATETIME(0) NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  INDEX `crm_impersonation_audits_actor_staff_id_created_at_idx` (`actor_staff_id`, `created_at`),
  INDEX `crm_impersonation_audits_target_staff_id_created_at_idx` (`target_staff_id`, `created_at`),
  INDEX `crm_impersonation_audits_expires_at_idx` (`expires_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `crm_impersonation_audits_actor_staff_id_fkey`
    FOREIGN KEY (`actor_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `crm_impersonation_audits_target_staff_id_fkey`
    FOREIGN KEY (`target_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
