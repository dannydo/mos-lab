import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client/index.js';
import { parseLashSpecs } from '../apps/api/src/modules/catalog/services/lash-benchmark.service.js';

async function test() {
  const legacyPrisma = new LegacyPrismaClient({
    datasources: {
      db: { url: process.env.LEGACY_DATABASE_URL || 'mysql://root:chickisslove@127.0.0.1:3306/management' },
    },
  });

  const staffId = 47950; // Cẩm Tiên
  const windowMonths = 6;

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

  console.log(`Cẩm Tiên (47950) rawCases count: ${rawCases.length}`);

  if (rawCases.length > 0) {
    const parsed = rawCases.map((c) => {
      const specs = parseLashSpecs(c.service_key, c.service_name);
      return {
        key: c.service_key,
        name: c.service_name,
        type: c.service_type,
        style: specs.lashStyle,
        count: specs.lashCount,
        dur:
          Number(c.cleaning_minute) +
          Number(c.servicing_minute) +
          Number(c.preparation_minute) +
          Number(c.pre_servicing_minute),
      };
    });

    console.log('Sample parsed cases (first 20):', parsed.slice(0, 20));

    // Check Classic 60 cases
    const classic60 = parsed.filter((p) => p.style === 'Classic' && p.count === 60);
    console.log(`Classic 60 cases count: ${classic60.length}`);
    if (classic60.length > 0) {
      console.log(
        'Sample Classic 60 durations:',
        classic60.map((c) => c.dur)
      );
    }
  }

  await legacyPrisma.$disconnect();
}

test().catch(console.error);
