ALTER TABLE `crm_inbox_follow_up_jobs`
  ADD COLUMN `event_context_json` LONGTEXT NULL;

ALTER TABLE `crm_inbox_plan_jobs`
  ADD COLUMN `event_context_json` LONGTEXT NULL;
