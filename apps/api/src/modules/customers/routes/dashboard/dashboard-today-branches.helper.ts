import { FastifyInstance } from 'fastify';
import { SafeAny, maskPhoneNumber } from '@mos-lab/shared';
import { CvAttendanceService } from '../../services/cv-attendance.service.js';
import { formatDbTime, toActualDate } from './dashboard-today-data.helper.js';
import { computeOrderRevenueBreakdown, populateCcShiftsAndRevenue } from './dashboard-today-cc.helper.js';

interface BuildDashboardBranchesDataParams {
  fastify: FastifyInstance;
  targetDateStr: string;
  canViewPhone: boolean;
  userProfiles: SafeAny[];
  comingOrders: SafeAny[];
  comingOrderIds: number[];
  comingServices: SafeAny[];
  comingServiceIds: number[];
  activeCcIds: number[];
  ccScheduleIds: number[];
  profileMap: Map<number, SafeAny>;
  contactMap: Map<number, SafeAny>;
  balancesByUserId: Map<number, SafeAny[]>;
  promoMap: Map<number, SafeAny>;
  staffMap: Map<number, string>;
  telesalesNames: Set<string>;
  ccNoteByOrderId: Map<number, { note: string; staffName: string | null }>;
  checkHasLiveCombo: (userId: number, bookingDateStart: Date | null, orderCreatedDate: Date) => boolean;
}

