-- Preserve the legacy structured syllabus while adding bilingual and rich-text
-- fields for the native Wings Academy course workspace.
ALTER TABLE `crm_academy_courses`
  ADD COLUMN `name_en` VARCHAR(255) NULL AFTER `name`,
  ADD COLUMN `syllabus_html` LONGTEXT NULL AFTER `syllabus`;
