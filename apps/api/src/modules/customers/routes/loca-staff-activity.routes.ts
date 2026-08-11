import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { SafeAny, LocaStaffActivityStats, LocaStaffActivityLogItem } from '@mos-lab/shared';

function getPresetDateBounds(
  datePreset?: string,
  startDateStr?: string,
  endDateStr?: string
): { startStr: string; endStr: string; startDateVal: Date; endDateVal: Date } {
  const now = new Date();

  if (datePreset === 'month') {
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const lastDayNum = new Date(yyyy, now.getMonth() + 1, 0).getDate();
    const startStr = `${yyyy}-${mm}-01 00:00:00`;
    const endStr = `${yyyy}-${mm}-${String(lastDayNum).padStart(2, '0')} 23:59:59`;

    const startDateVal = new Date(`${yyyy}-${mm}-01T00:00:00.000Z`);
    const endDateVal = new Date(`${yyyy}-${mm}-${String(lastDayNum).padStart(2, '0')}T23:59:59.999Z`);
    return { startStr, endStr, startDateVal, endDateVal };
  }

  if (datePreset === 'week') {
    // Rule #22: Monday-First ISO Week
    const day = now.getDay(); // 0 is Sunday, 1 is Monday...
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const yStart = monday.getFullYear();
    const mStart = String(monday.getMonth() + 1).padStart(2, '0');
    const dStart = String(monday.getDate()).padStart(2, '0');

    const yEnd = sunday.getFullYear();
    const mEnd = String(sunday.getMonth() + 1).padStart(2, '0');
    const dEnd = String(sunday.getDate()).padStart(2, '0');

    const startStr = `${yStart}-${mStart}-${dStart} 00:00:00`;
    const endStr = `${yEnd}-${mEnd}-${dEnd} 23:59:59`;

    const startDateVal = new Date(`${yStart}-${mStart}-${dStart}T00:00:00.000Z`);
    const endDateVal = new Date(`${yEnd}-${mEnd}-${dEnd}T23:59:59.999Z`);
    return { startStr, endStr, startDateVal, endDateVal };
  }

  if (datePreset === 'custom' && startDateStr && endDateStr) {
    const s = startDateStr.slice(0, 10);
    const e = endDateStr.slice(0, 10);
    const startStr = `${s} 00:00:00`;
    const endStr = `${e} 23:59:59`;

    const startDateVal = new Date(`${s}T00:00:00.000Z`);
    const endDateVal = new Date(`${e}T23:59:59.999Z`);
    return { startStr, endStr, startDateVal, endDateVal };
  }

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const startStr = `${yyyy}-${mm}-${dd} 00:00:00`;
  const endStr = `${yyyy}-${mm}-${dd} 23:59:59`;

  const startDateVal = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
  const endDateVal = new Date(`${yyyy}-${mm}-${dd}T23:59:59.999Z`);
  return { startStr, endStr, startDateVal, endDateVal };
}

