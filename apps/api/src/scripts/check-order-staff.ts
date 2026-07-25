import { PrismaClient as LegacyPrismaClient } from '../generated/legacy-client/index.js';
import dotenv from 'dotenv';
import path from 'path';
import { SafeAny } from '@mos-lab/shared';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new LegacyPrismaClient();

async function run() {
  try {
    const orderIds = [309634, 332929];
    for (const orderId of orderIds) {
      console.log(`\n=== CHECKING ORDER ID ${orderId} ===`);
      const [order] = await prisma.$queryRawUnsafe<SafeAny[]>('SELECT * FROM `order` WHERE id = ?', orderId);
      if (!order) {
        console.log(`Order ${orderId} not found`);
        continue;
      }
      console.log(`Order ${orderId} creator_staff_id:`, order.created_staff_id);

      const orderServices = await prisma.$queryRawUnsafe<SafeAny[]>(
        'SELECT * FROM order_service WHERE order_id = ?',
        orderId
      );
      console.log('Order Services:');
      for (const os of orderServices) {
        console.log(
          `- Service OS ID: ${os.id}, check_in_staff_id: ${os.check_in_staff_id}, check_out_staff_id: ${os.check_out_staff_id}, assigned_staff_id: ${os.assigned_staff_id}`
        );
      }

      const creator = await prisma.$queryRawUnsafe<SafeAny[]>(
        'SELECT full_name FROM user_profile WHERE user_id = ?',
        order.created_staff_id
      );
      console.log('Creator name:', creator[0]?.full_name);

      if (orderServices.length > 0) {
        const checkinStaff = await prisma.$queryRawUnsafe<SafeAny[]>(
          'SELECT full_name FROM user_profile WHERE user_id = ?',
          orderServices[0].check_in_staff_id
        );
        console.log('Check-in Staff name:', checkinStaff[0]?.full_name);

        const checkoutStaff = await prisma.$queryRawUnsafe<SafeAny[]>(
          'SELECT full_name FROM user_profile WHERE user_id = ?',
          orderServices[0].check_out_staff_id
        );
        console.log('Check-out Staff name:', checkoutStaff[0]?.full_name);
      }
    }

    console.log(`\n=== CHECKING USER SERVICE BALANCE 82418 (Classic 440) ===`);
    const [usb] = await prisma.$queryRawUnsafe<SafeAny[]>('SELECT * FROM user_service_balance WHERE id = 82418');
    console.log('USB 82418 created_staff_id:', usb.created_staff_id);
    const usbCreator = await prisma.$queryRawUnsafe<SafeAny[]>(
      'SELECT full_name FROM user_profile WHERE user_id = ?',
      usb.created_staff_id
    );
    console.log('USB Creator name:', usbCreator[0]?.full_name);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run().catch(console.error);
