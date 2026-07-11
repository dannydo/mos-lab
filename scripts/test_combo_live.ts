import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client';

const legacy = new LegacyPrismaClient({
  datasources: {
    db: {
      url: "mysql://root:chickisslove@127.0.0.1:3306/management"
    }
  }
});

async function main() {
  try {
    await legacy.$connect();
    
    // 1. Get stats for COMBO_LIVE
    const statsResult = await legacy.$queryRaw<any[]>`
      SELECT COUNT(DISTINCT u.id) as total
      FROM user u
      LEFT JOIN user_profile up ON u.id = up.user_id
      LEFT JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
      LEFT JOIN user_service_balance usb ON u.id = usb.user_id
      WHERE (usb.normal_count + usb.retain_count) > 0 AND (usb.date_expired IS NULL OR usb.date_expired > NOW())
    `;
    
    console.log("Count from stats query:", statsResult[0]?.total);

    // 2. Fetch rows with limit 50 offset 1100 (page 23)
    const rows = await legacy.$queryRaw<any[]>`
      SELECT 
        u.id, 
        COALESCE(up.full_name, 'No Name') as name,
        CASE
          WHEN MAX(usb.id) IS NULL THEN 'SINGLE'
          WHEN SUM(COALESCE(usb.normal_count, 0) + COALESCE(usb.retain_count, 0)) > 0 AND (MAX(usb.date_expired) IS NULL OR MAX(usb.date_expired) > NOW()) THEN 'COMBO_LIVE'
          ELSE 'COMBO_DEAD'
        END as bucket
      FROM user u
      LEFT JOIN user_profile up ON u.id = up.user_id
      LEFT JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
      LEFT JOIN user_service_balance usb ON u.id = usb.user_id
      WHERE (usb.normal_count + usb.retain_count) > 0 AND (usb.date_expired IS NULL OR usb.date_expired > NOW())
      GROUP BY u.id, up.full_name, u.email, u.gender, u.date_of_birth, up.last_order_booking
      LIMIT 50 OFFSET 1100
    `;

    console.log("Fetched rows count on page 23:", rows.length);
    if (rows.length > 0) {
      console.log("First row:", rows[0]);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await legacy.$disconnect();
  }
}

main();
