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
    
    // Date range
    const start = new Date('2026-07-12T00:00:00.000Z');
    const end = new Date('2026-07-12T23:59:59.999Z');

    // Fetch all orders in the date range
    const allOrders = await legacy.order.findMany({
      where: {
        booking_date_start: { gte: start, lte: end },
        order_state: { not: 'Cancelled' }
      }
    });

    console.log(`Total orders found: ${allOrders.length}`);

    // Fetch services
    const completedOrders = allOrders.filter(o => o.order_state === 'Completed');
    const completedOrderIds = completedOrders.map(o => o.id);

    const orderServicesMap = new Map<number, any[]>();
    const serviceNameMap = new Map<number, string>();

    if (completedOrderIds.length > 0) {
      const orderServices = await legacy.order_service.findMany({
        where: { order_id: { in: completedOrderIds } }
      });
      orderServices.forEach(os => {
        const list = orderServicesMap.get(os.order_id) || [];
        list.push(os);
        orderServicesMap.set(os.order_id, list);
      });

      const serviceIds = Array.from(new Set(orderServices.map(os => os.service_id)));
      if (serviceIds.length > 0) {
        const serviceLanguages = await legacy.service_language.findMany({
          where: { service_id: { in: serviceIds } }
        });
        serviceLanguages.forEach(sl => {
          serviceNameMap.set(sl.service_id, sl.service_name);
        });
      }
    }

    let comboCount = 0;
    let singleCount = 0;

    allOrders.forEach(o => {
      if (o.order_state === 'Completed') {
        const orderServicesList = orderServicesMap.get(o.id) || [];
        let primaryService = orderServicesList[0];
        for (const os of orderServicesList) {
          if (os.service_price > (primaryService?.service_price || 0)) {
            primaryService = os;
          }
        }

        const serviceName = primaryService ? (serviceNameMap.get(primaryService.service_id) || 'Unknown') : 'Unknown';
        const isCombo = serviceName.toLowerCase().includes('combo') || (primaryService?.service_type || '').toLowerCase().includes('combo');
        
        if (isCombo) {
          comboCount++;
        } else {
          singleCount++;
        }
      } else {
        // Non-completed are defaulted to 'Single' in current routes.ts
        singleCount++;
      }
    });

    console.log("Current calculation results (for all bookers on 2026-07-12):");
    console.log("  Combo Bookings:", comboCount);
    console.log("  Single Bookings:", singleCount);

  } catch (err) {
    console.error(err);
  } finally {
    await legacy.$disconnect();
  }
}

main();
