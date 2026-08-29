ALTER TABLE `crm_academy_workshops`
  MODIFY `capacity` INT NOT NULL DEFAULT 10,
  ADD COLUMN `menu_template_id` INT NULL,
  ADD COLUMN `equipment_template_id` INT NULL,
  ADD INDEX `crm_academy_workshops_menu_template_id_idx` (`menu_template_id`),
  ADD INDEX `crm_academy_workshops_equipment_template_id_idx` (`equipment_template_id`),
  ADD CONSTRAINT `crm_academy_workshops_menu_template_id_fkey`
    FOREIGN KEY (`menu_template_id`) REFERENCES `crm_academy_workshop_menu_templates` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `crm_academy_workshops_equipment_template_id_fkey`
    FOREIGN KEY (`equipment_template_id`) REFERENCES `crm_academy_workshop_equipment_templates` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
