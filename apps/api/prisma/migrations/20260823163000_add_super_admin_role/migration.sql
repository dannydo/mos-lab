-- Super Admin is a system role with explicit, auditable identity. It inherits
-- normal Admin capabilities in the application layer and owns sensitive
-- system configuration such as sidebar visibility policies.
INSERT INTO `crm_roles` (
  `key`, `name`, `color`, `view_kpi`, `view_team_kpi`, `manage_staff`,
  `omicall_auto_init`, `is_system`, `description`
)
VALUES (
  'super_admin', 'Super Admin', 'magenta', 1, 1, 1, 0, 1,
  'Quản trị tối cao: cấu hình quyền hệ thống và audit bảo mật'
)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `color` = VALUES(`color`),
  `view_kpi` = VALUES(`view_kpi`),
  `view_team_kpi` = VALUES(`view_team_kpi`),
  `manage_staff` = VALUES(`manage_staff`),
  `is_system` = VALUES(`is_system`),
  `description` = VALUES(`description`);

-- Canonical Danny Do accounts are promoted together so either password or
-- Google login resolves to the same persistent role.
UPDATE `crm_staff`
SET `role` = 'super_admin'
WHERE LOWER(`username`) IN ('admin', 'danhdo@gmail.com', 'danny.do@wingslashes.com')
   OR LOWER(COALESCE(`email`, '')) IN ('danhdo@gmail.com', 'danny.do@wingslashes.com');
