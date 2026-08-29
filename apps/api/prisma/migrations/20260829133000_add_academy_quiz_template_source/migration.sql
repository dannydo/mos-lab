ALTER TABLE `crm_academy_workshop_quizzes`
  ADD COLUMN `source_template_id` INT NULL,
  ADD INDEX `crm_academy_workshop_quizzes_source_template_id_idx` (`source_template_id`),
  ADD CONSTRAINT `crm_academy_workshop_quizzes_source_template_id_fkey`
    FOREIGN KEY (`source_template_id`) REFERENCES `crm_academy_workshop_quizzes` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
