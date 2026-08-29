ALTER TABLE `crm_academy_workshops`
  ADD COLUMN `equipment_agenda_item_id` INT NULL,
  ADD UNIQUE INDEX `crm_academy_workshops_equipment_agenda_item_id_key` (`equipment_agenda_item_id`),
  ADD CONSTRAINT `crm_academy_workshops_equipment_agenda_item_id_fkey`
    FOREIGN KEY (`equipment_agenda_item_id`) REFERENCES `crm_academy_workshop_agenda_items` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `crm_academy_workshop_quizzes`
  ADD COLUMN `agenda_item_id` INT NULL,
  ADD INDEX `crm_academy_workshop_quizzes_agenda_item_id_idx` (`agenda_item_id`),
  ADD CONSTRAINT `crm_academy_workshop_quizzes_agenda_item_id_fkey`
    FOREIGN KEY (`agenda_item_id`) REFERENCES `crm_academy_workshop_agenda_items` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
