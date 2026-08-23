-- Delivery planning fields: every course carries its session count and the
-- number of live lash models that must be arranged (zero when not applicable).
ALTER TABLE `crm_academy_courses`
  ADD COLUMN `lesson_count` INTEGER NOT NULL DEFAULT 0 AFTER `kit_url`,
  ADD COLUMN `lash_model_count` INTEGER NOT NULL DEFAULT 0 AFTER `lesson_count`;
