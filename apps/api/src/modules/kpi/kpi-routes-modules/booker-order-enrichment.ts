import { FastifyInstance } from 'fastify';
import { type SafeAny } from '@mos-lab/shared';

export interface OrderPaymentSummary {
  tips: number;
  debt: number;
  totalPaid: number;
}

export interface BookerOrdersEnrichment {
  orderPaymentMap: Map<number, OrderPaymentSummary>;
  orderServicesMap: Map<number, SafeAny[]>;
  serviceNameMap: Map<number, string>;
  profileMap: Map<number, string>;
  contactMap: Map<number, string>;
  checkHasLiveCombo: (userId: number, bookingDateStart: Date | null, orderCreatedDate: Date) => boolean;
}

export function selectPrimaryOrderService(orderServicesList: SafeAny[]): SafeAny | undefined {
  let primaryService = orderServicesList[0];
  for (const os of orderServicesList) {
    if (os.service_price > (primaryService?.service_price || 0)) {
      primaryService = os;
    }
  }
  return primaryService;
}

export async function loadBookerOrdersEnrichment(
  fastify: FastifyInstance,
  allOrders: SafeAny[]
): Promise<BookerOrdersEnrichment> {
  const orderPaymentMap = new Map<number, OrderPaymentSummary>();
  const orderServicesMap = new Map<number, SafeAny[]>();
  const serviceNameMap = new Map<number, string>();
  const profileMap = new Map<number, string>();
  const contactMap = new Map<number, string>();

  if (allOrders.length === 0) {
    return {
      orderPaymentMap,
      orderServicesMap,
      serviceNameMap,
      profileMap,
      contactMap,
      checkHasLiveCombo: () => false,
    };
  }

  const completedOrders = allOrders.filter((o) => o.order_state === 'Completed');
  const completedOrderIds = completedOrders.map((o) => o.id);

  if (completedOrderIds.length > 0) {
    const orderPayments = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT order_id as orderId, tip_amount as tipAmount, paid_credit_amount as paidCredit, paid_cash_amount as paidCash, paid_credit_card_amount as paidCard, paid_bank_transfer_amount as paidBank, debt_amount as debt
      FROM \`order_payment\`
      WHERE order_id IN (${completedOrderIds.join(',')})
    `);
    orderPayments.forEach((op: SafeAny) => {
      const existing = orderPaymentMap.get(Number(op.orderId)) || { tips: 0, debt: 0, totalPaid: 0 };
      const paidSum =
        Number(op.paidCredit || 0) + Number(op.paidCash || 0) + Number(op.paidCard || 0) + Number(op.paidBank || 0);
      orderPaymentMap.set(Number(op.orderId), {
        tips: existing.tips + Number(op.tipAmount || 0),
        debt: existing.debt + Number(op.debt || 0),
        totalPaid: existing.totalPaid + paidSum,
      });
    });

    const orderServices = await fastify.prisma.legacy.order_service.findMany({
      where: { order_id: { in: completedOrderIds } },
    });
    orderServices.forEach((os) => {
      const list = orderServicesMap.get(os.order_id) || [];
      list.push(os);
      orderServicesMap.set(os.order_id, list);
    });

    const serviceIds = Array.from(new Set(orderServices.map((os) => os.service_id)));
    if (serviceIds.length > 0) {
      const serviceLanguages = await fastify.prisma.legacy.service_language.findMany({
        where: { service_id: { in: serviceIds } },
      });
      serviceLanguages.forEach((sl) => {
        serviceNameMap.set(sl.service_id, sl.service_name);
      });
    }
  }

  // Fetch client names and phone numbers
  const customerIds = Array.from(new Set(allOrders.map((o) => o.user_id).filter((id) => id !== null))) as number[];
  const userProfiles =
    customerIds.length > 0
      ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT user_id as userId, full_name as fullName
          FROM \`user_profile\`
          WHERE user_id IN (${customerIds.join(',')})
        `)
      : [];
  const userContacts =
    customerIds.length > 0
      ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT user_id as userId, phone_number as phoneNumber
          FROM \`user_contact\`
          WHERE user_id IN (${customerIds.join(',')})
        `)
      : [];

  userProfiles.forEach((p) => profileMap.set(Number(p.userId), p.fullName));
  userContacts.forEach((c) => contactMap.set(Number(c.userId), c.phoneNumber));

  // Fetch user balances and transactions for checkHasLiveCombo
  const userBalances =
    customerIds.length > 0
      ? await fastify.prisma.legacy.user_service_balance.findMany({
          where: { user_id: { in: customerIds } },
        })
      : [];

  const balanceIds = userBalances.map((b) => b.id);
  const userBalanceTransactions =
    balanceIds.length > 0
      ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT usbt.id, usbt.user_service_balance_id, usbt.date_created, usbt.date_expired, 
                 usbt.total_normal_count_left, usbt.total_retain_count_left, usbt.normal_count, 
                 usbt.retain_count, usbt.used_staff_id, usbt.order_id,
                 o.booking_date_start as o_booking_date_start
          FROM user_service_balance_transaction usbt
          LEFT JOIN \`order\` o ON o.id = usbt.order_id
          WHERE usbt.user_service_balance_id IN (${balanceIds.join(',')})
        `)
      : [];

  const txnsByBalanceId = new Map<number, SafeAny[]>();
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
      if (new Date(usb.date_created) >= new Date(bTime)) {
        continue;
      }

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
        !dateExpired || new Date(dateExpired) >= new Date(new Date(bTime).toLocaleDateString('en-CA'));

      let countLeft: number;
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

      if (isNotExpired && countLeft > 0) {
        return true;
      }
    }
    return false;
  };

  return {
    orderPaymentMap,
    orderServicesMap,
    serviceNameMap,
    profileMap,
    contactMap,
    checkHasLiveCombo,
  };
}
