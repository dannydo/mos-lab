ALTER TABLE `crm_academy_workshops`
  ADD COLUMN `menu_agenda_item_id` INT NULL,
  ADD UNIQUE INDEX `crm_academy_workshops_menu_agenda_item_id_key` (`menu_agenda_item_id`),
  ADD CONSTRAINT `crm_academy_workshops_menu_agenda_item_id_fkey`
    FOREIGN KEY (`menu_agenda_item_id`) REFERENCES `crm_academy_workshop_agenda_items` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
