-- Keep the stable ACADEMY code and all memberships intact while aligning the
-- organization-facing name with the dedicated Academy sidebar section.
UPDATE `crm_departments`
SET
  `name` = 'Academy',
  `description` = 'Vận hành đào tạo, tuyển sinh và giảng viên Academy'
WHERE `code` = 'ACADEMY';

UPDATE `crm_teams`
SET
  `name` = 'Academy',
  `description` = 'Đội ngũ vận hành, tư vấn và quản lý khách hàng Academy'
WHERE `code` = 'ACADEMY';
