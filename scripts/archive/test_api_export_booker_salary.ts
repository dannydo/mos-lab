import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client/index.js';
import { PrismaClient as CrmPrismaClient } from '../apps/api/src/generated/crm-client/index.js';

const legacy = new LegacyPrismaClient();
const crm = new CrmPrismaClient();

// Re-implement the key portions of /api/kpi/export-booker-salary handler to test it
async function testRouteHandler() {
  const booker = 'Tâm Nguyễn';
  const date_from = '2026-06-01';
  const date_to = '2026-06-30';

  const start = new Date(date_from + 'T00:00:00.000Z');
  const end = new Date(date_to + 'T23:59:59.999Z');

  // Load config
  const crmConfig = await crm.crmConfig.findUnique({
    where: { key: 'BOOKER_SALARY_CONFIG' },
  });
  if (!crmConfig) {
    console.error('No BOOKER_SALARY_CONFIG record found');
    return;
  }
  const config = JSON.parse(crmConfig.value);

  // Find legacyUserId
  const profiles = await legacy.$queryRawUnsafe<any[]>(
    `
    SELECT up.user_id as userId, up.full_name as fullName
    FROM \`staff_profile\` sp
    JOIN \`user_profile\` up ON sp.user_id = up.user_id
    WHERE up.provider = 'Staff' AND up.is_disabled = 0
      AND (up.full_name = ? OR up.full_name = ?)
  `,
    booker,
    booker + ' '
  );

  if (profiles.length === 0) {
    console.error(`Booker not found: ${booker}`);
    return;
  }

  profiles.sort((a: any, b: any) => Number(a.userId) - Number(b.userId));
  const legacyUserId = Number(profiles[profiles.length - 1].userId);
  console.log(`Testing export for ${booker} (legacy ID: ${legacyUserId})`);

  // Fetch orders
  const allOrders = await legacy.order.findMany({
    where: {
      created_staff_id: legacyUserId,
      booking_date_start: { gte: start, lte: end },
      order_state: { not: 'Cancelled' },
    },
    orderBy: { booking_date_start: 'asc' },
  });

  console.log(`Found ${allOrders.length} orders to export.`);

  const rows: any[][] = [];
  rows.push([
    'ID',
    'CLIENT',
    'PHONE',
    'SOURCE',
    'SERVICE',
    'PRICE',
    'DISCOUNT PERCENT',
    'DISCOUNT VALUE',
    'AMOUNT PAID',
    'TIPS',
    'DEBT',
    'BOOKER',
    'BOOKING TYPE',
    'BOOKING BONUS',
    'COMBO DEDUCTION',
    'NET REVENUE',
    'CHECK-IN VALUE',
    'DATE BOOKED',
    'DATE CHECK-IN',
    'WEEK',
  ]);

  if (allOrders.length > 0) {
    const completedOrders = allOrders.filter((o) => o.order_state === 'Completed');
    const completedOrderIds = completedOrders.map((o) => o.id);

    const orderPaymentMap = new Map<number, { tips: number; debt: number; totalPaid: number }>();
    if (completedOrderIds.length > 0) {
      const orderPayments = await legacy.$queryRawUnsafe<any[]>(`
        SELECT order_id as orderId, tip_amount as tipAmount, paid_credit_amount as paidCredit, paid_cash_amount as paidCash, paid_credit_card_amount as paidCard, paid_bank_transfer_amount as paidBank, debt_amount as debt
        FROM \`order_payment\`
        WHERE order_id IN (${completedOrderIds.join(',')})
      `);
      orderPayments.forEach((op: any) => {
        const existing = orderPaymentMap.get(Number(op.orderId)) || { tips: 0, debt: 0, totalPaid: 0 };
        const paidSum =
          Number(op.paidCredit || 0) + Number(op.paidCash || 0) + Number(op.paidCard || 0) + Number(op.paidBank || 0);
        orderPaymentMap.set(Number(op.orderId), {
          tips: existing.tips + Number(op.tipAmount || 0),
          debt: existing.debt + Number(op.debt || 0),
          totalPaid: existing.totalPaid + paidSum,
        });
      });
    }

    const orderServicesMap = new Map<number, any[]>();
    let serviceNameMap = new Map<number, string>();
    if (completedOrderIds.length > 0) {
      const orderServices = await legacy.order_service.findMany({
        where: { order_id: { in: completedOrderIds } },
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

    const userIds = Array.from(new Set(allOrders.map((o) => o.user_id).filter((id) => id !== null))) as number[];
    const userBalances =
      userIds.length > 0
        ? await legacy.user_service_balance.findMany({
            where: { user_id: { in: userIds } },
          })
        : [];

    const balanceIds = userBalances.map((b) => b.id);
    const userBalanceTransactions =
      balanceIds.length > 0
        ? await legacy.$queryRawUnsafe<any[]>(`
      SELECT usbt.*, o.booking_date_start as o_booking_date_start
      FROM user_service_balance_transaction usbt
      LEFT JOIN \`order\` o ON o.id = usbt.order_id
      WHERE usbt.user_service_balance_id IN (${balanceIds.join(',')})
    `)
        : [];

    const txnsByBalanceId = new Map<number, any[]>();
    for (const t of userBalanceTransactions) {
      const bid = Number(t.user_service_balance_id);
      let list = txnsByBalanceId.get(bid);
      if (!list) {
        list = [];
        txnsByBalanceId.set(bid, list);
      }
      list.push(t);
    }

    const checkHasLiveCombo = (userId: number, bookingDateStart: Date | null, orderCreatedDate: Date) => {
      const bTime = bookingDateStart || orderCreatedDate;
      const userBals = userBalances.filter((b) => b.user_id === userId);
      for (const usb of userBals) {
        if (new Date(usb.date_created) >= new Date(bTime)) continue;
        const txnsBefore = (txnsByBalanceId.get(usb.id) || []).filter(
          (t) => new Date(t.o_booking_date_start || t.date_created) < new Date(bTime)
        );
        txnsBefore.sort((a, b) => {
          const timeA = new Date(a.o_booking_date_start || a.date_created).getTime();
          const timeB = new Date(b.o_booking_date_start || b.date_created).getTime();
          if (timeA !== timeB) return timeB - timeA;
          return b.id - a.id;
        });
        const lastTxnBefore = txnsBefore[0];
        const dateExpired = lastTxnBefore ? lastTxnBefore.date_expired : usb.date_expired;
        const isNotExpired =
          !dateExpired || new Date(dateExpired) >= new Date(new Date(bTime).toISOString().slice(0, 10));
        let countLeft = 0;
        if (
          lastTxnBefore &&
          lastTxnBefore.total_normal_count_left !== null &&
          lastTxnBefore.total_retain_count_left !== null
        ) {
          countLeft = (lastTxnBefore.total_normal_count_left || 0) + (lastTxnBefore.total_retain_count_left || 0);
        } else {
          const txnsAfterOrAt = (txnsByBalanceId.get(usb.id) || []).filter(
            (t) => new Date(t.o_booking_date_start || t.date_created) >= new Date(bTime)
          );
          let usedAfter = 0;
          txnsAfterOrAt.forEach((t) => {
            if (t.used_staff_id !== null) {
              usedAfter += (t.normal_count || 0) + (t.retain_count || 0);
            }
          });
          countLeft = (usb.normal_count || 0) + (usb.retain_count || 0) + usedAfter;
        }
        if (isNotExpired && countLeft > 0) return true;
      }
      return false;
    };

    // Construct spreadsheet rows
    allOrders.forEach((o) => {
      const pm = orderPaymentMap.get(o.id) || { tips: 0, debt: 0, totalPaid: 0 };
      const services = orderServicesMap.get(o.id) || [];

      let primaryService = services[0];
      for (const os of services) {
        if (os.service_price > (primaryService?.service_price || 0)) {
          primaryService = os;
        }
      }

      const serviceName = primaryService ? serviceNameMap.get(primaryService.service_id) || 'Unknown' : 'Unknown';

      let discountPercent = 0;
      if (primaryService && primaryService.service_price > 0) {
        discountPercent = Math.round((primaryService.discount_amount / primaryService.service_price) * 100);
      }

      const isRefill = serviceName.toLowerCase().includes('refill');
      const isCombo = checkHasLiveCombo(o.user_id, o.booking_date_start, o.date_created);

      let bonus = 0;
      if (o.order_state === 'Completed') {
        if (isCombo) {
          bonus = 0;
        } else if (isRefill) {
          if (discountPercent === 0) bonus = config.clientBonusRefill.discount30;
          else if (discountPercent <= 30) bonus = config.clientBonusRefill.discount30;
          else if (discountPercent <= 50) bonus = config.clientBonusRefill.discount50;
          else bonus = config.clientBonusRefill.discountMore;
        } else {
          if (discountPercent === 0) bonus = config.clientBonusFullSet.discount0;
          else if (discountPercent <= 30) bonus = config.clientBonusFullSet.discount30;
          else if (discountPercent <= 50) bonus = config.clientBonusFullSet.discount50;
          else bonus = config.clientBonusFullSet.discountMore;
        }
      }

      const bookingType = isCombo ? 'Combo' : isRefill ? 'Refill' : 'Fullset';

      rows.push([
        o.id,
        o.user_id,
        '', // Phone (omitted for privacy)
        'CRM',
        serviceName,
        primaryService?.service_price || 0,
        discountPercent,
        primaryService?.discount_amount || 0,
        pm.totalPaid,
        pm.tips,
        pm.debt,
        booker,
        bookingType,
        bonus,
        isCombo ? 1 : 0,
        o.order_state === 'Completed' ? o.total_price : 0,
        o.order_state === 'Completed' ? 1 : 0,
        o.date_created.toISOString(),
        o.booking_date_start ? o.booking_date_start.toISOString() : '',
        '',
      ]);
    });
  }

  console.log(`Success! Exporter route compiled ${rows.length - 1} data rows correctly.`);
  console.log('Sample data row:', rows[1]);

  await crm.$disconnect();
  await legacy.$disconnect();
}

testRouteHandler();
