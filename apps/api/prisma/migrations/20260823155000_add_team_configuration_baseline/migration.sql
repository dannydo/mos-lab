-- Team configuration predates the Academy workspace. These tables were
-- historically introduced through schema push, which left clean Prisma
-- replays without the prerequisite required by the Academy access seed.
CREATE TABLE `crm_teams` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(30) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `color` VARCHAR(30) NULL,
  `icon` VARCHAR(50) NULL,
  `sort_order` INTEGER NOT NULL DEFAULT 0,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `parent_team_id` INTEGER NULL,
  `metadata` TEXT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL,
  UNIQUE INDEX `crm_teams_code_key`(`code`),
  INDEX `crm_teams_parent_team_id_idx`(`parent_team_id`),
  INDEX `crm_teams_is_active_idx`(`is_active`),
  PRIMARY KEY (`id`),
  CONSTRAINT `crm_teams_parent_team_id_fkey`
    FOREIGN KEY (`parent_team_id`) REFERENCES `crm_teams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_team_members` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `team_id` INTEGER NOT NULL,
  `legacy_staff_id` INTEGER NOT NULL,
  `crm_staff_id` INTEGER NULL,
  `display_name` VARCHAR(100) NULL,
  `role` VARCHAR(20) NULL,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `sort_order` INTEGER NOT NULL DEFAULT 0,
  `joined_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `left_at` DATETIME(0) NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL,
  UNIQUE INDEX `crm_team_members_team_id_legacy_staff_id_key`(`team_id`, `legacy_staff_id`),
  INDEX `crm_team_members_legacy_staff_id_idx`(`legacy_staff_id`),
  INDEX `crm_team_members_crm_staff_id_idx`(`crm_staff_id`),
  INDEX `crm_team_members_is_active_idx`(`is_active`),
  PRIMARY KEY (`id`),
  CONSTRAINT `crm_team_members_team_id_fkey`
    FOREIGN KEY (`team_id`) REFERENCES `crm_teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
