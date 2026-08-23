-- The Academy workspace is an explicit operational team, not a broad CRM role.
-- Membership stays empty until an Admin selects the appropriate staff in Team Configuration.
INSERT INTO `crm_teams` (
  `code`, `name`, `description`, `color`, `icon`, `sort_order`, `is_active`, `created_at`, `updated_at`
) VALUES (
  'ACADEMY',
  'Wings Academy',
  'Đội ngũ vận hành, tư vấn và quản lý khách hàng Wings Academy',
  '#722ed1',
  '🎓',
  8,
  1,
  CURRENT_TIMESTAMP(0),
  CURRENT_TIMESTAMP(0)
)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `color` = VALUES(`color`),
  `icon` = VALUES(`icon`),
  `sort_order` = VALUES(`sort_order`),
  `is_active` = VALUES(`is_active`);
