ALTER TABLE `crm_bug_reports`
  ADD COLUMN `request_type` VARCHAR(16) NOT NULL DEFAULT 'BUG' AFTER `reporter_staff_id`,
  ADD COLUMN `request_metadata_json` LONGTEXT NULL AFTER `request_type`;

CREATE INDEX `bug_request_type_status_idx`
  ON `crm_bug_reports` (`request_type`, `status_sort`, `priority_sort`, `created_at`);
