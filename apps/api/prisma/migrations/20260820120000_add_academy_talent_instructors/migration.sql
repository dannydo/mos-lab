CREATE TABLE `crm_academy_instructors` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL,
  `staff_id` INT NULL,
  `display_name` VARCHAR(150) NOT NULL,
  `description` VARCHAR(255) NULL,
  `avatar_url` TEXT NULL,
  `surcharge_percent` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL,

  UNIQUE INDEX `crm_academy_instructors_code_key`(`code`),
  UNIQUE INDEX `crm_academy_instructors_staff_id_key`(`staff_id`),
  INDEX `crm_academy_instructors_is_active_sort_order_idx`(`is_active`, `sort_order`),
  PRIMARY KEY (`id`),
  CONSTRAINT `crm_academy_instructors_staff_id_fkey`
    FOREIGN KEY (`staff_id`) REFERENCES `crm_staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `crm_academy_talent_assessments`
  ADD COLUMN `selected_instructor_ids_by_course` LONGTEXT NULL;

-- Exact legacy Tố Chất options, now stored in mOS rather than browser code.
-- The percentage is applied to tuition after the workshop scholarship.
INSERT INTO `crm_academy_instructors`
  (`code`, `display_name`, `description`, `surcharge_percent`, `is_active`, `sort_order`, `updated_at`)
VALUES
  ('auto', 'Tự động phân bổ giảng viên', 'Phân bổ ngẫu nhiên', 0, 1, 0, NOW()),
  ('giang_tran', 'Giảng viên Giang Trần', 'Chỉ định giảng viên chính', 20, 1, 10, NOW()),
  ('giang_pham', 'Giảng viên Giang Phạm', 'Chỉ định giảng viên chính', 50, 1, 20, NOW()),
  ('hong_bui', 'Head Master Hồng Bùi', 'Học kèm 1:1 Head Master', 100, 1, 30, NOW())
ON DUPLICATE KEY UPDATE
  `display_name` = VALUES(`display_name`),
  `description` = VALUES(`description`),
  `surcharge_percent` = VALUES(`surcharge_percent`),
  `is_active` = VALUES(`is_active`),
  `sort_order` = VALUES(`sort_order`),
  `updated_at` = VALUES(`updated_at`);

-- Only link the profile where the existing mOS name is unambiguous. The
-- remaining legacy instructor labels remain config records until HR confirms
-- their current staff profiles.
UPDATE `crm_academy_instructors` AS instructor
JOIN `crm_staff` AS staff ON staff.`display_name` = 'Giang Trần'
SET instructor.`staff_id` = staff.`id`,
    instructor.`avatar_url` = COALESCE(staff.`avatar_url`, instructor.`avatar_url`)
WHERE instructor.`code` = 'giang_tran';
