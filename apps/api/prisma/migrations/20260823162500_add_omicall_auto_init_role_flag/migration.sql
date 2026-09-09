-- Historical baseline repair: the OmiCall role capability was introduced in
-- the Prisma schema before the Academy super-admin seed began writing it.
ALTER TABLE `crm_roles`
    ADD COLUMN `omicall_auto_init` TINYINT(1) NOT NULL DEFAULT 0;
