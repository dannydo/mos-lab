-- AlterTable
ALTER TABLE `crm_bk_games` ADD COLUMN `done_bonus_config` LONGTEXT NULL;

-- CreateTable
CREATE TABLE `crm_bk_game_done_bonuses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `game_id` INTEGER NOT NULL,
    `order_id` INTEGER NOT NULL,
    `order_service_id` INTEGER NULL,
    `staff_id` INTEGER NOT NULL,
    `service_id` INTEGER NULL,
    `service_name` VARCHAR(255) NOT NULL,
    `original_price` DOUBLE NOT NULL DEFAULT 0,
    `actual_paid` DOUBLE NOT NULL DEFAULT 0,
    `discount_amount` DOUBLE NOT NULL DEFAULT 0,
    `condition_applied` VARCHAR(255) NULL,
    `bonus_amount` INTEGER NOT NULL DEFAULT 0,
    `order_completed_at` DATETIME(0) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `crm_bk_game_done_bonuses_game_id_staff_id_idx`(`game_id`, `staff_id`),
    INDEX `crm_bk_game_done_bonuses_order_id_idx`(`order_id`),
    UNIQUE INDEX `uniq_game_order`(`game_id`, `order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `crm_bk_game_done_bonuses` ADD CONSTRAINT `crm_bk_game_done_bonuses_game_id_fkey` FOREIGN KEY (`game_id`) REFERENCES `crm_bk_games`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
