import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { RevenueHourlyResponse, RevenueDetailResponse, calculateFractionToday } from '@mos-lab/shared';
import { CvAttendanceService } from '../services/cv-attendance.service.js';

export async function registerDashboardRoutes(fastify: FastifyInstance) {
  // GET /api/nyc/config
  // Get touchpoint config for NYC campaign
  fastify.get('/nyc/config', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'NYC_TOUCHPOINTS_CONFIG' },
      });
      if (config) {
        return JSON.parse(config.value);
      }
      // Return defaults if not configured
      const defaultConfigs = {
        NYC_30: [
          { key: 'now', label: 'Chạm Now', daysMin: 0, daysMax: 1, color: 'blue' },
          { key: '3', label: 'Chạm 3', daysMin: 3, daysMax: 3, color: 'cyan' },
          { key: '7', label: 'Chạm 7', daysMin: 7, daysMax: 7, color: 'green' },
          { key: '17', label: 'Chạm 17', daysMin: 17, daysMax: 17, color: 'orange' },
          { key: '21', label: 'Chạm 21', daysMin: 21, daysMax: 21, color: 'red' },
        ],
        NYC_60: [
          { key: '35', label: 'Chạm 35', daysMin: 31, daysMax: 35, color: 'blue' },
          { key: '45', label: 'Chạm 45', daysMin: 41, daysMax: 45, color: 'orange' },
          { key: '55', label: 'Chạm 55', daysMin: 51, daysMax: 55, color: 'red' },
        ],
        NYC_90: [
          { key: '70', label: 'Chạm 70', daysMin: 65, daysMax: 70, color: 'blue' },
          { key: '80', label: 'Chạm 80', daysMin: 75, daysMax: 80, color: 'orange' },
        ],
        NYC_180: [
          { key: '100', label: 'Chạm 100', daysMin: 95, daysMax: 100, color: 'blue' },
          { key: '150', label: 'Chạm 150', daysMin: 145, daysMax: 150, color: 'orange' },
        ],
        NYC_365: [
          { key: '200', label: 'Chạm 200', daysMin: 195, daysMax: 200, color: 'blue' },
          { key: '300', label: 'Chạm 300', daysMin: 295, daysMax: 300, color: 'orange' },
        ],
        NYC_365plus: [
          { key: '400', label: 'Chạm 400', daysMin: 395, daysMax: 400, color: 'blue' },
          { key: '500', label: 'Chạm 500', daysMin: 495, daysMax: 500, color: 'orange' },
        ],
      };
      return defaultConfigs;
    } catch (error) {
      fastify.log.error(error as Error, 'Get NYC config error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve touchpoint config',
      });
    }
  });

  // PUT /api/nyc/config
  // Save touchpoint config for NYC campaign (Admins only)
  fastify.put('/nyc/config', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string };
    if (user.role !== 'admin') {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Chỉ Admin mới có quyền cấu hình touchpoints.',
      });
    }

    const configs = request.body as Record<string, SafeAny[]>;
    if (typeof configs !== 'object' || configs === null) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Configs must be an object',
      });
    }

    // Validate structure
    for (const [tabKey, touchpoints] of Object.entries(configs)) {
      if (!Array.isArray(touchpoints)) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: `Touchpoints for tab ${tabKey} must be an array`,
        });
      }
      for (const tp of touchpoints) {
        if (!tp.key || !tp.label || typeof tp.daysMin !== 'number' || typeof tp.daysMax !== 'number') {
          return reply.status(400).send({
            error: 'Bad Request',
            message: `Mỗi touchpoint trong tab ${tabKey} phải có key, label, daysMin, và daysMax hợp lệ.`,
          });
        }
      }
    }

    try {
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: 'NYC_TOUCHPOINTS_CONFIG' },
        create: {
          key: 'NYC_TOUCHPOINTS_CONFIG',
          value: JSON.stringify(configs),
        },
        update: {
          value: JSON.stringify(configs),
        },
      });
      return { success: true, message: 'Đã lưu cấu hình template touchpoints thành công.' };
    } catch (error) {
      fastify.log.error(error as Error, 'Save NYC config error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to save touchpoint config',
      });
    }
  });

  // GET /api/loca/config
  // Get touchpoint config for LoCa campaign
  fastify.get('/loca/config', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'LOCA_TOUCHPOINTS_CONFIG' },
      });
      if (config) {
        return JSON.parse(config.value);
      }
      const defaultConfigs = {
        LOCA_ALL: [
          { key: 'now', label: 'Chạm 24h', daysMin: 1, daysMax: 1, color: 'blue' },
          { key: '17', label: 'Chạm 17', daysMin: 17, daysMax: 17, color: 'cyan' },
          { key: '19', label: 'Chạm 19', daysMin: 19, daysMax: 19, color: 'cyan' },
          { key: '21', label: 'Chạm 21', daysMin: 21, daysMax: 21, color: 'green' },
          { key: '23', label: 'Chạm 23', daysMin: 23, daysMax: 23, color: 'green' },
          { key: '25', label: 'Chạm 25', daysMin: 25, daysMax: 25, color: 'green' },
          { key: '30', label: 'Chạm 30', daysMin: 30, daysMax: 30, color: 'orange' },
          { key: '35', label: 'Chạm 35', daysMin: 35, daysMax: 35, color: 'orange' },
          { key: '40', label: 'Chạm 40', daysMin: 40, daysMax: 40, color: 'orange' },
          { key: '45', label: 'Chạm 45', daysMin: 45, daysMax: 45, color: 'red' },
          { key: '50', label: 'Chạm 50', daysMin: 50, daysMax: 50, color: 'red' },
          { key: '55', label: 'Chạm 55', daysMin: 55, daysMax: 55, color: 'red' },
          { key: '60', label: 'Chạm 60', daysMin: 60, daysMax: 60, color: 'red' },
        ],
      };
      return defaultConfigs;
    } catch (error) {
      fastify.log.error(error as Error, 'Get LoCa config error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve touchpoint config',
      });
    }
  });

  // PUT /api/loca/config
  // Save touchpoint config for LoCa campaign (Admins only)
  fastify.put('/loca/config', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string; username?: string; email?: string };
    const isAuthorized =
      user.role === 'admin' ||
      user.role === 'manager' ||
      user.role === 'cs' ||
      user.role === 'control' ||
      user.username === 'admin' ||
      user.username === 'danhdo@gmail.com' ||
      user.email === 'danhdo@gmail.com';

    if (!isAuthorized) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Chỉ Admin, Manager, CS và Control mới có quyền cấu hình touchpoints.',
      });
    }

    const configs = request.body as Record<string, SafeAny[]>;
    if (typeof configs !== 'object' || configs === null) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Configs must be an object',
      });
    }

    try {
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: 'LOCA_TOUCHPOINTS_CONFIG' },
        create: {
          key: 'LOCA_TOUCHPOINTS_CONFIG',
          value: JSON.stringify(configs),
        },
        update: {
          value: JSON.stringify(configs),
        },
      });
      return { success: true, message: 'Đã lưu cấu hình template touchpoints thành công.' };
    } catch (error) {
      fastify.log.error(error as Error, 'Save LoCa config error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to save touchpoint config',
      });
    }
  });

  // GET /api/dashboard/vat-config
  // Get VAT rate configuration (Defaults to 8%)
  fastify.get('/dashboard/vat-config', { preHandler: [requireAuth] }, async (_request, _reply) => {
    try {
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'VAT_RATE_CONFIG' },
      });
      if (config) {
        const parsed = JSON.parse(config.value);
        return { vatPercent: Number(parsed.vatPercent ?? 8) };
      }
      return { vatPercent: 8 };
    } catch (error) {
      fastify.log.error(error as Error, 'Get VAT config error:');
      return { vatPercent: 8 };
    }
  });

  // PUT /api/dashboard/vat-config
  // Save VAT rate configuration (Admin only)
  fastify.put('/dashboard/vat-config', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string };
    if (user.role !== 'admin') {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Chỉ Admin mới có quyền cấu hình Tỷ lệ Thuế VAT.',
      });
    }
    const { vatPercent } = request.body as { vatPercent: number };
    const num = Number(vatPercent);
    if (isNaN(num) || num < 0 || num > 50) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Tỷ lệ VAT phải là số từ 0% đến 50%.',
      });
    }
    try {
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: 'VAT_RATE_CONFIG' },
        create: {
          key: 'VAT_RATE_CONFIG',
          value: JSON.stringify({ vatPercent: num }),
        },
        update: {
          value: JSON.stringify({ vatPercent: num }),
        },
      });
      return { success: true, vatPercent: num, message: `Đã cập nhật Tỷ lệ Thuế VAT thành ${num}%.` };
    } catch (error) {
      fastify.log.error(error as Error, 'Save VAT config error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể lưu cấu hình Tỷ lệ Thuế VAT',
      });
    }
  });

  // GET /api/dashboard/today - Real operational data for the "today" dashboard
  fastify.get('/dashboard/today', { preHandler: [requireAuth] }, async (request, reply) => {
    const { date, dateFrom, dateTo } = request.query as { date?: string; dateFrom?: string; dateTo?: string };
    const getVnDateStr = () => {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(new Date());
    };
    const targetDateFrom = (dateFrom || date || getVnDateStr()).slice(0, 10);
    const targetDateTo = (dateTo || date || getVnDateStr()).slice(0, 10);
    const targetDateStr = targetDateFrom;

    const bookingDateOnlyStart = new Date(targetDateFrom + 'T00:00:00.000Z');
    const bookingDateOnlyEnd = new Date(targetDateTo + 'T23:59:59.999Z');

    // Since database datetimes are local and Prisma reads them as UTC,
    // we query using timezone-naive start/end bounds directly
    const startOfDay = new Date(targetDateFrom + 'T00:00:00.000Z');
    const endOfDay = new Date(targetDateTo + 'T23:59:59.999Z');

    const toActualDate = (dbDate: Date | null | undefined) => {
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

    const formatDbTime = (dbDate: Date | null | undefined) => {
      if (!dbDate) return '00:00';
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(dbDate.getUTCHours())}:${pad(dbDate.getUTCMinutes())}`;
    };

    try {
      // Get active Telesales/OC names from CRM database (including Tâm Nguyễn who also does telesales)
      const crmTelesales = await fastify.prisma.crm.crmStaff.findMany({
        where: {
          OR: [{ role: 'telesales' }, { displayName: { in: ['Tâm Nguyễn'] } }],
          isActive: true,
        },
        select: { displayName: true },
      });
      const telesalesNames = new Set(crmTelesales.map((s) => s.displayName.trim().toLowerCase()));
      // 1. Query bookings created today
      const bookingsOrders = await fastify.prisma.legacy.order.findMany({
        where: {
          date_created: {
            gte: startOfDay,
            lte: endOfDay,
          },
          order_state: { not: 'Cancelled' },
        },
        orderBy: { date_created: 'desc' },
      });

      // 2. Query coming today/range
      const comingOrders = await fastify.prisma.legacy.order.findMany({
        where: {
          OR: [
            { booking_date_only: { gte: bookingDateOnlyStart, lte: bookingDateOnlyEnd } },
            { booking_date_start: { gte: startOfDay, lte: endOfDay } },
          ],
          order_state: { not: 'Cancelled' },
        },
        orderBy: { booking_date_start: 'asc' },
      });

      const userIds = Array.from(
        new Set([...bookingsOrders.map((o) => o.user_id), ...comingOrders.map((o) => o.user_id)])
      ).filter((id): id is number => id !== null && id !== undefined && !isNaN(Number(id)) && Number(id) > 0);

      const userProfiles =
        userIds.length > 0
          ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT up.user_id as userId, up.full_name as fullName, up.avatar, u.email, u.gender, u.date_of_birth as dob
        FROM \`user_profile\` up
        LEFT JOIN \`user\` u ON up.user_id = u.id
        WHERE up.user_id IN (${userIds.join(',')})
      `)
          : [];

      const userContacts =
        userIds.length > 0
          ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT user_id as userId, phone_number as phoneNumber
        FROM \`user_contact\`
        WHERE user_id IN (${userIds.join(',')}) AND is_disabled = 0
      `)
          : [];

      const userBalances =
        userIds.length > 0
          ? await fastify.prisma.legacy.user_service_balance.findMany({
              where: { user_id: { in: userIds } },
            })
          : [];

      const balancesByUserId = new Map<number, SafeAny[]>();
      for (const balance of userBalances) {
        const userId = Number(balance.user_id);
        const balances = balancesByUserId.get(userId) || [];
        balances.push(balance);
        balancesByUserId.set(userId, balances);
      }

      const balanceIds = userBalances.map((b) => b.id);
      const userBalanceTransactions =
        balanceIds.length > 0
          ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT usbt.id, usbt.user_service_balance_id, usbt.date_created, usbt.date_expired, 
               usbt.total_normal_count_left, usbt.total_retain_count_left, usbt.normal_count, 
               usbt.retain_count, usbt.used_staff_id, usbt.order_id,
               COALESCE(ro.actual_booking_date_start, o.booking_date_start) as o_booking_date_start
        FROM user_service_balance_transaction usbt
        LEFT JOIN \`order\` o ON o.id = usbt.order_id
        LEFT JOIN \`report_order\` ro ON ro.order_id = o.id
        WHERE usbt.user_service_balance_id IN (${balanceIds.join(',')})
      `)
          : [];

      // Index transactions by balance ID for O(1) lookups
      const txnsByBalanceId = new Map<number, SafeAny[]>();
      for (const t of userBalanceTransactions) {
        const bid = Number(t.user_service_balance_id);
        const list = txnsByBalanceId.get(bid) || [];
        list.push(t);
        txnsByBalanceId.set(bid, list);
      }

      const allOrderIds = Array.from(new Set([...bookingsOrders.map((o) => o.id), ...comingOrders.map((o) => o.id)]));

      const allOrderServices =
        allOrderIds.length > 0
          ? await fastify.prisma.legacy.order_service.findMany({
              where: { order_id: { in: allOrderIds } },
            })
          : [];

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

      const promotions =
        promoIds.length > 0
          ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT p.id, p.promotion_key as promotionKey, pl.promotion_name as name
        FROM promotion p
        LEFT JOIN promotion_language pl ON p.id = pl.promotion_id AND pl.language_id = 1
        WHERE p.id IN (${promoIds.join(',')})
      `)
          : [];

      const promoMap = new Map(promotions.map((p) => [Number(p.id), p.name || p.promotionKey || `PROMO-${p.id}`]));

      const staffProfiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT up.user_id as userId, 
               TRIM(COALESCE(NULLIF(up.full_name, ''), CONCAT(COALESCE(up.first_name, ''), ' ', COALESCE(up.last_name, '')))) as fullName
        FROM \`user_profile\` up
      `);
      const staffMap = new Map(staffProfiles.map((s) => [Number(s.userId), s.fullName || `Staff #${s.userId}`]));

      // Exact legacy PHP combo active helper function
      const checkHasLiveCombo = (userId: number, bookingDateStart: Date | null, orderCreatedDate: Date) => {
        const bTime = bookingDateStart || orderCreatedDate;
        const userBals = balancesByUserId.get(userId) || [];

        for (const usb of userBals) {
          // Condition 1: usb.date_created < booking_date_start
          if (new Date(usb.date_created) >= new Date(bTime)) {
            continue;
          }

          // Get all transactions for this balance before this booking
          const txnsBefore = (txnsByBalanceId.get(usb.id) || []).filter(
            (t) => new Date(t.o_booking_date_start || t.date_created) < new Date(bTime)
          );

          // Order them desc by time, then id desc
          txnsBefore.sort((a, b) => {
            const timeA = new Date(a.o_booking_date_start || a.date_created).getTime();
            const timeB = new Date(b.o_booking_date_start || b.date_created).getTime();
            if (timeA !== timeB) return timeB - timeA;
            return b.id - a.id;
          });

          const lastTxnBefore = txnsBefore[0];

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
            // If no transaction before or counts are null, calculate based on current count + all transactions that used sessions after or at the booking
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

        // Check active combo using exact legacy logic
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
        if (o.order_state === 'Completed') {
          status = 'completed';
        } else if (
          ['CheckIn', 'Consultation', 'Preparation', 'ServiceStart', 'ServiceCleaned', 'ServiceEnd'].includes(
            o.order_state
          )
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

        const record = {
          key: String(o.id),
          customerId: o.user_id,
          customer: name,
          avatar: uProfile?.avatar || null,
          phone,
          group,
          promo: promoName,
          booker,
          channel: o.booking_channels || 'N/A',
          branchName: o.client_store_id === 2 ? 'PXL' : o.client_store_id === 16 ? 'Estella' : 'Đề Thám',
          bookingDateTime: formatBookingDateTime(o.booking_date_start),
          requestedCv: cvRequested,
          status,
          bookingNote: o.booking_note || '',
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

      const comingServices =
        comingOrderIds.length > 0
          ? await fastify.prisma.legacy.order_service.findMany({
              where: { order_id: { in: comingOrderIds } },
            })
          : [];

      const comingServiceIds = Array.from(new Set(comingServices.map((cs) => cs.service_id)));
      const serviceLangs =
        comingServiceIds.length > 0
          ? await fastify.prisma.legacy.service_language.findMany({
              where: { service_id: { in: comingServiceIds } },
            })
          : [];
      const serviceLangMap = new Map(serviceLangs.map((sl) => [sl.service_id, sl.service_name]));

      const comingProducts =
        comingOrderIds.length > 0
          ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT * FROM \`order_product\` WHERE order_id IN (${comingOrderIds.join(',')})
      `)
          : [];

      const comingCombos =
        comingOrderIds.length > 0
          ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT * FROM \`order_service_combo\` WHERE order_id IN (${comingOrderIds.join(',')})
      `)
          : [];

      // Get active CCs (check-in/out in the last 30 days and user_profile.is_disabled = 0)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const activeCcRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `
        SELECT DISTINCT s.staffId
        FROM (
          SELECT DISTINCT check_in_staff_id as staffId FROM \`order_service\` WHERE check_in_staff_id IS NOT NULL AND check_in_staff_id > 0 AND date_created >= ?
          UNION
          SELECT DISTINCT check_out_staff_id as staffId FROM \`order_service\` WHERE check_out_staff_id IS NOT NULL AND check_out_staff_id > 0 AND date_created >= ?
        ) s
      `,
        thirtyDaysAgo,
        thirtyDaysAgo
      );

      const activeCcIds = activeCcRows.map((r) => Number(r.staffId)).filter((id) => !isNaN(id) && id > 0);
      const activeCcs: { id: number; name: string; branch: 'detham' | 'pxl' | 'estella' }[] = [];

      if (activeCcIds.length > 0) {
        const ccProfiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT user_id as userId, full_name as fullName
          FROM \`user_profile\`
          WHERE user_id IN (${activeCcIds.join(',')}) AND provider = 'Staff' AND is_disabled = 0
        `);

        // Map each CC to their preferred store in a single grouped query (Batch CC preference fetch)
        const prefStores = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT s.staffId, o.client_store_id as storeId, COUNT(*) as count
          FROM (
            SELECT check_in_staff_id as staffId, order_id 
            FROM \`order_service\` 
            WHERE check_in_staff_id IN (${activeCcIds.join(',')})
            UNION ALL
            SELECT check_out_staff_id as staffId, order_id 
            FROM \`order_service\` 
            WHERE check_out_staff_id IN (${activeCcIds.join(',')})
          ) s
          JOIN \`order\` o ON s.order_id = o.id
          GROUP BY s.staffId, o.client_store_id
        `);

        const ccCountsMap = new Map<number, { storeId: number; count: number }>();
        for (const row of prefStores) {
          const ccId = Number(row.staffId);
          const storeId = Number(row.storeId);
          const count = Number(row.count);
          const existing = ccCountsMap.get(ccId);
          if (!existing || count > existing.count) {
            ccCountsMap.set(ccId, { storeId, count });
          }
        }

        for (const p of ccProfiles) {
          const ccId = Number(p.userId);
          const pref = ccCountsMap.get(ccId);
          const prefStoreId = pref ? pref.storeId : null;

          let branch: 'detham' | 'pxl' | 'estella' | null = null;
          if (prefStoreId === 6) branch = 'detham';
          else if (prefStoreId === 2) branch = 'pxl';
          else if (prefStoreId === 16) branch = 'estella';

          if (branch) {
            activeCcs.push({
              id: ccId,
              name: p.fullName.trim(),
              branch,
            });
          }
        }
      }

      // 1. Query schedules for weekly off calculations
      const allSchedules = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT user_id, type, type_value, start_time, end_time 
         FROM staff_working_shift_schedule 
         WHERE is_disabled = 0 AND user_id IS NOT NULL`
      );

      const schedulesByUserId: { [uid: number]: SafeAny[] } = {};
      for (const s of allSchedules) {
        const uid = Number(s.user_id);
        const list = schedulesByUserId[uid] || [];
        list.push(s);
        schedulesByUserId[uid] = list;
      }

      // 2. Query approved week-off requests
      const weekOffRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT from_user_id as userId, weekday, COUNT(*) as cnt
         FROM staff_day_off
         WHERE attribute_option_id = 110 AND request_state = 'Approved' AND from_user_id IS NOT NULL
         GROUP BY from_user_id, weekday`
      );

      const weekOffsByUserId: { [uid: number]: { weekday: number; cnt: number }[] } = {};
      for (const r of weekOffRows) {
        const uid = Number(r.userId);
        const day = Number(r.weekday);
        const cnt = Number(r.cnt);
        const list = weekOffsByUserId[uid] || [];
        list.push({ weekday: day, cnt });
        weekOffsByUserId[uid] = list;
      }

      // 3. Query specific day-offs for target date
      const dayOffs = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT from_user_id FROM staff_day_off 
         WHERE ? BETWEEN from_date AND to_date AND request_state = 'Approved' AND from_user_id IS NOT NULL`,
        targetDateStr
      );
      const offUserIds = new Set(dayOffs.map((d) => Number(d.from_user_id)));

      const dayOfWeek = new Date(targetDateStr).getDay();
      const weekdayStr = dayOfWeek === 0 ? '7' : String(dayOfWeek);

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
        pxl: { revLe: 0, revCombo: 0, revProduct: 0, netLe: 0, netCombo: 0, netProduct: 0, cc: [], cv: [], coming: [] },
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

      // Pre-populate active CCs for each branch
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
        let branchKey = 'detham';
        if (o.client_store_id === 2) branchKey = 'pxl';
        else if (o.client_store_id === 16) branchKey = 'estella';

        const uProfile = profileMap.get(o.user_id);
        const phone = contactMap.get(o.user_id) || '';
        const name = uProfile?.fullName || 'Khách hàng';

        const orderSvs = comingServices.filter((cs) => cs.order_id === o.id);
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
        const userBal = userBalances.filter((b) => b.user_id === o.user_id);
        const group = hasLiveCombo ? 'combo_live' : userBal.length > 0 ? 'combo_dead' : 'single';

        let status: 'completed' | 'serving' | 'confirmed' | 'pending' | 'late' | 'checkout' = 'pending';
        if (o.order_state === 'Completed') {
          status = 'completed';
        } else if (
          ['CheckIn', 'Consultation', 'Preparation', 'ServiceStart', 'ServiceCleaned', 'ServiceEnd'].includes(
            o.order_state
          )
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

        const orderServices = comingServices.filter((cs) => cs.order_id === o.id);
        const orderCombos = comingCombos.filter((c) => Number(c.order_id) === o.id);
        const orderProducts = comingProducts.filter((p) => Number(p.order_id) === o.id);

        const totalTax =
          orderServices.reduce((sum, s) => sum + Number(s.tax_amount || 0), 0) +
          orderCombos.reduce((sum, c) => sum + Number(c.tax_amount || 0), 0) +
          orderProducts.reduce((sum, p) => sum + Number(p.tax_amount || 0), 0);

        const firstPromoSv = orderSvs.find((cs) => cs.promotion_id !== null && cs.promotion_id !== undefined);
        const pId = firstPromoSv?.promotion_id || o.promotion_id || o.selected_promotion_id;
        const promoName = pId ? promoMap.get(Number(pId)) || `PROMO-${pId}` : null;

        const isOc = telesalesNames.has(booker.trim().toLowerCase());
        const comboRev = orderCombos.reduce((sum, c) => sum + Number(c.total_price || 0), 0);
        const category = group === 'combo_live' || comboRev > 0 ? 'combo' : isOc ? 'oc' : 'other';

        const comingItem = {
          key: String(o.id),
          customerId: o.user_id,
          time: formatDbTime(o.booking_date_start),
          customer: name,
          avatar: uProfile?.avatar || null,
          phone,
          group,
          promo: promoName,
          booker,
          channel: o.booking_channels || 'N/A',
          category,
          cc: ccName,
          cv: cvName,
          service: serviceName,
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
          const comboRev = orderCombos.reduce((sum, c) => sum + Number(c.total_price || 0), 0);
          const productRev = orderProducts.reduce((sum, p) => sum + Number(p.total_price || 0), 0);
          const orderTotal = Number(o.total_price || 0);

          let finalRevCombo = comboRev;
          let finalRevProduct = productRev;
          let finalRevLe = 0;

          if (orderTotal < 0) {
            if (comboRev + productRev === 0) {
              finalRevLe = orderTotal;
            } else {
              const scale = orderTotal / (comboRev + productRev);
              finalRevCombo = comboRev * scale;
              finalRevProduct = productRev * scale;
            }
          } else {
            if (comboRev + productRev > orderTotal) {
              const scale = orderTotal / (comboRev + productRev);
              finalRevCombo = comboRev * scale;
              finalRevProduct = productRev * scale;
            } else {
              finalRevLe = orderTotal - comboRev - productRev;
            }
          }

          const comboNet = orderCombos.reduce(
            (sum, c) => sum + Number(c.total_price || 0) - Number(c.tax_amount || 0),
            0
          );
          const productNet = orderProducts.reduce(
            (sum, p) => sum + Number(p.total_price || 0) - Number(p.tax_amount || 0),
            0
          );
          const orderNet = orderTotal - totalTax;

          let finalNetCombo = comboNet;
          let finalNetProduct = productNet;
          let finalNetLe = 0;

          if (orderNet < 0) {
            if (comboNet + productNet === 0) {
              finalNetLe = orderNet;
            } else {
              const scaleNet = orderNet / (comboNet + productNet);
              finalNetCombo = comboNet * scaleNet;
              finalNetProduct = productNet * scaleNet;
            }
          } else {
            if (comboNet + productNet > orderNet) {
              const scaleNet = orderNet / (comboNet + productNet);
              finalNetCombo = comboNet * scaleNet;
              finalNetProduct = productNet * scaleNet;
            } else {
              finalNetLe = orderNet - comboNet - productNet;
            }
          }

          branchDetailMap[branchKey].revCombo += finalRevCombo;
          branchDetailMap[branchKey].revProduct += finalRevProduct;
          branchDetailMap[branchKey].revLe += finalRevLe;

          branchDetailMap[branchKey].netCombo += finalNetCombo;
          branchDetailMap[branchKey].netProduct += finalNetProduct;
          branchDetailMap[branchKey].netLe += finalNetLe;
        }
      });

      // Fetch working shifts for today
      const workingShifts = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `
        SELECT * FROM \`staff_working_shift\` WHERE \`date\` = ?
      `,
        targetDateStr
      );

      const shiftMap = new Map<number, SafeAny>();
      workingShifts.forEach((ws) => {
        shiftMap.set(Number(ws.user_id), ws);
      });

      const getShiftType = (startTime: SafeAny, endTime: SafeAny): 'sáng' | 'chiều' | 'full' => {
        if (!startTime) return 'full';

        let startStr = '';
        if (typeof startTime === 'string') {
          startStr = startTime;
        } else if (startTime instanceof Date) {
          startStr = startTime.toISOString().substr(11, 8);
        } else if (startTime && typeof startTime === 'object' && startTime.toISOString) {
          startStr = startTime.toISOString().substr(11, 8);
        }

        let endStr = '';
        if (typeof endTime === 'string') {
          endStr = endTime;
        } else if (endTime instanceof Date) {
          endStr = endTime.toISOString().substr(11, 8);
        } else if (endTime && typeof endTime === 'object' && endTime.toISOString) {
          endStr = endTime.toISOString().substr(11, 8);
        }

        if (startStr.startsWith('09:00') || startStr.startsWith('08:30')) {
          if (endStr.startsWith('18:00') || endStr.startsWith('17:00')) {
            return 'sáng';
          }
          return 'full';
        } else if (startStr >= '10:30') {
          return 'chiều';
        }
        return 'full';
      };

      // Update CCs' shift, attendance, and doing from actual check-in records (workingShifts)
      Object.keys(branchDetailMap).forEach((bKey) => {
        branchDetailMap[bKey].cc.forEach((cc: SafeAny) => {
          const wsRecord = shiftMap.get(cc.id);

          let shift: 'sáng' | 'chiều' | 'full' | 'off' = 'full';
          const list = schedulesByUserId[cc.id] || [];
          const todaySchedule =
            list.find((s) => s.type === 'Weekday' && s.type_value === weekdayStr) ||
            list.find((s) => s.type === 'Day' && s.type_value === 'All');
          if (todaySchedule) {
            shift = getShiftType(todaySchedule.start_time, todaySchedule.end_time);
          }

          const weekOffs = weekOffsByUserId[cc.id] || [];
          let isWeekOff = false;
          if (weekOffs.length > 0) {
            const sorted = [...weekOffs].sort((a, b) => b.cnt - a.cnt);
            isWeekOff = String(sorted[0].weekday) === weekdayStr;
          } else if (list.length > 0) {
            const worksAll = list.some((s) => s.type === 'Day' && s.type_value === 'All');
            if (!worksAll) {
              const workingWeekdays = list.filter((s) => s.type === 'Weekday').map((s) => s.type_value);
              if (workingWeekdays.length > 0 && !workingWeekdays.includes(weekdayStr)) {
                isWeekOff = true;
              }
            }
          }

          const hasSpecificDayOff = offUserIds.has(cc.id);
          const isOffCC = isWeekOff || hasSpecificDayOff;

          if (isOffCC) {
            shift = 'off';
          }

          let attendance: 'none' | 'checked_in' | 'checked_out' | 'late' = 'none';
          let doing = isOffCC ? 'Nghỉ phép tuần' : 'Chưa check-in';

          if (wsRecord) {
            if (!isOffCC || wsRecord.check_in_staff_task_id !== null) {
              shift = getShiftType(wsRecord.start_time, wsRecord.end_time);
            }
            if (wsRecord.check_out_staff_task_id !== null) {
              attendance = 'checked_out';
              doing = 'Đã về';
            } else if (wsRecord.check_in_staff_task_id !== null) {
              attendance = 'checked_in';
              doing = 'Trống (Sẵn sàng đón khách)';
            }
          }

          cc.shift = shift;
          cc.attendance = attendance;
          cc.doing = doing;
        });
      });

      // Single Source of Truth: Calculate and populate Chuyên viên (CV) list for each branch
      const cvAttendanceList = await CvAttendanceService.getDailyCvAttendance(fastify, targetDateStr);
      cvAttendanceList.forEach((cv) => {
        let bKey = 'estella';
        if (cv.storeId === 6 || cv.storeId === 1) bKey = 'detham';
        else if (cv.storeId === 2) bKey = 'pxl';

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

      // Helper function to find and move CC to their active branch today
      const getOrMoveCC = (ccId: number, targetBranchKey: string) => {
        let ccObj: SafeAny = null;
        Object.keys(branchDetailMap).forEach((k) => {
          const foundIdx = branchDetailMap[k].cc.findIndex((c: SafeAny) => c.id === ccId);
          if (foundIdx !== -1) {
            ccObj = branchDetailMap[k].cc[foundIdx];
            if (k !== targetBranchKey) {
              // Remove from old branch
              branchDetailMap[k].cc.splice(foundIdx, 1);
            }
          }
        });

        if (!ccObj) {
          const staffName = staffMap.get(ccId) || 'Tư vấn viên';
          ccObj = {
            id: ccId,
            name: staffName,
            doing: 'Đang hoạt động',
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
            shift: 'full',
            attendance: 'checked_in',
          };
        }

        // Ensure CC is in target branch
        const exists = branchDetailMap[targetBranchKey].cc.some((c: SafeAny) => c.id === ccId);
        if (!exists) {
          branchDetailMap[targetBranchKey].cc.push(ccObj);
        }

        return ccObj;
      };

      // Calculate today's CC statistics from today's orders
      comingOrders.forEach((o) => {
        let bKey = 'detham';
        if (o.client_store_id === 2) bKey = 'pxl';
        else if (o.client_store_id === 16) bKey = 'estella';

        const orderSvs = comingServices.filter((cs) => cs.order_id === o.id);
        if (orderSvs.length === 0) return;

        // Check-in CC
        const checkInStaffId = orderSvs.find((cs) => cs.check_in_staff_id)?.check_in_staff_id;
        if (checkInStaffId) {
          const ccId = Number(checkInStaffId);
          const cc = getOrMoveCC(ccId, bKey);

          if (['CheckIn', 'Parking', 'Consultation', 'Preparation'].includes(o.order_state)) {
            cc.doing = 'Đang hỗ trợ khách check-in';
            if (cc.attendance !== 'checked_out') {
              cc.attendance = 'checked_in';
            }
          }
        }

        // Check-out CC
        const checkOutStaffId = orderSvs.find((cs) => cs.check_out_staff_id)?.check_out_staff_id;
        if (checkOutStaffId) {
          const ccId = Number(checkOutStaffId);
          const cc = getOrMoveCC(ccId, bKey);

          if (o.order_state === 'CheckOut') {
            cc.doing = 'Đang thanh toán cho khách';
            if (cc.attendance !== 'checked_out') {
              cc.attendance = 'checked_in';
            }
          }

          if (o.order_state === 'Completed') {
            const orderServices = comingServices.filter((cs) => cs.order_id === o.id);
            const orderCombos = comingCombos.filter((c) => Number(c.order_id) === o.id);
            const orderProducts = comingProducts.filter((p) => Number(p.order_id) === o.id);

            const totalTax =
              orderServices.reduce((sum, s) => sum + Number(s.tax_amount || 0), 0) +
              orderCombos.reduce((sum, c) => sum + Number(c.tax_amount || 0), 0) +
              orderProducts.reduce((sum, p) => sum + Number(p.tax_amount || 0), 0);

            const comboRev = orderCombos.reduce((sum, c) => sum + Number(c.total_price || 0), 0);
            const productRev = orderProducts.reduce((sum, p) => sum + Number(p.total_price || 0), 0);
            const orderTotal = Number(o.total_price || 0);

            let finalRevCombo = comboRev;
            let finalRevProduct = productRev;
            let finalRevLe = 0;

            if (orderTotal < 0) {
              if (comboRev + productRev === 0) {
                finalRevLe = orderTotal;
              } else {
                const scale = orderTotal / (comboRev + productRev);
                finalRevCombo = comboRev * scale;
                finalRevProduct = productRev * scale;
              }
            } else {
              if (comboRev + productRev > orderTotal) {
                const scale = orderTotal / (comboRev + productRev);
                finalRevCombo = comboRev * scale;
                finalRevProduct = productRev * scale;
              } else {
                finalRevLe = orderTotal - comboRev - productRev;
              }
            }

            const comboNet = orderCombos.reduce(
              (sum, c) => sum + Number(c.total_price || 0) - Number(c.tax_amount || 0),
              0
            );
            const productNet = orderProducts.reduce(
              (sum, p) => sum + Number(p.total_price || 0) - Number(p.tax_amount || 0),
              0
            );
            const orderNet = orderTotal - totalTax;

            let finalNetCombo = comboNet;
            let finalNetProduct = productNet;
            let finalNetLe = 0;

            if (orderNet < 0) {
              if (comboNet + productNet === 0) {
                finalNetLe = orderNet;
              } else {
                const scaleNet = orderNet / (comboNet + productNet);
                finalNetCombo = comboNet * scaleNet;
                finalNetProduct = productNet * scaleNet;
              }
            } else {
              if (comboNet + productNet > orderNet) {
                const scaleNet = orderNet / (comboNet + productNet);
                finalNetCombo = comboNet * scaleNet;
                finalNetProduct = productNet * scaleNet;
              } else {
                finalNetLe = orderNet - comboNet - productNet;
              }
            }

            cc.revCombo += finalRevCombo;
            cc.revProduct += finalRevProduct;
            cc.revLe += finalRevLe;
            cc.revenue += orderTotal;

            cc.netCombo += finalNetCombo;
            cc.netProduct += finalNetProduct;
            cc.netLe += finalNetLe;
            cc.netRevenue += orderNet;

            cc.combos += orderCombos.length;
          }
        }
      });

      // Compute unique clients count for each CC today, and set default idle states
      Object.keys(branchDetailMap).forEach((bKey) => {
        branchDetailMap[bKey].cc.forEach((cc: SafeAny) => {
          const ccId = cc.id;
          const ccServices = comingServices.filter(
            (s) => s.check_in_staff_id === ccId || s.check_out_staff_id === ccId
          );
          const uniqueOrders = new Set(ccServices.map((s) => s.order_id));
          cc.clients = uniqueOrders.size;

          if (cc.clients > 0 && cc.doing === 'Nghỉ phép tuần') {
            cc.doing = 'Trống (Sẵn sàng đón khách)';
            cc.shift = 'full';
            cc.attendance = 'checked_in';
          }
        });
      });

      return reply.send({
        branchesData: branchDetailMap,
        bookingsCombo,
        bookingsOc,
        bookingsOther,
      });
    } catch (error) {
      fastify.log.error(error, 'Fetch dashboard today error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi hệ thống khi tải dữ liệu vận hành hôm nay.',
      });
    }
  });

  // GET /api/dashboard/today/revenue-hourly
  fastify.get('/dashboard/today/revenue-hourly', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { dateFrom, dateTo, branchKey, bookerFilter } = request.query as {
        dateFrom: string;
        dateTo: string;
        branchKey?: string;
        bookerFilter?: string;
      };
      if (!dateFrom || !dateTo) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Missing dateFrom or dateTo' });
      }

      const start = dateFrom + ' 00:00:00';
      const end = dateTo + ' 23:59:59';

      // Load only profiles referenced by the selected orders; the old full staff scan dominated short date ranges.
      const staffMap = new Map<number, string>();

      const crmTelesales = await fastify.prisma.crm.crmStaff.findMany({
        where: {
          OR: [{ role: 'telesales' }, { displayName: { in: ['Tâm Nguyễn'] } }],
        },
        select: { displayName: true },
      });
      const telesalesSet = new Set<string>(crmTelesales.map((s) => s.displayName.trim().toLowerCase()));

      const teamConfigRaw = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'BOOKER_TEAM_CONFIG' },
      });
      const controlCsSet = new Set<string>();
      if (teamConfigRaw && teamConfigRaw.value) {
        try {
          const parsed = JSON.parse(teamConfigRaw.value);
          if (parsed.telesales) parsed.telesales.forEach((n: string) => telesalesSet.add(n.trim().toLowerCase()));
          if (parsed.control_cs) parsed.control_cs.forEach((n: string) => controlCsSet.add(n.trim().toLowerCase()));
        } catch {
          // ignore
        }
      }

      const matchesBookerFilter = (bookerName: string, filter: string | undefined): boolean => {
        if (!filter || filter === 'all') return true;
        const nameLower = (bookerName || '').trim().toLowerCase();
        if (!nameLower) return false;

        if (filter === 'team:telesales') {
          return telesalesSet.has(nameLower);
        }
        if (filter === 'team:control_cs') {
          return controlCsSet.has(nameLower);
        }
        if (filter === 'team:other') {
          return !telesalesSet.has(nameLower) && !controlCsSet.has(nameLower);
        }

        return nameLower === filter.trim().toLowerCase();
      };

      const branchKeyToStoreIdMap: Record<string, number> = { detham: 6, pxl: 2, estella: 16 };
      const targetStoreId = branchKey && branchKey !== 'all' ? branchKeyToStoreIdMap[branchKey] : null;

      const rawOrders: SafeAny[] = await fastify.prisma.legacy.$queryRawUnsafe(
        `
        SELECT 
          o.id as orderId,
          o.total_price,
          o.client_store_id,
          o.created_staff_id,
          COALESCE(o.booking_date_end, ro.actual_booking_date_start, o.booking_date_start) as checkin_time,
          HOUR(COALESCE(o.booking_date_end, ro.actual_booking_date_start, o.booking_date_start)) as checkin_hour
        FROM \`order\` o
        LEFT JOIN report_order ro ON o.id = ro.order_id
        WHERE o.order_state = 'Completed'
          AND (
            (o.booking_date_end >= ? AND o.booking_date_end <= ?)
            OR (
              o.booking_date_end IS NULL
              AND ro.actual_booking_date_start >= ? AND ro.actual_booking_date_start <= ?
            )
            OR (
              o.booking_date_end IS NULL AND ro.actual_booking_date_start IS NULL
              AND o.booking_date_start >= ? AND o.booking_date_start <= ?
            )
          )
        ORDER BY checkin_time ASC
      `,
        start,
        end,
        start,
        end,
        start,
        end
      );

      const createdStaffIds = Array.from(
        new Set(rawOrders.map((order) => Number(order.created_staff_id)).filter((id) => id > 0))
      );
      if (createdStaffIds.length > 0) {
        const staffProfiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT up.user_id as userId,
                 TRIM(COALESCE(NULLIF(up.full_name, ''), CONCAT(COALESCE(up.first_name, ''), ' ', COALESCE(up.last_name, '')))) as fullName
          FROM \`user_profile\` up
          WHERE up.user_id IN (${createdStaffIds.join(',')})
        `);
        staffProfiles.forEach((staff) =>
          staffMap.set(Number(staff.userId), staff.fullName || `Staff #${staff.userId}`)
        );
      }

      const completedOrders = rawOrders.filter((o) => {
        if (targetStoreId && Number(o.client_store_id) !== targetStoreId) return false;
        const bookerName = o.created_staff_id
          ? staffMap.get(Number(o.created_staff_id)) || 'Nhiều Booker'
          : 'Khách tự đặt';
        return matchesBookerFilter(bookerName, bookerFilter);
      });

      const orderIds = completedOrders.map((o) => o.orderId);

      const combosMap: Record<number, number> = {};
      const productsMap: Record<number, number> = {};

      if (orderIds.length > 0) {
        const orderIdsStr = orderIds.join(',');
        const combos = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT order_id, SUM(total_price) as total FROM order_service_combo WHERE order_id IN (${orderIdsStr}) GROUP BY order_id
        `);
        const products = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT order_id, SUM(total_price) as total FROM order_product WHERE order_id IN (${orderIdsStr}) GROUP BY order_id
        `);

        combos.forEach((c) => (combosMap[c.order_id] = Number(c.total || 0)));
        products.forEach((p) => (productsMap[p.order_id] = Number(p.total || 0)));
      }

      // Branches config
      const storeIdToBranchKey: Record<number, string> = { 6: 'detham', 2: 'pxl', 16: 'estella' };
      const branchKeyToStoreId: Record<string, number> = { detham: 6, pxl: 2, estella: 16 };
      const branchKeys = ['detham', 'pxl', 'estella'];

      const branchesInit = () =>
        branchKeys.reduce((acc, key) => {
          acc[key] = {
            branchKey: key,
            totalRevenue: 0,
            comboRevenue: 0,
            singleRevenue: 0,
            productRevenue: 0,
            orderCount: 0,
          };
          return acc;
        }, {} as SafeAny);

      const hourlyData: SafeAny[] = [];
      let globalCumulative = 0;
      for (let h = 9; h <= 23; h++) {
        hourlyData.push({
          hour: h,
          totalRevenue: 0,
          comboRevenue: 0,
          singleRevenue: 0,
          productRevenue: 0,
          cumulativeRevenue: 0,
          orderCount: 0,
          branches: branchesInit(),
        });
      }

      let summaryTotalRevenue = 0;
      let summaryComboRevenue = 0;
      let summarySingleRevenue = 0;
      let summaryProductRevenue = 0;
      let summaryOrderCount = 0;
      let summaryComboCount = 0;

      for (const o of completedOrders) {
        const h = Number(o.checkin_hour);
        const comboRev = combosMap[o.orderId] || 0;
        const productRev = productsMap[o.orderId] || 0;
        const orderTotal = Number(o.total_price || 0);

        let finalRevCombo = comboRev;
        let finalRevProduct = productRev;
        let finalRevLe = 0;

        if (orderTotal < 0) {
          if (comboRev + productRev === 0) {
            finalRevLe = orderTotal;
          } else {
            const scale = orderTotal / (comboRev + productRev);
            finalRevCombo = comboRev * scale;
            finalRevProduct = productRev * scale;
          }
        } else {
          if (comboRev + productRev > orderTotal) {
            const scale = orderTotal / (comboRev + productRev);
            finalRevCombo = comboRev * scale;
            finalRevProduct = productRev * scale;
          } else {
            finalRevLe = orderTotal - comboRev - productRev;
          }
        }

        const orderFinalRev = finalRevCombo + finalRevProduct + finalRevLe;
        const branchKey = storeIdToBranchKey[o.client_store_id] || 'detham';

        summaryTotalRevenue += orderFinalRev;
        summaryComboRevenue += finalRevCombo;
        summaryProductRevenue += finalRevProduct;
        summarySingleRevenue += finalRevLe;
        summaryOrderCount++;
        if (finalRevCombo > 0) summaryComboCount++;

        const hourEntry = hourlyData.find((hd) => hd.hour === h);
        if (hourEntry) {
          hourEntry.totalRevenue += orderFinalRev;
          hourEntry.comboRevenue += finalRevCombo;
          hourEntry.productRevenue += finalRevProduct;
          hourEntry.singleRevenue += finalRevLe;
          hourEntry.orderCount++;

          hourEntry.branches[branchKey].totalRevenue += orderFinalRev;
          hourEntry.branches[branchKey].comboRevenue += finalRevCombo;
          hourEntry.branches[branchKey].productRevenue += finalRevProduct;
          hourEntry.branches[branchKey].singleRevenue += finalRevLe;
          hourEntry.branches[branchKey].orderCount++;
        }
      }

      // Compute cumulative
      for (const hd of hourlyData) {
        globalCumulative += hd.totalRevenue;
        hd.cumulativeRevenue = globalCumulative;
      }

      // Query CRM for monthly target
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'MONTHLY_REVENUE_TARGET' },
      });
      let dailyTarget = 0;
      if (config && config.value) {
        const val = Number(config.value);
        if (!isNaN(val)) {
          const vnNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
          const daysInMonth = new Date(vnNow.getFullYear(), vnNow.getMonth() + 1, 0).getDate();
          dailyTarget = Math.round(val / daysInMonth);
        }
      }

      const vnNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
      const currentHour = vnNow.getHours();
      const fractionToday = calculateFractionToday(currentHour);

      const pad2 = (n: number) => String(n).padStart(2, '0');
      const todayStr = `${vnNow.getFullYear()}-${pad2(vnNow.getMonth() + 1)}-${pad2(vnNow.getDate())}`;
      const d1Str = String(dateFrom).slice(0, 10);
      const d2Str = String(dateTo).slice(0, 10);

      const d1 = new Date(`${d1Str}T00:00:00`);
      const d2 = new Date(`${d2Str}T00:00:00`);
      const todayDate = new Date(`${todayStr}T00:00:00`);

      const diffMs = d2.getTime() - d1.getTime();
      const diffDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      const daysInPeriod = Math.max(1, diffDays + 1);

      let elapsedRatio = 1.0;
      if (todayDate < d1) {
        // Future period
        elapsedRatio = 0.001;
      } else if (todayDate > d2) {
        // Past period (already closed)
        elapsedRatio = 1.0;
      } else {
        // Active period containing today
        const daysPassedBeforeToday = Math.max(
          0,
          Math.round((todayDate.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
        );
        const totalElapsedDays = daysPassedBeforeToday + fractionToday;
        elapsedRatio = Math.min(1.0, Math.max(0.001, totalElapsedDays / daysInPeriod));
      }

      const projectedRevenue =
        elapsedRatio >= 1.0 ? Math.round(summaryTotalRevenue) : Math.round(summaryTotalRevenue / elapsedRatio);

      // Round all numbers for hourlyData and summary
      for (const hd of hourlyData) {
        hd.totalRevenue = Math.round(hd.totalRevenue);
        hd.comboRevenue = Math.round(hd.comboRevenue);
        hd.productRevenue = Math.round(hd.productRevenue);
        hd.singleRevenue = Math.round(hd.singleRevenue);
        hd.cumulativeRevenue = Math.round(hd.cumulativeRevenue);
        for (const bk of branchKeys) {
          hd.branches[bk].totalRevenue = Math.round(hd.branches[bk].totalRevenue);
          hd.branches[bk].comboRevenue = Math.round(hd.branches[bk].comboRevenue);
          hd.branches[bk].productRevenue = Math.round(hd.branches[bk].productRevenue);
          hd.branches[bk].singleRevenue = Math.round(hd.branches[bk].singleRevenue);
        }
      }

      const storeIdToBranchName: Record<number, string> = { 6: 'Đề Thám', 2: 'Phan Xích Long', 16: 'Estella' };

      // Build hourlyBreakdown array
      const hourlyBreakdown = hourlyData.map((hd: SafeAny) => ({
        hour: `${String(hd.hour).padStart(2, '0')}:00`,
        comboRevenue: Math.round(hd.comboRevenue),
        singleRevenue: Math.round(hd.singleRevenue),
        productRevenue: Math.round(hd.productRevenue),
        cumulativeRevenue: Math.round(hd.cumulativeRevenue),
        orderCount: hd.orderCount,
      }));

      // Build branchHourlyMatrix
      const branchHourlyMatrix = branchKeys.map((bk: string) => ({
        branchKey: bk,
        branchName: storeIdToBranchName[branchKeyToStoreId[bk]] || bk,
        hours: hourlyData.map((hd: SafeAny) => ({
          hour: `${String(hd.hour).padStart(2, '0')}:00`,
          revenue: Math.round(hd.branches[bk]?.totalRevenue || 0),
          orderCount: hd.branches[bk]?.orderCount || 0,
        })),
        totalRevenue: Math.round(
          hourlyData.reduce((s: number, hd: SafeAny) => s + (hd.branches[bk]?.totalRevenue || 0), 0)
        ),
        totalOrders: hourlyData.reduce((s: number, hd: SafeAny) => s + (hd.branches[bk]?.orderCount || 0), 0),
      }));

      const { netFactor } = await getVatRateConfig(fastify);

      const response: RevenueHourlyResponse = {
        summary: {
          totalRevenue: Math.round(summaryTotalRevenue),
          totalNetRevenue: Math.round(summaryTotalRevenue * netFactor),
          comboRevenue: Math.round(summaryComboRevenue),
          singleRevenue: Math.round(summarySingleRevenue),
          productRevenue: Math.round(summaryProductRevenue),
          completedOrders: summaryOrderCount,
          aov: summaryOrderCount > 0 ? Math.round(summaryTotalRevenue / summaryOrderCount) : 0,
          comboCount: summaryComboCount,
          dailyTarget: dailyTarget,
          projectedRevenue: projectedRevenue,
          elapsedRatio: elapsedRatio,
          daysInPeriod: daysInPeriod,
          isSingleDay: daysInPeriod === 1,
        },
        hourlyBreakdown,
        branchHourlyMatrix,
      };

      return reply.send(response);
    } catch (error) {
      fastify.log.error(error, 'Fetch revenue hourly error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi hệ thống khi tải dữ liệu revenue hourly.',
      });
    }
  });

  // GET /api/dashboard/today/revenue-detail
  fastify.get('/dashboard/today/revenue-detail', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const { dateFrom, dateTo, hour, branchKey, bookerFilter } = request.query as {
        dateFrom: string;
        dateTo: string;
        hour?: string;
        branchKey?: string;
        bookerFilter?: string;
      };
      if (!dateFrom || !dateTo) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Missing dateFrom or dateTo' });
      }

      const start = dateFrom + ' 00:00:00';
      const end = dateTo + ' 23:59:59';

      const branchKeyToStoreId: Record<string, number> = { detham: 6, pxl: 2, estella: 16 };
      let branchFilter = '';
      if (branchKey && branchKeyToStoreId[branchKey]) {
        branchFilter = ` AND o.client_store_id = ${branchKeyToStoreId[branchKey]}`;
      }

      let hourFilter = '';
      if (hour) {
        const hNum = parseInt(String(hour).split(':')[0], 10);
        if (!isNaN(hNum)) {
          hourFilter = ` AND HOUR(COALESCE(o.booking_date_end, ro.actual_booking_date_start, o.booking_date_start)) = ${hNum}`;
        }
      }

      // Load staff map & team sets
      const staffProfiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT up.user_id as userId, 
               TRIM(COALESCE(NULLIF(up.full_name, ''), CONCAT(COALESCE(up.first_name, ''), ' ', COALESCE(up.last_name, '')))) as fullName
        FROM \`user_profile\` up
      `);
      const staffMap = new Map<number, string>();
      staffProfiles.forEach((s) => staffMap.set(Number(s.userId), s.fullName || `Staff #${s.userId}`));

      const crmTelesales = await fastify.prisma.crm.crmStaff.findMany({
        where: {
          OR: [{ role: 'telesales' }, { displayName: { in: ['Tâm Nguyễn'] } }],
        },
        select: { displayName: true },
      });
      const telesalesSet = new Set<string>(crmTelesales.map((s) => s.displayName.trim().toLowerCase()));

      const teamConfigRaw = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'BOOKER_TEAM_CONFIG' },
      });
      const controlCsSet = new Set<string>();
      if (teamConfigRaw && teamConfigRaw.value) {
        try {
          const parsed = JSON.parse(teamConfigRaw.value);
          if (parsed.telesales) parsed.telesales.forEach((n: string) => telesalesSet.add(n.trim().toLowerCase()));
          if (parsed.control_cs) parsed.control_cs.forEach((n: string) => controlCsSet.add(n.trim().toLowerCase()));
        } catch {
          // ignore
        }
      }

      const matchesBookerFilter = (bookerName: string, filter: string | undefined): boolean => {
        if (!filter || filter === 'all') return true;
        const nameLower = (bookerName || '').trim().toLowerCase();
        if (!nameLower) return false;

        if (filter === 'team:telesales') {
          return telesalesSet.has(nameLower);
        }
        if (filter === 'team:control_cs') {
          return controlCsSet.has(nameLower);
        }
        if (filter === 'team:other') {
          return !telesalesSet.has(nameLower) && !controlCsSet.has(nameLower);
        }

        return nameLower === filter.trim().toLowerCase();
      };

      const query = `
        SELECT
          o.id as orderId,
          o.user_id,
          o.total_price,
          o.order_state,
          o.client_store_id,
          o.created_staff_id,
          COALESCE(o.booking_date_end, ro.actual_booking_date_start, o.booking_date_start) as checkin_time
        FROM \`order\` o
        LEFT JOIN report_order ro ON o.id = ro.order_id
        WHERE o.order_state = 'Completed'
          AND COALESCE(o.booking_date_end, ro.actual_booking_date_start, o.booking_date_start) BETWEEN ? AND ?
          ${hourFilter}
          ${branchFilter}
        ORDER BY checkin_time DESC
      `;

      const rawOrders: SafeAny[] = await fastify.prisma.legacy.$queryRawUnsafe(query, start, end);
      const completedOrders = rawOrders.filter((o) => {
        const bookerName = o.created_staff_id
          ? staffMap.get(Number(o.created_staff_id)) || 'Nhiều Booker'
          : 'Khách tự đặt';
        return matchesBookerFilter(bookerName, bookerFilter);
      });

      const orderIds = completedOrders.map((o) => o.orderId);
      const userIds = [...new Set(completedOrders.map((o) => o.user_id).filter(Boolean))];

      const orderServicesMap: Record<number, SafeAny[]> = {};
      const combosMap: Record<number, boolean> = {};
      const productsMap: Record<number, boolean> = {};
      const usersMap: Record<number, SafeAny> = {};
      const staffIds = new Set<number>();

      if (orderIds.length > 0) {
        const orderIdsStr = orderIds.join(',');

        // Check combos
        const combos = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT DISTINCT order_id FROM order_service_combo WHERE order_id IN (${orderIdsStr})
        `);
        combos.forEach((c) => (combosMap[c.order_id] = true));

        // Check products
        const products = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT DISTINCT order_id FROM order_product WHERE order_id IN (${orderIdsStr})
        `);
        products.forEach((p) => (productsMap[p.order_id] = true));

        // Get services
        const services = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT 
            os.order_id, 
            os.check_in_staff_id, 
            os.check_out_staff_id, 
            os.assigned_staff_id,
            sl.service_name as service_name
          FROM order_service os
          LEFT JOIN service_language sl ON os.service_id = sl.service_id AND sl.language_id = 1
          WHERE os.order_id IN (${orderIdsStr})
        `);

        services.forEach((s) => {
          if (!orderServicesMap[s.order_id]) orderServicesMap[s.order_id] = [];
          orderServicesMap[s.order_id].push(s);
          if (s.check_in_staff_id) staffIds.add(s.check_in_staff_id);
          if (s.check_out_staff_id) staffIds.add(s.check_out_staff_id);
          if (s.assigned_staff_id) staffIds.add(s.assigned_staff_id);
        });
      }

      const allUserIds = [...new Set([...userIds, ...Array.from(staffIds)])];
      if (allUserIds.length > 0) {
        const allUserIdsStr = allUserIds.join(',');
        const users = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT u.id, up.full_name, uc.phone_number as phone
          FROM user u
          LEFT JOIN user_profile up ON u.id = up.user_id
          LEFT JOIN user_contact uc ON u.id = uc.user_id
          WHERE u.id IN (${allUserIdsStr})
        `);
        users.forEach((u) => (usersMap[u.id] = { name: u.full_name, phone: u.phone }));
      }

      const { netFactor } = await getVatRateConfig(fastify);

      const transactions = completedOrders.map((o) => {
        let sType: 'combo' | 'single' | 'product' = 'single';
        if (combosMap[o.orderId]) sType = 'combo';
        else if (productsMap[o.orderId] && (!orderServicesMap[o.orderId] || orderServicesMap[o.orderId].length === 0))
          sType = 'product';

        const uInfo = usersMap[o.user_id] || {};
        const svcs = orderServicesMap[o.orderId] || [];

        const ccInName = svcs.find((s) => s.check_in_staff_id)?.check_in_staff_id
          ? usersMap[svcs.find((s) => s.check_in_staff_id)?.check_in_staff_id]?.name || null
          : null;
        const ccOutName = svcs.find((s) => s.check_out_staff_id)?.check_out_staff_id
          ? usersMap[svcs.find((s) => s.check_out_staff_id)?.check_out_staff_id]?.name || null
          : null;
        const cvName = svcs.find((s) => s.assigned_staff_id)?.assigned_staff_id
          ? usersMap[svcs.find((s) => s.assigned_staff_id)?.assigned_staff_id]?.name || null
          : null;

        const storeIdToBranchKeyDetail: Record<number, string> = { 6: 'detham', 2: 'pxl', 16: 'estella' };
        const storeIdToBranchNameDetail: Record<number, string> = { 6: 'Đề Thám', 2: 'Phan Xích Long', 16: 'Estella' };

        return {
          orderId: o.orderId,
          customerId: o.user_id || 0,
          customerName: uInfo.name || 'Khách vãng lai',
          customerPhone: uInfo.phone || '',
          serviceName:
            svcs
              .map((s) => s.service_name)
              .filter(Boolean)
              .join(', ') || 'N/A',
          ccInName,
          ccOutName,
          cvName,
          serviceType: sType,
          price: Math.round(Number(o.total_price || 0)),
          netPrice: Math.round(Number(o.total_price || 0) * netFactor),
          checkinTime: o.checkin_time,
          orderState: 'Completed',
          branchKey: storeIdToBranchKeyDetail[o.client_store_id] || 'detham',
          branchName: storeIdToBranchNameDetail[o.client_store_id] || 'Đề Thám',
        };
      });

      const totalRev = transactions.reduce((sum, t) => sum + t.price, 0);
      const comboRevTotal = transactions.filter((t) => t.serviceType === 'combo').reduce((s, t) => s + t.price, 0);
      const singleRevTotal = transactions.filter((t) => t.serviceType === 'single').reduce((s, t) => s + t.price, 0);
      const productRevTotal = transactions.filter((t) => t.serviceType === 'product').reduce((s, t) => s + t.price, 0);

      const response: RevenueDetailResponse = {
        transactions,
        summary: {
          totalRevenue: totalRev,
          comboRevenue: comboRevTotal,
          singleRevenue: singleRevTotal,
          productRevenue: productRevTotal,
          orderCount: transactions.length,
          aov: transactions.length > 0 ? Math.round(totalRev / transactions.length) : 0,
        },
      };

      return reply.send(response);
    } catch (error) {
      fastify.log.error(error, 'Fetch revenue detail error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Lỗi hệ thống khi tải dữ liệu revenue detail.',
      });
    }
  });
}

export async function getVatRateConfig(fastify: FastifyInstance): Promise<{ vatPercent: number; netFactor: number }> {
  try {
    const configRecord = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: 'VAT_RATE_CONFIG' },
    });
    if (configRecord?.value) {
      const parsed = typeof configRecord.value === 'string' ? JSON.parse(configRecord.value) : configRecord.value;
      const vatPercent = Number(parsed.vatPercent ?? 8);
      const validVat = isNaN(vatPercent) || vatPercent < 0 ? 8 : vatPercent;
      return {
        vatPercent: validVat,
        netFactor: 1 / (1 + validVat / 100),
      };
    }
  } catch {
    // Default fallback
  }
  return { vatPercent: 8, netFactor: 1 / 1.08 }; // Default 8% VAT
}
