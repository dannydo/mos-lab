import { PrismaClient as CrmPrismaClient } from '../apps/api/src/generated/crm-client/index.js';
import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client/index.js';
import {
  predictCvSpeed,
  getCvRollingWindowMonths,
} from '../apps/api/src/modules/kpi/services/cv-speed-model.service.js';
import { parseLashSpecs } from '../apps/api/src/modules/catalog/services/lash-benchmark.service.js';

async function test() {
  const crmPrisma = new CrmPrismaClient({
    datasources: { db: { url: process.env.CRM_DATABASE_URL || 'mysql://root:chickisslove@127.0.0.1:3306/mos_lab' } },
  });
  const legacyPrisma = new LegacyPrismaClient({
    datasources: {
      db: { url: process.env.LEGACY_DATABASE_URL || 'mysql://root:chickisslove@127.0.0.1:3306/management' },
    },
  });

  const staffId = 47950; // Cẩm Tiên
  const windowMonths = await getCvRollingWindowMonths(legacyPrisma, staffId);

  const rawCases = (await legacyPrisma.$queryRawUnsafe(`
    SELECT
      s.service_key,
      COALESCE(sl.service_name, s.service_key) as service_name,
      s.service_type,
      COALESCE(ros.cleaning_minute, 0) as cleaning_minute,
      COALESCE(ros.servicing_minute, 0) as servicing_minute,
      COALESCE(ros.preparation_minute, 0) as preparation_minute,
      COALESCE(ros.pre_servicing_minute, 0) as pre_servicing_minute
    FROM order_service os
    JOIN \`order\` o ON os.order_id = o.id
    JOIN service s ON os.service_id = s.id
    JOIN report_order_service ros ON os.id = ros.order_service_id
    LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
    JOIN staff_bonus sb ON sb.order_service_id = os.id
    WHERE o.order_state = 'Completed'
      AND (os.assigned_staff_id = ${Number(staffId)} OR sb.user_id = ${Number(staffId)})
      AND (COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0) + COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0)) > 15
      AND (COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0) + COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0)) < 200
      AND COALESCE(
        (SELECT ro.actual_booking_date_start FROM report_order ro WHERE ro.order_id = o.id LIMIT 1),
        o.booking_date_start
      ) >= DATE_SUB(NOW(), INTERVAL ${windowMonths} MONTH)
  `)) as any[];

  const staffCases = rawCases.map((c) => {
    const specs = parseLashSpecs(c.service_key, c.service_name);
    const cleaning = Number(c.cleaning_minute || 0);
    const extension = Number(c.servicing_minute || 0);
    const prepQc = Number(c.preparation_minute || 0) + Number(c.pre_servicing_minute || 0);
    const total = cleaning + extension + prepQc;
    const mode = c.service_type === 'Retain' ? 'retain' : 'normal_clean';
    return {
      lashStyle: specs.lashStyle,
      serviceMode: mode as any,
      lashCount: specs.lashCount || 60,
      cleaning,
      extension,
      prepQc,
      total,
    };
  });

  console.log(`staffCases count for Cẩm Tiên: ${staffCases.length}`);

  const pred1 = await predictCvSpeed(crmPrisma, legacyPrisma, staffId, 'Classic', 'normal_clean', 60);
  console.log('Without preFetchedCases:', pred1);

  const pred2 = await predictCvSpeed(crmPrisma, legacyPrisma, staffId, 'Classic', 'normal_clean', 60, staffCases);
  console.log('With preFetchedCases:', pred2);

  await crmPrisma.$disconnect();
  await legacyPrisma.$disconnect();
}

test().catch(console.error);
