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
    console.log('Connected to MySQL server');

    console.log('\n==================================================');
    console.log('1. ALL TABLES IN MANAGEMENT DATABASE');
    console.log('==================================================');
    const mgtTables = await legacy.$queryRawUnsafe<any[]>(`
      SELECT TABLE_NAME, TABLE_ROWS, DATA_LENGTH
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = 'management'
      ORDER BY TABLE_NAME ASC
    `);
    console.table(mgtTables);

    console.log('\n==================================================');
    console.log('2. ALL TABLES IN MOS_LAB DATABASE');
    console.log('==================================================');
    const mosTables = await legacy.$queryRawUnsafe<any[]>(`
      SELECT TABLE_NAME, TABLE_ROWS, DATA_LENGTH
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = 'mos_lab'
      ORDER BY TABLE_NAME ASC
    `);
    console.table(mosTables);

    console.log('\n==================================================');
    console.log('3. SAMPLE STAFF PROFILES (user_group_id IN (4, 7))');
    console.log('==================================================');
    const cvProfiles = await legacy.$queryRawUnsafe<any[]>(`
      SELECT user_id, full_name, user_group_id, client_store_id, is_disabled, is_leaved
      FROM user_profile
      WHERE provider = 'Staff' AND user_group_id IN (4, 7) AND is_disabled = 0
      LIMIT 20
    `);
    console.table(cvProfiles);

    console.log('\n==================================================');
    console.log('4. CHECK STAFF WORKING SHIFT & SCHEDULE TABLES');
    console.log('==================================================');
    try {
      const shiftSched = await legacy.$queryRawUnsafe<any[]>(`
        SELECT * FROM staff_working_shift_schedule LIMIT 10
      `);
      console.log('staff_working_shift_schedule sample:');
      console.table(shiftSched);
    } catch (e: any) {
      console.log('staff_working_shift_schedule error:', e.message);
    }

    try {
      const shifts = await legacy.$queryRawUnsafe<any[]>(`
        SELECT * FROM staff_working_shift ORDER BY id DESC LIMIT 10
      `);
      console.log('staff_working_shift sample:');
      console.table(shifts);
    } catch (e: any) {
      console.log('staff_working_shift error:', e.message);
    }

    console.log('\n==================================================');
    console.log('5. CHECK STAFF DAY OFF TABLES');
    console.log('==================================================');
    try {
      const dayOffs = await legacy.$queryRawUnsafe<any[]>(`
        SELECT * FROM staff_day_off ORDER BY id DESC LIMIT 10
      `);
      console.log('staff_day_off sample:');
      console.table(dayOffs);
    } catch (e: any) {
      console.log('staff_day_off error:', e.message);
    }

    try {
      const dayOffSched = await legacy.$queryRawUnsafe<any[]>(`
        SELECT * FROM staff_day_off_schedule LIMIT 10
      `);
      console.log('staff_day_off_schedule sample:');
      console.table(dayOffSched);
    } catch (e: any) {
      console.log('staff_day_off_schedule error:', e.message);
    }
  } catch (err) {
    console.error('Error executing query:', err);
  } finally {
    await legacy.$disconnect();
  }
}

main();
