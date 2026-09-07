ALTER TABLE `crm_inbox_implementation_jobs`
  ADD COLUMN `ide_task_id` VARCHAR(160) NULL,
  ADD COLUMN `ide_task_bound_at` DATETIME(0) NULL,
  ADD INDEX `crm_inbox_implementation_jobs_ide_task_id_idx` (`ide_task_id`);
