-- AlterTable
ALTER TABLE `crm_pilot_materials`
  ADD COLUMN `image_url` VARCHAR(512) NULL,
  ADD COLUMN `item_type` VARCHAR(30) NOT NULL DEFAULT 'CONSUMABLE';

-- AlterTable
ALTER TABLE `crm_pilot_sessions`
  ADD COLUMN `is_stock_deducted` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `stock_inventory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `material_id` INTEGER NULL,
    `material_name` VARCHAR(120) NOT NULL,
    `unit` VARCHAR(30) NOT NULL,
    `quantity` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `min_quantity` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `warehouse` VARCHAR(50) NOT NULL DEFAULT 'detham',
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `stock_inventory_material_id_warehouse_key`(`material_id`, `warehouse`),
    INDEX `stock_inventory_warehouse_idx`(`warehouse`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `stock_inventory` ADD CONSTRAINT `stock_inventory_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `crm_pilot_materials`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
