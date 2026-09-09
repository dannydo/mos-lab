-- Historical baseline repair: the Custom Campaign workspace was schema-pushed
-- before the tracked promotion migrations began. Restore its pre-promotion
-- table contract so the later additive migrations can replay from empty.
CREATE TABLE `crm_allocation_batches` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `batch_code` VARCHAR(50) NOT NULL,
    `assigner_id` INTEGER NOT NULL,
    `booker_id` INTEGER NOT NULL,
    `total_count` INTEGER NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING_ACCEPT',
    `decline_reason` TEXT NULL,
    `decline_category` VARCHAR(100) NULL,
    `decline_note` TEXT NULL,
    `expires_at` DATETIME(0) NOT NULL,
    `accepted_at` DATETIME(0) NULL,
    `declined_at` DATETIME(0) NULL,
    `recalled_at` DATETIME(0) NULL,
    `retention_expires_at` DATETIME(0) NULL,
    `source_filter_summary` TEXT NULL,
    `source_filter_json` TEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `crm_allocation_batches_batch_code_key` (`batch_code`),
    INDEX `crm_allocation_batches_booker_id_idx` (`booker_id`),
    INDEX `crm_allocation_batches_assigner_id_idx` (`assigner_id`),
    INDEX `crm_allocation_batches_status_idx` (`status`),
    INDEX `crm_allocation_batches_expires_at_idx` (`expires_at`),
    PRIMARY KEY (`id`),
    CONSTRAINT `crm_allocation_batches_assigner_id_fkey`
      FOREIGN KEY (`assigner_id`) REFERENCES `crm_staff`(`id`)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `crm_allocation_batches_booker_id_fkey`
      FOREIGN KEY (`booker_id`) REFERENCES `crm_staff`(`id`)
      ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_allocation_batch_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `batch_id` INTEGER NOT NULL,
    `customer_id` INTEGER NOT NULL,
    `customer_name` VARCHAR(100) NULL,
    `customer_phone` VARCHAR(20) NULL,
    `bucket` VARCHAR(50) NULL,
    `days_since_last_visit` INTEGER NULL,
    `total_spent` DOUBLE NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING_ACCEPT',
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `crm_allocation_batch_items_batch_id_customer_id_key` (`batch_id`, `customer_id`),
    INDEX `crm_allocation_batch_items_customer_id_idx` (`customer_id`),
    INDEX `crm_allocation_batch_items_batch_id_idx` (`batch_id`),
    INDEX `crm_allocation_batch_items_status_idx` (`status`),
    PRIMARY KEY (`id`),
    CONSTRAINT `crm_allocation_batch_items_batch_id_fkey`
      FOREIGN KEY (`batch_id`) REFERENCES `crm_allocation_batches`(`id`)
      ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_custom_campaigns` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `start_date` DATE NULL,
    `end_date` DATE NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `created_by` INTEGER NULL,
    `assigned_staff_ids` TEXT NULL,
    `deleted_at` DATETIME(0) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `crm_custom_campaigns_slug_key` (`slug`),
    INDEX `crm_custom_campaigns_status_idx` (`status`),
    INDEX `crm_custom_campaigns_created_by_idx` (`created_by`),
    PRIMARY KEY (`id`),
    CONSTRAINT `crm_custom_campaigns_created_by_fkey`
      FOREIGN KEY (`created_by`) REFERENCES `crm_staff`(`id`)
      ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_campaign_customers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `campaign_id` INTEGER NOT NULL,
    `legacy_user_id` INTEGER NOT NULL,
    `added_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `added_by` INTEGER NULL,
    `removed_at` DATETIME(0) NULL,
    `removed_reason` TEXT NULL,
    `removed_by` INTEGER NULL,

    INDEX `crm_campaign_customers_campaign_id_idx` (`campaign_id`),
    INDEX `crm_campaign_customers_legacy_user_id_idx` (`legacy_user_id`),
    INDEX `crm_campaign_customers_removed_at_idx` (`removed_at`),
    INDEX `crm_campaign_customers_legacy_user_id_removed_at_idx` (`legacy_user_id`, `removed_at`),
    INDEX `crm_campaign_customers_campaign_id_removed_at_idx` (`campaign_id`, `removed_at`),
    PRIMARY KEY (`id`),
    CONSTRAINT `crm_campaign_customers_campaign_id_fkey`
      FOREIGN KEY (`campaign_id`) REFERENCES `crm_custom_campaigns`(`id`)
      ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_campaign_touchpoints` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `campaign_id` INTEGER NOT NULL,
    `key` VARCHAR(50) NOT NULL,
    `label` VARCHAR(100) NOT NULL,
    `icon` VARCHAR(50) NULL,
    `days_min` INTEGER NOT NULL,
    `days_max` INTEGER NULL,
    `color` VARCHAR(30) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `crm_campaign_touchpoints_campaign_id_key_key` (`campaign_id`, `key`),
    INDEX `crm_campaign_touchpoints_campaign_id_idx` (`campaign_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `crm_campaign_touchpoints_campaign_id_fkey`
      FOREIGN KEY (`campaign_id`) REFERENCES `crm_custom_campaigns`(`id`)
      ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_campaign_promotions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `campaign_id` INTEGER NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `code` VARCHAR(50) NULL,
    `type` VARCHAR(30) NOT NULL,
    `value` DOUBLE NOT NULL DEFAULT 0,
    `description` TEXT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `legacy_promotion_id` INTEGER NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `crm_campaign_promotions_campaign_id_idx` (`campaign_id`),
    INDEX `crm_campaign_promotions_is_active_idx` (`is_active`),
    PRIMARY KEY (`id`),
    CONSTRAINT `crm_campaign_promotions_campaign_id_fkey`
      FOREIGN KEY (`campaign_id`) REFERENCES `crm_custom_campaigns`(`id`)
      ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_campaign_touchpoint_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `campaign_customer_id` INTEGER NOT NULL,
    `touchpoint_id` INTEGER NOT NULL,
    `is_checked` TINYINT(1) NOT NULL DEFAULT 1,
    `status` VARCHAR(30) NULL,
    `completed_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `completed_by_staff_id` INTEGER NULL,
    `completed_by_staff_name` VARCHAR(100) NULL,
    `note` TEXT NULL,

    UNIQUE INDEX `crm_campaign_touchpoint_logs_campaign_customer_id_touchpoint_key` (`campaign_customer_id`, `touchpoint_id`),
    INDEX `crm_campaign_touchpoint_logs_campaign_customer_id_idx` (`campaign_customer_id`),
    INDEX `crm_campaign_touchpoint_logs_touchpoint_id_idx` (`touchpoint_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `crm_campaign_touchpoint_logs_campaign_customer_id_fkey`
      FOREIGN KEY (`campaign_customer_id`) REFERENCES `crm_campaign_customers`(`id`)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `crm_campaign_touchpoint_logs_touchpoint_id_fkey`
      FOREIGN KEY (`touchpoint_id`) REFERENCES `crm_campaign_touchpoints`(`id`)
      ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `crm_allocation_batches`
    ADD COLUMN `campaign_id` INTEGER NULL,
    ADD INDEX `crm_allocation_batches_campaign_id_idx` (`campaign_id`),
    ADD CONSTRAINT `crm_allocation_batches_campaign_id_fkey`
      FOREIGN KEY (`campaign_id`) REFERENCES `crm_custom_campaigns`(`id`)
      ON DELETE SET NULL ON UPDATE CASCADE;