function formatDateDisplay(d: Date | string | null | undefined): string {
  if (!d) return 'Chưa có ngày';
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return 'Chưa có ngày';
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const yyyy = dateObj.getFullYear();
  const hh = String(dateObj.getHours()).padStart(2, '0');
  const min = String(dateObj.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function formatAvatarUrl(avatar?: string | null, userId?: number): string | null {
  if (!avatar) return null;
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar;
  return `https://cdn.wingslashes.com/uploads/user/avatar/${userId}/thumbnail/${avatar}`;
}

export async function registerLocaStaffActivityRoutes(fastify: FastifyInstance) {
  // GET /api/customers/loca-staff-activity
  fastify.get('/customers/loca-staff-activity', { preHandler: [requireAuth] }, async (request, reply) => {
    const query = request.query as {
      staffId?: string;
      datePreset?: 'today' | 'week' | 'month' | 'custom';
      startDate?: string;
      endDate?: string;
      page?: string;
      pageSize?: string;
      actionType?: string;
      touchpointKey?: string;
      search?: string;
    };

    const targetStaffId = query.staffId && query.staffId !== 'ALL' ? parseInt(query.staffId, 10) : null;
    const datePreset = query.datePreset || 'month';
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const pageSize = Math.max(1, parseInt(query.pageSize || '20', 10));
    const actionTypeFilter = query.actionType || 'ALL';
    const touchpointKeyFilter = (query.touchpointKey || 'ALL').trim();
    const searchStr = (query.search || '').trim().toLowerCase();

    const { startStr, endStr, startDateVal, endDateVal } = getPresetDateBounds(
      datePreset,
      query.startDate,
      query.endDate
    );

    try {
      // Fetch Staff Names from CRM Staff table
      const staffList = await fastify.prisma.crm.crmStaff.findMany({
        select: { id: true, displayName: true, username: true, legacyStaffId: true },
      });
      const staffMap = new Map<number, string>();
      staffList.forEach((s) => {
        const name = s.displayName || s.username || `NV #${s.id}`;
        staffMap.set(s.id, name);
        if (s.legacyStaffId) {
          staffMap.set(s.legacyStaffId, name);
        }
      });

      let legacyStaffId = targetStaffId;
      if (targetStaffId) {
        const s = staffList.find((x) => x.id === targetStaffId);
        if (s && s.legacyStaffId) legacyStaffId = s.legacyStaffId;
      }

      // 1. Fetch Call Logs from crm.crmCallLog
      const callWhereClause: SafeAny = {
        createdAt: {
          gte: startDateVal,
          lte: endDateVal,
        },
      };
      if (targetStaffId) {
        callWhereClause.OR = [{ staffId: targetStaffId }, ...(legacyStaffId ? [{ staffId: legacyStaffId }] : [])];
      }

      const callLogs = await fastify.prisma.crm.crmCallLog.findMany({
        where: callWhereClause,
        orderBy: { createdAt: 'desc' },
      });

      // 2. Fetch Touchpoint Logs from crm.crmLocaTouchpoint
      const touchpointWhereClause: SafeAny = {
        AND: [
          {
            OR: [
              { checkedAt: { gte: startDateVal, lte: endDateVal }, isChecked: true },
              { createdAt: { gte: startDateVal, lte: endDateVal }, isChecked: true },
            ],
          },
        ],
      };
      if (targetStaffId) {
        touchpointWhereClause.AND.push({
          OR: [{ checkedByStaffId: targetStaffId }, ...(legacyStaffId ? [{ checkedByStaffId: legacyStaffId }] : [])],
        });
      }

      const touchpointLogs = await fastify.prisma.crm.crmLocaTouchpoint.findMany({
        where: touchpointWhereClause,
        orderBy: { checkedAt: 'desc' },
      });

      // Gather legacyUserIds for name/phone/avatar lookup
      const userIdsSet = new Set<number>();
      callLogs.forEach((c) => userIdsSet.add(c.legacyUserId));
      touchpointLogs.forEach((t) => userIdsSet.add(t.legacyUserId));

      // Fetch Booked Orders created STRICTLY BY the selected staff member
      let orderSql = `
        SELECT o.id, o.user_id as legacyUserId, o.created_staff_id as staffId, o.date_created as dateCreated, 
               o.booking_date_start as bookingDateStart, 
               up.full_name as customerName, up.avatar as customerAvatar, uc.phone_number as customerPhone,
               st.full_name as bookerName
        FROM \`order\` o
        LEFT JOIN user_profile up ON o.user_id = up.user_id
        LEFT JOIN (
          SELECT user_id, MIN(phone_number) as phone_number 
          FROM user_contact 
          WHERE is_disabled = 0 
          GROUP BY user_id
        ) uc ON o.user_id = uc.user_id
        LEFT JOIN user_profile st ON o.created_staff_id = st.user_id
        WHERE o.date_created >= ? AND o.date_created <= ?
      `;
      const sqlParams: SafeAny[] = [startStr, endStr];
      if (legacyStaffId) {
        if (targetStaffId && targetStaffId !== legacyStaffId) {
          orderSql += ` AND (o.created_staff_id = ? OR o.created_staff_id = ?)`;
          sqlParams.push(legacyStaffId, targetStaffId);
        } else {
          orderSql += ` AND o.created_staff_id = ?`;
          sqlParams.push(legacyStaffId);
        }
      }
      orderSql += ` ORDER BY o.date_created DESC LIMIT 500`;

      const bookedOrders = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(orderSql, ...sqlParams);
      bookedOrders.forEach((b) => userIdsSet.add(Number(b.legacyUserId)));

      // Fetch customer names, phones, and avatars for call & touchpoint logs
      const userIdsArr = Array.from(userIdsSet).filter(Boolean);
      const customerMap = new Map<number, { name: string; phone: string; avatar: string | null }>();
      if (userIdsArr.length > 0) {
        const usersSql = `
          SELECT up.user_id as id, up.full_name as name, up.avatar as avatar, uc.phone_number as phone 
          FROM user_profile up
          LEFT JOIN (
            SELECT user_id, MIN(phone_number) as phone_number 
            FROM user_contact 
            WHERE is_disabled = 0 
            GROUP BY user_id
          ) uc ON up.user_id = uc.user_id
          WHERE up.user_id IN (${userIdsArr.join(',')})
        `;
        const users = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(usersSql);
        users.forEach((u) => {
          customerMap.set(Number(u.id), {
            name: u.name || `Khách hàng #${u.id}`,
            phone: u.phone || '-',
            avatar: formatAvatarUrl(u.avatar, Number(u.id)),
          });
        });
      }

      // Build Unified Log Feed
      const logsFeed: LocaStaffActivityLogItem[] = [];

      // Add Calls
      callLogs.forEach((c) => {
        const sName = staffMap.get(c.staffId) || `NV #${c.staffId}`;
        const cust = customerMap.get(c.legacyUserId) || {
          name: `Khách hàng #${c.legacyUserId}`,
          phone: '-',
          avatar: null,
        };
        const durationText =
          c.durationSec && c.durationSec > 0 ? `${Math.floor(c.durationSec / 60)}m ${c.durationSec % 60}s` : '0s';
        const isAnswered = c.callResult === 'ANSWERED' || (c.durationSec && c.durationSec > 0);

        logsFeed.push({
          id: `CALL_${c.id}`,
          timestamp: c.createdAt.toISOString(),
          staffId: c.staffId,
          staffName: sName,
          legacyUserId: c.legacyUserId,
          customerName: cust.name,
          customerPhone: cust.phone,
          customerAvatar: cust.avatar,
          actionType: 'CALL',
          actionTitle: `Cuộc gọi OmiCall (${c.callType || 'GỌI RA'})`,
          actionDetail: `Kết quả: ${c.callResult || 'KHÔNG BẮT MÁY'} (${durationText})${c.note ? ` - Ghi chú: ${c.note}` : ''}`,
          badgeColor: isAnswered ? '#10B981' : '#EF4444',
          callResult: c.callResult || 'NO_ANSWER',
          durationSec: c.durationSec || 0,
          recordingUrl: c.callUuid ? `https://omicall.com/recording/${c.callUuid}` : null,
        });
      });

      // Add Touchpoints
      touchpointLogs.forEach((t) => {
        const sName = t.checkedByStaffName || staffMap.get(t.checkedByStaffId || 0) || 'Nhân viên CSKH';
        const cust = customerMap.get(t.legacyUserId) || {
          name: `Khách hàng #${t.legacyUserId}`,
          phone: '-',
          avatar: null,
        };
        const tpLabel = `Mốc Chạm ${t.touchpointKey}`;
        const statusStr = t.status ? ` - Trạng thái: ${t.status}` : '';

        logsFeed.push({
          id: `TP_${t.id}`,
          timestamp: (t.checkedAt || t.createdAt).toISOString(),
          staffId: t.checkedByStaffId || 0,
          staffName: sName,
          legacyUserId: t.legacyUserId,
          customerName: cust.name,
          customerPhone: cust.phone,
          customerAvatar: cust.avatar,
          actionType: 'TOUCHPOINT',
          actionTitle: `Đánh dấu Điểm chạm CSKH (${tpLabel})`,
          actionDetail: `Hoàn thành điểm chạm LoCa ${tpLabel}${statusStr}${t.note ? ` - Ghi chú: ${t.note}` : ''}`,
          badgeColor: '#3B82F6',
          touchpointKey: t.touchpointKey,
        });
      });

      // Add Booked Orders
      bookedOrders.forEach((b) => {
        const sName = b.bookerName || staffMap.get(Number(b.staffId)) || 'Nhân viên';
        const cust = customerMap.get(Number(b.legacyUserId));
        const custName = b.customerName || cust?.name || `Khách hàng #${b.legacyUserId}`;
        const custPhone = b.customerPhone || cust?.phone || '-';
        const custAvatar = formatAvatarUrl(b.customerAvatar, Number(b.legacyUserId)) || cust?.avatar || null;
        const bDateStr = formatDateDisplay(b.bookingDateStart);

        logsFeed.push({
          id: `BOOKED_${b.id}`,
          timestamp: new Date(b.dateCreated).toISOString(),
          staffId: Number(b.staffId || 0),
          staffName: sName,
          legacyUserId: Number(b.legacyUserId),
          customerName: custName,
          customerPhone: custPhone,
          customerAvatar: custAvatar,
          actionType: 'BOOKED',
          actionTitle: `Đặt lịch hẹn thành công (Đơn #${b.id})`,
          actionDetail: `Khách hẹn ngày: ${bDateStr}`,
          badgeColor: '#8B5CF6',
          bookingDate: bDateStr,
          orderId: Number(b.id),
        });
      });

      // Sort logsFeed chronologically descending
      logsFeed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Filter by actionType and search string
      let filteredFeed = logsFeed;

      // Strict staff filtering when targetStaffId is selected
      if (targetStaffId) {
        const allowedStaffIds = new Set([targetStaffId, ...(legacyStaffId ? [legacyStaffId] : [])]);
        filteredFeed = filteredFeed.filter((item) => allowedStaffIds.has(item.staffId));
      }

      if (actionTypeFilter !== 'ALL') {
        filteredFeed = filteredFeed.filter((item) => item.actionType === actionTypeFilter);
      }
      if (touchpointKeyFilter !== 'ALL') {
        filteredFeed = filteredFeed.filter((item) => item.touchpointKey === touchpointKeyFilter);
      }
      if (searchStr) {
        filteredFeed = filteredFeed.filter(
          (item) =>
            item.customerName.toLowerCase().includes(searchStr) ||
            item.customerPhone.includes(searchStr) ||
            item.staffName.toLowerCase().includes(searchStr) ||
            item.actionDetail.toLowerCase().includes(searchStr)
        );
      }

      // Compute Aggregate Statistics
      const totalCalls = callLogs.length;
      const answeredCalls = callLogs.filter(
        (c) => c.callResult === 'ANSWERED' || (c.durationSec && c.durationSec > 0)
      ).length;
      const answerRate = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0;
      const totalTouchpointsChecked = touchpointLogs.length;
      const totalBooked = bookedOrders.length;

      const totalDurationSec = callLogs.reduce((acc, c) => acc + (c.durationSec || 0), 0);
      const hours = Math.floor(totalDurationSec / 3600);
      const minutes = Math.floor((totalDurationSec % 3600) / 60);
      const seconds = totalDurationSec % 60;
      const formattedDuration =
        hours > 0
          ? `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`
          : `${minutes}m ${seconds.toString().padStart(2, '0')}s`;

      const touchpointBreakdown: Record<string, number> = {
        '24h': 0,
        '17': 0,
        '19': 0,
        '21': 0,
        '23': 0,
        '25': 0,
        '30': 0,
        '30plus': 0,
      };
      touchpointLogs.forEach((t) => {
        const k = t.touchpointKey;
        if (k) {
          touchpointBreakdown[k] = (touchpointBreakdown[k] || 0) + 1;
        }
      });

      const callToAnswer = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0;
      const answerToTouchpoint = answeredCalls > 0 ? Math.round((totalTouchpointsChecked / answeredCalls) * 100) : 0;
      const touchpointToBooked =
        totalTouchpointsChecked > 0 ? Math.round((totalBooked / totalTouchpointsChecked) * 100) : 0;
      const overallConversion = totalCalls > 0 ? Math.round((totalBooked / totalCalls) * 100) : 0;

      const stats: LocaStaffActivityStats = {
        totalCalls,
        answeredCalls,
        answerRate,
        totalTouchpointsChecked,
        totalBooked,
        totalDurationSec,
        formattedDuration,
        touchpointBreakdown,
        conversionRates: {
          callToAnswer,
          answerToTouchpoint,
          touchpointToBooked,
          overallConversion,
        },
      };

      // Pagination
      const totalLogs = filteredFeed.length;
      const startIndex = (page - 1) * pageSize;
      const paginatedLogs = filteredFeed.slice(startIndex, startIndex + pageSize);

      return reply.send({
        stats,
        logs: paginatedLogs,
        pagination: {
          total: totalLogs,
          page,
          pageSize,
          totalPages: Math.ceil(totalLogs / pageSize) || 1,
        },
      });
    } catch (error: SafeAny) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'InternalServerError',
        message: error.message || 'Lỗi hệ thống khi tải báo cáo hoạt động nhân viên LoCa.',
      });
    }
  });
}
