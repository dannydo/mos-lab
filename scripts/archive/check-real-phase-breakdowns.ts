import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client/index.js';

async function main() {
  const legacyPrisma = new LegacyPrismaClient({
    datasources: { db: { url: process.env.LEGACY_DATABASE_URL || 'mysql://root:root@localhost:3306/management' } },
  });

  const rows = await legacyPrisma.$queryRawUnsafe(`
    SELECT
      sb.user_id AS staff_id,
      up.full_name AS staff_name,
      COUNT(*) AS total_cases,
      ROUND(AVG(COALESCE(ros.cleaning_minute, 0))) AS avg_cleaning,
      ROUND(AVG(COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0))) AS avg_prep_qc,
      ROUND(AVG(COALESCE(ros.servicing_minute, 0))) AS avg_extension,
      ROUND(AVG(COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0) + COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0))) AS avg_total
    FROM order_service os
    JOIN \`order\` o ON os.order_id = o.id
    JOIN report_order_service ros ON os.id = ros.order_service_id
    JOIN staff_bonus sb ON sb.order_service_id = os.id
    JOIN user_profile up ON sb.user_id = up.user_id
    WHERE o.order_state = 'Completed'
      AND (COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0) + COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0)) BETWEEN 15 AND 200
      AND COALESCE(
        (SELECT ro.actual_booking_date_start FROM report_order ro WHERE ro.order_id = o.id LIMIT 1),
        o.booking_date_start
      ) >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
    GROUP BY sb.user_id, up.full_name
    ORDER BY avg_total ASC
  `);

  console.log('Real historical average breakdown per KTV:');
  console.table(rows);

  await legacyPrisma.$disconnect();
}

main().catch(console.error);
