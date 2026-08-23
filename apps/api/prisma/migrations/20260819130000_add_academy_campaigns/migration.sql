-- Native, snapshot-based operational campaigns for Wings Academy.
-- These tables intentionally do not reuse the legacy NYC campaign tables.
CREATE TABLE IF NOT EXISTS `crm_academy_campaigns` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `slug` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `start_date` DATE NULL,
    `end_date` DATE NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    `assigned_staff_ids` TEXT NULL,
    `audience_filter_json` LONGTEXT NULL,
    `audience_summary` TEXT NULL,
    `created_by_staff_id` INTEGER NULL,
    `deleted_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL,

    UNIQUE INDEX `crm_academy_campaigns_slug_key`(`slug`),
    INDEX `crm_academy_campaigns_status_deleted_at_idx`(`status`, `deleted_at`),
    INDEX `crm_academy_campaigns_created_by_staff_id_idx`(`created_by_staff_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `crm_academy_campaign_leads` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `campaign_id` INTEGER NOT NULL,
    `lead_id` INTEGER NOT NULL,
    `added_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `added_by_staff_id` INTEGER NULL,
    `removed_at` DATETIME NULL,
    `removed_reason` TEXT NULL,
    `removed_by_staff_id` INTEGER NULL,

    UNIQUE INDEX `crm_academy_campaign_leads_campaign_id_lead_id_key`(`campaign_id`, `lead_id`),
    INDEX `crm_academy_campaign_leads_campaign_id_removed_at_idx`(`campaign_id`, `removed_at`),
    INDEX `crm_academy_campaign_leads_lead_id_removed_at_idx`(`lead_id`, `removed_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `crm_academy_campaign_touchpoints` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `campaign_id` INTEGER NOT NULL,
    `key` VARCHAR(50) NOT NULL,
    `label` VARCHAR(100) NOT NULL,
    `icon` VARCHAR(80) NULL,
    `days_min` INTEGER NOT NULL,
    `days_max` INTEGER NULL,
    `color` VARCHAR(30) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL,

    UNIQUE INDEX `crm_academy_campaign_touchpoints_campaign_id_key_key`(`campaign_id`, `key`),
    INDEX `crm_academy_campaign_touchpoints_campaign_id_sort_order_idx`(`campaign_id`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `crm_academy_campaign_touchpoint_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `campaign_lead_id` INTEGER NOT NULL,
    `touchpoint_id` INTEGER NOT NULL,
    `is_checked` TINYINT NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NULL,
    `completed_at` DATETIME NULL,
    `completed_by_staff_id` INTEGER NULL,
    `completed_by_staff_name` VARCHAR(100) NULL,
    `note` TEXT NULL,
    `callback_due_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL,

    UNIQUE INDEX `acad_camp_tp_log_member_tp_uniq`(`campaign_lead_id`, `touchpoint_id`),
    INDEX `acad_camp_tp_log_touchpoint_idx`(`touchpoint_id`),
    INDEX `acad_camp_tp_log_actor_at_idx`(`completed_by_staff_id`, `completed_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `crm_academy_follow_up_tasks`
  ADD COLUMN `campaign_touchpoint_log_id` INTEGER NULL,
  ADD UNIQUE INDEX `crm_academy_follow_up_tasks_campaign_touchpoint_log_id_key`(`campaign_touchpoint_log_id`);

ALTER TABLE `crm_academy_campaigns`
  ADD CONSTRAINT `acad_campaign_creator_fk`
  FOREIGN KEY (`created_by_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `crm_academy_campaign_leads`
  ADD CONSTRAINT `acad_camp_lead_campaign_fk`
  FOREIGN KEY (`campaign_id`) REFERENCES `crm_academy_campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `acad_camp_lead_lead_fk`
  FOREIGN KEY (`lead_id`) REFERENCES `crm_academy_leads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `acad_camp_lead_added_by_fk`
  FOREIGN KEY (`added_by_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `acad_camp_lead_removed_by_fk`
  FOREIGN KEY (`removed_by_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `crm_academy_campaign_touchpoints`
  ADD CONSTRAINT `acad_camp_tp_campaign_fk`
  FOREIGN KEY (`campaign_id`) REFERENCES `crm_academy_campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `crm_academy_campaign_touchpoint_logs`
  ADD CONSTRAINT `acad_camp_tp_log_lead_fk`
  FOREIGN KEY (`campaign_lead_id`) REFERENCES `crm_academy_campaign_leads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `acad_camp_tp_log_touchpoint_fk`
  FOREIGN KEY (`touchpoint_id`) REFERENCES `crm_academy_campaign_touchpoints`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `acad_camp_tp_log_actor_fk`
  FOREIGN KEY (`completed_by_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `crm_academy_follow_up_tasks`
  ADD CONSTRAINT `acad_followup_camp_tp_log_fk`
  FOREIGN KEY (`campaign_touchpoint_log_id`) REFERENCES `crm_academy_campaign_touchpoint_logs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
