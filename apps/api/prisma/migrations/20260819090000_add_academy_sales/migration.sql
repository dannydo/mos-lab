-- Sales Academy replaces the legacy Ads Portal persistence layer.
CREATE TABLE `crm_academy_leads` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `legacy_portal_id` VARCHAR(64) NULL,
    `external_key` VARCHAR(191) NULL,
    `source_system` VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
    `source` VARCHAR(100) NOT NULL DEFAULT 'Manual',
    `pancake_id` VARCHAR(100) NULL,
    `facebook_psid` VARCHAR(150) NULL,
    `page_id` VARCHAR(100) NULL,
    `facebook_chat_link` TEXT NULL,
    `avatar_url` TEXT NULL,
    `name` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(50) NULL,
    `phone_normalized` VARCHAR(30) NULL,
    `search_text` VARCHAR(1000) NOT NULL DEFAULT '',
    `email` VARCHAR(150) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'NEW',
    `course` VARCHAR(150) NULL,
    `goal` TEXT NULL,
    `flight_date` DATE NULL,
    `scheduled_at` DATETIME NULL,
    `revenue_vnd` INTEGER NOT NULL DEFAULT 0,
    `is_hot` TINYINT NOT NULL DEFAULT 0,
    `hot_marked_at` DATETIME NULL,
    `last_contact_at` DATETIME NULL,
    `note` TEXT NULL,
    `owner_staff_id` INTEGER NULL,
    `legacy_owner_email` VARCHAR(150) NULL,
    `created_by_staff_id` INTEGER NULL,
    `source_created_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL,
    UNIQUE INDEX `crm_academy_leads_legacy_portal_id_key`(`legacy_portal_id`),
    UNIQUE INDEX `crm_academy_leads_external_key_key`(`external_key`),
    INDEX `crm_academy_leads_status_updated_at_idx`(`status`, `updated_at`),
    INDEX `crm_academy_leads_owner_staff_id_status_idx`(`owner_staff_id`, `status`),
    INDEX `crm_academy_leads_phone_normalized_idx`(`phone_normalized`),
    INDEX `crm_academy_leads_search_text_idx`(`search_text`(191)),
    INDEX `crm_academy_leads_pancake_id_idx`(`pancake_id`),
    INDEX `crm_academy_leads_facebook_psid_idx`(`facebook_psid`),
    INDEX `crm_academy_leads_is_hot_hot_marked_at_idx`(`is_hot`, `hot_marked_at`),
    INDEX `crm_academy_leads_scheduled_at_idx`(`scheduled_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_academy_lead_activities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lead_id` INTEGER NOT NULL,
    `activity_type` VARCHAR(30) NOT NULL,
    `content` TEXT NULL,
    `metadata` LONGTEXT NULL,
    `actor_staff_id` INTEGER NULL,
    `occurred_at` DATETIME NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `crm_academy_lead_activities_lead_id_occurred_at_idx`(`lead_id`, `occurred_at`),
    INDEX `crm_academy_lead_activities_activity_type_occurred_at_idx`(`activity_type`, `occurred_at`),
    INDEX `crm_academy_lead_activities_actor_staff_id_fkey`(`actor_staff_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_academy_follow_up_tasks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `legacy_portal_id` VARCHAR(64) NULL,
    `lead_id` INTEGER NOT NULL,
    `content` TEXT NOT NULL,
    `due_at` DATETIME NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `pancake_link` TEXT NULL,
    `assignee_staff_id` INTEGER NULL,
    `completed_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL,
    UNIQUE INDEX `crm_academy_follow_up_tasks_legacy_portal_id_key`(`legacy_portal_id`),
    INDEX `crm_academy_follow_up_tasks_lead_id_status_idx`(`lead_id`, `status`),
    INDEX `crm_academy_follow_up_tasks_status_due_at_idx`(`status`, `due_at`),
    INDEX `crm_academy_follow_up_tasks_assignee_staff_id_status_idx`(`assignee_staff_id`, `status`),
    INDEX `crm_academy_follow_up_tasks_assignee_staff_id_fkey`(`assignee_staff_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_academy_playbooks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `legacy_portal_id` VARCHAR(64) NULL,
    `title` VARCHAR(255) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `content` LONGTEXT NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` TINYINT NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL,
    UNIQUE INDEX `crm_academy_playbooks_legacy_portal_id_key`(`legacy_portal_id`),
    INDEX `crm_academy_playbooks_category_is_active_idx`(`category`, `is_active`),
    INDEX `crm_academy_playbooks_sort_order_idx`(`sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `crm_academy_courses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `tag` VARCHAR(100) NULL,
    `description` TEXT NULL,
    `list_price_vnd` INTEGER NOT NULL DEFAULT 0,
    `promo_price_vnd` INTEGER NOT NULL DEFAULT 0,
    `kit_name` VARCHAR(255) NULL,
    `kit_url` TEXT NULL,
    `syllabus` LONGTEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` TINYINT NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL,
    UNIQUE INDEX `crm_academy_courses_code_key`(`code`),
    INDEX `crm_academy_courses_is_active_sort_order_idx`(`is_active`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `crm_academy_leads`
  ADD CONSTRAINT `crm_academy_leads_owner_staff_id_fkey`
  FOREIGN KEY (`owner_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `crm_academy_leads_created_by_staff_id_fkey`
  FOREIGN KEY (`created_by_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `crm_academy_lead_activities`
  ADD CONSTRAINT `crm_academy_lead_activities_lead_id_fkey`
  FOREIGN KEY (`lead_id`) REFERENCES `crm_academy_leads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `crm_academy_lead_activities_actor_staff_id_fkey`
  FOREIGN KEY (`actor_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `crm_academy_follow_up_tasks`
  ADD CONSTRAINT `crm_academy_follow_up_tasks_lead_id_fkey`
  FOREIGN KEY (`lead_id`) REFERENCES `crm_academy_leads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `crm_academy_follow_up_tasks_assignee_staff_id_fkey`
  FOREIGN KEY (`assignee_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
