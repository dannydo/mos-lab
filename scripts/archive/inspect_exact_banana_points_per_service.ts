import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client';

const legacy = new LegacyPrismaClient({
  datasources: {
    db: {
      url: 'mysql://root:chickisslove@127.0.0.1:3306/management',
    },
  },
});

async function main() {
  try {
    await legacy.$connect();

    console.log('=== 1. ALL STAFF BONUS RULES FOR BONUSPOINT / BANANA ===');
    const rules = await legacy.$queryRawUnsafe<any[]>(`
      SELECT id, type, bonus_type, bonus_amount, is_disabled
      FROM staff_bonus_rule
      WHERE bonus_type IN ('BonusPoint', 'Banana')
      ORDER BY id ASC
      LIMIT 50
    `);
    console.table(rules);

    console.log('\n=== 2. SAMPLE REAL STAFF_BONUS ROWS FOR KTV (BONUSPOINT) ===');
    const samples = await legacy.$queryRawUnsafe<any[]>(`
      SELECT 
        sb.id, sb.user_id, up.full_name, sb.order_service_id, 
        sb.bonus_type, sb.bonus_amount, sb.staff_bonus_rule_id, sbr.type as rule_type, sb.date_created
      FROM staff_bonus sb
      JOIN user_profile up ON up.user_id = sb.user_id
      LEFT JOIN staff_bonus_rule sbr ON sbr.id = sb.staff_bonus_rule_id
      WHERE up.user_group_id = 4 AND sb.bonus_type IN ('BonusPoint', 'Banana')
      ORDER BY sb.id DESC
      LIMIT 30
    `);
    console.table(samples);

    console.log('\n=== 3. TOTAL BONUSPOINTS EARNED PER KTV PER DAY (SAMPLE 2026-08-09) ===');
    const dailyPoints = await legacy.$queryRawUnsafe<any[]>(`
      SELECT 
        sb.user_id, up.full_name, DATE_FORMAT(ro.date, '%Y-%m-%d') as shift_date,
        COUNT(DISTINCT os.id) as total_services,
        SUM(sb.bonus_amount) as total_banana_points
      FROM staff_bonus sb
      JOIN user_profile up ON up.user_id = sb.user_id
      JOIN order_service os ON os.id = sb.order_service_id
      JOIN \`order\` o ON o.id = os.order_id
      JOIN report_order ro ON ro.order_id = o.id
      WHERE up.user_group_id = 4 
        AND sb.bonus_type IN ('BonusPoint', 'Banana')
        AND ro.date = '2026-08-09'
      GROUP BY sb.user_id, up.full_name, ro.date
      LIMIT 20
    `);
    console.table(dailyPoints);
  } catch (err) {
    console.error('Error executing query:', err);
  } finally {
    await legacy.$disconnect();
  }
}

main();
