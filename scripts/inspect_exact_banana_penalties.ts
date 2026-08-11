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
    console.log('Connected to legacy MySQL database management');

    console.log('\n==================================================');
    console.log('1. ALL NEGATIVE BONUS_AMOUNT IN staff_bonus');
    console.log('==================================================');
    const negativeBonuses = await legacy.$queryRawUnsafe<any[]>(`
      SELECT 
        sb.id, sb.user_id, up.full_name, sb.bonus_type, sb.bonus_amount, 
        sb.staff_bonus_rule_id, sbr.type as rule_type, sb.description, sb.date_created
      FROM staff_bonus sb
      LEFT JOIN staff_bonus_rule sbr ON sbr.id = sb.staff_bonus_rule_id
      LEFT JOIN user_profile up ON up.user_id = sb.user_id
      WHERE sb.bonus_amount < 0
      ORDER BY sb.id DESC
      LIMIT 100
    `);
    console.log(`Found ${negativeBonuses.length} negative bonus rows`);
    console.table(negativeBonuses);

    console.log('\n==================================================');
    console.log('2. SEARCH DESCRIPTION CONTAINING off / gấp / vắng / phạt / trừ / nghỉ IN staff_bonus');
    console.log('==================================================');
    const offBonusRows = await legacy.$queryRawUnsafe<any[]>(`
      SELECT 
        sb.id, sb.user_id, up.full_name, sb.bonus_type, sb.bonus_amount, 
        sb.staff_bonus_rule_id, sbr.type as rule_type, sb.description, sb.date_created
      FROM staff_bonus sb
      LEFT JOIN staff_bonus_rule sbr ON sbr.id = sb.staff_bonus_rule_id
      LEFT JOIN user_profile up ON up.user_id = sb.user_id
      WHERE sb.description LIKE '%off%' 
         OR sb.description LIKE '%gấp%' 
         OR sb.description LIKE '%vắng%' 
         OR sb.description LIKE '%phạt%' 
         OR sb.description LIKE '%trừ%' 
         OR sb.description LIKE '%nghỉ%'
      ORDER BY sb.id DESC
      LIMIT 100
    `);
    console.log(`Found ${offBonusRows.length} matching description rows`);
    console.table(offBonusRows);

    console.log('\n==================================================');
    console.log('3. SUMMARY OF ALL BONUS_TYPES AND NEGATIVE VS POSITIVE AMOUNTS IN staff_bonus');
    console.log('==================================================');
    const summary = await legacy.$queryRawUnsafe<any[]>(`
      SELECT 
        bonus_type,
        COUNT(*) as total_rows,
        SUM(CASE WHEN bonus_amount < 0 THEN 1 ELSE 0 END) as negative_rows,
        MIN(bonus_amount) as min_amount,
        MAX(bonus_amount) as max_amount,
        AVG(bonus_amount) as avg_amount
      FROM staff_bonus
      GROUP BY bonus_type
    `);
    console.table(summary);

    console.log('\n==================================================');
    console.log('4. SEARCH ALL TABLES IN MANAGEMENT FOR FINE / PENALTY / PUNISH / ABSENT / DAY_OFF');
    console.log('==================================================');
    const penaltyTables = await legacy.$queryRawUnsafe<any[]>(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'management' 
        AND (TABLE_NAME LIKE '%penalty%' OR TABLE_NAME LIKE '%fine%' OR TABLE_NAME LIKE '%punish%' OR TABLE_NAME LIKE '%off%' OR TABLE_NAME LIKE '%leave%' OR TABLE_NAME LIKE '%payroll%')
    `);
    console.table(penaltyTables);
  } catch (err) {
    console.error('Error executing legacy query:', err);
  } finally {
    await legacy.$disconnect();
  }
}

main();
