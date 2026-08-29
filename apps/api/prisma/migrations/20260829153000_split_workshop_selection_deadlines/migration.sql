ALTER TABLE `crm_academy_workshops`
  ADD COLUMN `menu_selection_deadline` DATETIME(0) NULL AFTER `selection_change_deadline`,
  ADD COLUMN `equipment_selection_deadline` DATETIME(0) NULL AFTER `menu_selection_deadline`;

UPDATE `crm_academy_workshops`
SET
  `menu_selection_deadline` = `selection_change_deadline`,
  `equipment_selection_deadline` = `selection_change_deadline`
WHERE `selection_change_deadline` IS NOT NULL;
