-- Departments are stable operating domains. Teams remain the roster and
-- reporting unit, and may be nested without changing historical team codes.
CREATE TABLE `crm_departments` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(30) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `color` VARCHAR(30) NULL,
  `icon` VARCHAR(50) NULL,
  `sort_order` INTEGER NOT NULL DEFAULT 0,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  UNIQUE INDEX `crm_departments_code_key`(`code`),
  INDEX `crm_departments_is_active_idx`(`is_active`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `crm_teams`
  ADD COLUMN `department_id` INTEGER NULL,
  ADD INDEX `crm_teams_department_id_idx`(`department_id`),
  ADD CONSTRAINT `crm_teams_department_id_fkey`
    FOREIGN KEY (`department_id`) REFERENCES `crm_departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO `crm_departments` (`code`, `name`, `description`, `color`, `icon`, `sort_order`, `is_active`)
VALUES
  ('SHOP', 'Shop Operations', 'Vận hành dịch vụ trực tiếp tại cửa hàng', '#d4a72c', '🏬', 1, 1),
  ('ACADEMY', 'Wings Academy', 'Vận hành đào tạo, tuyển sinh và giảng viên Academy', '#722ed1', '🎓', 2, 1),
  ('GROWTH', 'Growth & Booking', 'Telesales, booking và các hoạt động tăng trưởng khách hàng', '#fa8c16', '📈', 3, 1),
  ('BACK_OFFICE', 'Back Office', 'Các chức năng hỗ trợ: HR, tài chính, vận hành và hệ thống', '#1677ff', '🏢', 4, 1)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `color` = VALUES(`color`),
  `icon` = VALUES(`icon`),
  `sort_order` = VALUES(`sort_order`),
  `is_active` = VALUES(`is_active`);

UPDATE `crm_teams` team
JOIN `crm_departments` department ON department.`code` = 'SHOP'
SET team.`department_id` = department.`id`
WHERE team.`code` IN ('CC', 'CV');

UPDATE `crm_teams` team
JOIN `crm_departments` department ON department.`code` = 'GROWTH'
SET team.`department_id` = department.`id`
WHERE team.`code` IN ('BK', 'BK_TELESALES', 'BK_CS', 'BK_CONTROL', 'BK_OTHER');

UPDATE `crm_teams` team
JOIN `crm_departments` department ON department.`code` = 'ACADEMY'
SET team.`department_id` = department.`id`
WHERE team.`code` = 'ACADEMY';
