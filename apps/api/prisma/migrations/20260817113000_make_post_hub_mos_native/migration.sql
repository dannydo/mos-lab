-- Retain historical Sheet rows, while allowing native mOS submissions to be
-- created first and assigned their internal source record number atomically.
ALTER TABLE `crm_social_post_submissions`
  MODIFY `source_record_id` INTEGER NULL;

ALTER TABLE `crm_social_post_submissions`
  ADD COLUMN `source_url_fingerprint` VARCHAR(64) NULL;

CREATE UNIQUE INDEX `crm_post_source_fingerprint_key`
  ON `crm_social_post_submissions`(`source_spreadsheet_id`, `source_url_fingerprint`);
