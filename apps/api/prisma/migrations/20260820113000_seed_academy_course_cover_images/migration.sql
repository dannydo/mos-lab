-- Native copies of the Wings Academy course artwork live under
-- apps/web/public/academy/courses.  Persist the public paths in CRM so the
-- catalog and the Tố Chất course picker always render the same covers.
UPDATE `crm_academy_courses`
SET `cover_image_url` = CASE `code`
  WHEN 'combo' THEN '/academy/courses/lash_combo.jpg'
  WHEN 'basic' THEN '/academy/courses/lash_basic.jpg'
  WHEN 'advanced' THEN '/academy/courses/lash_advanced.jpg'
  WHEN 'fan' THEN '/academy/courses/lash_volume.jpg'
  WHEN 'design' THEN '/academy/courses/lash_design.jpg'
  ELSE `cover_image_url`
END
WHERE `code` IN ('combo', 'basic', 'advanced', 'fan', 'design');
