-- DropForeignKey
ALTER TABLE `crm_academy_campaign_leads` DROP FOREIGN KEY `acad_camp_lead_added_by_fk`;

-- DropForeignKey
ALTER TABLE `crm_academy_campaign_leads` DROP FOREIGN KEY `acad_camp_lead_campaign_fk`;

-- DropForeignKey
ALTER TABLE `crm_academy_campaign_leads` DROP FOREIGN KEY `acad_camp_lead_lead_fk`;

-- DropForeignKey
ALTER TABLE `crm_academy_campaign_leads` DROP FOREIGN KEY `acad_camp_lead_removed_by_fk`;

-- DropForeignKey
ALTER TABLE `crm_academy_campaign_touchpoint_logs` DROP FOREIGN KEY `acad_camp_tp_log_actor_fk`;

-- DropForeignKey
ALTER TABLE `crm_academy_campaign_touchpoint_logs` DROP FOREIGN KEY `acad_camp_tp_log_lead_fk`;

-- DropForeignKey
ALTER TABLE `crm_academy_campaign_touchpoint_logs` DROP FOREIGN KEY `acad_camp_tp_log_touchpoint_fk`;

-- DropForeignKey
ALTER TABLE `crm_academy_campaign_touchpoints` DROP FOREIGN KEY `acad_camp_tp_campaign_fk`;

-- DropForeignKey
ALTER TABLE `crm_academy_campaigns` DROP FOREIGN KEY `acad_campaign_creator_fk`;

-- DropForeignKey
ALTER TABLE `crm_academy_follow_up_tasks` DROP FOREIGN KEY `acad_followup_camp_tp_log_fk`;

-- DropForeignKey
ALTER TABLE `crm_academy_talent_assessments` DROP FOREIGN KEY `acad_talent_assessment_evaluator_fk`;

-- DropForeignKey
ALTER TABLE `crm_academy_talent_assessments` DROP FOREIGN KEY `acad_talent_assessment_invoice_printer_fk`;

-- DropForeignKey
ALTER TABLE `crm_academy_talent_assessments` DROP FOREIGN KEY `acad_talent_assessment_lead_fk`;

-- DropForeignKey
ALTER TABLE `crm_academy_talent_assessments` DROP FOREIGN KEY `acad_talent_assessment_policy_audit_fk`;

-- DropForeignKey
ALTER TABLE `crm_academy_talent_payments` DROP FOREIGN KEY `acad_talent_payment_assessment_fk`;

-- DropForeignKey
ALTER TABLE `crm_academy_talent_payments` DROP FOREIGN KEY `acad_talent_payment_confirmer_fk`;

-- DropForeignKey
ALTER TABLE `crm_academy_talent_policy_audits` DROP FOREIGN KEY `acad_talent_policy_audit_changer_fk`;

-- DropIndex
DROP INDEX `crm_academy_campaigns_status_deleted_at_idx` ON `crm_academy_campaigns`;

-- AlterTable
ALTER TABLE `crm_academy_campaign_touchpoint_logs` MODIFY `is_checked` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `crm_academy_campaigns` ADD COLUMN `kind` VARCHAR(20) NOT NULL DEFAULT 'CAMPAIGN';

