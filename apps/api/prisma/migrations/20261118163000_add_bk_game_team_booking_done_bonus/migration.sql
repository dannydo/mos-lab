-- AlterTable
ALTER TABLE `crm_bk_games` ADD COLUMN `team_booking_done_bonus_config` LONGTEXT NULL;

-- CreateTable
CREATE TABLE `crm_bk_game_team_booking_done_bonuses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `game_id` INTEGER NOT NULL,
    `order_id` INTEGER NOT NULL,
    `order_key` VARCHAR(60) NULL,
    `staff_id` INTEGER NOT NULL,
    `customer_name` VARCHAR(180) NULL,
    `reward_date` VARCHAR(10) NOT NULL,
    `team_bookings` INTEGER NOT NULL DEFAULT 0,
    `tier_label` VARCHAR(120) NOT NULL,
    `bonus_per_done` INTEGER NOT NULL DEFAULT 0,
    `bonus_amount` INTEGER NOT NULL DEFAULT 0,
    `order_completed_at` DATETIME(0) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `uniq_team_bk_done_game_order`(`game_id`, `order_id`),
    INDEX `crm_bk_game_team_booking_done_bonuses_game_id_reward_date_idx`(`game_id`, `reward_date`),
    INDEX `crm_bk_game_team_booking_done_bonuses_game_id_staff_id_idx`(`game_id`, `staff_id`),
    INDEX `crm_bk_game_team_booking_done_bonuses_order_id_idx`(`order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `crm_bk_game_team_booking_done_bonuses` ADD CONSTRAINT `crm_bk_game_team_booking_done_bonuses_game_id_fkey` FOREIGN KEY (`game_id`) REFERENCES `crm_bk_games`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
