ALTER TABLE `crm_academy_workshops`
  ADD COLUMN `agenda_preset_key` VARCHAR(48) NOT NULL DEFAULT 'HAPPY_FRIDAY' AFTER `status`;
