-- Add composite index for bug report polling performance by reporter and status
CREATE INDEX `bug_reporter_status_created_idx` ON `crm_bug_reports`(`reporter_staff_id`, `status`, `created_at`);
