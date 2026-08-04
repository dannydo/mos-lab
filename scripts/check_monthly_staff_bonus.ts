import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client/index.js';

const legacy = new LegacyPrismaClient({
  datasources: {
    db: {
      url: 'mysql://root:chickisslove@127.0.0.1:3306/management',
    },
  },
});

async function checkAllStaffBonus() {
  await legacy.$connect();

  console.log('--- Inspecting total rows in staff_bonus by month ---');

  const monthlyCounts = await legacy.$queryRawUnsafe<any[]>(`
    SELECT 
      DATE_FORMAT(ro.date, '%Y-%m') as month_str,
      sb.bonus_type,
      COUNT(*) as row_count,
      SUM(sb.bonus_amount) as total_bonus
    FROM staff_bonus sb
    JOIN order_service os ON sb.order_service_id = os.id
    JOIN \`order\` o ON os.order_id = o.id
    JOIN report_order ro ON o.id = ro.order_id
    WHERE ro.date >= '2026-01-01'
    GROUP BY month_str, sb.bonus_type
    ORDER BY month_str DESC, sb.bonus_type ASC
  `);

  console.table(monthlyCounts);

  await legacy.$disconnect();
}

checkAllStaffBonus();
