-- CreateTable
CREATE TABLE IF NOT EXISTS `crm_bk_games` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `game_type` VARCHAR(30) NOT NULL DEFAULT 'INDIVIDUAL',
    `metric_type` VARCHAR(50) NOT NULL DEFAULT 'BOOKINGS',
    `target_score` INTEGER NULL,
    `start_date` DATETIME(0) NOT NULL,
    `end_date` DATETIME(0) NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    `entry_fee` INTEGER NOT NULL DEFAULT 0,
    `reward_pool` INTEGER NOT NULL DEFAULT 0,
    `reward_description` TEXT NULL,
    `penalty_description` TEXT NULL,
    `winner_criteria` VARCHAR(50) NOT NULL DEFAULT 'TOP_1',
    `announced_results` LONGTEXT NULL,
    `created_by_staff_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `crm_bk_games_status_idx`(`status`),
    INDEX `crm_bk_games_start_date_end_date_idx`(`start_date`, `end_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `crm_bk_game_teams` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `game_id` INTEGER NOT NULL,
    `team_name` VARCHAR(100) NOT NULL,
    `color` VARCHAR(30) NULL,
    `score` INTEGER NOT NULL DEFAULT 0,
    `rank` INTEGER NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `crm_bk_game_teams_game_id_idx`(`game_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `crm_bk_game_teams_game_id_fkey` FOREIGN KEY (`game_id`) REFERENCES `crm_bk_games`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `crm_bk_game_participants` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `game_id` INTEGER NOT NULL,
    `staff_id` INTEGER NOT NULL,
    `staff_name` VARCHAR(100) NOT NULL,
    `avatar` VARCHAR(255) NULL,
    `team_id` INTEGER NULL,
    `bet_amount` INTEGER NOT NULL DEFAULT 0,
    `score` INTEGER NOT NULL DEFAULT 0,
    `rank` INTEGER NULL,
    `reward_amount` INTEGER NOT NULL DEFAULT 0,
    `penalty_note` VARCHAR(255) NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `crm_bk_game_participants_game_id_idx`(`game_id`),
    INDEX `crm_bk_game_participants_staff_id_idx`(`staff_id`),
    UNIQUE INDEX `crm_bk_game_participants_game_id_staff_id_key`(`game_id`, `staff_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `crm_bk_game_participants_game_id_fkey` FOREIGN KEY (`game_id`) REFERENCES `crm_bk_games`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `crm_bk_game_participants_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `crm_bk_game_teams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
