import { PrismaClient as LegacyPrismaClient } from '../generated/legacy-client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function run() {
  const legacy = new LegacyPrismaClient({
    datasources: {
      db: {
        url: process.env.LEGACY_DATABASE_URL,
      },
    },
  });

  await legacy.$connect();

  console.log('Testing pre-aggregated LEFT JOINS with full filters...');
  const start = Date.now();

  const querySql = `
    SELECT 
      u.id, 
      COALESCE(up.full_name, 'No Name') as name, 
      (
        SELECT COALESCE(MAX(uc.phone_number), '') 
        FROM user_contact uc 
        WHERE uc.user_id = u.id AND uc.is_disabled = 0
      ) as phone, 
      u.email,
      u.gender,
      u.date_of_birth as dob,
      up.last_order_booking as lastVisit,
      DATEDIFF(NOW(), up.last_order_booking) as daysSinceLastVisit,
      COALESCE(order_counts.totalSpent, 0) as totalSpent,
      COALESCE(order_counts.totalVisits, 0) as totalVisits,
      COALESCE(promo_counts.totalPromotionsUsed, 0) as totalPromotionsUsed,
      COALESCE(ref_counts.totalReferrals, 0) as totalReferrals,
      (
        SELECT 
          CASE
            WHEN COUNT(usb.id) = 0 THEN 'SINGLE'
            WHEN SUM(COALESCE(usb.normal_count, 0) + COALESCE(usb.retain_count, 0)) > 0 AND (MAX(usb.date_expired) IS NULL OR MAX(usb.date_expired) > NOW()) THEN 'COMBO_LIVE'
            ELSE 'COMBO_DEAD'
          END
        FROM user_service_balance usb
        WHERE usb.user_id = u.id
      ) as bucket,
      (
        SELECT COALESCE(SUM(usb.normal_count), 0)
        FROM user_service_balance usb
        WHERE usb.user_id = u.id
      ) as normalCount,
      (
        SELECT COALESCE(SUM(usb.retain_count), 0)
        FROM user_service_balance usb
        WHERE usb.user_id = u.id
      ) as retainCount,
      (
        SELECT MAX(usb.date_expired)
        FROM user_service_balance usb
        WHERE usb.user_id = u.id
      ) as expiryDate
    FROM (
      SELECT u.id
      FROM user u
      LEFT JOIN user_profile up ON u.id = up.user_id
      
      -- Pre-aggregate order counts
      LEFT JOIN (
        SELECT 
          user_id, 
          COALESCE(SUM(total_price), 0) as totalSpent, 
          COUNT(*) as totalVisits
        FROM \`order\`
        WHERE order_state = 'Completed'
        GROUP BY user_id
      ) as order_counts ON u.id = order_counts.user_id
      
      -- Pre-aggregate promotion counts
      LEFT JOIN (
        SELECT user_id, COUNT(*) as totalPromotionsUsed
        FROM \`order\`
        WHERE order_state = 'Completed' AND (promotion_id IS NOT NULL OR selected_promotion_id IS NOT NULL)
        GROUP BY user_id
      ) as promo_counts ON u.id = promo_counts.user_id
      
      -- Pre-aggregate referral counts
      LEFT JOIN (
        SELECT referrer_user_id, COUNT(*) as totalReferrals
        FROM user_profile
        WHERE referrer_user_id IS NOT NULL
        GROUP BY referrer_user_id
      ) as ref_counts ON u.id = ref_counts.referrer_user_id
      
      WHERE 
        (up.last_order_booking IS NOT NULL AND DATEDIFF(NOW(), up.last_order_booking) >= 366)
        AND COALESCE(order_counts.totalSpent, 0) >= 5000000
        AND COALESCE(promo_counts.totalPromotionsUsed, 0) >= 1
        AND COALESCE(ref_counts.totalReferrals, 0) >= 1
      ORDER BY u.id DESC
      LIMIT 10 OFFSET 0
    ) as p
    JOIN user u ON u.id = p.id
    LEFT JOIN user_profile up ON u.id = up.user_id
    LEFT JOIN (
      SELECT 
        user_id, 
        COALESCE(SUM(total_price), 0) as totalSpent, 
        COUNT(*) as totalVisits
      FROM \`order\`
      WHERE order_state = 'Completed'
      GROUP BY user_id
    ) as order_counts ON u.id = order_counts.user_id
    LEFT JOIN (
      SELECT user_id, COUNT(*) as totalPromotionsUsed
      FROM \`order\`
      WHERE order_state = 'Completed' AND (promotion_id IS NOT NULL OR selected_promotion_id IS NOT NULL)
      GROUP BY user_id
    ) as promo_counts ON u.id = promo_counts.user_id
    LEFT JOIN (
      SELECT referrer_user_id, COUNT(*) as totalReferrals
      FROM user_profile
      WHERE referrer_user_id IS NOT NULL
      GROUP BY referrer_user_id
    ) as ref_counts ON u.id = ref_counts.referrer_user_id
    ORDER BY u.id DESC
  `;

  const results = await legacy.$queryRawUnsafe(querySql);
  console.log('Query finished in:', Date.now() - start, 'ms');
  console.log('Results size:', (results as any[]).length);
  if ((results as any[]).length > 0) {
    console.log('Sample result:', (results as any[])[0]);
  }

  await legacy.$disconnect();
}

run().catch(console.error);
