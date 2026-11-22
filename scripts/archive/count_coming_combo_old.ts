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

    // Date range
    const targetDateStr = '2026-07-12';
    const bookingDateOnlyDate = new Date(targetDateStr + 'T00:00:00.000Z');
    const startOfDay = new Date(targetDateStr + 'T00:00:00.000Z');
    const endOfDay = new Date(targetDateStr + 'T23:59:59.999Z');

    // Fetch coming today
    const comingOrders = await legacy.order.findMany({
      where: {
        OR: [{ booking_date_only: bookingDateOnlyDate }, { booking_date_start: { gte: startOfDay, lte: endOfDay } }],
        order_state: { not: 'Cancelled' },
      },
    });

    const allOrderIds = comingOrders.map((o) => o.id);
    const orderServicesMap = new Map<number, any[]>();
    const serviceNameMap = new Map<number, string>();

    if (allOrderIds.length > 0) {
      const orderServices = await legacy.order_service.findMany({
        where: { order_id: { in: allOrderIds } },
      });
      orderServices.forEach((os) => {
        const list = orderServicesMap.get(os.order_id) || [];
        list.push(os);
        orderServicesMap.set(os.order_id, list);
      });

      const serviceIds = Array.from(new Set(orderServices.map((os) => os.service_id)));
      if (serviceIds.length > 0) {
        const serviceLanguages = await legacy.service_language.findMany({
          where: { service_id: { in: serviceIds } },
        });
        serviceLanguages.forEach((sl) => {
          serviceNameMap.set(sl.service_id, sl.service_name);
        });
      }
    }

    let oldComboCount = 0;
    comingOrders.forEach((o) => {
      const orderServicesList = orderServicesMap.get(o.id) || [];
      let primaryService = orderServicesList[0];
      for (const os of orderServicesList) {
        if (os.service_price > (primaryService?.service_price || 0)) {
          primaryService = os;
        }
      }

      const serviceName = primaryService ? serviceNameMap.get(primaryService.service_id) || 'Unknown' : 'Unknown';
      const isComboOld =
        serviceName.toLowerCase().includes('combo') ||
        (primaryService?.service_type || '').toLowerCase().includes('combo');

      if (isComboOld) {
        oldComboCount++;
      }
    });

    console.log('Old logic Coming Today combo count:', oldComboCount);
  } catch (err) {
    console.error(err);
  } finally {
    await legacy.$disconnect();
  }
}

main();