export async function buildDashboardBranchesData({
  fastify,
  targetDateStr,
  canViewPhone,
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
}: BuildDashboardBranchesDataParams) {
  const [serviceLangs, comingProducts, comingCombos, ccProfiles, allSchedules, weekOffRows, dayOffs, workingShifts] =
    await Promise.all([
      comingServiceIds.length > 0
        ? fastify.prisma.legacy.service_language.findMany({
            where: { service_id: { in: comingServiceIds } },
            select: { service_id: true, service_name: true },
          })
        : Promise.resolve([]),
      comingOrderIds.length > 0
        ? fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT * FROM \`order_product\` WHERE order_id IN (${comingOrderIds.join(',')})
        `)
        : Promise.resolve([]),
      comingOrderIds.length > 0
        ? fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT * FROM \`order_service_combo\` WHERE order_id IN (${comingOrderIds.join(',')})
        `)
        : Promise.resolve([]),
      activeCcIds.length > 0
        ? fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT user_id as userId, full_name as fullName, client_store_id as storeId
          FROM \`user_profile\`
          WHERE user_id IN (${activeCcIds.join(',')}) AND provider = 'Staff' AND is_disabled = 0
        `)
        : Promise.resolve([]),
      ccScheduleIds.length > 0
        ? fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT user_id, type, type_value, start_time, end_time
          FROM staff_working_shift_schedule
          WHERE is_disabled = 0 AND user_id IN (${ccScheduleIds.join(',')})
        `)
        : Promise.resolve([]),
      ccScheduleIds.length > 0
        ? fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT from_user_id as userId, weekday, COUNT(*) as cnt
          FROM staff_day_off
          WHERE attribute_option_id = 110
            AND request_state = 'Approved'
            AND from_user_id IN (${ccScheduleIds.join(',')})
          GROUP BY from_user_id, weekday
        `)
        : Promise.resolve([]),
      ccScheduleIds.length > 0
        ? fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
            `SELECT from_user_id FROM staff_day_off
           WHERE ? BETWEEN from_date AND to_date
             AND request_state = 'Approved'
             AND from_user_id IN (${ccScheduleIds.join(',')})`,
            targetDateStr
          )
        : Promise.resolve([]),
      ccScheduleIds.length > 0
        ? fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
            `SELECT user_id, start_time, end_time, check_in_staff_task_id, check_out_staff_task_id
           FROM \`staff_working_shift\`
           WHERE \`date\` = ? AND user_id IN (${ccScheduleIds.join(',')})`,
            targetDateStr
          )
        : Promise.resolve([]),
    ]);

  const serviceLangMap = new Map(serviceLangs.map((sl) => [sl.service_id, sl.service_name]));
  const comingServicesByOrderId = new Map<number, SafeAny[]>();
  const comingCombosByOrderId = new Map<number, SafeAny[]>();
  const comingProductsByOrderId = new Map<number, SafeAny[]>();
  const ccClientOrderIds = new Map<number, Set<number>>();

  const addRowToOrderMap = (map: Map<number, SafeAny[]>, row: SafeAny) => {
    const orderId = Number(row.order_id);
    const rows = map.get(orderId) || [];
    rows.push(row);
    map.set(orderId, rows);
  };
  const recordCcClient = (staffId: SafeAny, orderId: number) => {
    const id = Number(staffId);
    if (!id) return;
    const orderIds = ccClientOrderIds.get(id) || new Set<number>();
    orderIds.add(orderId);
    ccClientOrderIds.set(id, orderIds);
  };
  for (const service of comingServices) {
    addRowToOrderMap(comingServicesByOrderId, service);
    recordCcClient(service.check_in_staff_id, Number(service.order_id));
    recordCcClient(service.check_out_staff_id, Number(service.order_id));
  }
  for (const combo of comingCombos) addRowToOrderMap(comingCombosByOrderId, combo);
  for (const product of comingProducts) addRowToOrderMap(comingProductsByOrderId, product);

  const activeCcs = ccProfiles.flatMap((profile) => {
    const storeId = Number(profile.storeId);
    const branch = storeId === 16 ? 'estella' : storeId === 6 || storeId === 1 ? 'detham' : null;
    if (!branch) return [];
    const id = Number(profile.userId);
    return [{ id, name: String(profile.fullName || staffMap.get(id) || `Staff #${id}`).trim(), branch }];
  });

  const branchDetailMap: Record<string, SafeAny> = {
    detham: {
      revLe: 0,
      revCombo: 0,
      revProduct: 0,
      netLe: 0,
      netCombo: 0,
      netProduct: 0,
      cc: [],
      cv: [],
      coming: [],
    },
    estella: {
      revLe: 0,
      revCombo: 0,
      revProduct: 0,
      netLe: 0,
      netCombo: 0,
      netProduct: 0,
      cc: [],
      cv: [],
      coming: [],
    },
  };

  activeCcs.forEach((cc) => {
    branchDetailMap[cc.branch].cc.push({
      id: cc.id,
      name: cc.name,
      doing: 'Nghỉ phép tuần',
      clients: 0,
      combos: 0,
      revenue: 0,
      revLe: 0,
      revCombo: 0,
      revProduct: 0,
      netRevenue: 0,
      netLe: 0,
      netCombo: 0,
      netProduct: 0,
      shift: 'off',
      attendance: 'none',
    });
  });

  comingOrders.forEach((o, index) => {
    const branchKey = o.client_store_id === 16 ? 'estella' : 'detham';

    const uProfile = profileMap.get(o.user_id);
    const phone = contactMap.get(o.user_id) || '';
    const name = uProfile?.fullName || 'Khách hàng';

    const orderSvs = comingServicesByOrderId.get(Number(o.id)) || [];
    const serviceName = orderSvs.length > 0 ? serviceLangMap.get(orderSvs[0].service_id) || 'Dịch vụ' : 'Dịch vụ';

    let cvName = 'Chưa phân công';
    if (o.assigned_staff_id) {
      cvName = staffMap.get(Number(o.assigned_staff_id)) || 'Chuyên viên';
    } else if (orderSvs.length > 0 && orderSvs[0].assigned_staff_id) {
      cvName = staffMap.get(Number(orderSvs[0].assigned_staff_id)) || 'Chuyên viên';
    }

    const booker = o.created_staff_id
      ? staffMap.get(Number(o.created_staff_id)) || 'Nhiều Booker'
      : `Khách tự đặt (${o.booking_channels || 'GB'})`;

    let ccName = 'Chưa nhận';
    const checkInStaffId =
      orderSvs.find((cs) => cs.check_in_staff_id)?.check_in_staff_id ||
      orderSvs.find((cs) => cs.check_out_staff_id)?.check_out_staff_id;
    if (checkInStaffId) {
      ccName = staffMap.get(Number(checkInStaffId)) || 'Tư vấn viên';
    }

    const hasLiveCombo = checkHasLiveCombo(o.user_id, o.booking_date_start, o.date_created);
    const userBal = balancesByUserId.get(Number(o.user_id)) || [];
    const group = hasLiveCombo ? 'combo_live' : userBal.length > 0 ? 'combo_dead' : 'single';

    let status: 'completed' | 'serving' | 'confirmed' | 'pending' | 'late' | 'checkout' = 'pending';
    if (o.order_state === 'Completed') {
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

    const orderCombos = comingCombosByOrderId.get(Number(o.id)) || [];
    const orderProducts = comingProductsByOrderId.get(Number(o.id)) || [];

    const totalTax =
      orderSvs.reduce((sum, s) => sum + Number(s.tax_amount || 0), 0) +
      orderCombos.reduce((sum, c) => sum + Number(c.tax_amount || 0), 0) +
      orderProducts.reduce((sum, p) => sum + Number(p.tax_amount || 0), 0);

    const firstPromoSv = orderSvs.find((cs) => cs.promotion_id !== null && cs.promotion_id !== undefined);
    const pId = firstPromoSv?.promotion_id || o.promotion_id || o.selected_promotion_id;
    const promoName = pId ? promoMap.get(Number(pId)) || `PROMO-${pId}` : null;

    const isOc = telesalesNames.has(booker.trim().toLowerCase());
    const comboRev = orderCombos.reduce((sum, c) => sum + Number(c.total_price || 0), 0);
    const category = group === 'combo_live' || comboRev > 0 ? 'combo' : isOc ? 'oc' : 'other';

    const ccNoteEntry = status === 'completed' ? ccNoteByOrderId.get(Number(o.id)) : undefined;

    const comingItem = {
      key: String(o.id),
      customerId: o.user_id,
      time: formatDbTime(o.booking_date_start),
      customer: name,
      avatar: uProfile?.avatar || null,
      phone: !canViewPhone ? maskPhoneNumber(phone) : phone,
      group,
      promo: promoName,
      booker,
      channel: o.booking_channels || 'N/A',
      category,
      cc: ccName,
      cv: cvName,
      service: serviceName,
      bookingNote: o.booking_note || '',
      ccNote: ccNoteEntry?.note || '',
      ccNoteStaffName: ccNoteEntry?.staffName || null,
      status,
      avatarColor: ['#1890ff', '#722ed1', '#f5222d', '#fa8c16', '#52c41a', '#13c2c2', '#eb2f96'][index % 7],
      code: String(o.id),
      email: uProfile?.email || '',
      ltv: (o.total_price || 0).toLocaleString('vi-VN') + ' đ',
      price: Number(o.total_price || 0),
      tax: Number(totalTax || 0),
      bookingsCount: 1,
      diamonds: 50,
      frequency: 'N/A',
      gender: uProfile?.gender || 'N/A',
      dob: uProfile?.dob ? new Date(uProfile.dob).toLocaleDateString('en-CA') : 'N/A',
      daysAway: 'Hôm nay',
      favoriteDay: 'N/A',
      oc: booker,
    };

    branchDetailMap[branchKey].coming.push(comingItem);

    if (o.order_state === 'Completed') {
      const orderTotal = Number(o.total_price || 0);
      const rev = computeOrderRevenueBreakdown(orderTotal, orderCombos, orderProducts, orderSvs);

      branchDetailMap[branchKey].revCombo += rev.finalRevCombo;
      branchDetailMap[branchKey].revProduct += rev.finalRevProduct;
      branchDetailMap[branchKey].revLe += rev.finalRevLe;

      branchDetailMap[branchKey].netCombo += rev.finalNetCombo;
      branchDetailMap[branchKey].netProduct += rev.finalNetProduct;
      branchDetailMap[branchKey].netLe += rev.finalNetLe;
    }
  });

  // Reuse the dashboard's appointment dataset so the shared CV service does not query the same orders, services,
  // translations, and customer names for a second time in the same request.
  const cvStart = new Date(`${targetDateStr}T00:00:00.000Z`).getTime();
  const cvEnd = new Date(`${targetDateStr}T23:59:59.999Z`).getTime();
  const cvComingOrders = comingOrders.filter((order) => {
    const bookingTime = order.booking_date_start ? new Date(order.booking_date_start).getTime() : NaN;
    return bookingTime >= cvStart && bookingTime <= cvEnd;
  });
  const cvComingOrderIds = new Set(cvComingOrders.map((order) => Number(order.id)));
  const cvCustomerProfileMap = new Map(
    userProfiles.map((profile) => [
      Number(profile.userId),
      profile.fullName ? String(profile.fullName).trim() : 'Khách hàng',
    ])
  );
  const cvAttendanceList = await CvAttendanceService.getDailyCvAttendance(fastify, targetDateStr, {
    comingOrders: cvComingOrders,
    comingServices: comingServices.filter((service) => cvComingOrderIds.has(Number(service.order_id))),
    serviceLangMap,
    customerProfileMap: cvCustomerProfileMap,
  });
  cvAttendanceList.forEach((cv) => {
    const bKey = cv.storeId === 16 ? 'estella' : 'detham';

    branchDetailMap[bKey].cv.push({
      id: cv.id,
      name: cv.name,
      avatarUrl: cv.avatarUrl,
      branchName: cv.branchName,
      doing: cv.doing,
      clients: cv.clients,
      bookedCount: cv.bookedCount,
      doneCount: cv.doneCount,
      shift: cv.shift,
      attendance: cv.attendance,
      status: cv.status,
      isOff: cv.isOff,
      offReason: cv.offReason,
      offType: cv.offType,
    });
  });

  populateCcShiftsAndRevenue({
    branchDetailMap,
    allSchedules,
    weekOffRows,
    dayOffs,
    workingShifts,
    targetDateStr,
    staffMap,
    comingOrders,
    comingServicesByOrderId,
    comingCombosByOrderId,
    comingProductsByOrderId,
    ccClientOrderIds,
  });

  return branchDetailMap;
}
