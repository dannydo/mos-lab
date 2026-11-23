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

    console.log('=== 1. SEARCH NHUNG & THẢO LY IN USER_PROFILE ===');
    const staffProfiles = await legacy.$queryRawUnsafe<any[]>(`
      SELECT user_id, full_name, user_group_id, client_store_id, provider, is_disabled, is_leaved
      FROM user_profile
      WHERE full_name LIKE '%Nhung%' OR full_name LIKE '%Thảo Ly%' OR full_name LIKE '%Ly%'
    `);
    console.table(staffProfiles);

    const uids = staffProfiles.map((p) => p.user_id).filter(Boolean);
    if (uids.length === 0) return;

    console.log('\n=== 2. ALL STAFF DAY OFF RECORDS FOR NHUNG & THẢO LY ===');
    const dayOffs = await legacy.$queryRawUnsafe<any[]>(`
      SELECT 
        sdo.id, sdo.from_user_id, up.full_name,
        DATE_FORMAT(sdo.from_date, '%Y-%m-%d') as from_date,
        DATE_FORMAT(COALESCE(sdo.to_date, sdo.from_date), '%Y-%m-%d') as to_date,
        sdo.attribute_option_id, aol.attribute_option_value as leave_type_vn,
        sdo.request_state, sdo.note,
        DATE_FORMAT(sdo.date_created, '%Y-%m-%d %H:%i:%s') as date_created,
        DATEDIFF(sdo.from_date, sdo.date_created) as days_ahead
      FROM staff_day_off sdo
      JOIN user_profile up ON up.user_id = sdo.from_user_id
      LEFT JOIN attribute_option_language aol ON aol.attribute_option_id = sdo.attribute_option_id AND aol.language_id = 2
      WHERE sdo.from_user_id IN (${uids.join(',')})
      ORDER BY sdo.id DESC
      LIMIT 50
    `);
    console.table(dayOffs);

    console.log('\n=== 3. WORKING SHIFT / CHECKINS TODAY FOR NHUNG & THẢO LY ===');
    const shifts = await legacy.$queryRawUnsafe<any[]>(`
      SELECT 
        ws.id, ws.user_id, up.full_name, ws.date, ws.check_in_date, ws.check_out_date, ws.working_minute
      FROM staff_working_shift ws
      JOIN user_profile up ON up.user_id = ws.user_id
      WHERE ws.user_id IN (${uids.join(',')}) AND ws.date >= '2026-08-01'
      ORDER BY ws.id DESC
      LIMIT 30
    `);
    console.table(shifts);
  } catch (err) {
    console.error('Error executing query:', err);
  } finally {
    await legacy.$disconnect();
  }
}

main();
