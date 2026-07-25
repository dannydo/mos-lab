import { PrismaClient as LegacyPrismaClient } from '../generated/legacy-client/index.js';
import dotenv from 'dotenv';
import path from 'path';
import { SafeAny } from '@mos-lab/shared';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new LegacyPrismaClient();

async function run() {
  try {
    const userId = 7888;
    console.log(`=== CHECKING USER PROFILE ${userId} ===`);
    const profiles = await prisma.$queryRawUnsafe<SafeAny[]>('SELECT * FROM user_profile WHERE user_id = ?', userId);
    console.log('Profiles:', profiles);

    const user = await prisma.$queryRawUnsafe<SafeAny[]>('SELECT * FROM user WHERE id = ?', userId);
    console.log('User Account:', user);

    console.log(`\n=== CHECKING ORDERS FOR USER ${userId} ON 2026-07-22 ===`);
    const orders = await prisma.$queryRawUnsafe<SafeAny[]>(
      'SELECT * FROM `order` WHERE user_id = ? AND date_created >= "2026-07-22 00:00:00" AND date_created <= "2026-07-22 23:59:59"',
      userId
    );
    console.log('Orders on 2026-07-22:', orders);

    if (orders.length > 0) {
      for (const order of orders) {
        console.log(`\n=== ORDER DETAILS FOR ORDER ID ${order.id} ===`);

        // Check order_service_combo
        const combos = await prisma.$queryRawUnsafe<SafeAny[]>(
          'SELECT osc.*, sp.service_price_package_key FROM order_service_combo osc LEFT JOIN service_price sp ON osc.service_price_id = sp.id WHERE osc.order_id = ?',
          order.id
        );
        console.log('Combo items (order_service_combo):', combos);

        // Check order_service
        const services = await prisma.$queryRawUnsafe<SafeAny[]>(
          'SELECT os.*, sp.service_price_package_key FROM order_service os LEFT JOIN service_price sp ON os.service_price_id = sp.id WHERE os.order_id = ?',
          order.id
        );
        console.log('Service items (order_service):', services);
      }
    } else {
      console.log('No orders found on 2026-07-22 for user 7888.');
    }

    console.log(`\n=== CHECKING ALL TIME COMBO SALES FOR USER ${userId} ===`);
    const allCombos = await prisma.$queryRawUnsafe<SafeAny[]>(
      'SELECT osc.*, o.date_created as order_date_created FROM order_service_combo osc JOIN `order` o ON osc.order_id = o.id WHERE o.user_id = ?',
      userId
    );
    console.log('All time combos:', allCombos);

    console.log(`\n=== CHECKING SERVICE BALANCE FOR USER ${userId} ===`);
    const balances = await prisma.$queryRawUnsafe<SafeAny[]>(
      'SELECT * FROM user_service_balance WHERE user_id = ?',
      userId
    );
    console.log('Balances:', balances);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run().catch(console.error);
