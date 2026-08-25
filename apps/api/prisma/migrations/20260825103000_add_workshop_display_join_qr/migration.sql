ALTER TABLE `crm_academy_workshops`
  ADD COLUMN `show_join_qr_on_display` TINYINT(1) NOT NULL DEFAULT 0 AFTER `display_token_version`;
