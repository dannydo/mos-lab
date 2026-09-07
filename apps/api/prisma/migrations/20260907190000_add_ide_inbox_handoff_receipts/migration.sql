-- Code/test, commit and deploy authority are IDE-owned.  The nonce makes each
-- handoff receipt one-time; a revoked handoff can never be replayed.
ALTER TABLE `crm_inbox_implementation_jobs`
  ADD COLUMN `execution_owner` VARCHAR(16) NOT NULL DEFAULT 'IDE' AFTER `retry_sequence`,
  ADD COLUMN `ide_receipt_nonce` VARCHAR(64) NULL AFTER `execution_owner`,
  ADD COLUMN `ide_handoff_revoked_at` DATETIME(0) NULL AFTER `ide_receipt_nonce`,
  MODIFY COLUMN `execution_phase` VARCHAR(32) NOT NULL DEFAULT 'IDE_HANDOFF_READY';
