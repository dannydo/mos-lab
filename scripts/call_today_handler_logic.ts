import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client';
import { PrismaClient as CrmPrismaClient } from '../apps/api/src/generated/crm-client';

const legacy = new LegacyPrismaClient({
  datasources: {
    db: {
      url: "mysql://root:chickisslove@127.0.0.1:3306/management"
    }
  }
});

const crm = new CrmPrismaClient({
  datasources: {
    db: {
      url: "mysql://root:chickisslove@127.0.0.1:3306/crm"
    }
  }
});

async function main() {
  try {
    await legacy.$connect();
    try {
      await crm.$connect();
    } catch (e) {
      console.log("Could not connect to crm db, continuing");
    }

    const targetDateStr = '2026-07-12';
    
    // booking_date_only needs timezone-naive date at UTC midnight
    const bookingDateOnlyDate = new Date(targetDateStr + 'T00:00:00.000Z');

    // Since database datetimes are local and Prisma reads them as UTC,
    // we query using timezone-naive start/end bounds directly
    const startOfDay = new Date(targetDateStr + 'T00:00:00.000Z');
    const endOfDay = new Date(targetDateStr + 'T23:59:59.999Z');

    const toActualDate = (dbDate: Date | null | undefined) => {
      if (!dbDate) return new Date(0);
      return new Date(Date.UTC(
        dbDate.getUTCFullYear(),
        dbDate.getUTCMonth(),
        dbDate.getUTCDate(),
        dbDate.getUTCHours(),
        dbDate.getUTCMinutes(),
        dbDate.getUTCSeconds()
      ) - 7 * 3600 * 1000);
    };

    const formatDbTime = (dbDate: Date | null | undefined) => {
      if (!dbDate) return '00:00';
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(dbDate.getUTCHours())}:${pad(dbDate.getUTCMinutes())}`;
    };

    // Get active Telesales/OC names from CRM database
    let telesalesNames = new Set<string>();
    try {
      const crmTelesales = await crm.crmStaff.findMany({
        where: {
          OR: [
            { role: 'telesales' },
            { displayName: { in: ['Tâm Nguyễn'] } }
          ],
          isActive: true
        },
        select: { displayName: true }
      });
      telesalesNames = new Set(crmTelesales.map(s => s.displayName.trim().toLowerCase()));
    } catch (e) {
      console.log("CRM database not available, using empty telesalesNames");
    }

    // 1. Query bookings created today
    const bookingsOrders = await legacy.order.findMany({
      where: {
        date_created: {
          gte: startOfDay,
          lte: endOfDay
        },
        order_state: { not: 'Cancelled' }
      },
      orderBy: { date_created: 'desc' }
    });

    // 2. Query coming today
    const comingOrders = await legacy.order.findMany({
      where: {
        OR: [
          { booking_date_only: bookingDateOnlyDate },
          { booking_date_start: { gte: startOfDay, lte: endOfDay } }
        ],
        order_state: { not: 'Cancelled' }
      },
      orderBy: { booking_date_start: 'asc' }
    });

    const userIds = Array.from(new Set([
      ...bookingsOrders.map(o => o.user_id),
      ...comingOrders.map(o => o.user_id)
    ]));
    
    const userProfiles = userIds.length > 0 ? await legacy.$queryRawUnsafe<any[]>(`
      SELECT up.user_id as userId, up.full_name as fullName, up.avatar, u.email, u.gender, u.date_of_birth as dob
      FROM \`user_profile\` up
      LEFT JOIN \`user\` u ON up.user_id = u.id
      WHERE up.user_id IN (${userIds.join(',')})
    `) : [];

    const userContacts = userIds.length > 0 ? await legacy.$queryRawUnsafe<any[]>(`
      SELECT user_id as userId, phone_number as phoneNumber
      FROM \`user_contact\`
      WHERE user_id IN (${userIds.join(',')}) AND is_disabled = 0
    `) : [];

    const userBalances = userIds.length > 0 ? await legacy.user_service_balance.findMany({
      where: { user_id: { in: userIds } }
    }) : [];

    const balanceIds = userBalances.map(b => b.id);
    const userBalanceTransactions = balanceIds.length > 0 ? await legacy.$queryRawUnsafe<any[]>(`
      SELECT usbt.*, o.booking_date_start as o_booking_date_start
      FROM user_service_balance_transaction usbt
      LEFT JOIN \`order\` o ON o.id = usbt.order_id
      WHERE usbt.user_service_balance_id IN (${balanceIds.join(',')})
    `) : [];

    // Index transactions by balance ID
    const txnsByBalanceId = new Map<number, any[]>();
    for (const t of userBalanceTransactions) {
      const bid = Number(t.user_service_balance_id);
      let list = txnsByBalanceId.get(bid);
      if (!list) {
        list = [];
        txnsByBalanceId.set(bid, list);
      }
      list.push(t);
    }

    const allOrderIds = Array.from(new Set([
      ...bookingsOrders.map(o => o.id),
      ...comingOrders.map(o => o.id)
    ]));

    const allOrderServices = allOrderIds.length > 0 ? await legacy.order_service.findMany({
      where: { order_id: { in: allOrderIds } }
    }) : [];

    const profileMap = new Map(userProfiles.map(p => [Number(p.userId), p]));
    const contactMap = new Map(userContacts.map(c => [Number(c.userId), c.phoneNumber]));

    const checkHasLiveCombo = (userId: number, bookingDateStart: Date | null, orderCreatedDate: Date) => {
      const bTime = bookingDateStart || orderCreatedDate;
      const userBals = userBalances.filter(b => b.user_id === userId);
      
      for (const usb of userBals) {
        if (new Date(usb.date_created) >= new Date(bTime)) {
          continue;
        }

        const txnsBefore = (txnsByBalanceId.get(usb.id) || []).filter(t => 
          new Date(t.o_booking_date_start || t.date_created) < new Date(bTime)
        );

        txnsBefore.sort((a, b) => {
          const timeA = new Date(a.o_booking_date_start || a.date_created).getTime();
          const timeB = new Date(b.o_booking_date_start || b.date_created).getTime();
          if (timeA !== timeB) return timeB - timeA;
          return b.id - a.id;
        });

        const lastTxnBefore = txnsBefore[0];

        const dateExpired = lastTxnBefore ? lastTxnBefore.date_expired : usb.date_expired;
        const isNotExpired = !dateExpired || new Date(dateExpired) >= new Date(new Date(bTime).toISOString().slice(0, 10));

        let countLeft = 0;
        if (lastTxnBefore && lastTxnBefore.total_normal_count_left !== null && lastTxnBefore.total_retain_count_left !== null) {
          countLeft = (lastTxnBefore.total_normal_count_left || 0) + (lastTxnBefore.total_retain_count_left || 0);
        } else {
          const txnsAfterOrAt = (txnsByBalanceId.get(usb.id) || []).filter(t => 
            new Date(t.o_booking_date_start || t.date_created) >= new Date(bTime)
          );
          
          let usedAfter = 0;
          txnsAfterOrAt.forEach(t => {
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

    const bookingsCombo: any[] = [];
    const bookingsOc: any[] = [];
    const bookingsOther: any[] = [];

    const staffProfiles = await legacy.$queryRawUnsafe<any[]>(`
      SELECT up.user_id as userId, up.full_name as fullName
      FROM \`staff_profile\` sp
      JOIN \`user_profile\` up ON sp.user_id = up.user_id
      WHERE up.provider = 'Staff' AND up.is_disabled = 0
    `);
    const staffMap = new Map(staffProfiles.map(s => [Number(s.userId), s.fullName]));

    bookingsOrders.forEach((o, index) => {
      const uProfile = profileMap.get(o.user_id);
      const phone = contactMap.get(o.user_id) || '';
      const name = uProfile?.fullName || 'Khách hàng';
      const hasLiveCombo = checkHasLiveCombo(o.user_id, o.booking_date_start, o.date_created);
      const userBal = userBalances.filter(b => b.user_id === o.user_id);
      const group = hasLiveCombo ? 'combo_live' : (userBal.length > 0 ? 'combo_dead' : 'single');
      const booker = staffMap.get(Number(o.created_staff_id)) || o.booking_channels || 'System';

      const record = {
        key: String(o.id),
        customer: name,
        group,
        booker
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

    console.log("bookingsCombo count:", bookingsCombo.length);
    console.log("bookingsOc count:", bookingsOc.length);
    console.log("bookingsOther count:", bookingsOther.length);
    console.log("Total Bookings count:", bookingsCombo.length + bookingsOc.length + bookingsOther.length);

    console.log("bookingsCombo items:", bookingsCombo.map(c => c.customer));

  } catch (err) {
    console.error(err);
  } finally {
    await legacy.$disconnect();
    await crm.$disconnect();
  }
}

main();
