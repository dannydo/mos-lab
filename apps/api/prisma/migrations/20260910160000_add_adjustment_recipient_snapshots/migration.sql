-- Additive-only recipient snapshots. Existing local rehearsal lines remain
-- immutable and therefore keep NULL until a new case captures its own facts.
ALTER TABLE `crm_fal_adjustment_lines`
  ADD COLUMN `recipient_display_name` VARCHAR(100) NULL AFTER `recipient_role`,
  ADD COLUMN `recipient_avatar_url` TEXT NULL AFTER `recipient_display_name`,
  ADD COLUMN `recipient_branch_key` VARCHAR(30) NULL AFTER `recipient_avatar_url`,
  ADD COLUMN `recipient_branch_name` VARCHAR(160) NULL AFTER `recipient_branch_key`;