-- AlterTable
ALTER TABLE `crm_academy_courses` ADD COLUMN `teacher_bonus_vnd` INTEGER NOT NULL DEFAULT 0,
    MODIFY `is_active` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `crm_academy_instructors` MODIFY `is_active` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `crm_academy_leads` MODIFY `is_hot` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `crm_academy_playbooks` MODIFY `is_active` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `crm_academy_talent_assessments` ADD COLUMN `workshop_participant_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `crm_call_logs` ADD COLUMN `call_uuid` VARCHAR(100) NULL;

-- AlterTable
ALTER TABLE `crm_departments` MODIFY `is_active` BOOLEAN NOT NULL DEFAULT true,
    ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `crm_menu_access_policies` MODIFY `is_restricted` BOOLEAN NOT NULL DEFAULT false,
    ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `crm_omicall_logs` ADD COLUMN `customer_satisfaction_score` INTEGER NULL,
    ADD COLUMN `customer_sentiment` VARCHAR(20) NULL,
    ADD COLUMN `laugh_count_agent` INTEGER NULL,
    ADD COLUMN `laugh_count_customer` INTEGER NULL,
    ADD COLUMN `qa_checklist` TEXT NULL,
    ADD COLUMN `qa_score` INTEGER NULL,
    ADD COLUMN `qa_tags` TEXT NULL,
    ADD COLUMN `satisfaction_analysis` TEXT NULL;

-- AlterTable
ALTER TABLE `crm_staff` ADD COLUMN `base_salary` DOUBLE NULL,
    ADD COLUMN `hourly_wage` DOUBLE NULL,
    ADD COLUMN `omicall_auto_init` BOOLEAN NULL,
    ADD COLUMN `seniority_offset` INTEGER NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `crm_team_members` MODIFY `is_active` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `crm_teams` MODIFY `is_active` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `crm_fal_log_explanations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_service_id` BIGINT NOT NULL,
    `decision_status` VARCHAR(12) NOT NULL DEFAULT 'PENDING',
    `ledger_status` VARCHAR(16) NOT NULL DEFAULT 'NOT_APPLIED',
    `explanation` TEXT NULL,
    `explanation_channel` VARCHAR(30) NULL,
    `explained_by_staff_id` INTEGER NULL,
    `approved_by_staff_id` INTEGER NULL,
    `approved_at` DATETIME(0) NULL,
    `rejection_reason` TEXT NULL,
    `applied_at` DATETIME(0) NULL,
    `failure_reason` TEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `crm_fal_log_explanations_order_service_id_key`(`order_service_id`),
    INDEX `crm_fal_log_explanations_decision_status_idx`(`decision_status`),
    INDEX `crm_fal_log_explanations_ledger_status_idx`(`ledger_status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_fal_log_explanation_audits` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `decision_id` INTEGER NOT NULL,
    `action` VARCHAR(30) NOT NULL,
    `actor_staff_id` INTEGER NULL,
    `details` TEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `crm_fal_log_explanation_audits_decision_id_created_at_idx`(`decision_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_missed_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `reason_category` VARCHAR(50) NOT NULL,
    `responsibility` VARCHAR(50) NOT NULL,
    `note` TEXT NULL,
    `follow_up_status` VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    `callback_date` DATE NULL,
    `created_by` VARCHAR(100) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `crm_missed_logs_order_id_key`(`order_id`),
    INDEX `crm_missed_logs_reason_category_idx`(`reason_category`),
    INDEX `crm_missed_logs_responsibility_idx`(`responsibility`),
    INDEX `crm_missed_logs_follow_up_status_idx`(`follow_up_status`),
    INDEX `crm_missed_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_booking_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `action_type` VARCHAR(30) NOT NULL,
    `actor_staff_id` INTEGER NOT NULL,
    `actor_staff_name` VARCHAR(100) NULL,
    `original_staff_id` INTEGER NULL,
    `original_staff_name` VARCHAR(100) NULL,
    `is_cross_action` BOOLEAN NOT NULL DEFAULT false,
    `reason_category` VARCHAR(100) NULL,
    `reason_note` TEXT NULL,
    `old_data_json` TEXT NULL,
    `new_data_json` TEXT NULL,
    `ip_address` VARCHAR(45) NULL,
    `date_created` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `crm_booking_logs_order_id_idx`(`order_id`),
    INDEX `crm_booking_logs_actor_staff_id_idx`(`actor_staff_id`),
    INDEX `crm_booking_logs_original_staff_id_idx`(`original_staff_id`),
    INDEX `crm_booking_logs_is_cross_action_idx`(`is_cross_action`),
    INDEX `crm_booking_logs_date_created_idx`(`date_created`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_happy_call_tasks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `customer_id` INTEGER NOT NULL,
    `assigned_cs_staff_id` INTEGER NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `attempt_count` INTEGER NOT NULL DEFAULT 0,
    `scheduled_date` DATE NOT NULL,
    `completed_at` DATETIME(0) NULL,
    `checkout_date` DATETIME(0) NULL,
    `technician_id` INTEGER NULL,
    `cc_in_staff_id` INTEGER NULL,
    `cc_out_staff_id` INTEGER NULL,
    `booker_staff_id` INTEGER NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `crm_happy_call_tasks_order_id_idx`(`order_id`),
    INDEX `crm_happy_call_tasks_customer_id_idx`(`customer_id`),
    INDEX `crm_happy_call_tasks_assigned_cs_staff_id_idx`(`assigned_cs_staff_id`),
    INDEX `crm_happy_call_tasks_status_idx`(`status`),
    INDEX `crm_happy_call_tasks_scheduled_date_idx`(`scheduled_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_survey_ratings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `happy_call_task_id` INTEGER NOT NULL,
    `order_id` INTEGER NOT NULL,
    `customer_id` INTEGER NOT NULL,
    `overall_rating` TINYINT NOT NULL,
    `technician_quality_rating` TINYINT NULL,
    `staff_attitude_rating` TINYINT NULL,
    `facility_rating` TINYINT NULL,
    `value_for_money_rating` TINYINT NULL,
    `check_in_experience_rating` TINYINT NULL,
    `check_out_experience_rating` TINYINT NULL,
    `booking_experience_rating` TINYINT NULL,
    `customer_note` TEXT NULL,
    `cs_note` TEXT NULL,
    `technician_id` INTEGER NULL,
    `cc_in_staff_id` INTEGER NULL,
    `cc_out_staff_id` INTEGER NULL,
    `booker_staff_id` INTEGER NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `crm_survey_ratings_happy_call_task_id_key`(`happy_call_task_id`),
    INDEX `crm_survey_ratings_order_id_idx`(`order_id`),
    INDEX `crm_survey_ratings_customer_id_idx`(`customer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_cs_tickets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ticket_code` VARCHAR(20) NOT NULL,
    `survey_rating_id` INTEGER NULL,
    `happy_call_task_id` INTEGER NULL,
    `order_id` INTEGER NULL,
    `customer_id` INTEGER NULL,
    `type` VARCHAR(30) NOT NULL,
    `priority` VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
    `status` VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    `department` VARCHAR(20) NULL,
    `related_staff_id` INTEGER NULL,
    `assigned_cs_staff_id` INTEGER NULL,
    `description` TEXT NOT NULL,
    `sla_due_date` DATETIME(0) NULL,
    `resolution_note` TEXT NULL,
    `action_plan` TEXT NULL,
    `resolved_at` DATETIME(0) NULL,
    `resolved_by_staff_id` INTEGER NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `crm_cs_tickets_ticket_code_key`(`ticket_code`),
    INDEX `crm_cs_tickets_survey_rating_id_idx`(`survey_rating_id`),
    INDEX `crm_cs_tickets_happy_call_task_id_idx`(`happy_call_task_id`),
    INDEX `crm_cs_tickets_order_id_idx`(`order_id`),
    INDEX `crm_cs_tickets_customer_id_idx`(`customer_id`),
    INDEX `crm_cs_tickets_status_idx`(`status`),
    INDEX `crm_cs_tickets_priority_idx`(`priority`),
    INDEX `crm_cs_tickets_department_idx`(`department`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_cs_ticket_subtasks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ticket_id` INTEGER NOT NULL,
    `department` VARCHAR(20) NOT NULL,
    `assigned_staff_id` INTEGER NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    `issue_summary` TEXT NULL,
    `resolution_note` TEXT NULL,
    `action_plan` TEXT NULL,
    `technical_issue_tags` VARCHAR(255) NULL,
    `warranty_type` VARCHAR(50) NULL,
    `is_within_3day_warranty` BOOLEAN NOT NULL DEFAULT false,
    `previous_technician_id` INTEGER NULL,
    `replacement_technician_id` INTEGER NULL,
    `warranty_appointment_date` DATETIME(0) NULL,
    `next_fal_order_service_id` BIGINT NULL,
    `inspection_store_name` VARCHAR(100) NULL,
    `inspection_appointment_date` DATETIME(0) NULL,
    `inspection_result_note` TEXT NULL,
    `resolved_at` DATETIME(0) NULL,
    `resolved_by_staff_id` INTEGER NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `crm_cs_ticket_subtasks_ticket_id_idx`(`ticket_id`),
    INDEX `crm_cs_ticket_subtasks_department_idx`(`department`),
    INDEX `crm_cs_ticket_subtasks_assigned_staff_id_idx`(`assigned_staff_id`),
    INDEX `crm_cs_ticket_subtasks_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_cs_ticket_comments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ticket_id` INTEGER NOT NULL,
    `staff_id` INTEGER NOT NULL,
    `staff_name` VARCHAR(100) NULL,
    `content` TEXT NOT NULL,
    `is_internal` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `crm_cs_ticket_comments_ticket_id_idx`(`ticket_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_cs_campaigns` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `target` VARCHAR(30) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    `date_from` DATE NULL,
    `date_to` DATE NULL,
    `filter_bucket` VARCHAR(20) NULL,
    `sample_size` INTEGER NULL,
    `created_by_staff_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `crm_cs_campaigns_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_cs_campaign_tasks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `campaign_id` INTEGER NOT NULL,
    `order_id` INTEGER NOT NULL,
    `customer_id` INTEGER NOT NULL,
    `assigned_cs_staff_id` INTEGER NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `attempt_count` INTEGER NOT NULL DEFAULT 0,
    `survey_rating_id` INTEGER NULL,
    `completed_at` DATETIME(0) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `crm_cs_campaign_tasks_campaign_id_idx`(`campaign_id`),
    INDEX `crm_cs_campaign_tasks_order_id_idx`(`order_id`),
    INDEX `crm_cs_campaign_tasks_customer_id_idx`(`customer_id`),
    INDEX `crm_cs_campaign_tasks_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_lash_type_benchmarks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lash_style` VARCHAR(50) NOT NULL,
    `service_type` VARCHAR(30) NOT NULL,
    `lash_count` INTEGER NULL,
    `benchmark_minutes` INTEGER NOT NULL,
    `min_minutes` INTEGER NOT NULL,
    `max_minutes` INTEGER NOT NULL,
    `sample_size` INTEGER NOT NULL DEFAULT 0,
    `is_auto_generated` BOOLEAN NOT NULL DEFAULT true,
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `crm_lash_type_benchmarks_lash_style_service_type_lash_count_key`(`lash_style`, `service_type`, `lash_count`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_cv_speed_profile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `staff_id` INTEGER NOT NULL,
    `staff_name` VARCHAR(100) NULL,
    `lash_style` VARCHAR(50) NOT NULL,
    `service_mode` VARCHAR(20) NOT NULL,
    `lash_count` INTEGER NOT NULL,
    `cleaning_minutes` DOUBLE NOT NULL,
    `extension_minutes` DOUBLE NOT NULL,
    `prep_qc_minutes` DOUBLE NOT NULL,
    `total_minutes` DOUBLE NOT NULL,
    `model_layer` INTEGER NOT NULL,
    `sample_size` INTEGER NOT NULL,
    `confidence` VARCHAR(10) NOT NULL,
    `reg_a` DOUBLE NULL,
    `reg_b` DOUBLE NULL,
    `reg_r_squared` DOUBLE NULL,
    `benchmark_total_minutes` DOUBLE NULL,
    `speed_delta_percent` DOUBLE NULL,
    `speed_rating` VARCHAR(10) NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `crm_cv_speed_profile_staff_id_idx`(`staff_id`),
    INDEX `crm_cv_speed_profile_lash_style_idx`(`lash_style`),
    INDEX `crm_cv_speed_profile_speed_rating_idx`(`speed_rating`),
    UNIQUE INDEX `crm_cv_speed_profile_staff_id_lash_style_service_mode_lash_c_key`(`staff_id`, `lash_style`, `service_mode`, `lash_count`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_stores` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `name_en` VARCHAR(100) NULL,
    `store_type` VARCHAR(20) NOT NULL DEFAULT 'SALON',
    `address_map` VARCHAR(255) NULL,
    `address_sms` VARCHAR(255) NULL,
    `address_web` VARCHAR(255) NULL,
    `address_city` VARCHAR(255) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `legacy_client_store_id` INTEGER NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `crm_stores_code_key`(`code`),
    UNIQUE INDEX `crm_stores_legacy_client_store_id_key`(`legacy_client_store_id`),
    INDEX `crm_stores_code_idx`(`code`),
    INDEX `crm_stores_is_active_idx`(`is_active`),
    INDEX `crm_stores_store_type_idx`(`store_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_data_migrations` (
    `id` VARCHAR(191) NOT NULL,
    `checksum` CHAR(64) NOT NULL,
    `description` TEXT NOT NULL,
    `commit_sha` VARCHAR(64) NULL,
    `duration_ms` INTEGER NOT NULL,
    `applied_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_academy_workshops` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `campaign_id` INTEGER NOT NULL,
    `starts_at` DATETIME(0) NOT NULL,
    `ends_at` DATETIME(0) NOT NULL,
    `location` VARCHAR(255) NOT NULL,
    `capacity` INTEGER NOT NULL DEFAULT 100,
    `fee_vnd` INTEGER NOT NULL DEFAULT 0,
    `fee_due_at` DATETIME(0) NULL,
    `status` VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
    `live_agenda_item_id` INTEGER NULL,
    `display_code` VARCHAR(32) NOT NULL,
    `display_token_version` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `crm_academy_workshops_campaign_id_key`(`campaign_id`),
    UNIQUE INDEX `crm_academy_workshops_display_code_key`(`display_code`),
    INDEX `crm_academy_workshops_status_starts_at_idx`(`status`, `starts_at`),
    INDEX `crm_academy_workshops_starts_at_ends_at_idx`(`starts_at`, `ends_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_academy_workshop_participants` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `workshop_id` INTEGER NOT NULL,
    `campaign_lead_id` INTEGER NOT NULL,
    `qr_token_hash` CHAR(64) NOT NULL,
    `qr_redeemed_at` DATETIME(0) NULL,
    `token_version` INTEGER NOT NULL DEFAULT 1,
    `info_sent_at` DATETIME(0) NULL,
    `info_sent_by_staff_id` INTEGER NULL,
    `attendance_status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `attendance_confirmed_at` DATETIME(0) NULL,
    `attendance_confirmed_by_staff_id` INTEGER NULL,
    `checked_in_at` DATETIME(0) NULL,
    `checked_in_by_staff_id` INTEGER NULL,
    `photo_consent_at` DATETIME(0) NULL,
    `photo_consent_version` VARCHAR(40) NULL,
    `primary_instructor_id` INTEGER NULL,
    `fee_waived_at` DATETIME(0) NULL,
    `fee_waiver_reason` TEXT NULL,
    `fee_waived_by_staff_id` INTEGER NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `crm_academy_workshop_participants_campaign_lead_id_key`(`campaign_lead_id`),
    UNIQUE INDEX `crm_academy_workshop_participants_qr_token_hash_key`(`qr_token_hash`),
    INDEX `crm_academy_workshop_participants_workshop_id_attendance_sta_idx`(`workshop_id`, `attendance_status`),
    INDEX `crm_academy_workshop_participants_workshop_id_checked_in_at_idx`(`workshop_id`, `checked_in_at`),
    INDEX `crm_academy_workshop_participants_primary_instructor_id_idx`(`primary_instructor_id`),
    UNIQUE INDEX `crm_academy_workshop_participants_workshop_id_campaign_lead__key`(`workshop_id`, `campaign_lead_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_academy_workshop_participant_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `workshop_id` INTEGER NOT NULL,
    `participant_id` INTEGER NULL,
    `event_type` VARCHAR(40) NOT NULL,
    `metadata_json` LONGTEXT NULL,
    `actor_staff_id` INTEGER NULL,
    `occurred_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `crm_academy_workshop_participant_events_workshop_id_occurred_idx`(`workshop_id`, `occurred_at`),
    INDEX `crm_academy_workshop_participant_events_participant_id_occur_idx`(`participant_id`, `occurred_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_academy_workshop_fee_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `participant_id` INTEGER NOT NULL,
    `amount_vnd` INTEGER NOT NULL,
    `method` VARCHAR(24) NOT NULL,
    `reference` VARCHAR(160) NULL,
    `note` TEXT NULL,
    `received_at` DATETIME(0) NOT NULL,
    `confirmed_by_staff_id` INTEGER NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `crm_academy_workshop_fee_payments_participant_id_received_at_idx`(`participant_id`, `received_at`),
    INDEX `crm_academy_workshop_fee_payments_confirmed_by_staff_id_crea_idx`(`confirmed_by_staff_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_academy_workshop_photos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `participant_id` INTEGER NOT NULL,
    `storage_path` VARCHAR(500) NOT NULL,
    `mime_type` VARCHAR(80) NOT NULL,
    `size_bytes` INTEGER NOT NULL,
    `caption` TEXT NULL,
    `captured_at` DATETIME(0) NOT NULL,
    `captured_by_staff_id` INTEGER NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `crm_academy_workshop_photos_storage_path_key`(`storage_path`),
    INDEX `crm_academy_workshop_photos_participant_id_captured_at_idx`(`participant_id`, `captured_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_academy_workshop_agenda_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `workshop_id` INTEGER NOT NULL,
    `title` VARCHAR(180) NOT NULL,
    `description` TEXT NULL,
    `kind` VARCHAR(24) NOT NULL DEFAULT 'CONTENT',
    `planned_duration_seconds` INTEGER NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `started_at` DATETIME(3) NULL,
    `paused_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `paused_seconds` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `crm_academy_workshop_agenda_items_workshop_id_sort_order_idx`(`workshop_id`, `sort_order`),
    INDEX `crm_academy_workshop_agenda_items_workshop_id_status_idx`(`workshop_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_academy_workshop_timeline_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `workshop_id` INTEGER NOT NULL,
    `agenda_item_id` INTEGER NULL,
    `event_type` VARCHAR(32) NOT NULL,
    `metadata_json` LONGTEXT NULL,
    `actor_staff_id` INTEGER NULL,
    `occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `crm_academy_workshop_timeline_events_workshop_id_occurred_at_idx`(`workshop_id`, `occurred_at`),
    INDEX `crm_academy_workshop_timeline_events_agenda_item_id_occurred_idx`(`agenda_item_id`, `occurred_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_academy_workshop_quizzes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `workshop_id` INTEGER NULL,
    `title` VARCHAR(180) NOT NULL,
    `description` TEXT NULL,
    `is_template` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
    `active_question_id` INTEGER NULL,
    `question_opened_at` DATETIME(3) NULL,
    `question_closes_at` DATETIME(3) NULL,
    `podium_rewards_json` LONGTEXT NULL,
    `created_by_staff_id` INTEGER NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `crm_academy_workshop_quizzes_workshop_id_status_idx`(`workshop_id`, `status`),
    INDEX `crm_academy_workshop_quizzes_is_template_updated_at_idx`(`is_template`, `updated_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_academy_workshop_quiz_questions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quiz_id` INTEGER NOT NULL,
    `type` VARCHAR(24) NOT NULL DEFAULT 'SINGLE_CHOICE',
    `prompt` TEXT NOT NULL,
    `image_url` TEXT NULL,
    `duration_seconds` INTEGER NOT NULL DEFAULT 20,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `reward_rule` VARCHAR(24) NOT NULL DEFAULT 'NONE',
    `fastest_count` INTEGER NOT NULL DEFAULT 1,
    `reward_label` VARCHAR(255) NULL,
    `reward_quantity` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `crm_academy_workshop_quiz_questions_quiz_id_sort_order_idx`(`quiz_id`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_academy_workshop_quiz_options` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `question_id` INTEGER NOT NULL,
    `label` TEXT NOT NULL,
    `color` VARCHAR(30) NULL,
    `is_correct` BOOLEAN NOT NULL DEFAULT false,
    `sort_order` INTEGER NOT NULL DEFAULT 0,

    INDEX `crm_academy_workshop_quiz_options_question_id_sort_order_idx`(`question_id`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_academy_workshop_answers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `workshop_id` INTEGER NOT NULL,
    `participant_id` INTEGER NOT NULL,
    `quiz_id` INTEGER NOT NULL,
    `question_id` INTEGER NOT NULL,
    `option_id` INTEGER NOT NULL,
    `idempotency_key` VARCHAR(80) NOT NULL,
    `is_correct` BOOLEAN NOT NULL,
    `response_time_ms` INTEGER NOT NULL,
    `score` INTEGER NOT NULL DEFAULT 0,
    `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `crm_academy_workshop_answers_idempotency_key_key`(`idempotency_key`),
    INDEX `crm_academy_workshop_answers_workshop_id_submitted_at_idx`(`workshop_id`, `submitted_at`),
    INDEX `crm_academy_workshop_answers_quiz_id_question_id_score_idx`(`quiz_id`, `question_id`, `score`),
    UNIQUE INDEX `crm_academy_workshop_answers_participant_id_question_id_key`(`participant_id`, `question_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_academy_workshop_rewards` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `workshop_id` INTEGER NOT NULL,
    `participant_id` INTEGER NOT NULL,
    `quiz_id` INTEGER NULL,
    `question_id` INTEGER NULL,
    `source_type` VARCHAR(20) NOT NULL,
    `source_key` VARCHAR(100) NOT NULL,
    `label` VARCHAR(255) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PROMISED',
    `promised_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `fulfilled_at` DATETIME(0) NULL,
    `fulfilled_by_staff_id` INTEGER NULL,
    `note` TEXT NULL,

    INDEX `crm_academy_workshop_rewards_workshop_id_status_idx`(`workshop_id`, `status`),
    UNIQUE INDEX `crm_academy_workshop_rewards_participant_id_source_type_sour_key`(`participant_id`, `source_type`, `source_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_academy_instructor_bonuses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `workshop_id` INTEGER NOT NULL,
    `participant_id` INTEGER NOT NULL,
    `assessment_id` INTEGER NOT NULL,
    `course_id` INTEGER NOT NULL,
    `course_name` VARCHAR(255) NOT NULL,
    `instructor_id` INTEGER NOT NULL,
    `amount_vnd` INTEGER NOT NULL,
    `status` VARCHAR(24) NOT NULL DEFAULT 'EARNED',
    `earned_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `paid_at` DATETIME(0) NULL,
    `paid_by_staff_id` INTEGER NULL,
    `note` TEXT NULL,

    INDEX `crm_academy_instructor_bonuses_workshop_id_status_idx`(`workshop_id`, `status`),
    INDEX `crm_academy_instructor_bonuses_instructor_id_earned_at_idx`(`instructor_id`, `earned_at`),
    UNIQUE INDEX `crm_academy_instructor_bonuses_participant_id_assessment_id__key`(`participant_id`, `assessment_id`, `course_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `crm_academy_campaigns_kind_status_deleted_at_idx` ON `crm_academy_campaigns`(`kind`, `status`, `deleted_at`);

-- CreateIndex
CREATE INDEX `crm_academy_talent_assessments_workshop_participant_id_updat_idx` ON `crm_academy_talent_assessments`(`workshop_participant_id`, `updated_at`);

-- CreateIndex
CREATE INDEX `crm_call_logs_staff_id_created_at_idx` ON `crm_call_logs`(`staff_id`, `created_at`);

-- CreateIndex
CREATE INDEX `crm_omicall_logs_status_created_at_idx` ON `crm_omicall_logs`(`status`, `created_at`);

-- AddForeignKey
ALTER TABLE `crm_fal_log_explanation_audits` ADD CONSTRAINT `crm_fal_log_explanation_audits_decision_id_fkey` FOREIGN KEY (`decision_id`) REFERENCES `crm_fal_log_explanations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_survey_ratings` ADD CONSTRAINT `crm_survey_ratings_happy_call_task_id_fkey` FOREIGN KEY (`happy_call_task_id`) REFERENCES `crm_happy_call_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_cs_tickets` ADD CONSTRAINT `crm_cs_tickets_survey_rating_id_fkey` FOREIGN KEY (`survey_rating_id`) REFERENCES `crm_survey_ratings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_cs_tickets` ADD CONSTRAINT `crm_cs_tickets_happy_call_task_id_fkey` FOREIGN KEY (`happy_call_task_id`) REFERENCES `crm_happy_call_tasks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_cs_ticket_subtasks` ADD CONSTRAINT `crm_cs_ticket_subtasks_ticket_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `crm_cs_tickets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_cs_ticket_comments` ADD CONSTRAINT `crm_cs_ticket_comments_ticket_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `crm_cs_tickets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_cs_campaign_tasks` ADD CONSTRAINT `crm_cs_campaign_tasks_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `crm_cs_campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_follow_up_tasks` ADD CONSTRAINT `crm_academy_follow_up_tasks_campaign_touchpoint_log_id_fkey` FOREIGN KEY (`campaign_touchpoint_log_id`) REFERENCES `crm_academy_campaign_touchpoint_logs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_talent_assessments` ADD CONSTRAINT `crm_academy_talent_assessments_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `crm_academy_leads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_talent_assessments` ADD CONSTRAINT `crm_academy_talent_assessments_evaluator_staff_id_fkey` FOREIGN KEY (`evaluator_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_talent_assessments` ADD CONSTRAINT `crm_academy_talent_assessments_invoice_printed_by_staff_id_fkey` FOREIGN KEY (`invoice_printed_by_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_talent_assessments` ADD CONSTRAINT `crm_academy_talent_assessments_promotion_policy_audit_id_fkey` FOREIGN KEY (`promotion_policy_audit_id`) REFERENCES `crm_academy_talent_policy_audits`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_talent_assessments` ADD CONSTRAINT `crm_academy_talent_assessments_workshop_participant_id_fkey` FOREIGN KEY (`workshop_participant_id`) REFERENCES `crm_academy_workshop_participants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_talent_policy_audits` ADD CONSTRAINT `crm_academy_talent_policy_audits_changed_by_staff_id_fkey` FOREIGN KEY (`changed_by_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_talent_payments` ADD CONSTRAINT `crm_academy_talent_payments_assessment_id_fkey` FOREIGN KEY (`assessment_id`) REFERENCES `crm_academy_talent_assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_talent_payments` ADD CONSTRAINT `crm_academy_talent_payments_confirmed_by_staff_id_fkey` FOREIGN KEY (`confirmed_by_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_campaigns` ADD CONSTRAINT `crm_academy_campaigns_created_by_staff_id_fkey` FOREIGN KEY (`created_by_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_campaign_leads` ADD CONSTRAINT `crm_academy_campaign_leads_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `crm_academy_campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_campaign_leads` ADD CONSTRAINT `crm_academy_campaign_leads_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `crm_academy_leads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_campaign_leads` ADD CONSTRAINT `crm_academy_campaign_leads_added_by_staff_id_fkey` FOREIGN KEY (`added_by_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_campaign_leads` ADD CONSTRAINT `crm_academy_campaign_leads_removed_by_staff_id_fkey` FOREIGN KEY (`removed_by_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshops` ADD CONSTRAINT `crm_academy_workshops_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `crm_academy_campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshop_participants` ADD CONSTRAINT `crm_academy_workshop_participants_workshop_id_fkey` FOREIGN KEY (`workshop_id`) REFERENCES `crm_academy_workshops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshop_participants` ADD CONSTRAINT `crm_academy_workshop_participants_campaign_lead_id_fkey` FOREIGN KEY (`campaign_lead_id`) REFERENCES `crm_academy_campaign_leads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshop_participants` ADD CONSTRAINT `crm_academy_workshop_participants_info_sent_by_staff_id_fkey` FOREIGN KEY (`info_sent_by_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshop_participants` ADD CONSTRAINT `crm_academy_workshop_participants_attendance_confirmed_by_s_fkey` FOREIGN KEY (`attendance_confirmed_by_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshop_participants` ADD CONSTRAINT `crm_academy_workshop_participants_checked_in_by_staff_id_fkey` FOREIGN KEY (`checked_in_by_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshop_participants` ADD CONSTRAINT `crm_academy_workshop_participants_fee_waived_by_staff_id_fkey` FOREIGN KEY (`fee_waived_by_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshop_participants` ADD CONSTRAINT `crm_academy_workshop_participants_primary_instructor_id_fkey` FOREIGN KEY (`primary_instructor_id`) REFERENCES `crm_academy_instructors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshop_participant_events` ADD CONSTRAINT `crm_academy_workshop_participant_events_workshop_id_fkey` FOREIGN KEY (`workshop_id`) REFERENCES `crm_academy_workshops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshop_participant_events` ADD CONSTRAINT `crm_academy_workshop_participant_events_participant_id_fkey` FOREIGN KEY (`participant_id`) REFERENCES `crm_academy_workshop_participants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshop_participant_events` ADD CONSTRAINT `crm_academy_workshop_participant_events_actor_staff_id_fkey` FOREIGN KEY (`actor_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshop_fee_payments` ADD CONSTRAINT `crm_academy_workshop_fee_payments_participant_id_fkey` FOREIGN KEY (`participant_id`) REFERENCES `crm_academy_workshop_participants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshop_fee_payments` ADD CONSTRAINT `crm_academy_workshop_fee_payments_confirmed_by_staff_id_fkey` FOREIGN KEY (`confirmed_by_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshop_photos` ADD CONSTRAINT `crm_academy_workshop_photos_participant_id_fkey` FOREIGN KEY (`participant_id`) REFERENCES `crm_academy_workshop_participants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshop_photos` ADD CONSTRAINT `crm_academy_workshop_photos_captured_by_staff_id_fkey` FOREIGN KEY (`captured_by_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshop_agenda_items` ADD CONSTRAINT `crm_academy_workshop_agenda_items_workshop_id_fkey` FOREIGN KEY (`workshop_id`) REFERENCES `crm_academy_workshops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshop_timeline_events` ADD CONSTRAINT `crm_academy_workshop_timeline_events_workshop_id_fkey` FOREIGN KEY (`workshop_id`) REFERENCES `crm_academy_workshops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshop_timeline_events` ADD CONSTRAINT `crm_academy_workshop_timeline_events_agenda_item_id_fkey` FOREIGN KEY (`agenda_item_id`) REFERENCES `crm_academy_workshop_agenda_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshop_timeline_events` ADD CONSTRAINT `crm_academy_workshop_timeline_events_actor_staff_id_fkey` FOREIGN KEY (`actor_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshop_quizzes` ADD CONSTRAINT `crm_academy_workshop_quizzes_workshop_id_fkey` FOREIGN KEY (`workshop_id`) REFERENCES `crm_academy_workshops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshop_quiz_questions` ADD CONSTRAINT `crm_academy_workshop_quiz_questions_quiz_id_fkey` FOREIGN KEY (`quiz_id`) REFERENCES `crm_academy_workshop_quizzes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshop_quiz_options` ADD CONSTRAINT `crm_academy_workshop_quiz_options_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `crm_academy_workshop_quiz_questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshop_answers` ADD CONSTRAINT `crm_academy_workshop_answers_workshop_id_fkey` FOREIGN KEY (`workshop_id`) REFERENCES `crm_academy_workshops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshop_answers` ADD CONSTRAINT `crm_academy_workshop_answers_participant_id_fkey` FOREIGN KEY (`participant_id`) REFERENCES `crm_academy_workshop_participants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshop_answers` ADD CONSTRAINT `crm_academy_workshop_answers_quiz_id_fkey` FOREIGN KEY (`quiz_id`) REFERENCES `crm_academy_workshop_quizzes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshop_answers` ADD CONSTRAINT `crm_academy_workshop_answers_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `crm_academy_workshop_quiz_questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshop_answers` ADD CONSTRAINT `crm_academy_workshop_answers_option_id_fkey` FOREIGN KEY (`option_id`) REFERENCES `crm_academy_workshop_quiz_options`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshop_rewards` ADD CONSTRAINT `crm_academy_workshop_rewards_workshop_id_fkey` FOREIGN KEY (`workshop_id`) REFERENCES `crm_academy_workshops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshop_rewards` ADD CONSTRAINT `crm_academy_workshop_rewards_participant_id_fkey` FOREIGN KEY (`participant_id`) REFERENCES `crm_academy_workshop_participants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshop_rewards` ADD CONSTRAINT `crm_academy_workshop_rewards_quiz_id_fkey` FOREIGN KEY (`quiz_id`) REFERENCES `crm_academy_workshop_quizzes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshop_rewards` ADD CONSTRAINT `crm_academy_workshop_rewards_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `crm_academy_workshop_quiz_questions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_workshop_rewards` ADD CONSTRAINT `crm_academy_workshop_rewards_fulfilled_by_staff_id_fkey` FOREIGN KEY (`fulfilled_by_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_instructor_bonuses` ADD CONSTRAINT `crm_academy_instructor_bonuses_workshop_id_fkey` FOREIGN KEY (`workshop_id`) REFERENCES `crm_academy_workshops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_instructor_bonuses` ADD CONSTRAINT `crm_academy_instructor_bonuses_participant_id_fkey` FOREIGN KEY (`participant_id`) REFERENCES `crm_academy_workshop_participants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_instructor_bonuses` ADD CONSTRAINT `crm_academy_instructor_bonuses_assessment_id_fkey` FOREIGN KEY (`assessment_id`) REFERENCES `crm_academy_talent_assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_instructor_bonuses` ADD CONSTRAINT `crm_academy_instructor_bonuses_instructor_id_fkey` FOREIGN KEY (`instructor_id`) REFERENCES `crm_academy_instructors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_instructor_bonuses` ADD CONSTRAINT `crm_academy_instructor_bonuses_paid_by_staff_id_fkey` FOREIGN KEY (`paid_by_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_campaign_touchpoints` ADD CONSTRAINT `crm_academy_campaign_touchpoints_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `crm_academy_campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_campaign_touchpoint_logs` ADD CONSTRAINT `crm_academy_campaign_touchpoint_logs_campaign_lead_id_fkey` FOREIGN KEY (`campaign_lead_id`) REFERENCES `crm_academy_campaign_leads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_campaign_touchpoint_logs` ADD CONSTRAINT `crm_academy_campaign_touchpoint_logs_touchpoint_id_fkey` FOREIGN KEY (`touchpoint_id`) REFERENCES `crm_academy_campaign_touchpoints`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_academy_campaign_touchpoint_logs` ADD CONSTRAINT `crm_academy_campaign_touchpoint_logs_completed_by_staff_id_fkey` FOREIGN KEY (`completed_by_staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `crm_academy_campaign_touchpoint_logs` RENAME INDEX `acad_camp_tp_log_actor_at_idx` TO `crm_academy_campaign_touchpoint_logs_completed_by_staff_id_c_idx`;

-- RenameIndex
ALTER TABLE `crm_academy_campaign_touchpoint_logs` RENAME INDEX `acad_camp_tp_log_member_tp_uniq` TO `crm_academy_campaign_touchpoint_logs_campaign_lead_id_touchp_key`;

-- RenameIndex
ALTER TABLE `crm_academy_campaign_touchpoint_logs` RENAME INDEX `acad_camp_tp_log_touchpoint_idx` TO `crm_academy_campaign_touchpoint_logs_touchpoint_id_idx`;

-- RenameIndex
ALTER TABLE `crm_academy_talent_policy_audits` RENAME INDEX `acad_policy_audit_changer_created_idx` TO `crm_academy_talent_policy_audits_changed_by_staff_id_created_idx`;

-- RenameIndex
ALTER TABLE `crm_academy_talent_policy_audits` RENAME INDEX `acad_policy_audit_config_created_idx` TO `crm_academy_talent_policy_audits_config_key_created_at_idx`;
