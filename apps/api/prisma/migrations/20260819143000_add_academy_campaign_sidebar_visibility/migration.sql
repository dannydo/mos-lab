-- A pinned Academy campaign is discoverable only through the server-filtered
-- sidebar endpoint. The flag never grants campaign access by itself.
ALTER TABLE `crm_academy_campaigns`
  ADD COLUMN `show_in_sidebar` TINYINT(1) NOT NULL DEFAULT 0;

CREATE INDEX `crm_academy_campaigns_show_in_sidebar_deleted_at_idx`
  ON `crm_academy_campaigns`(`show_in_sidebar`, `deleted_at`);
