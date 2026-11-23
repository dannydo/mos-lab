import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';
import { ComboRecognitionService } from '../../services/combo-recognition.service.js';
import { LashSpecificationService } from '../../services/lash-specification.service.js';
import { repairCustomerNotesIntegrity } from '../customer-notes.routes.js';

export async function fetchCustomerDetailedBookingsNotesAndCalls(
  fastify: FastifyInstance,
  customerId: number,
  resolvedCustomerId: number,
  completedOrders: SafeAny[]
) {
  // 6. Fetch Bookings and order services (Optimized)
  const bookingsSql = `
    SELECT 
      o.id,
      o.order_key as orderKey,
      o.booking_date_start as bookingDate,
      o.booking_note as bookingNote,
      o.order_state as orderState,
      o.total_price as totalPrice,
      o.assigned_staff_id as technicianId,
      o.client_store_id as storeId,
      o.created_staff_id as createdStaffId,
      COALESCE(csl.client_store_name, 'Estella Place') as branchName,
      up.full_name as assignedTechnicianName
    FROM \`order\` o
    LEFT JOIN client_store_language csl ON o.client_store_id = csl.client_store_id AND csl.language_id = 1
    LEFT JOIN user_profile up ON o.assigned_staff_id = up.user_id
    WHERE o.user_id = ?
    ORDER BY o.booking_date_start DESC
    LIMIT 50
  `;
  const servicesSql = `
    SELECT 
      os.order_id as orderId,
      COALESCE(sl.service_name, s.service_key) as serviceName,
      os.service_type as serviceType,
      os.user_service_type as userServiceType
    FROM order_service os
    LEFT JOIN service s ON os.service_id = s.id
    LEFT JOIN service_language sl ON os.service_id = sl.service_id AND sl.language_id = 1
    WHERE os.user_id = ?
  `;

  const orderServicesSql = `
    SELECT 
      os.order_id as orderId,
      os.total_price as totalPrice,
      os.service_id as serviceId,
      COALESCE(sl.service_name, s.service_key) as serviceName
    FROM order_service os
    LEFT JOIN service s ON os.service_id = s.id
    LEFT JOIN service_language sl ON os.service_id = sl.service_id AND sl.language_id = 1
    WHERE os.user_id = ?
  `;

  const orderCombosSql = `
    SELECT 
      osc.order_id as orderId,
      osc.total_price as totalPrice,
      osc.service_id as serviceId,
      COALESCE(sl.service_name, s.service_key) as serviceName
    FROM order_service_combo osc
    LEFT JOIN service s ON osc.service_id = s.id
    LEFT JOIN service_language sl ON osc.service_id = sl.service_id AND sl.language_id = 1
    WHERE osc.user_id = ?
  `;

  const orderProductsSql = `
    SELECT 
      op.order_id as orderId,
      op.total_price as totalPrice,
      op.product_id as productId,
      COALESCE(pl.product_name, 'Sản phẩm') as productName
    FROM order_product op
    LEFT JOIN product_language pl ON op.product_id = pl.product_id AND pl.language_id = 1
    WHERE op.user_id = ?
  `;

  const [bookingsRaw, servicesRaw, orderServicesRaw, orderCombosRaw, orderProductsRaw] = await Promise.all([
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(bookingsSql, customerId),
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(servicesSql, customerId),
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(orderServicesSql, customerId),
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(orderCombosSql, customerId),
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(orderProductsSql, customerId),
  ]);
  const detailBookingIds = bookingsRaw.map((booking) => Number(booking.id));
  const [bookingComboLiveByOrderId, bookingLashSpecsByOrderId] = await Promise.all([
    ComboRecognitionService.getBookingComboLiveStatesByOrderIds(fastify, detailBookingIds),
    LashSpecificationService.getLashSpecsByOrderIds(fastify, detailBookingIds),
  ]);

  const servicesByOrderIdDetail = new Map<number, { name: string; price: number }[]>();
  for (const os of orderServicesRaw) {
    const orderId = Number(os.orderId);
    const list = servicesByOrderIdDetail.get(orderId) || [];
    list.push({ name: os.serviceName, price: Number(os.totalPrice || 0) });
    servicesByOrderIdDetail.set(orderId, list);
  }

  const combosByOrderIdDetail = new Map<number, { name: string; price: number }[]>();
  for (const oc of orderCombosRaw) {
    const orderId = Number(oc.orderId);
    const list = combosByOrderIdDetail.get(orderId) || [];
    list.push({ name: oc.serviceName, price: Number(oc.totalPrice || 0) });
    combosByOrderIdDetail.set(orderId, list);
  }

  const productsByOrderIdDetail = new Map<number, { name: string; price: number }[]>();
  for (const op of orderProductsRaw) {
    const orderId = Number(op.orderId);
    const list = productsByOrderIdDetail.get(orderId) || [];
    list.push({ name: op.productName, price: Number(op.totalPrice || 0) });
    productsByOrderIdDetail.set(orderId, list);
  }

  const allOrderIds = Array.from(
    new Set([...bookingsRaw.map((b) => Number(b.id)), ...completedOrders.map((o) => Number(o.id))])
  );

  const [orderServicesDetails, auditLogCounts] = await Promise.all([
    allOrderIds.length > 0
      ? fastify.prisma.legacy.order_service.findMany({
          where: { order_id: { in: allOrderIds } },
          select: {
            order_id: true,
            assigned_staff_id: true,
            check_in_staff_id: true,
            check_out_staff_id: true,
          },
        })
      : Promise.resolve([]),
    allOrderIds.length > 0
      ? fastify.prisma.crm.crmBookingLog.groupBy({
          by: ['orderId'],
          _count: { id: true },
          where: { orderId: { in: allOrderIds } },
        })
      : Promise.resolve([]),
  ]);

  const auditCountMap = new Map<number, number>(auditLogCounts.map((item) => [item.orderId, item._count.id]));
  const orderServicesByOrderId = new Map<number, SafeAny[]>();
  for (const orderService of orderServicesDetails) {
    const orderId = Number(orderService.order_id);
    const services = orderServicesByOrderId.get(orderId) || [];
    services.push(orderService);
    orderServicesByOrderId.set(orderId, services);
  }

  const staffUserIds = new Set<number>();
  for (const b of bookingsRaw) {
    if (b.technicianId) staffUserIds.add(Number(b.technicianId));
    if (b.createdStaffId) staffUserIds.add(Number(b.createdStaffId));
  }
  for (const o of completedOrders) {
    if (o.technicianId) staffUserIds.add(Number(o.technicianId));
    if (o.createdStaffId) staffUserIds.add(Number(o.createdStaffId));
  }
  for (const os of orderServicesDetails) {
    if (os.assigned_staff_id) staffUserIds.add(Number(os.assigned_staff_id));
    if (os.check_in_staff_id) staffUserIds.add(Number(os.check_in_staff_id));
    if (os.check_out_staff_id) staffUserIds.add(Number(os.check_out_staff_id));
  }

  const staffIdArray = Array.from(staffUserIds);
  const staffProfiles =
    staffIdArray.length > 0
      ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT user_id as userId, full_name as fullName, is_disabled as isDisabled, is_leaved as isLeaved, avatar
        FROM user_profile
        WHERE user_id IN (${staffIdArray.join(',')})
      `)
      : [];
  const staffNamesMap = new Map<number, string>(staffProfiles.map((s) => [Number(s.userId), s.fullName]));
  const staffAvatarMap = new Map<number, string | null>(staffProfiles.map((s) => [Number(s.userId), s.avatar || null]));
  const staffInactiveMap = new Map<number, boolean>(
    staffProfiles.map((s) => [
      Number(s.userId),
      s.isDisabled === 1 || s.isDisabled === true || s.isLeaved === 1 || s.isLeaved === true,
    ])
  );

  // Map services to bookings
  const servicesByOrderId = new Map<number, string[]>();
  const serviceTypesByOrderId = new Map<number, string[]>();
  const serviceStatusesByOrderId = new Map<
    number,
    { serviceName: string; serviceType?: string | null; userServiceType: string | null }[]
  >();
  for (const s of servicesRaw) {
    const orderId = Number(s.orderId);
    const list = servicesByOrderId.get(orderId) || [];
    list.push(s.serviceName);
    servicesByOrderId.set(orderId, list);

    if (s.serviceType) {
      const types = serviceTypesByOrderId.get(orderId) || [];
      types.push(String(s.serviceType));
      serviceTypesByOrderId.set(orderId, types);
    }

    const statuses = serviceStatusesByOrderId.get(orderId) || [];
    statuses.push({
      serviceName: String(s.serviceName || 'Dịch vụ'),
      serviceType: s.serviceType ? String(s.serviceType) : null,
      userServiceType: s.userServiceType ? String(s.userServiceType) : null,
    });
    serviceStatusesByOrderId.set(orderId, statuses);
  }

  const formattedBookings = bookingsRaw.map((b) => {
    const orderSvs = orderServicesByOrderId.get(Number(b.id)) || [];
    const rawCheckIn = orderSvs.find((os) => os.check_in_staff_id && os.check_in_staff_id > 0)?.check_in_staff_id;
    const rawCheckOut = orderSvs.find((os) => os.check_out_staff_id && os.check_out_staff_id > 0)?.check_out_staff_id;
    const firstCvStaffId =
      b.technicianId || orderSvs.find((os) => os.assigned_staff_id && os.assigned_staff_id > 0)?.assigned_staff_id;
    const rawBooker = b.createdStaffId;

    const isCheckedIn = [
      'CheckIn',
      'Consultation',
      'Preparation',
      'ServiceStart',
      'ServiceCleaned',
      'ServiceEnd',
      'ServiceCompleted',
      'CheckOut',
      'Parking',
      'Completed',
    ].includes(b.orderState);
    const isCheckedOut = ['CheckOut', 'Completed'].includes(b.orderState);

    const finalCheckInId = isCheckedIn ? rawCheckIn || rawCheckOut || null : null;
    const finalCheckOutId = isCheckedOut ? rawCheckOut || rawCheckIn || null : null;
    const finalBookerId = rawBooker || null;

    const getStaffDisplayName = (staffId: number | null | undefined) => {
      if (!staffId) return null;
      const name = staffNamesMap.get(Number(staffId));
      if (!name) return null;
      const isInactive = staffInactiveMap.get(Number(staffId));
      return isInactive ? `${name} (Đã nghỉ)` : name;
    };

    const checkinName = getStaffDisplayName(finalCheckInId);
    const checkoutName = getStaffDisplayName(finalCheckOutId);
    const bookerDisplayName = getStaffDisplayName(finalBookerId);
    const technicianName =
      getStaffDisplayName(firstCvStaffId) ||
      (b.assignedTechnicianName &&
      b.assignedTechnicianName !== 'Kỹ thuật viên' &&
      b.assignedTechnicianName !== 'Chuyên viên'
        ? b.assignedTechnicianName
        : null);

    const bServiceTypes = serviceTypesByOrderId.get(Number(b.id)) || [];
    const isWarranty = bServiceTypes.length > 0 && bServiceTypes.every((st) => ['Fix', 'Log', 'Adjust'].includes(st));

    return {
      id: b.id,
      orderKey: b.orderKey,
      bookingDate: b.bookingDate ? new Date(b.bookingDate).toISOString().replace('Z', '+07:00') : null,
      bookingNote: b.bookingNote || '',
      orderState: b.orderState,
      totalPrice: Number(b.totalPrice || 0),
      branchName: b.branchName,
      technicianName,
      ccInName: checkinName,
      checkinStaffName: checkinName,
      ccOutName: checkoutName,
      checkoutStaffName: checkoutName,
      bookerName: bookerDisplayName,
      bookerStaffName: bookerDisplayName,
      ccInAvatar: finalCheckInId ? staffAvatarMap.get(Number(finalCheckInId)) || null : null,
      ccOutAvatar: finalCheckOutId ? staffAvatarMap.get(Number(finalCheckOutId)) || null : null,
      bookerAvatar: finalBookerId ? staffAvatarMap.get(Number(finalBookerId)) || null : null,
      technicianId: firstCvStaffId ? Number(firstCvStaffId) : null,
      storeId: b.storeId ? Number(b.storeId) : null,
      services: servicesByOrderId.get(Number(b.id)) || [],
      serviceTypes: bServiceTypes,
      isWarranty,
      serviceStatuses: serviceStatusesByOrderId.get(Number(b.id)) || [],
      hasLiveComboAtBooking: bookingComboLiveByOrderId.get(Number(b.id)) || false,
      lashSpecifications: bookingLashSpecsByOrderId.get(Number(b.id)) || [],
      lashSpecs: bookingLashSpecsByOrderId.get(Number(b.id)) || [],
      auditLogCount: auditCountMap.get(Number(b.id)) || 0,
    };
  });

  // 7. Fetch Notes from user_note
  await repairCustomerNotesIntegrity(fastify.prisma.legacy, resolvedCustomerId);

  const notesSql = `
    SELECT 
      un.id,
      un.note,
      un.note_field_key as noteFieldKey,
      un.is_sticky as isSticky,
      un.is_issue as isIssue,
      un.date_created as dateCreated,
      COALESCE(up.full_name, 'System') as staffName,
      up.avatar as staffAvatar
    FROM user_note un
    LEFT JOIN user_profile up ON un.created_staff_id = up.user_id
    WHERE un.user_id = ? AND (un.is_disabled = 0 OR un.note_field_key = 'order_note')
    ORDER BY un.date_created DESC
  `;
  const notesRaw = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(notesSql, resolvedCustomerId);
  const formattedNotes = notesRaw.map((n) => {
    let safeIsoDate: string | null = null;
    if (n.dateCreated) {
      if (n.dateCreated instanceof Date) {
        safeIsoDate = isNaN(n.dateCreated.getTime()) ? null : n.dateCreated.toISOString();
      } else if (typeof n.dateCreated === 'string') {
        const parsed = new Date(n.dateCreated.replace(' ', 'T'));
        safeIsoDate = isNaN(parsed.getTime()) ? null : parsed.toISOString();
      } else {
        const parsed = new Date(n.dateCreated);
        safeIsoDate = isNaN(parsed.getTime()) ? null : parsed.toISOString();
      }
    }
    return {
      id: Number(n.id),
      note: n.note || '',
      noteFieldKey: n.noteFieldKey || 'note',
      isSticky: Boolean(n.isSticky),
      isIssue: Boolean(n.isIssue),
      dateCreated: safeIsoDate,
      staffName: n.staffName,
      staffAvatar: n.staffAvatar || null,
    };
  });

  // 8. Fetch CRM Call Logs
  const logs = await fastify.prisma.crm.crmCallLog.findMany({
    where: { legacyUserId: resolvedCustomerId },
    orderBy: { createdAt: 'desc' },
  });
  const staffIds = Array.from(new Set(logs.map((l) => l.staffId)));
  const staffList = await fastify.prisma.crm.crmStaff.findMany({
    where: { id: { in: staffIds } },
    select: { id: true, displayName: true, avatarUrl: true },
  });
  const staffMap = new Map(staffList.map((s) => [s.id, s.displayName]));
  const staffAvatarUrlMap = new Map(staffList.map((s) => [s.id, s.avatarUrl || null]));
  const formattedCalls = logs.map((log) => ({
    id: log.id,
    planId: log.planId,
    callType: log.callType,
    callResult: log.callResult,
    durationSec: log.durationSec,
    note: log.note,
    outcome: log.outcome,
    callbackDate: log.callbackDate ? new Date(log.callbackDate).toISOString().split('T')[0] : null,
    createdAt: log.createdAt.toISOString(),
    staffName: staffMap.get(log.staffId) || 'Unknown Staff',
    staffAvatar: staffAvatarUrlMap.get(log.staffId) || null,
  }));

  return {
    formattedBookings,
    formattedNotes,
    formattedCalls,
    staffNamesMap,
    staffInactiveMap,
    orderServicesByOrderId,
    servicesByOrderIdDetail,
    combosByOrderIdDetail,
    productsByOrderIdDetail,
  };
}
