import type { FastifyInstance } from 'fastify';
import {
  type SafeAny,
  type TelesaleTodayBookItem,
  type TelesaleTodayCheckinItem,
  type TelesaleTodayLiveEvent,
  maskPhoneNumber,
} from '@mos-lab/shared';
import { analyzeCustomerPraiseNote } from '../../utils/customer-praise-analyzer.js';
import { parseVietnamDateToIso } from '../telesale-target-config.service.js';
import type { StaffCandidateSummary } from './overview-data-loader.js';

const formatBookingDateDisplay = (dateStr?: string): string => {
  if (!dateStr) return 'Hôm nay';
  try {
    const d = new Date(parseVietnamDateToIso(dateStr));
    const today = new Date();
    const isToday =
      d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const isTomorrow =
      d.getDate() === tomorrow.getDate() &&
      d.getMonth() === tomorrow.getMonth() &&
      d.getFullYear() === tomorrow.getFullYear();

    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    if (isToday) return `Hôm nay ${hours}:${mins}`;
    if (isTomorrow) return `Ngày mai ${hours}:${mins}`;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month} ${hours}:${mins}`;
  } catch {
    return dateStr;
  }
};

const formatTimeAgo = (dateStr?: string): string => {
  if (!dateStr) return 'Vừa xong';
  try {
    const d = new Date(parseVietnamDateToIso(dateStr)).getTime();
    const now = Date.now();
    const diffMins = Math.floor((now - d) / 60000);
    if (diffMins <= 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins}p trước`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h trước`;
  } catch {
    return 'Vừa xong';
  }
};

const formatTimeInService = (startStr?: string, endStr?: string, isDone?: boolean): string => {
  if (!startStr) return '';
  try {
    const startTime = new Date(parseVietnamDateToIso(startStr)).getTime();
    const endTime = isDone && endStr ? new Date(parseVietnamDateToIso(endStr)).getTime() : Date.now();
    const diffMins = Math.max(1, Math.floor((endTime - startTime) / 60000));
    if (diffMins < 60) return `${diffMins}p`;
    const h = Math.floor(diffMins / 60);
    const m = diffMins % 60;
    return m > 0 ? `${h}h ${m}p` : `${h}h`;
  } catch {
    return '';
  }
};

const resolvePromotionName = (promoId?: number, bookingNote?: string): string | null => {
  if (bookingNote && bookingNote.trim()) {
    const note = bookingNote.trim();
    if (/voucher|giảm|off|sale|km|tri ân|deal/i.test(note)) {
      return note.length > 25 ? note.slice(0, 25) + '...' : note;
    }
  }
  if (promoId && Number(promoId) > 0) {
    return 'Có ưu đãi đặt lịch';
  }
  return null;
};

export async function buildTodayFeeds(
  fastify: FastifyInstance,
  params: {
    todayBookOrders: SafeAny[];
    todayCheckinOrders: SafeAny[];
    todayDoneOrders: SafeAny[];
    allStaffCandidates: StaffCandidateSummary[];
    staffNameMap: Map<number, string>;
    staffAvatarMap: Map<number, string | null>;
  }
): Promise<{
  todayLiveEvents: TelesaleTodayLiveEvent[];
  todayBookList: TelesaleTodayBookItem[];
  todayCheckinList: TelesaleTodayCheckinItem[];
}> {
  const { todayBookOrders, todayCheckinOrders, todayDoneOrders, allStaffCandidates, staffNameMap, staffAvatarMap } =
    params;

  // 5. Build today's live events feed for TV Celebration
  const sortedTodayBookOrders = [...todayBookOrders]
    .filter((o) => o && o.id)
    .sort(
      (a, b) =>
        new Date(parseVietnamDateToIso(a.dateCreated)).getTime() -
        new Date(parseVietnamDateToIso(b.dateCreated)).getTime()
    );

  const staffBookCountMap = new Map<number, number>();
  const bookEvents: TelesaleTodayLiveEvent[] = sortedTodayBookOrders.map((o) => {
    const bookerId = Number(o.bookerId);
    const prevCount = staffBookCountMap.get(bookerId) || 0;
    const newCount = prevCount + 1;
    staffBookCountMap.set(bookerId, newCount);

    return {
      id: `book-${o.id}`,
      type: 'BOOK' as const,
      staffId: bookerId,
      staffName:
        staffNameMap.get(bookerId) || allStaffCandidates.find((c) => c.legacyStaffId === bookerId)?.name || 'Telesales',
      avatarUrl: staffAvatarMap.get(bookerId) || null,
      timestamp: parseVietnamDateToIso(o.dateCreated),
      orderId: Number(o.id),
      changeResult: `Book ${prevCount} → ${newCount}`,
    };
  });

  const sortedTodayCheckinOrders = [...todayCheckinOrders]
    .filter((o) => o && o.id)
    .sort((a, b) => {
      const timeA = new Date(
        parseVietnamDateToIso(a.checkinDate || a.actualBookingDateStart || a.bookingDateStart || 0)
      ).getTime();
      const timeB = new Date(
        parseVietnamDateToIso(b.checkinDate || b.actualBookingDateStart || b.bookingDateStart || 0)
      ).getTime();
      return timeA - timeB;
    });

  const staffCheckinCountMap = new Map<number, number>();
  const checkinEvents: TelesaleTodayLiveEvent[] = sortedTodayCheckinOrders.map((o) => {
    const bookerId = Number(o.bookerId);
    const prevCheckin = staffCheckinCountMap.get(bookerId) || 0;
    const newCheckin = prevCheckin + 1;
    staffCheckinCountMap.set(bookerId, newCheckin);

    const timestamp = parseVietnamDateToIso(o.checkinDate || o.actualBookingDateStart || o.bookingDateStart);

    return {
      id: `checkin-${o.id}`,
      type: 'CHECKIN' as const,
      staffId: bookerId,
      staffName:
        staffNameMap.get(bookerId) || allStaffCandidates.find((c) => c.legacyStaffId === bookerId)?.name || 'Telesales',
      avatarUrl: staffAvatarMap.get(bookerId) || null,
      timestamp,
      orderId: Number(o.id),
      changeResult: `Check-in ${prevCheckin} → ${newCheckin}`,
    };
  });

  const sortedTodayDoneOrders = [...todayDoneOrders]
    .filter((o) => o && o.id)
    .sort((a, b) => {
      const timeA = new Date(
        parseVietnamDateToIso(a.doneDate || a.actualBookingDateEnd || a.dateUpdated || a.actualBookingDateStart || 0)
      ).getTime();
      const timeB = new Date(
        parseVietnamDateToIso(b.doneDate || b.actualBookingDateEnd || b.dateUpdated || b.actualBookingDateStart || 0)
      ).getTime();
      return timeA - timeB;
    });

  // Query tip data, combo sales, and customer praise feedback for today's completed and check-in orders
  const tipOrderIds = Array.from(
    new Set([...todayDoneOrders.map((o) => Number(o.id)), ...todayCheckinOrders.map((o) => Number(o.id))])
  ).filter((id) => Number.isInteger(id) && id > 0);
  const tipMap = new Map<number, number>();
  const comboSaleMap = new Map<number, { comboPackageName: string; comboPrice: number }>();
  const customerPraiseMap = new Map<number, string>();

  if (tipOrderIds.length > 0) {
    try {
      const [tips, comboRows, feedbackRows] = await Promise.all([
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT order_id, SUM(tip_amount) as totalTip FROM staff_tip WHERE order_id IN (${tipOrderIds.join(',')}) GROUP BY order_id`
        ),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT 
              osc.order_id as orderId,
              COALESCE(osc.total_price, osc.service_price, 0) as comboPrice,
              COALESCE(sl.service_name, s.service_key, 'Gói Combo') as comboName
            FROM order_service_combo osc
            JOIN \`order\` o ON o.id = osc.order_id
            LEFT JOIN service s ON s.id = osc.service_id
            LEFT JOIN service_language sl ON sl.service_id = s.id AND sl.language_id = 1
            WHERE osc.order_id IN (${tipOrderIds.join(',')})
              AND o.order_state = 'Completed'`
        ),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT 
              booking_id as bookingId,
              customer_name as customerName,
              rating,
              tip_amount as tipAmount,
              tip_note as tipNote,
              cc_user_name as ccUserName
            FROM cc_feedback_reviews
            WHERE booking_id IN (${tipOrderIds.map((id) => `'${id}'`).join(',')})
              AND tip_note IS NOT NULL
              AND TRIM(tip_note) != ''`
        ),
      ]);
      for (const t of tips) {
        tipMap.set(Number(t.order_id), Number(t.totalTip || 0));
      }
      for (const r of comboRows) {
        comboSaleMap.set(Number(r.orderId), {
          comboPackageName: r.comboName || 'Gói Combo',
          comboPrice: Math.round(Number(r.comboPrice || 0)),
        });
      }
      for (const f of feedbackRows) {
        const ordId = Number(f.bookingId);
        if (ordId > 0 && f.tipNote) {
          const analysis = analyzeCustomerPraiseNote(f.tipNote);
          if (analysis.isPraise) {
            customerPraiseMap.set(ordId, analysis.cleanNote);
          }
        }
      }
    } catch (err) {
      fastify.log.warn(`Failed to query staff_tip, order_service_combo, or cc_feedback_reviews: ${err}`);
    }
  }

  // 5.4 Pre-fetch Customer Info and Order Service Details (CV, CC, Service)
  const customerIdsToFetch = Array.from(
    new Set(
      [
        ...todayBookOrders.map((o) => Number(o.customerId)),
        ...todayCheckinOrders.map((o) => Number(o.customerId)),
        ...todayDoneOrders.map((o) => Number(o.customerId)),
      ].filter((id) => Number.isInteger(id) && id > 0)
    )
  );

  const customerInfoMap = new Map<number, { fullName: string; phone?: string; avatar?: string | null }>();
  if (customerIdsToFetch.length > 0) {
    try {
      const custRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `
          SELECT 
            up.user_id as userId,
            up.full_name as fullName,
            up.avatar as avatar,
            uc.phone_number as phone
          FROM user_profile up
          LEFT JOIN user_contact uc ON uc.user_id = up.user_id AND uc.is_disabled = 0
          WHERE up.user_id IN (${customerIdsToFetch.join(',')})
        `
      );
      for (const c of custRows) {
        customerInfoMap.set(Number(c.userId), {
          fullName: c.fullName || 'Khách hàng',
          phone: c.phone || '',
          avatar: c.avatar || null,
        });
      }
    } catch (err) {
      fastify.log.warn(`Failed to query customer profiles for today orders: ${err}`);
    }
  }

  // Query order_service for all today orders (checkin + done) to get CV, CC, and serviceName
  const allOrderIdsForDetails = Array.from(
    new Set([...todayCheckinOrders.map((o) => Number(o.id)), ...todayDoneOrders.map((o) => Number(o.id))])
  ).filter((id) => id > 0);
  const orderServiceDetailsMap = new Map<number, { serviceName: string; cvStaffId?: number; ccStaffId?: number }>();
  const extraStaffIdsToFetch = new Set<number>();

  if (allOrderIdsForDetails.length > 0) {
    try {
      const osRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `
          SELECT 
            os.order_id as orderId,
            os.assigned_staff_id as cvStaffId,
            os.check_in_staff_id as ccStaffId,
            COALESCE(sl.service_name, s.service_key, 'Nối mi thiết kế') as serviceName
          FROM order_service os
          LEFT JOIN service s ON s.id = os.service_id
          LEFT JOIN service_language sl ON sl.service_id = s.id AND sl.language_id = 1
          WHERE os.order_id IN (${allOrderIdsForDetails.join(',')})
          ORDER BY os.id ASC
        `
      );
      for (const row of osRows) {
        const ordId = Number(row.orderId);
        if (!orderServiceDetailsMap.has(ordId)) {
          orderServiceDetailsMap.set(ordId, {
            serviceName: row.serviceName || 'Nối mi thiết kế',
            cvStaffId: row.cvStaffId ? Number(row.cvStaffId) : undefined,
            ccStaffId: row.ccStaffId ? Number(row.ccStaffId) : undefined,
          });
          if (row.cvStaffId && !staffNameMap.has(Number(row.cvStaffId))) {
            extraStaffIdsToFetch.add(Number(row.cvStaffId));
          }
          if (row.ccStaffId && !staffNameMap.has(Number(row.ccStaffId))) {
            extraStaffIdsToFetch.add(Number(row.ccStaffId));
          }
        }
      }
    } catch (err) {
      fastify.log.warn(`Failed to query order_service for today orders: ${err}`);
    }
  }

  if (extraStaffIdsToFetch.size > 0) {
    try {
      const extraStaffRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT user_id as userId, full_name as fullName, avatar FROM user_profile WHERE user_id IN (${Array.from(
          extraStaffIdsToFetch
        ).join(',')})`
      );
      for (const st of extraStaffRows) {
        const sid = Number(st.userId);
        if (st.fullName && !staffNameMap.has(sid)) staffNameMap.set(sid, st.fullName);
        if (st.avatar && !staffAvatarMap.has(sid)) staffAvatarMap.set(sid, st.avatar);
      }
    } catch (err) {
      fastify.log.warn(`Failed to query extra staff profiles: ${err}`);
    }
  }

  const staffDoneCountMap = new Map<number, number>();
  const doneEvents: TelesaleTodayLiveEvent[] = sortedTodayDoneOrders.map((o) => {
    const bookerId = Number(o.bookerId);
    const prevDone = staffDoneCountMap.get(bookerId) || 0;
    const newDone = prevDone + 1;
    staffDoneCountMap.set(bookerId, newDone);

    const timestamp = parseVietnamDateToIso(
      o.doneDate || o.actualBookingDateEnd || o.dateUpdated || o.actualBookingDateStart || o.bookingDateStart
    );

    const ordId = Number(o.id);
    const comboSale = comboSaleMap.get(ordId);
    const hasComboSale = Boolean(comboSale);
    const isComboMember = Number(o.isComboLive || 0) === 1;
    const hasCombo = hasComboSale || isComboMember;
    const comboPackageName = comboSale?.comboPackageName || (isComboMember ? 'Combo Live Wings' : undefined);
    const comboPrice = comboSale?.comboPrice || (isComboMember ? 1200000 : undefined);
    const tipAmount = tipMap.get(ordId) || 0;
    const hasTip = tipAmount > 0;
    const customerPraiseNote = customerPraiseMap.get(ordId) || null;
    const hasPraise = Boolean(customerPraiseNote);

    let changeResult = `Done ${prevDone} → ${newDone}`;
    if (hasPraise && hasTip) {
      changeResult = `Done · Khen & Tip ${tipAmount.toLocaleString('vi-VN')}đ`;
    } else if (hasPraise) {
      changeResult = `Done · Khách gửi lời khen`;
    } else if (hasComboSale && hasTip) {
      changeResult = `Done · Chốt Combo + Tip ${tipAmount.toLocaleString('vi-VN')}đ`;
    } else if (hasComboSale) {
      changeResult = `Done · Chốt ${comboPackageName}`;
    } else if (isComboMember && hasTip) {
      changeResult = `Done · Combo Live + Tip ${tipAmount.toLocaleString('vi-VN')}đ`;
    } else if (isComboMember) {
      changeResult = `Done · Chốt Combo Live`;
    } else if (hasTip) {
      changeResult = `Done · Tip ${tipAmount.toLocaleString('vi-VN')}đ`;
    }

    const osDetails = orderServiceDetailsMap.get(ordId);
    const cvStaffName = osDetails?.cvStaffId ? staffNameMap.get(osDetails.cvStaffId) || null : null;
    const ccStaffName = osDetails?.ccStaffId ? staffNameMap.get(osDetails.ccStaffId) || null : null;
    const cust = customerInfoMap.get(Number(o.customerId));
    const customerName = cust?.fullName || 'Khách yêu';

    return {
      id: `done-${o.id}`,
      type: 'DONE' as const,
      staffId: bookerId,
      staffName:
        staffNameMap.get(bookerId) || allStaffCandidates.find((c) => c.legacyStaffId === bookerId)?.name || 'Telesales',
      avatarUrl: staffAvatarMap.get(bookerId) || null,
      timestamp,
      orderId: ordId,
      changeResult,
      hasCombo,
      comboPackageName,
      comboPrice,
      hasTip,
      tipAmount,
      customerPraiseNote,
      customerName,
      assignedStaffName: cvStaffName,
      checkInStaffName: ccStaffName,
    };
  });

  const todayLiveEvents: TelesaleTodayLiveEvent[] = [...bookEvents, ...checkinEvents, ...doneEvents].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Build todayBookList
  const todayBookList: TelesaleTodayBookItem[] = [...todayBookOrders]
    .filter((o) => o && o.id)
    .sort((a, b) => {
      const timeA = new Date(parseVietnamDateToIso(a.dateCreated || 0)).getTime();
      const timeB = new Date(parseVietnamDateToIso(b.dateCreated || 0)).getTime();
      return timeB - timeA; // Mới nhất lên đầu
    })
    .map((o) => {
      const cust = customerInfoMap.get(Number(o.customerId));
      const bookerId = Number(o.bookerId);
      const bookerName =
        staffNameMap.get(bookerId) || allStaffCandidates.find((c) => c.legacyStaffId === bookerId)?.name || 'Telesales';
      const bookerAvatar = staffAvatarMap.get(bookerId) || null;
      return {
        orderId: Number(o.id),
        customerName: cust?.fullName || 'Khách hàng',
        customerPhone: maskPhoneNumber(cust?.phone),
        customerAvatar: cust?.avatar || null,
        bookerId,
        bookerName,
        bookerAvatar,
        bookingDateStart: parseVietnamDateToIso(o.bookingDateStart || o.dateCreated),
        bookingDateDisplay: formatBookingDateDisplay(o.bookingDateStart || o.dateCreated),
        promotionName: resolvePromotionName(o.promotionId, o.bookingNote),
        dateCreated: parseVietnamDateToIso(o.dateCreated),
        timeAgoText: formatTimeAgo(o.dateCreated),
        isNewCustomer: Boolean(o.isNew),
      };
    });

  // Build todayCheckinList
  const todayCheckinList: TelesaleTodayCheckinItem[] = [...todayCheckinOrders]
    .filter((o) => o && o.id)
    .map((o) => {
      const ordId = Number(o.id);
      const cust = customerInfoMap.get(Number(o.customerId));
      const bookerId = Number(o.bookerId);
      const bookerName =
        staffNameMap.get(bookerId) || allStaffCandidates.find((c) => c.legacyStaffId === bookerId)?.name || 'Telesales';
      const bookerAvatar = staffAvatarMap.get(bookerId) || null;
      const osDetails = orderServiceDetailsMap.get(ordId);
      const cvStaffName = osDetails?.cvStaffId ? staffNameMap.get(osDetails.cvStaffId) || null : null;
      const cvStaffAvatar = osDetails?.cvStaffId ? staffAvatarMap.get(osDetails.cvStaffId) || null : null;
      const ccStaffName = osDetails?.ccStaffId ? staffNameMap.get(osDetails.ccStaffId) || null : null;

      const isDone = o.orderState === 'Completed';
      const comboSale = comboSaleMap.get(ordId);
      const hasComboSale = Boolean(comboSale);
      const isComboMember = Number(o.isComboLive || 0) === 1;
      const hasCombo = hasComboSale || isComboMember;
      const comboPackageName = comboSale?.comboPackageName || (isComboMember ? 'Combo Live Wings' : null);
      const comboPrice = comboSale?.comboPrice || (isComboMember ? 1200000 : undefined);
      const tipAmount = tipMap.get(ordId) || 0;
      const hasTip = tipAmount > 0;

      const checkinTimestamp = parseVietnamDateToIso(o.checkinDate || o.actualBookingDateStart || o.bookingDateStart);
      let checkinTimeDisplay = '08:00';
      try {
        const cd = new Date(checkinTimestamp);
        checkinTimeDisplay = `${String(cd.getHours()).padStart(2, '0')}:${String(cd.getMinutes()).padStart(2, '0')}`;
      } catch {
        // ignore parsing errors and use fallback
      }

      return {
        orderId: ordId,
        customerName: cust?.fullName || 'Khách hàng',
        customerPhone: maskPhoneNumber(cust?.phone),
        customerAvatar: cust?.avatar || null,
        bookerId,
        bookerName,
        bookerAvatar,
        checkinDate: checkinTimestamp,
        checkinDateDisplay: checkinTimeDisplay,
        serviceName: osDetails?.serviceName || 'Nối mi thiết kế',
        assignedStaffName: cvStaffName,
        assignedStaffAvatar: cvStaffAvatar,
        checkInStaffName: ccStaffName,
        orderState: o.orderState || 'In-Progress',
        isDone,
        hasCombo,
        comboPackageName,
        comboPrice,
        hasTip,
        tipAmount: hasTip ? tipAmount : undefined,
        customerPraiseNote: customerPraiseMap.get(ordId) || null,
        timeInService: formatTimeInService(
          o.actualBookingDateStart || o.checkinDate,
          o.actualBookingDateEnd || o.doneDate,
          isDone
        ),
      };
    })
    .sort((a, b) => {
      // Priority: Done with Praise/Combo/Tip (1000) > Just Done (800) > In-Progress (500)
      const isSuperA = a.isDone && (a.hasCombo || a.hasTip || Boolean(a.customerPraiseNote));
      const scoreA = isSuperA ? 1000 : a.isDone ? 800 : 500;
      const isSuperB = b.isDone && (b.hasCombo || b.hasTip || Boolean(b.customerPraiseNote));
      const scoreB = isSuperB ? 1000 : b.isDone ? 800 : 500;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return new Date(b.checkinDate).getTime() - new Date(a.checkinDate).getTime();
    });

  return { todayLiveEvents, todayBookList, todayCheckinList };
}
