import { FastifyInstance } from 'fastify';
import { SafeAny, maskPhoneNumber } from '@mos-lab/shared';
import { TeamService } from '../../../teams/team.service.js';

interface FetchDashboardTodayBaseParams {
  fastify: FastifyInstance;
  targetDateFrom: string;
  targetDateTo: string;
  endAt: string | undefined;
  canViewPhone: boolean;
}

export const toActualDate = (dbDate: Date | null | undefined) => {
  if (!dbDate) return new Date(0);
  return new Date(
    Date.UTC(
      dbDate.getUTCFullYear(),
      dbDate.getUTCMonth(),
      dbDate.getUTCDate(),
      dbDate.getUTCHours(),
      dbDate.getUTCMinutes(),
      dbDate.getUTCSeconds()
    ) -
      7 * 3600 * 1000
  );
};

export const formatDbTime = (dbDate: Date | null | undefined) => {
  if (!dbDate) return '00:00';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(dbDate.getUTCHours())}:${pad(dbDate.getUTCMinutes())}`;
};

export async function fetchAndBuildDashboardTodayBase({
  fastify,
  targetDateFrom,
  targetDateTo,
  endAt,
  canViewPhone,
}: FetchDashboardTodayBaseParams) {
  const bookingDateOnlyStart = new Date(targetDateFrom + 'T00:00:00.000Z');
  const bookingDateOnlyEnd = new Date(targetDateTo + 'T23:59:59.999Z');

  // Since database datetimes are local and Prisma reads them as UTC,
  // we query using timezone-naive start/end bounds directly
  const startOfDay = new Date(targetDateFrom + 'T00:00:00.000Z');
  const targetEndAt = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(endAt || '')
    ? String(endAt).replace(' ', 'T')
    : `${targetDateTo}T23:59:59`;
  const endOfDay = new Date(`${targetEndAt}.999Z`);

  // The legacy order and service tables are wide. The operations response
  // only needs this projection, so avoid hydrating unused columns for every
  // poll of the live dashboard.
  const dashboardOrderSelect = {
    id: true,
    user_id: true,
    created_staff_id: true,
    assigned_staff_id: true,
    promotion_id: true,
    selected_promotion_id: true,
    booking_note: true,
    booking_channels: true,
    booking_date_start: true,
    booking_date_end: true,
    booking_date_only: true,
    total_price: true,
    order_state: true,
    date_created: true,
    client_store_id: true,
  } as const;

  // These independent reads form the first critical-path fan-out for the dashboard.
  const [crmTelesales, bookingsOrders, comingOrders, activeCcIds] = await Promise.all([
    fastify.prisma.crm.crmStaff.findMany({
      where: {
        OR: [{ role: 'telesales' }, { displayName: { in: ['Tâm Nguyễn'] } }],
        isActive: true,
      },
      select: { displayName: true },
    }),
    fastify.prisma.legacy.order.findMany({
      where: {
        date_created: {
          gte: startOfDay,
          lte: endOfDay,
        },
        order_state: { not: 'Cancelled' },
      },
      orderBy: { date_created: 'desc' },
      select: dashboardOrderSelect,
    }),
    fastify.prisma.legacy.order.findMany({
      where: {
        OR: [
          { booking_date_only: { gte: bookingDateOnlyStart, lte: bookingDateOnlyEnd } },
          { booking_date_start: { gte: startOfDay, lte: endOfDay } },
        ],
        order_state: { not: 'Cancelled' },
      },
      orderBy: { booking_date_start: 'asc' },
      select: dashboardOrderSelect,
    }),
    // Active CC configuration is the system source of truth. Avoid scanning the complete order_service ledger on every page load.
    TeamService.getActiveStaffIdsWithFallback(fastify, 'CC', 'ACTIVE_CC_STAFF_CONFIG'),
  ]);
  const telesalesNames = new Set(crmTelesales.map((s) => s.displayName.trim().toLowerCase()));

  const userIds = Array.from(
    new Set([...bookingsOrders.map((o) => o.user_id), ...comingOrders.map((o) => o.user_id)])
  ).filter((id): id is number => id !== null && id !== undefined && !isNaN(Number(id)) && Number(id) > 0);
  const allOrderIds = Array.from(new Set([...bookingsOrders.map((o) => o.id), ...comingOrders.map((o) => o.id)]));

  const [userProfiles, userContacts, userBalances, allOrderServices, orderCcNotesRaw] = await Promise.all([
    userIds.length > 0
      ? fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT up.user_id as userId, up.full_name as fullName, up.avatar, u.email, u.gender, u.date_of_birth as dob
          FROM \`user_profile\` up
          LEFT JOIN \`user\` u ON up.user_id = u.id
          WHERE up.user_id IN (${userIds.join(',')})
        `)
      : Promise.resolve([]),
    userIds.length > 0
      ? fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT user_id as userId, phone_number as phoneNumber
          FROM \`user_contact\`
          WHERE user_id IN (${userIds.join(',')}) AND is_disabled = 0
        `)
      : Promise.resolve([]),
    userIds.length > 0
      ? fastify.prisma.legacy.user_service_balance.findMany({
          where: { user_id: { in: userIds } },
          select: {
            id: true,
            user_id: true,
            service_group: true,
            date_created: true,
            date_expired: true,
            normal_count: true,
            retain_count: true,
          },
        })
      : Promise.resolve([]),
    allOrderIds.length > 0
      ? fastify.prisma.legacy.order_service.findMany({
          where: { order_id: { in: allOrderIds } },
          select: {
            order_id: true,
            service_id: true,
            promotion_id: true,
            assigned_staff_id: true,
            check_in_staff_id: true,
            check_out_staff_id: true,
            tax_amount: true,
          },
        })
      : Promise.resolve([]),
    allOrderIds.length > 0
      ? fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT un.order_id as orderId, un.note, up.full_name as staffName
          FROM \`user_note\` un
          LEFT JOIN \`user_profile\` up ON un.created_staff_id = up.user_id
          WHERE un.order_id IN (${allOrderIds.join(',')})
            AND un.note_field_key = 'order_note'
          ORDER BY un.date_created DESC, un.id DESC
        `)
      : Promise.resolve([]),
  ]);

  const ccNoteByOrderId = new Map<number, { note: string; staffName: string | null }>();
  for (const row of orderCcNotesRaw) {
    const orderId = Number(row.orderId || 0);
    const noteText = String(row.note || '').trim();
    if (!orderId || !noteText || ccNoteByOrderId.has(orderId)) continue;
    ccNoteByOrderId.set(orderId, {
      note: noteText,
      staffName: row.staffName ? String(row.staffName).trim() : null,
    });
  }

  const balancesByUserId = new Map<number, SafeAny[]>();
  for (const balance of userBalances) {
    const userId = Number(balance.user_id);
    const balances = balancesByUserId.get(userId) || [];
    balances.push(balance);
    balancesByUserId.set(userId, balances);
  }

  const servicesByOrderId = new Map<number, SafeAny[]>();
  for (const service of allOrderServices) {
    const orderId = Number(service.order_id);
    const services = servicesByOrderId.get(orderId) || [];
    services.push(service);
    servicesByOrderId.set(orderId, services);
  }

  const profileMap = new Map(userProfiles.map((p) => [Number(p.userId), p]));
  const contactMap = new Map(userContacts.map((c) => [Number(c.userId), c.phoneNumber]));

  // Query promotions used by orders
  const promoIds = Array.from(
    new Set(
      [
        ...bookingsOrders.map((o) => o.promotion_id).filter((id) => id !== null && id !== undefined),
        ...bookingsOrders.map((o) => o.selected_promotion_id).filter((id) => id !== null && id !== undefined),
        ...comingOrders.map((o) => o.promotion_id).filter((id) => id !== null && id !== undefined),
        ...comingOrders.map((o) => o.selected_promotion_id).filter((id) => id !== null && id !== undefined),
        ...allOrderServices.map((os) => os.promotion_id).filter((id) => id !== null && id !== undefined),
      ].map((id) => Number(id))
    )
  ).filter((id) => !isNaN(id) && id > 0);

  const balanceIds = userBalances.map((b) => b.id);
  const staffIds = Array.from(
    new Set(
      [
        ...activeCcIds,
        ...[...bookingsOrders, ...comingOrders].flatMap((order) => [order.created_staff_id, order.assigned_staff_id]),
        ...allOrderServices.flatMap((service) => [
          service.assigned_staff_id,
          service.check_in_staff_id,
          service.check_out_staff_id,
        ]),
      ].map(Number)
    )
  ).filter((id) => !isNaN(id) && id > 0);

  const [userBalanceTransactions, promotions, staffProfiles] = await Promise.all([
    balanceIds.length > 0
      ? fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT usbt.id, usbt.user_service_balance_id, usbt.date_created, usbt.date_expired,
                 usbt.total_normal_count_left, usbt.total_retain_count_left, usbt.normal_count,
                 usbt.retain_count, usbt.used_staff_id, usbt.order_id,
                 COALESCE(ro.actual_booking_date_start, o.booking_date_start) as o_booking_date_start
          FROM user_service_balance_transaction usbt
          LEFT JOIN \`order\` o ON o.id = usbt.order_id
          LEFT JOIN \`report_order\` ro ON ro.order_id = usbt.order_id
          WHERE usbt.user_service_balance_id IN (${balanceIds.join(',')})
        `)
      : Promise.resolve([]),
    promoIds.length > 0
      ? fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT p.id, p.promotion_key as promotionKey, pl.promotion_name as name
          FROM promotion p
          LEFT JOIN promotion_language pl ON p.id = pl.promotion_id AND pl.language_id = 1
          WHERE p.id IN (${promoIds.join(',')})
        `)
      : Promise.resolve([]),
    staffIds.length > 0
      ? fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT up.user_id as userId,
                 TRIM(COALESCE(NULLIF(up.full_name, ''), CONCAT(COALESCE(up.first_name, ''), ' ', COALESCE(up.last_name, '')))) as fullName
          FROM \`user_profile\` up
          WHERE up.user_id IN (${staffIds.join(',')})
        `)
      : Promise.resolve([]),
  ]);

  const txnsByBalanceId = new Map<number, SafeAny[]>();
  for (const t of userBalanceTransactions) {
    const bid = Number(t.user_service_balance_id);
    const list = txnsByBalanceId.get(bid) || [];
    list.push(t);
    txnsByBalanceId.set(bid, list);
  }
  for (const transactions of txnsByBalanceId.values()) {
    transactions.sort((a, b) => {
      const timeA = new Date(a.o_booking_date_start || a.date_created).getTime();
      const timeB = new Date(b.o_booking_date_start || b.date_created).getTime();
      if (timeA !== timeB) return timeB - timeA;
      return Number(b.id) - Number(a.id);
    });
  }

  const promoMap = new Map(promotions.map((p) => [Number(p.id), p.name || p.promotionKey || `PROMO-${p.id}`]));
  const staffMap = new Map(staffProfiles.map((s) => [Number(s.userId), s.fullName || `Staff #${s.userId}`]));
  const liveComboByBooking = new Map<string, boolean>();

  // Exact legacy PHP combo active helper function
  const checkHasLiveCombo = (userId: number, bookingDateStart: Date | null, orderCreatedDate: Date) => {
    const bTime = bookingDateStart || orderCreatedDate;
    const bTimeMs = new Date(bTime).getTime();
    const cacheKey = `${userId}:${bTimeMs}`;
    const cached = liveComboByBooking.get(cacheKey);
    if (cached !== undefined) return cached;
    const userBals = balancesByUserId.get(userId) || [];

    for (const usb of userBals) {
      // Rule COMBO-001: Combo mi dưới (LashesUnder) không tính vào active combo hoặc combo live
      if (usb.service_group === 'LashesUnder') {
        continue;
      }

      // Condition 1: usb.date_created < booking_date_start
      if (new Date(usb.date_created).getTime() >= bTimeMs) {
        continue;
      }

      const transactions = txnsByBalanceId.get(Number(usb.id)) || [];
      const lastTxnBefore = transactions.find(
        (transaction) => new Date(transaction.o_booking_date_start || transaction.date_created).getTime() < bTimeMs
      );

      // Condition 2: date_expired at that time is null or >= booking_date_start
      const dateExpired = lastTxnBefore ? lastTxnBefore.date_expired : usb.date_expired;
      const isNotExpired =
        !dateExpired || new Date(dateExpired) >= new Date(new Date(bTime).toLocaleDateString('en-CA'));

      // Condition 3: count left at that time > 0
      let countLeft: number;
      if (
        lastTxnBefore &&
        lastTxnBefore.total_normal_count_left !== null &&
        lastTxnBefore.total_retain_count_left !== null
      ) {
        countLeft = (lastTxnBefore.total_normal_count_left || 0) + (lastTxnBefore.total_retain_count_left || 0);
      } else {
        let usedAfter = 0;
        for (const transaction of transactions) {
          if (new Date(transaction.o_booking_date_start || transaction.date_created).getTime() >= bTimeMs) {
            if (transaction.used_staff_id !== null) {
              usedAfter += (transaction.normal_count || 0) + (transaction.retain_count || 0);
            }
          }
        }

        countLeft = (usb.normal_count || 0) + (usb.retain_count || 0) + usedAfter;
      }

      if (isNotExpired && countLeft > 0) {
        liveComboByBooking.set(cacheKey, true);
        return true;
      }
    }
    liveComboByBooking.set(cacheKey, false);
    return false;
  };

  const bookingsCombo: SafeAny[] = [];
  const bookingsOc: SafeAny[] = [];
  const bookingsOther: SafeAny[] = [];

  const formatBookingDateTime = (d: Date | null) => {
    if (!d) return 'N/A';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} ${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`;
  };

  bookingsOrders.forEach((o, index) => {
    const uProfile = profileMap.get(o.user_id);
    const phone = contactMap.get(o.user_id) || '';
    const name = uProfile?.fullName || 'Khách hàng';
    const email = uProfile?.email || '';
    const dob = uProfile?.dob ? new Date(uProfile.dob).toLocaleDateString('en-CA') : 'N/A';
    const gender = uProfile?.gender || 'N/A';

    const hasLiveCombo = checkHasLiveCombo(o.user_id, o.booking_date_start, o.date_created);
    const userBal = balancesByUserId.get(Number(o.user_id)) || [];
    const group = hasLiveCombo ? 'combo_live' : userBal.length > 0 ? 'combo_dead' : 'single';

    const booker = o.created_staff_id
      ? staffMap.get(Number(o.created_staff_id)) || 'Nhiều Booker'
      : `Khách tự đặt (${o.booking_channels || 'GB'})`;

    const orderSvs = servicesByOrderId.get(Number(o.id)) || [];
    const firstPromoSv = orderSvs.find((cs) => cs.promotion_id !== null && cs.promotion_id !== undefined);
    const pId = firstPromoSv?.promotion_id || o.promotion_id || o.selected_promotion_id;
    const promoName = pId ? promoMap.get(Number(pId)) || `PROMO-${pId}` : null;

    const firstCvStaffId =
      o.assigned_staff_id ||
      (orderSvs.length > 0 ? orderSvs.find((cs) => cs.assigned_staff_id !== null)?.assigned_staff_id : null);
    const cvRequested = firstCvStaffId ? staffMap.get(Number(firstCvStaffId)) || 'Chuyên viên' : 'Chưa phân công';

    let status: 'completed' | 'serving' | 'confirmed' | 'pending' | 'late' | 'checkout' = 'pending';
    const completedRevenueTime = o.booking_date_end || o.booking_date_start;
    const isWithinComparisonCutoff = !endAt || !completedRevenueTime || completedRevenueTime <= endOfDay;
    if (o.order_state === 'Completed' && isWithinComparisonCutoff) {
      status = 'completed';
    } else if (
      ['CheckIn', 'Consultation', 'Preparation', 'ServiceStart', 'ServiceCleaned', 'ServiceEnd'].includes(o.order_state)
    ) {
      status = 'serving';
    } else if (['ServiceCompleted', 'CheckOut'].includes(o.order_state)) {
      status = 'checkout';
    } else if (o.order_state === 'Confirmed' || o.order_state === 'New') {
      const now = new Date();
      const actualStart = toActualDate(o.booking_date_start);
      if (o.booking_date_start && actualStart < new Date(now.getTime() - 15 * 60000)) {
        status = 'late';
      } else {
        status = o.order_state === 'New' ? 'pending' : 'confirmed';
      }
    }

    const ccNoteEntry = status === 'completed' ? ccNoteByOrderId.get(Number(o.id)) : undefined;

    const record = {
      key: String(o.id),
      customerId: o.user_id,
      customer: name,
      avatar: uProfile?.avatar || null,
      phone: !canViewPhone ? maskPhoneNumber(phone) : phone,
      group,
      promo: promoName,
      booker,
      channel: o.booking_channels || 'N/A',
      branchName: o.client_store_id === 2 ? 'PXL' : o.client_store_id === 16 ? 'Estella' : 'Đề Thám',
      bookingDateTime: formatBookingDateTime(o.booking_date_start),
      requestedCv: cvRequested,
      status,
      bookingNote: o.booking_note || '',
      ccNote: ccNoteEntry?.note || '',
      ccNoteStaffName: ccNoteEntry?.staffName || null,
      createdTime: new Date(o.date_created).toLocaleTimeString('vi-VN', {
        timeZone: 'UTC',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
      avatarColor: ['#1890ff', '#722ed1', '#f5222d', '#fa8c16', '#52c41a', '#13c2c2', '#eb2f96'][index % 7],
      code: String(o.id),
      email,
      ltv: (o.total_price || 0).toLocaleString('vi-VN') + ' đ',
      bookingsCount: 1,
      diamonds: 50,
      frequency: 'N/A',
      gender,
      dob,
      daysAway: 'Hôm nay',
      oc: booker,
      historyService: o.booking_note || 'Nối mi',
      historyBranch: o.client_store_id === 1 ? 'Đề Thám' : o.client_store_id === 2 ? 'PXL' : 'Estella Place',
      historyCv: 'N/A',
      historyCcIn: booker,
      historyCcOut: booker,
      historyBooker: booker,
      historyDate: new Date(o.date_created).toLocaleString('vi-VN', { timeZone: 'UTC' }),
      historyStatus: o.order_state === 'Completed' ? 'Hoàn thành' : 'Đã xác nhận',
      historyNote: o.booking_note || '',
    };

    const isOc = telesalesNames.has(booker.trim().toLowerCase());
    if (group === 'combo_live') {
      bookingsCombo.push(record);
    } else if (isOc) {
      bookingsOc.push(record);
    } else {
      bookingsOther.push(record);
    }
  });

  const comingOrderIds = comingOrders.map((o) => o.id);
  const comingOrderIdSet = new Set(comingOrderIds.map(Number));
  const comingServices = allOrderServices.filter((service) => comingOrderIdSet.has(Number(service.order_id)));
  const comingServiceIds = Array.from(new Set(comingServices.map((cs) => cs.service_id)));
  const ccScheduleIds = Array.from(
    new Set(
      [...activeCcIds, ...comingServices.flatMap((service) => [service.check_in_staff_id, service.check_out_staff_id])]
        .map(Number)
        .filter((id) => !isNaN(id) && id > 0)
    )
  );

  return {
    bookingsCombo,
    bookingsOc,
    bookingsOther,
    userProfiles,
    comingOrders,
    comingOrderIds,
    comingServices,
    comingServiceIds,
    activeCcIds,
    ccScheduleIds,
    profileMap,
    contactMap,
    balancesByUserId,
    promoMap,
    staffMap,
    telesalesNames,
    ccNoteByOrderId,
    checkHasLiveCombo,
  };
}
