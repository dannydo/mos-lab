import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client/index.js';

const legacy = new LegacyPrismaClient({
  datasources: {
    db: {
      url: 'mysql://root:chickisslove@127.0.0.1:3306/management',
    },
  },
});

async function checkStaffBonus() {
  await legacy.$connect();

  console.log('--- Inspecting staff_bonus rows for Diễm Hương (user_id = 37790) in July 2026 ---');

  const rows = await legacy.$queryRawUnsafe<any[]>(`
    SELECT 
      sb.id,
      sb.order_service_id,
      sb.user_id,
      sb.bonus_type,
      sb.bonus_amount,
      sb.staff_bonus_rule_id,
      sbr.type AS rule_type,
      ro.date
    FROM staff_bonus sb
    JOIN staff_bonus_rule sbr ON sb.staff_bonus_rule_id = sbr.id
    JOIN order_service os ON sb.order_service_id = os.id
    JOIN \`order\` o ON os.order_id = o.id
    JOIN report_order ro ON o.id = ro.order_id
    WHERE sb.user_id = 37790
      AND ro.date BETWEEN '2026-07-01' AND '2026-07-31'
    ORDER BY sb.id ASC
    LIMIT 100
  `);

  console.log(`Total staff_bonus rows for 37790 in July 2026: ${rows.length}`);
  if (rows.length > 0) {
    console.log('Sample rows:');
    console.table(rows.slice(0, 15));
  } else {
    console.log('❌ NO ROWS FOUND IN staff_bonus for user_id = 37790 in July 2026!');
  }

  // Summary of all staff_bonus in July 2026 grouped by bonus_type & rule_type
  const anyRows = await legacy.$queryRawUnsafe<any[]>(`
    SELECT 
      sb.bonus_type,
      sb.staff_bonus_rule_id,
      sbr.type AS rule_type,
      COUNT(*) as cnt,
      SUM(sb.bonus_amount) as total_amount
    FROM staff_bonus sb
    JOIN staff_bonus_rule sbr ON sb.staff_bonus_rule_id = sbr.id
    JOIN order_service os ON sb.order_service_id = os.id
    JOIN \`order\` o ON os.order_id = o.id
    JOIN report_order ro ON o.id = ro.order_id
    WHERE ro.date BETWEEN '2026-07-01' AND '2026-07-31'
    GROUP BY sb.bonus_type, sb.staff_bonus_rule_id, sbr.type
  `);
  console.log('\n--- Summary of ALL staff_bonus in July 2026 ---');
  console.table(anyRows);

  await legacy.$disconnect();
}

checkStaffBonus();
