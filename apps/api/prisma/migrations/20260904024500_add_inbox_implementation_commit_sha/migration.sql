-- Retain the exact commit created from Danny's approved review patch so the
-- later deploy acknowledgement can be verified without asking the user for SHA.
ALTER TABLE `crm_inbox_implementation_jobs`
  ADD COLUMN `commit_sha` VARCHAR(64) NULL AFTER `risks_and_rollback`;
