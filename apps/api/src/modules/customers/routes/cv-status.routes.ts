import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { SafeAny } from '@mos-lab/shared';
import { CvAttendanceService } from '../services/cv-attendance.service.js';
import { TeamService } from '../../teams/team.service.js';
import { LashBenchmarkService, parseLashSpecs } from '../../catalog/services/lash-benchmark.service.js';

export async function registerCvStatusRoutes(fastify: FastifyInstance) {
  // GET /api/customers/cv-schedule-roster
  // Central roster/OFF snapshot shared with the Today dashboard.
  fastify.get('/customers/cv-schedule-roster', { preHandler: [requireAuth] }, async (request, reply) => {
    const { date } = request.query as { date?: string };
    const nowIct = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const targetDate = date || nowIct.toISOString().slice(0, 10);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'date phải có định dạng YYYY-MM-DD.',
      });
    }

    try {
      const attendance = await CvAttendanceService.getDailyCvAttendance(fastify, targetDate);
      const branchForStore = (storeId: number) => {
        if (storeId === 16) return { branchName: 'Estella Place', branchCode: 'EP' };
        if (storeId === 2) return { branchName: 'PXL', branchCode: 'PXL' };
        return { branchName: 'Đề Thám', branchCode: 'DT' };
      };

      const workingStaffList = attendance
        .filter((staff) => !staff.isOff)
        .map((staff) => ({
          id: staff.id,
          name: staff.name,
          avatarUrl: staff.avatarUrl,
          ...branchForStore(staff.storeId),
          shift: staff.shift === 'off' ? 'full' : staff.shift,
          attendance: staff.attendance,
          bookedCount: staff.bookedCount,
          doneCount: staff.doneCount,
        }));
      const offStaffList = attendance
        .filter((staff) => staff.isOff)
        .map((staff) => ({
          id: staff.id,
          name: staff.name,
          avatarUrl: staff.avatarUrl,
          ...branchForStore(staff.storeId),
          reason: staff.offReason || 'Nghỉ phép',
          type: staff.offType || undefined,
        }));

      return {
        date: targetDate,
        workingKtvCount: workingStaffList.length,
        maxCapacity: workingStaffList.length * 5,
        workingStaffList,
        offStaffList,
      };
    } catch (error: SafeAny) {
      fastify.log.error(error, 'CV schedule roster error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: error?.message || 'Không thể tải roster CV theo lịch.',
      });
    }
  });

  // In-memory TTL cache for CV 90-day average speed (P4 Optimization: 5-minute TTL)
  const cvSpeedCache = new Map<string, { data: SafeAny[]; timestamp: number }>();

  // GET /api/customers/cv-realtime-status
  // Real-time CV availability status from legacy order_state + order_staff_queue.
  fastify.get('/customers/cv-realtime-status', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const now = new Date();
      const tzOffset = 7 * 60 * 60 * 1000; // ICT UTC+7
      const nowICT = new Date(now.getTime() + tzOffset);
      const todayStr = nowICT.toISOString().split('T')[0];
      const todayStart = `${todayStr} 00:00:00`;
      const todayEnd = `${todayStr} 23:59:59`;

      // 1. Get active CV staff IDs
      const cvStaffIds = await TeamService.getActiveStaffIdsWithFallback(fastify, 'CV', 'ACTIVE_CV_STAFF_CONFIG');
      if (cvStaffIds.length === 0) {
        return { staffStatuses: [], queueByStore: {}, timestamp: nowICT.toISOString() };
      }

      // 2. Query Day-Offs and Weekly-Offs today to exclude OFF staff
      const dayOffs = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT from_user_id FROM staff_day_off WHERE ? BETWEEN from_date AND COALESCE(to_date, from_date) AND request_state = 'Approved'`,
        todayStr
      );
      const offStaffUserIds = new Set(dayOffs.map((d) => Number(d.from_user_id)));

      const weekdayNumber = new Date(todayStr).getDay();
      const legacyWeekday = weekdayNumber === 0 ? 7 : weekdayNumber;
      const schedules = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT user_id, type, type_value FROM staff_working_shift_schedule WHERE is_disabled = 0 AND user_id IN (${cvStaffIds.join(',')})`
      );
      cvStaffIds.forEach((id) => {
        const staffScheds = schedules.filter((s) => Number(s.user_id) === id);
        if (staffScheds.length > 0) {
          const isWeeklyOff = staffScheds.some((s) => s.type === 'WeeklyOff' && Number(s.type_value) === legacyWeekday);
          if (isWeeklyOff) offStaffUserIds.add(id);
        }
      });

      const activeDutyStaffIds = cvStaffIds.filter((id) => !offStaffUserIds.has(id));

      // 3. Query today's staff shift check-in status from staff_working_shift
      // (Only include CVs who HAVE checked in AND HAVE NOT checked out today)
      const checkedInShiftRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `
        SELECT DISTINCT user_id as staffId
        FROM staff_working_shift
        WHERE date = ?
          AND check_in_staff_task_id IS NOT NULL
          AND check_out_staff_task_id IS NULL
      `,
        todayStr
      );
      const checkedInStaffIds = new Set(checkedInShiftRows.map((r: SafeAny) => Number(r.staffId)));
      const checkedInCvStaffIds = activeDutyStaffIds.filter((id: number) => checkedInStaffIds.has(id));
      const effectiveCvStaffIds = checkedInCvStaffIds.length > 0 ? checkedInCvStaffIds : activeDutyStaffIds;

      const { countOnly } = (request.query || {}) as { countOnly?: string | boolean };
      if (countOnly === 'true' || countOnly === true) {
        return {
          workingCvCount: effectiveCvStaffIds.length,
          offCvCount: offStaffUserIds.size,
          staffStatuses: [],
          queueByStore: {},
          timestamp: nowICT.toISOString(),
        };
      }

      // 3. Query today's queue from order_staff_queue for working CV staff IDs
      const queueRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `
        SELECT osq.id as queueId, osq.client_store_id as storeId, osq.user_id as staffId,
               osq.order_id as orderId, osq.position, osq.date_assigned as dateAssigned,
               osq.date_skipped as dateSkipped, osq.date_created as dateCreated
        FROM order_staff_queue osq
        WHERE osq.date_created >= ?
          AND osq.user_id IN (${effectiveCvStaffIds.join(',')})
        ORDER BY osq.client_store_id ASC, osq.position ASC
      `,
        todayStart
      );

      const allStaffIds = effectiveCvStaffIds;

      // Current ICT local time string ("YYYY-MM-DD HH:mm:ss")
      const nowICTStr = nowICT.toISOString().replace('T', ' ').slice(0, 19);

      // 4. Get CV profiles with avatar from legacy user_profile + CRM staff fallback
      const cvProfiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT user_id, full_name, avatar, client_store_id
        FROM user_profile
        WHERE user_id IN (${allStaffIds.join(',')})
      `);

      const crmStaffList = await fastify.prisma.crm.crmStaff.findMany({
        where: { id: { in: allStaffIds } },
        select: { id: true, displayName: true, avatarUrl: true },
      });
      const crmStaffMap = new Map(crmStaffList.map((s: SafeAny) => [s.id, s]));

      const profileMap = new Map<number, { name: string; avatar: string | null; storeId: number }>();
      allStaffIds.forEach((sid) => {
        const p = cvProfiles.find((row: SafeAny) => Number(row.user_id) === sid);
        const crmS = crmStaffMap.get(sid);
        const name =
          (p?.full_name ? String(p.full_name).trim() : '') ||
          (crmS?.displayName ? String(crmS.displayName).trim() : '') ||
          `CV #${sid}`;
        const avatar = (p?.avatar ? String(p.avatar) : null) || crmS?.avatarUrl || null;
        const storeId = Number(p?.client_store_id || 6);
        profileMap.set(sid, { name, avatar, storeId });
      });

      // 5. Query real-time orders for today — format DATETIME as ICT string to avoid timezone parsing mismatch
      // Includes service_key + service_name for benchmark ETA & customerId for history lookup
      const orderRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `
        SELECT
          o.id as orderId,
          o.order_state as orderState,
          DATE_FORMAT(o.booking_date_start, '%Y-%m-%d %H:%i:%s') as bookStartStr,
          DATE_FORMAT(o.booking_date_end, '%Y-%m-%d %H:%i:%s') as bookEndStr,
          COALESCE(os.assigned_staff_id, os.booked_staff_id, osq.user_id) as ktvId,
          cust_up.full_name as customerName,
          o.user_id as customerId,
          s.service_key as serviceKey,
          COALESCE(sl.service_name, s.service_key) as serviceName,
          s.service_type as serviceType
        FROM \`order\` o
        LEFT JOIN order_service os ON o.id = os.order_id
        LEFT JOIN service s ON os.service_id = s.id
        LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
        LEFT JOIN order_staff_queue osq ON osq.order_id = o.id AND osq.date_assigned IS NOT NULL
        LEFT JOIN user_profile cust_up ON o.user_id = cust_up.user_id
        WHERE o.booking_date_start >= ? AND o.booking_date_start <= ?
          AND o.order_state NOT IN ('Cancelled', 'Missed')
          AND (os.assigned_staff_id IN (${allStaffIds.join(',')}) OR os.booked_staff_id IN (${allStaffIds.join(',')}) OR osq.user_id IN (${allStaffIds.join(',')}))
        ORDER BY o.booking_date_start DESC
      `,
        todayStart,
        todayEnd
      );

      // Query real store bookings today (sorted by booking_date_start ASC)
      const upcomingStoreOrders = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `
        SELECT
          o.id as orderId,
          o.client_store_id as storeId,
          o.order_state as orderState,
          DATE_FORMAT(o.booking_date_start, '%Y-%m-%d %H:%i:%s') as bookStartStr,
          cust_up.full_name as customerName
        FROM \`order\` o
        LEFT JOIN user_profile cust_up ON o.user_id = cust_up.user_id
        WHERE o.booking_date_start >= ? AND o.booking_date_start <= ?
          AND o.order_state IN ('New', 'Confirmed')
        ORDER BY o.booking_date_start ASC
      `,
        todayStart,
        todayEnd
      );

      // Query average actual lash extension speed for effectiveCvStaffIds (with 5-minute TTL cache)
      const sortedStaffKey = [...effectiveCvStaffIds].sort((a, b) => a - b).join(',');
      const cachedSpeed = cvSpeedCache.get(sortedStaffKey);
      let speedRows: SafeAny[];

      if (cachedSpeed && Date.now() - cachedSpeed.timestamp < 5 * 60 * 1000) {
        speedRows = cachedSpeed.data;
      } else {
        speedRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          WITH eligible_orders AS (
            SELECT o.id AS order_id
            FROM report_order ro
            JOIN \`order\` o ON o.id = ro.order_id
            WHERE o.order_state = 'Completed'
              AND ro.actual_booking_date_start >= DATE_SUB(NOW(), INTERVAL 90 DAY)
            UNION ALL
            SELECT o.id AS order_id
            FROM \`order\` o
            LEFT JOIN report_order ro ON ro.order_id = o.id
            WHERE o.order_state = 'Completed'
              AND ro.actual_booking_date_start IS NULL
              AND o.booking_date_start >= DATE_SUB(NOW(), INTERVAL 90 DAY)
          )
          SELECT
            os.assigned_staff_id as staff_id,
            s.service_type,
            ROUND(AVG(
              COALESCE(ros.preparation_minute, 0) +
              COALESCE(ros.pre_servicing_minute, 0) +
              COALESCE(ros.cleaning_minute, 0) +
              COALESCE(ros.servicing_minute, 0)
            )) as avg_min
          FROM eligible_orders eo
          JOIN order_service os ON eo.order_id = os.order_id
          JOIN service s ON os.service_id = s.id
          JOIN report_order_service ros ON os.id = ros.order_service_id
          WHERE s.service_group IN ('Lashes', 'LashesTop', 'LashesUnder')
            AND os.assigned_staff_id IN (${effectiveCvStaffIds.join(',')})
            AND (COALESCE(ros.preparation_minute, 0) +
                 COALESCE(ros.pre_servicing_minute, 0) +
                 COALESCE(ros.cleaning_minute, 0) +
                 COALESCE(ros.servicing_minute, 0)) BETWEEN 15 AND 200
          GROUP BY os.assigned_staff_id, s.service_type
        `);
        cvSpeedCache.set(sortedStaffKey, { data: speedRows, timestamp: Date.now() });
      }

      const staffSpeedMap = new Map<
        number,
        { normalAvg?: number; retainAvg?: number; removalAvg?: number; overallAvg?: number }
      >();
      speedRows.forEach((r) => {
        const sid = Number(r.staff_id);
        const stype = String(r.service_type || '');
        const avgVal = Math.round(Number(r.avg_min || 0));

        if (!staffSpeedMap.has(sid)) staffSpeedMap.set(sid, {});
        const item = staffSpeedMap.get(sid)!;

        if (stype === 'Normal') item.normalAvg = avgVal;
        else if (stype === 'Retain') item.retainAvg = avgVal;
        else if (stype === 'Removal' || stype === 'Fix') item.removalAvg = avgVal;
      });

      // 6. Build per-CV status with accurate time-slot & order_state recognition
      const staffStatuses = effectiveCvStaffIds
        .map((staffId: number) => {
          const profile = profileMap.get(staffId);
          if (!profile) return null;

          const staffOrders = orderRows.filter((r: SafeAny) => Number(r.ktvId) === staffId);

          let liveStatus = 'IDLE';
          let liveLabel = 'Đang rảnh';
          let currentOrderId = null;
          let currentOrderState = null;
          let currentCustomerName = null;
          let bookingDateEnd = null;
          let estimatedEndMinutes = null;

          // Priority 1: Check if there is an order currently running right now in ICT time
          const runningOrder = staffOrders.find((o: SafeAny) => {
            if (!o.bookStartStr || !o.bookEndStr) return false;
            if (o.orderState === 'Completed') return false;
            return nowICTStr >= o.bookStartStr && nowICTStr <= o.bookEndStr;
          });

          // Priority 2: Check for active order states (excluding stale orders ended > 60m ago)
          const ACTIVE_SERVICING_STATES = [
            'ServiceStart',
            'ServiceCleaned',
            'Consultation',
            'Preparation',
            'CheckIn',
            'ServiceEnd',
          ];
          const stateActiveOrder = staffOrders.find((o: SafeAny) => {
            if (!ACTIVE_SERVICING_STATES.includes(o.orderState)) return false;
            if (o.bookEndStr) {
              const endMs = new Date(o.bookEndStr.replace(' ', 'T') + '+07:00').getTime();
              const endMins = Math.round((endMs - now.getTime()) / 60000);
              if (endMins < -60) return false; // Ignore stale orders ended > 60 minutes ago
            }
            return true;
          });

          const activeOrder = runningOrder || stateActiveOrder;

          if (activeOrder) {
            currentOrderId = Number(activeOrder.orderId);
            currentOrderState = activeOrder.orderState;
            currentCustomerName = activeOrder.customerName ? String(activeOrder.customerName).trim() : null;

            if (activeOrder.bookEndStr) {
              const endMs = new Date(activeOrder.bookEndStr.replace(' ', 'T') + '+07:00').getTime();
              bookingDateEnd = new Date(endMs).toISOString();
              estimatedEndMinutes = Math.round((endMs - nowICT.getTime()) / 60000);
            }

            if (activeOrder.orderState === 'ServiceCleaned') {
              liveStatus = 'ENDING_SOON';
              liveLabel = `Đang vệ sinh mi${estimatedEndMinutes != null ? ` (còn ${Math.max(0, estimatedEndMinutes)}p)` : ''}`;
            } else if (activeOrder.orderState === 'Consultation') {
              liveStatus = 'BUSY';
              liveLabel = `Đang tư vấn${currentCustomerName ? ` • ${currentCustomerName}` : ''}`;
            } else if (activeOrder.orderState === 'ServiceEnd') {
              liveStatus = 'ENDING_SOON';
              liveLabel = `Xong nối mi, chụp ảnh After${currentCustomerName ? ` • ${currentCustomerName}` : ''}`;
            } else if (estimatedEndMinutes != null && estimatedEndMinutes < -10) {
              liveStatus = 'OVERTIME';
              liveLabel = `Quá giờ (${Math.abs(estimatedEndMinutes)}p)`;
            } else if (estimatedEndMinutes != null && estimatedEndMinutes <= 15) {
              liveStatus = 'ENDING_SOON';
              liveLabel = `Sắp xong (còn ${Math.max(0, estimatedEndMinutes)}p)${currentCustomerName ? ` • ${currentCustomerName}` : ''}`;
            } else {
              liveStatus = 'BUSY';
              liveLabel = `Đang nối mi${estimatedEndMinutes != null ? ` (còn ${Math.max(0, estimatedEndMinutes)}p)` : ''}${currentCustomerName ? ` • ${currentCustomerName}` : ''}`;
            }
          } else {
            // Check for upcoming bookings today
            const upcomingOrders = staffOrders
              .filter((o: SafeAny) => o.orderState !== 'Completed' && o.bookStartStr && o.bookStartStr > nowICTStr)
              .sort((a: SafeAny, b: SafeAny) => String(a.bookStartStr).localeCompare(String(b.bookStartStr)));

            if (upcomingOrders.length > 0) {
              const nextOrder = upcomingOrders[0];
              const nextStartMs = new Date(nextOrder.bookStartStr.replace(' ', 'T') + '+07:00').getTime();
              const diffMins = Math.round((nextStartMs - now.getTime()) / 60000);

              if (diffMins <= 45) {
                liveStatus = diffMins <= 15 ? 'UPCOMING' : 'LOCKED';
                liveLabel = `Sắp có khách (${Math.max(0, diffMins)}p nữa)`;
                currentCustomerName = nextOrder.customerName ? String(nextOrder.customerName).trim() : null;
                bookingDateEnd = null;
              }
            }
          }

          const storeId = profile.storeId;
          const storeName = storeId === 16 ? 'Estella Place' : 'Đề Thám';

          return {
            staffId,
            name: profile.name,
            avatar: profile.avatar,
            storeId,
            storeName,
            currentOrderId,
            currentOrderState,
            currentCustomerName,
            bookingDateEnd,
            estimatedEndMinutes,
            liveStatus,
            liveLabel,
            avgDurationMinutes: staffSpeedMap.get(staffId),
            etaInfo: null as null | {
              etaMinutes: number;
              elapsedMinutes: number;
              remainingMinutes: number;
              progressPercent: number;
              layer: 1 | 2 | 3;
              confidence: 'high' | 'medium' | 'low';
              lashStyle: string;
              lashCount: number | null;
              source: string;
            },
          };
        })
        .filter(Boolean);

      // ── 7. Batch ETA enrichment for BUSY CVs ──
      try {
        const busyCvEntries: Array<{
          staffId: number;
          customerId: number;
          lashStyle: string;
          serviceType: string;
          lashCount: number | null;
          bookingStartStr: string;
        }> = [];

        for (const ss of staffStatuses) {
          if (!ss || !['BUSY', 'ENDING_SOON', 'OVERTIME'].includes(ss.liveStatus)) continue;
          // Find the active order for this CV
          const activeOrder = orderRows.find(
            (o: SafeAny) => Number(o.ktvId) === ss.staffId && o.orderId === ss.currentOrderId
          );
          if (!activeOrder || !activeOrder.serviceKey) continue;

          const specs = parseLashSpecs(String(activeOrder.serviceKey || ''), String(activeOrder.serviceName || ''));
          if (!specs.lashStyle) continue;

          busyCvEntries.push({
            staffId: ss.staffId,
            customerId: Number(activeOrder.customerId || 0),
            lashStyle: specs.lashStyle,
            serviceType: String(activeOrder.serviceType || 'Normal'),
            lashCount: specs.lashCount,
            bookingStartStr: String(activeOrder.bookStartStr || ''),
          });
        }

        if (busyCvEntries.length > 0) {
          const etaMap = await LashBenchmarkService.batchEstimateETA(fastify, busyCvEntries);

          for (const ss of staffStatuses) {
            if (!ss) continue;
            const eta = etaMap.get(ss.staffId);
            if (!eta) continue;

            // Replace estimatedEndMinutes with benchmark-based remaining
            ss.estimatedEndMinutes = eta.remainingMinutes;

            // Attach etaInfo
            ss.etaInfo = eta;

            // Update liveLabel with benchmark info
            const custLabel = ss.currentCustomerName ? ` • ${ss.currentCustomerName}` : '';
            const styleShort = eta.lashStyle.length > 12 ? eta.lashStyle.slice(0, 12) + '…' : eta.lashStyle;

            if (eta.remainingMinutes < -10) {
              ss.liveStatus = 'OVERTIME';
              ss.liveLabel = `🔴 Quá giờ (${Math.abs(eta.remainingMinutes)}p) • ${styleShort}${custLabel}`;
            } else if (eta.remainingMinutes <= 15) {
              ss.liveStatus = 'ENDING_SOON';
              ss.liveLabel = `⚡ Sắp xong (còn ${Math.max(0, eta.remainingMinutes)}p) • ${styleShort}${custLabel}`;
            } else {
              ss.liveStatus = 'BUSY';
              ss.liveLabel = `🔵 Đang nối (còn ${eta.remainingMinutes}p) • ${styleShort}${custLabel}`;
            }
          }
        }
      } catch (etaErr) {
        fastify.log.warn(etaErr, 'Batch ETA enrichment failed, using booking_date_end fallback');
      }

      // 6. Build queue by store — only include entries that are "waiting" (orderId = null, not skipped)
      const queueByStore: Record<number, SafeAny[]> = {};
      const storeIds = [6, 16]; // Đề Thám, Estella Place

      storeIds.forEach((sid) => {
        // Filter upcoming bookings for this store (exclude past-due bookings late by >30 mins)
        const storeUpcomingBookings = upcomingStoreOrders
          .filter((o: SafeAny) => Number(o.storeId) === sid)
          .filter((o: SafeAny) => {
            const startMs = new Date(o.bookStartStr.replace(' ', 'T') + '+07:00').getTime();
            const diffMins = Math.round((startMs - now.getTime()) / 60000);
            return diffMins >= -30; // Ignore > 30 mins late (considered missed)
          });

        // Get the latest queue entries for this store (only unassigned = waiting in queue)
        const storeQueue = queueRows
          .filter((q: SafeAny) => Number(q.storeId) === sid && !q.orderId && !q.dateSkipped)
          .map((q: SafeAny, idx: number) => {
            const staffId = Number(q.staffId);
            const profile = profileMap.get(staffId);
            const staffStatus = staffStatuses.find((s: SafeAny) => s?.staffId === staffId);

            // Check if this CV has an upcoming booking within 45 minutes
            const upcomingBookings = orderRows.filter(
              (o: SafeAny) =>
                Number(o.ktvId) === staffId &&
                (o.orderState === 'New' || o.orderState === 'Confirmed') &&
                new Date(o.bookStartStr.replace(' ', 'T') + '+07:00').getTime() > now.getTime()
            );
            const nextBooking = upcomingBookings.sort(
              (a: SafeAny, b: SafeAny) =>
                new Date(a.bookStartStr.replace(' ', 'T') + '+07:00').getTime() -
                new Date(b.bookStartStr.replace(' ', 'T') + '+07:00').getTime()
            )[0];
            const nextBookingInMinutes = nextBooking
              ? Math.round(
                  (new Date(nextBooking.bookStartStr.replace(' ', 'T') + '+07:00').getTime() - now.getTime()) / 60000
                )
              : null;
            const isLockedForBooking = nextBookingInMinutes != null && nextBookingInMinutes <= 45;

            // Check if CV is actually available now
            const isAvailableNow = staffStatus ? staffStatus.liveStatus === 'IDLE' : true;

            // Calculate estimated wait time based on actual real booking schedule mapping for queue position
            let estimatedWaitMinutes: number | null;
            let mappedBookingTime: string | null;
            if (isLockedForBooking && nextBookingInMinutes !== null && nextBooking) {
              estimatedWaitMinutes = nextBookingInMinutes;
              mappedBookingTime = nextBooking.bookStartStr ? String(nextBooking.bookStartStr).slice(11, 16) : null;
            } else if (storeUpcomingBookings[idx]) {
              const booking = storeUpcomingBookings[idx];
              const startMs = new Date(booking.bookStartStr.replace(' ', 'T') + '+07:00').getTime();
              const diffMins = Math.round((startMs - now.getTime()) / 60000);
              estimatedWaitMinutes = diffMins; // Can be negative (e.g. -15p, -26p) if late within 30m
              mappedBookingTime = booking.bookStartStr ? String(booking.bookStartStr).slice(11, 16) : null;
            } else {
              // Beyond scheduled bookings today for this store: leave blank (null)
              estimatedWaitMinutes = null;
              mappedBookingTime = null;
            }

            return {
              queueId: Number(q.queueId),
              staffId,
              name: profile?.name || `CV #${staffId}`,
              avatar: profile?.avatar || null,
              storeId: sid,
              position: Number(q.position),
              orderId: null,
              dateAssigned: null,
              dateCreated: q.dateCreated ? new Date(q.dateCreated).toISOString() : '',
              isAvailableNow,
              estimatedWaitMinutes,
              mappedBookingTime,
              isLockedForBooking,
              nextBookingInMinutes,
            };
          });

        queueByStore[sid] = storeQueue;
      });

      return {
        workingCvCount: effectiveCvStaffIds.length,
        offCvCount: offStaffUserIds.size,
        staffStatuses,
        queueByStore,
        timestamp: nowICT.toISOString(),
      };
    } catch (error: SafeAny) {
      fastify.log.error(error, 'CV realtime status error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: (error as SafeAny).message || 'Failed to get CV realtime status',
      });
    }
  });
}
