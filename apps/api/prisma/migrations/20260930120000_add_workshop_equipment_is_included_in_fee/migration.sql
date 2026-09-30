-- Add is_included_in_fee to equipment packages and template packages

ALTER TABLE `crm_academy_workshop_equipment_packages`
  ADD COLUMN `is_included_in_fee` TINYINT NOT NULL DEFAULT 0 AFTER `is_available`;

ALTER TABLE `crm_academy_workshop_equipment_template_packages`
  ADD COLUMN `is_included_in_fee` TINYINT NOT NULL DEFAULT 0 AFTER `is_available`;

-- Mark existing 299k Basic Combo as included in fee by default
UPDATE `crm_academy_workshop_equipment_packages`
  SET `is_included_in_fee` = 1
  WHERE `price_vnd` = 299000 AND `name` LIKE '%Cơ Bản%';

UPDATE `crm_academy_workshop_equipment_template_packages`
  SET `is_included_in_fee` = 1
  WHERE `price_vnd` = 299000 AND `name` LIKE '%Cơ Bản%';
