import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';

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

    const configs = request.body as Record<string, any[]>;
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
          { key: 'now', label: 'Chạm 24h', daysMin: 0, daysMax: 1, color: 'blue' },
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
    const user = request.user as { role: string };
    if (user.role !== 'admin') {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Chỉ Admin mới có quyền cấu hình touchpoints.',
      });
    }

    const configs = request.body as Record<string, any[]>;
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

  // GET /api/dashboard/today - Real operational data for the "today" dashboard
  fastify.get('/dashboard/today', { preHandler: [requireAuth] }, async (request, reply) => {
    const { date } = request.query as { date?: string };
    const getVnDateStr = () => {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(new Date());
    };
    const targetDateStr = date || getVnDateStr();

    // booking_date_only needs timezone-naive date at UTC midnight
    const bookingDateOnlyDate = new Date(targetDateStr + 'T00:00:00.000Z');

    // Since database datetimes are local and Prisma reads them as UTC,
    // we query using timezone-naive start/end bounds directly
    const startOfDay = new Date(targetDateStr + 'T00:00:00.000Z');
    const endOfDay = new Date(targetDateStr + 'T23:59:59.999Z');

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

      // 2. Query coming today
      const comingOrders = await fastify.prisma.legacy.order.findMany({
        where: {
          OR: [{ booking_date_only: bookingDateOnlyDate }, { booking_date_start: { gte: startOfDay, lte: endOfDay } }],
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

      // Index transactions by balance ID for O(1) lookups
      const txnsByBalanceId = new Map<number, any[]>();
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
        SELECT up.user_id as userId, up.full_name as fullName
        FROM \`staff_profile\` sp
        JOIN \`user_profile\` up ON sp.user_id = up.user_id
        WHERE up.provider = 'Staff' AND up.is_disabled = 0
      `);
      const staffMap = new Map(staffProfiles.map((s) => [Number(s.userId), s.fullName]));

      // Exact legacy PHP combo active helper function
      const checkHasLiveCombo = (userId: number, bookingDateStart: Date | null, orderCreatedDate: Date) => {
        const bTime = bookingDateStart || orderCreatedDate;
        const userBals = userBalances.filter((b) => b.user_id === userId);

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
          let countLeft = 0;
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
        const userBal = userBalances.filter((b) => b.user_id === o.user_id);
        const group = hasLiveCombo ? 'combo_live' : userBal.length > 0 ? 'combo_dead' : 'single';

        const booker = staffMap.get(Number(o.created_staff_id)) || o.booking_channels || 'System';

        const orderSvs = allOrderServices.filter((cs) => cs.order_id === o.id);
        const firstPromoSv = orderSvs.find((cs) => cs.promotion_id !== null && cs.promotion_id !== undefined);
        const pId = firstPromoSv?.promotion_id || o.promotion_id || o.selected_promotion_id;
        const promoName = pId ? promoMap.get(Number(pId)) || `PROMO-${pId}` : null;

        const firstCvStaffId =
          o.assigned_staff_id ||
          (orderSvs.length > 0 ? orderSvs.find((cs) => cs.assigned_staff_id !== null)?.assigned_staff_id : null);
        const cvRequested = firstCvStaffId ? staffMap.get(Number(firstCvStaffId)) || 'Kỹ thuật viên' : 'Chưa phân công';

        let status: 'completed' | 'serving' | 'confirmed' | 'pending' | 'late' = 'pending';
        if (o.order_state === 'Completed') {
          status = 'completed';
        } else if (
          [
            'CheckIn',
            'Consultation',
            'Preparation',
            'ServiceStart',
            'ServiceCleaned',
            'ServiceEnd',
            'ServiceCompleted',
            'CheckOut',
            'Parking',
          ].includes(o.order_state)
        ) {
          status = 'serving';
        } else if (o.order_state === 'Confirmed' || o.order_state === 'New' || o.order_state === 'Approved') {
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

      const getKTVOffDays = (userId: number) => {
        const weekOffs = weekOffsByUserId[userId] || [];
        if (weekOffs.length > 0) {
          const sorted = [...weekOffs].sort((a, b) => b.cnt - a.cnt);
          return [String(sorted[0].weekday)];
        }

        const list = schedulesByUserId[userId] || [];
        const worksAll = list.some((s) => s.type === 'Day' && s.type_value === 'All');
        if (worksAll) return [];
        const workingWeekdays = list.filter((s) => s.type === 'Weekday').map((s) => s.type_value);
        if (workingWeekdays.length === 0) return [];
        const allWeekdays = ['1', '2', '3', '4', '5', '6', '7'];
        return allWeekdays.filter((w) => !workingWeekdays.includes(w));
      };

      // 3. Query specific day-offs for target date
      const dayOffs = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT from_user_id FROM staff_day_off 
         WHERE ? BETWEEN from_date AND to_date AND request_state = 'Approved' AND from_user_id IS NOT NULL`,
        targetDateStr
      );
      const offUserIds = new Set(dayOffs.map((d) => Number(d.from_user_id)));

      // 4. Query active CVs (technicians)
      const activeCvs = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT user_id as userId, full_name as fullName, client_store_id as storeId
        FROM \`user_profile\`
        WHERE provider = 'Staff' AND user_group_id = 4 AND is_disabled = 0 AND is_leaved = 0 AND is_deleted = 0
      `);

      const dayOfWeek = new Date(targetDateStr).getDay();
      const weekdayStr = dayOfWeek === 0 ? '7' : String(dayOfWeek);

      const branchDetailMap: Record<string, any> = {
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
          cvName = staffMap.get(Number(o.assigned_staff_id)) || 'Kỹ thuật viên';
        } else if (orderSvs.length > 0 && orderSvs[0].assigned_staff_id) {
          cvName = staffMap.get(Number(orderSvs[0].assigned_staff_id)) || 'Kỹ thuật viên';
        }

        const booker = staffMap.get(Number(o.created_staff_id)) || o.booking_channels || 'System';

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

        let status: 'completed' | 'serving' | 'confirmed' | 'pending' | 'late' = 'pending';
        if (o.order_state === 'Completed') {
          status = 'completed';
        } else if (
          [
            'CheckIn',
            'Consultation',
            'Preparation',
            'ServiceStart',
            'ServiceCleaned',
            'ServiceEnd',
            'ServiceCompleted',
            'CheckOut',
            'Parking',
          ].includes(o.order_state)
        ) {
          status = 'serving';
        } else if (o.order_state === 'Confirmed' || o.order_state === 'New' || o.order_state === 'Approved') {
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

      const refTime = new Date();
      const normalizeName = (name: string) => (name || '').trim().toLowerCase();

      // Fetch working shifts for today
      const workingShifts = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `
        SELECT * FROM \`staff_working_shift\` WHERE \`date\` = ?
      `,
        targetDateStr
      );

      const shiftMap = new Map<number, any>();
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

      // Calculate and populate Chuyên viên (CV) list for each branch
      activeCvs.forEach((cv) => {
        const storeId = Number(cv.storeId);
        let bKey = 'estella';
        if (storeId === 6) bKey = 'detham';
        else if (storeId === 2) bKey = 'pxl';

        const cvId = Number(cv.userId);
        const normName = normalizeName(cv.fullName);

        // Check if weekly off or specific day off
        const offDays = getKTVOffDays(cvId);
        const isWeeklyOff = offDays.includes(weekdayStr);
        const hasSpecificDayOff = offUserIds.has(cvId);
        const isOff = isWeeklyOff || hasSpecificDayOff;

        // Check actual check-in/out record (workingShifts)
        const wsRecord = shiftMap.get(cvId);

        let shift: 'sáng' | 'chiều' | 'full' | 'off' = 'full';
        if (isOff) {
          shift = 'off';
        } else {
          // Determine scheduled shift from staff_working_shift_schedule
          const list = schedulesByUserId[cvId] || [];
          const todaySchedule =
            list.find((s) => s.type === 'Weekday' && s.type_value === weekdayStr) ||
            list.find((s) => s.type === 'Day' && s.type_value === 'All');
          if (todaySchedule) {
            shift = getShiftType(todaySchedule.start_time, todaySchedule.end_time);
          }
        }

        let attendance: 'none' | 'checked_in' | 'checked_out' | 'late' = 'none';
        let doing = isOff ? 'Nghỉ phép' : 'Chưa check-in';

        if (wsRecord) {
          if (!isOff || wsRecord.check_in_staff_task_id !== null) {
            shift = getShiftType(wsRecord.start_time, wsRecord.end_time);
          }
          if (wsRecord.check_out_staff_task_id !== null) {
            attendance = 'checked_out';
            doing = 'Đã về';
          } else if (wsRecord.check_in_staff_task_id !== null) {
            attendance = 'checked_in';
            doing = 'Đang trống';
          }
        }

        // Get orders assigned to this CV
        const staffOrders = comingOrders.filter((o) => {
          if (o.assigned_staff_id === cvId) return true;
          const assignedName = staffMap.get(Number(o.assigned_staff_id));
          if (assignedName && normalizeName(assignedName) === normName) return true;
          const orderSvs = comingServices.filter((cs) => cs.order_id === o.id);
          for (const cs of orderSvs) {
            if (cs.assigned_staff_id === cvId) return true;
            const csAssignedName = staffMap.get(Number(cs.assigned_staff_id));
            if (csAssignedName && normalizeName(csAssignedName) === normName) return true;
          }
          return false;
        });

        let status: 'available' | 'busy' = 'available';

        if (!isOff && attendance === 'checked_in') {
          // Find active order
          const activeOrder = staffOrders.find((o) => {
            if (o.order_state === 'Cancelled' || o.order_state === 'Completed') return false;
            if (!o.booking_date_start || !o.booking_date_end) return false;
            const start = toActualDate(o.booking_date_start);
            const end = toActualDate(o.booking_date_end);
            return refTime >= start && refTime <= end;
          });

          if (activeOrder) {
            const custProfile = profileMap.get(activeOrder.user_id);
            const custName = custProfile?.fullName ? custProfile.fullName.trim() : 'Khách hàng';
            const parts = custName.split(' ');
            const shortCustName = parts.length > 2 ? parts.slice(-2).join(' ') : custName;

            const orderSvs = comingServices.filter((cs) => cs.order_id === activeOrder.id);
            const svName = orderSvs.length > 0 ? serviceLangMap.get(orderSvs[0].service_id) || 'Dịch vụ' : 'Dịch vụ';

            const start = toActualDate(activeOrder.booking_date_start);
            const end = toActualDate(activeOrder.booking_date_end);
            const totalMin = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
            const elapsedMin = Math.max(
              0,
              Math.min(totalMin, Math.round((refTime.getTime() - start.getTime()) / 60000))
            );

            doing = `[${elapsedMin}/${totalMin}] ${shortCustName}: ${svName}`;
            status = 'busy';
          } else {
            // Find next upcoming order
            const upcoming = staffOrders
              .filter((o) => {
                if (o.order_state === 'Cancelled' || o.order_state === 'Completed') return false;
                if (!o.booking_date_start) return false;
                return toActualDate(o.booking_date_start) > refTime;
              })
              .sort(
                (a, b) => toActualDate(a.booking_date_start).getTime() - toActualDate(b.booking_date_start).getTime()
              );

            if (upcoming.length > 0) {
              const nextOrder = upcoming[0];
              const timeStr = formatDbTime(nextOrder.booking_date_start);
              const orderSvs = comingServices.filter((cs) => cs.order_id === nextOrder.id);
              const svName = orderSvs.length > 0 ? serviceLangMap.get(orderSvs[0].service_id) || 'Dịch vụ' : 'Dịch vụ';
              doing = `Chờ khách: ${svName} (${timeStr})`;
            }
          }
        }

        branchDetailMap[bKey].cv.push({
          name: cv.fullName.trim(),
          doing,
          clients: isOff ? 0 : staffOrders.length,
          shift,
          attendance,
          status,
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
}
