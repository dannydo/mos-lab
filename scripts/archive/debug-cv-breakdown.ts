import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client/index.js';
import { parseLashSpecs } from '../apps/api/src/modules/catalog/services/lash-benchmark.service.js';

async function test() {
  const legacy = new LegacyPrismaClient({
    datasources: {
      db: { url: process.env.LEGACY_DATABASE_URL || 'mysql://root:chickisslove@127.0.0.1:3306/management' },
    },
  });

  const activeCvIds = [3832, 47950, 47510, 48308, 13783, 34806, 52453, 928, 51154, 52186];
  const rows = (await legacy.$queryRawUnsafe(`
    SELECT
      sb.user_id as staff_id,
      s.service_key,
      COALESCE(sl.service_name, s.service_key) as service_name,
      s.service_type,
      COUNT(*) as cnt
    FROM order_service os
    JOIN \`order\` o ON os.order_id = o.id
    JOIN service s ON os.service_id = s.id
    JOIN report_order_service ros ON os.id = ros.order_service_id
    LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
    JOIN staff_bonus sb ON sb.order_service_id = os.id
    WHERE o.order_state = 'Completed'
      AND sb.user_id IN (${activeCvIds.join(',')})
      AND (COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0) + COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0)) > 15
    GROUP BY sb.user_id, s.service_key, service_name, s.service_type
    LIMIT 40
  `)) as any[];

  console.log(`Found ${rows.length} breakdown rows for active CVs:`);
  for (const r of rows) {
    const specs = parseLashSpecs(r.service_key, r.service_name);
    console.log(
      `Staff ${r.staff_id}: key="${r.service_key}" name="${r.service_name}" type="${r.service_type}" -> LashStyle="${specs.lashStyle}" Count=${specs.lashCount} (Count=${r.cnt})`
    );
  }

  await legacy.$disconnect();
}

test().catch(console.error);
