import { FastifyInstance } from 'fastify';
import { LashSetDetail, SafeAny, SlotBookingInfo } from '@mos-lab/shared';
import type { SlotOrderRow } from './booking-slots.helper.js';

const resolveStoreName = (sId?: number | null): string => {
  if (sId === 16) return 'Estella Place (EP)';
  if (sId === 2) return 'Phan Xích Long (PXL)';
  if (sId === 6) return 'Đề Thám (Q1)';
  return sId ? `Chi nhánh #${sId}` : 'Wings Lashes';
};

const buildPhotoUrl = (p: SafeAny, ver: 'original' | 'thumbnail' = 'original'): string => {
  const folder = Number(p.id) % 1000;
  return `https://cdn.wingslashes.com/uploads/order/service-progress/${folder}/${ver}/${p.image_filename}.${p.image_extension}`;
};

export const enrichSlotOrderBookings = async (
  fastify: FastifyInstance,
  date: string,
  orders: SlotOrderRow[]
): Promise<Map<number, SlotBookingInfo>> => {
  const customerBookingInfoMap = new Map<number, SlotBookingInfo>();
  if (orders.length === 0) {
    return customerBookingInfoMap;
  }

  const customerIds = Array.from(new Set(orders.map((o) => Number(o.user_id)).filter(Boolean)));
  if (customerIds.length === 0) {
    return customerBookingInfoMap;
  }

  const idList = customerIds.join(',');

  // 1. Fetch customer profiles
  const profiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
    `SELECT user_id, full_name, avatar, avatar_internal
     FROM user_profile
     WHERE user_id IN (${idList})`
  );
  const profileMap = new Map<number, SafeAny>();
  profiles.forEach((p) => profileMap.set(Number(p.user_id), p));

  // 2. Fetch customer phones
  const phones = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
    `SELECT user_id, phone_number
     FROM user_contact
     WHERE user_id IN (${idList}) AND is_disabled = 0
     ORDER BY id DESC`
  );
  const phoneMap = new Map<number, string>();
  phones.forEach((ph) => {
    if (!phoneMap.has(Number(ph.user_id))) {
      phoneMap.set(Number(ph.user_id), String(ph.phone_number));
    }
  });

  // 3. Fetch services for current orders
  const currentOrderIds = orders.map((o) => Number(o.id)).filter(Boolean);
  const currentServices = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
    `SELECT os.order_id, sl.service_name
     FROM order_service os
     LEFT JOIN service_language sl ON sl.service_id = os.service_id AND sl.language_id = 1
     WHERE os.order_id IN (${currentOrderIds.join(',')})`
  );
  const currentServiceMap = new Map<number, string>();
  currentServices.forEach((cs) => currentServiceMap.set(Number(cs.order_id), cs.service_name));

  // 4. Fetch previous and next bookings relative to this target date
  const dateStartStr = `${date} 00:00:00`;
  const dateEndStr = `${date} 23:59:59`;

  const prevBookings = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
    `SELECT o.id, o.user_id, CAST(o.booking_date_start AS CHAR) as booking_date_start,
            o.client_store_id, sl.service_name,
            COALESCE(
              (SELECT up.full_name FROM user_profile up WHERE up.user_id = os.assigned_staff_id LIMIT 1),
              (SELECT up.full_name FROM order_booking_date_change obdc JOIN user_profile up ON up.user_id = obdc.assigned_staff_id WHERE obdc.order_id = o.id ORDER BY obdc.id DESC LIMIT 1)
            ) as cv_name
     FROM \`order\` o
     LEFT JOIN order_service os ON os.order_id = o.id
     LEFT JOIN service_language sl ON sl.service_id = os.service_id AND sl.language_id = 1
     WHERE o.user_id IN (${idList})
       AND o.booking_date_start < ?
       AND o.order_state = 'Completed'
       AND NOT EXISTS (
         SELECT 1 FROM order_service os_w
         WHERE os_w.order_id = o.id
           AND os_w.service_type IN ('Fix', 'Log', 'Adjust')
       )
     ORDER BY o.booking_date_start DESC`,
    dateStartStr
  );
  const prevBookingMap = new Map<number, SafeAny>();
  prevBookings.forEach((pb) => {
    const uid = Number(pb.user_id);
    if (!prevBookingMap.has(uid)) prevBookingMap.set(uid, pb);
  });

  const nextBookings = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
    `SELECT o.id, o.user_id, CAST(o.booking_date_start AS CHAR) as booking_date_start,
            o.client_store_id, sl.service_name,
            COALESCE(
              (SELECT up.full_name FROM user_profile up WHERE up.user_id = os.assigned_staff_id LIMIT 1),
              (SELECT up.full_name FROM order_booking_date_change obdc JOIN user_profile up ON up.user_id = obdc.assigned_staff_id WHERE obdc.order_id = o.id ORDER BY obdc.id DESC LIMIT 1)
            ) as cv_name
     FROM \`order\` o
     LEFT JOIN order_service os ON os.order_id = o.id
     LEFT JOIN service_language sl ON sl.service_id = os.service_id AND sl.language_id = 1
     WHERE o.user_id IN (${idList})
       AND o.booking_date_start > ?
       AND o.order_state != 'Cancelled'
     ORDER BY o.booking_date_start ASC`,
    dateEndStr
  );
  const nextBookingMap = new Map<number, SafeAny>();
  nextBookings.forEach((nb) => {
    const uid = Number(nb.user_id);
    if (!nextBookingMap.has(uid)) nextBookingMap.set(uid, nb);
  });

  // 5. Fetch recent lash sets (up to 10 completed orders per customer)
  const recentOrders = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
    `SELECT o.id, o.user_id, CAST(o.booking_date_start AS CHAR) as booking_date_start,
            o.order_state, o.client_store_id, o.total_price, o.booking_note,
            sl.service_name,
            COALESCE(
              (SELECT up.full_name FROM user_profile up WHERE up.user_id = os.assigned_staff_id LIMIT 1),
              (SELECT up.full_name FROM order_booking_date_change obdc JOIN user_profile up ON up.user_id = obdc.assigned_staff_id WHERE obdc.order_id = o.id ORDER BY obdc.id DESC LIMIT 1)
            ) as cv_name
     FROM \`order\` o
     LEFT JOIN order_service os ON os.order_id = o.id
     LEFT JOIN service_language sl ON sl.service_id = os.service_id AND sl.language_id = 1
     WHERE o.user_id IN (${idList})
       AND o.order_state = 'Completed'
     ORDER BY o.booking_date_start DESC`
  );

  // Limit recent orders to 10 per customer
  const customerRecentOrders = new Map<number, SafeAny[]>();
  const allRecentOrderIds: number[] = [];
  recentOrders.forEach((ro) => {
    const uid = Number(ro.user_id);
    const list = customerRecentOrders.get(uid) || [];
    if (list.length < 10) {
      list.push(ro);
      customerRecentOrders.set(uid, list);
      allRecentOrderIds.push(Number(ro.id));
    }
  });

  // 6. Fetch photos for these recent orders
  const photos =
    allRecentOrderIds.length > 0
      ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT id, order_id, service_state, image_filename, image_extension
           FROM order_service_progress
           WHERE order_id IN (${allRecentOrderIds.join(',')}) AND image_filename IS NOT NULL
           ORDER BY id ASC`
        )
      : [];

  const photoOrderMap = new Map<number, SafeAny[]>();
  photos.forEach((p) => {
    const oid = Number(p.order_id);
    const pList = photoOrderMap.get(oid) || [];
    pList.push(p);
    photoOrderMap.set(oid, pList);
  });

  // 7. Assemble SlotBookingInfo for each order
  orders.forEach((o) => {
    const uid = Number(o.user_id);
    const prof = profileMap.get(uid);
    const phone = phoneMap.get(uid) || null;
    const currentService = currentServiceMap.get(Number(o.id)) || 'Dịch vụ nối mi';
    const prev = prevBookingMap.get(uid);
    const next = nextBookingMap.get(uid);

    const orderDate = new Date(o.start_str || `${date} 09:00:00`);

    let cycleDays: number | null = null;
    let prevBookingInfo: SafeAny = null;
    if (prev?.booking_date_start) {
      const prevDate = new Date(prev.booking_date_start);
      const diffMs = orderDate.getTime() - prevDate.getTime();
      cycleDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      prevBookingInfo = {
        orderId: Number(prev.id),
        date: prev.booking_date_start,
        serviceName: prev.service_name || 'Dịch vụ nối mi',
        technicianName: prev.cv_name || 'Chuyên viên',
        storeName: resolveStoreName(prev.client_store_id),
        cycleDays,
      };
    }

    let nextBookingInfo: SafeAny = null;
    if (next?.booking_date_start) {
      const nextDate = new Date(next.booking_date_start);
      const diffMs = nextDate.getTime() - orderDate.getTime();
      const inDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      nextBookingInfo = {
        orderId: Number(next.id),
        date: next.booking_date_start,
        serviceName: next.service_name || 'Dịch vụ nối mi',
        technicianName: next.cv_name || 'Chuyên viên',
        storeName: resolveStoreName(next.client_store_id),
        inDays,
      };
    }

    const rawLashSets = customerRecentOrders.get(uid) || [];
    const recentLashSets: LashSetDetail[] = rawLashSets.map((r) => {
      const rPhotos = photoOrderMap.get(Number(r.id)) || [];
      const beforeP = rPhotos.find((p) => p.service_state === 'ServiceStart' || p.service_state === 'ServiceCleaned');
      const afterP = rPhotos.find((p) => p.service_state === 'ServiceEnd');

      return {
        orderId: Number(r.id),
        bookingDate: r.booking_date_start,
        serviceName: r.service_name || 'Dịch vụ nối mi',
        technicianName: r.cv_name || 'Chuyên viên',
        storeName: resolveStoreName(r.client_store_id),
        orderState: r.order_state,
        totalPrice: Number(r.total_price) || 0,
        bookingNote: r.booking_note || '',
        beforePhotoUrl: beforeP ? buildPhotoUrl(beforeP, 'original') : null,
        beforeThumbnailUrl: beforeP ? buildPhotoUrl(beforeP, 'thumbnail') : null,
        afterPhotoUrl: afterP ? buildPhotoUrl(afterP, 'original') : null,
        afterThumbnailUrl: afterP ? buildPhotoUrl(afterP, 'thumbnail') : null,
      };
    });

    const timePart = o.start_str ? o.start_str.split(' ')[1]?.slice(0, 5) || '09:00' : '09:00';

    const bookingInfo: SlotBookingInfo = {
      orderId: Number(o.id),
      customerId: uid,
      customerName: prof?.full_name || 'Khách hàng',
      customerPhone: phone,
      customerAvatar: prof?.avatar || prof?.avatar_internal || null,
      serviceName: currentService,
      bookingTime: timePart,
      duration: Number(o.duration || 90),
      orderState: o.order_state,
      cycleDays,
      previousBooking: prevBookingInfo,
      nextBooking: nextBookingInfo,
      recentLashSets,
    };

    customerBookingInfoMap.set(Number(o.id), bookingInfo);
  });

  return customerBookingInfoMap;
};
