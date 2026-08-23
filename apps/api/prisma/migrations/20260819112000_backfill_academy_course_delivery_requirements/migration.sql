-- Values are transcribed from the legacy Academy course syllabus. Only the
-- unconfigured zero values are filled; operational values already set in mOS
-- are never overwritten.
UPDATE `crm_academy_courses`
SET `lesson_count` = CASE `code`
      WHEN 'basic' THEN 6
      WHEN 'advanced' THEN 6
      WHEN 'fan' THEN 8
      WHEN 'design' THEN 4
      WHEN 'combo' THEN 24
      ELSE `lesson_count`
    END
WHERE `lesson_count` = 0
  AND `code` IN ('basic', 'advanced', 'fan', 'design', 'combo');

UPDATE `crm_academy_courses`
SET `lash_model_count` = CASE `code`
      WHEN 'basic' THEN 3
      WHEN 'advanced' THEN 3
      WHEN 'fan' THEN 4
      WHEN 'design' THEN 2
      WHEN 'combo' THEN 12
      ELSE `lash_model_count`
    END
WHERE `lash_model_count` = 0
  AND `code` IN ('basic', 'advanced', 'fan', 'design', 'combo');
