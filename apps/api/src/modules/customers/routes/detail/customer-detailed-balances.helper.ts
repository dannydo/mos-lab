import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';

export async function resolveDetailedCustomerLegacyId(fastify: FastifyInstance, customerId: number): Promise<number> {
  let resolvedCustomerId = customerId;
  const userDirect = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
    `SELECT id FROM \`user\` WHERE id = ? LIMIT 1`,
    customerId
  );
  if (userDirect.length === 0) {
    const campCust = await fastify.prisma.crm.crmCampaignCustomer.findUnique({
      where: { id: customerId },
    });
    if (campCust?.legacyUserId) {
      resolvedCustomerId = campCust.legacyUserId;
    } else {
      const assignCust = await fastify.prisma.crm.crmCustomerAssignment.findUnique({
        where: { id: customerId },
      });
      if (assignCust?.legacyUserId) {
        resolvedCustomerId = assignCust.legacyUserId;
      }
    }
  }
  return resolvedCustomerId;
}

export async function fetchCustomerProfileAndBalances(
  fastify: FastifyInstance,
  customerId: number,
  resolvedCustomerId: number
) {
  // 1. Fetch CRM Assignment for Online Consultant
  const assigned = await fastify.prisma.crm.crmCustomerAssignment.findFirst({
    where: { legacyUserId: resolvedCustomerId },
    include: { staff: true },
  });
  const onlineConsultantName = assigned?.staff?.displayName || 'Chưa phân bổ';

  // 2. Fetch Customer Profile details
  const customerSql = `
    SELECT 
      u.id, 
      COALESCE(up.full_name, 'No Name') as name, 
      up.avatar as avatar,
      COALESCE(up.is_deleted, 0) as isDeleted,
      up.is_foreign as is_foreign,
      up.is_foreign_overridden as is_foreign_overridden,
      COALESCE(uc.phone_number, '') as phone, 
      u.email,
      u.gender,
      u.date_of_birth as dob,
      up.last_order_booking as lastVisit,
      DATEDIFF(NOW(), up.last_order_booking) as daysSinceLastVisit,
      CASE
        WHEN elsa_res.id IS NOT NULL THEN 'COMBO_ELSA'
        WHEN usb.id IS NULL THEN 'SINGLE'
        WHEN (usb.normal_count + usb.retain_count) > 0 AND (usb.date_expired IS NULL OR usb.date_expired > NOW()) THEN 'COMBO_LIVE'
        ELSE 'COMBO_DEAD'
      END as bucket,
      usb.normal_count as normalCount,
      usb.retain_count as retainCount,
      usb.date_expired as expiryDate
    FROM user u
    LEFT JOIN user_profile up ON u.id = up.user_id
    LEFT JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
    LEFT JOIN user_service_balance usb ON u.id = usb.user_id
    LEFT JOIN mos_lab.crm_customer_elsa_reservations elsa_res ON elsa_res.legacy_user_id = u.id AND elsa_res.status = 'ACTIVE' AND (elsa_res.end_date IS NULL OR elsa_res.end_date >= NOW())
    WHERE u.id = ?
    LIMIT 1
  `;
  const [customerResult, elsaReservation] = await Promise.all([
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(customerSql, resolvedCustomerId),
    fastify.prisma.crm.crmCustomerElsaReservation.findFirst({
      where: {
        legacyUserId: resolvedCustomerId,
        status: 'ACTIVE',
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
      orderBy: { id: 'desc' },
    }),
  ]);
  if (customerResult.length === 0) {
    return { notFound: true as const };
  }
  const row = customerResult[0];

  // Fetch all phone numbers associated with the customer
  const userContacts = await fastify.prisma.legacy.user_contact.findMany({
    where: { user_id: resolvedCustomerId },
  });

  // 3. Fetch Completed Orders for financial and frequency metrics
  const completedOrders = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
    `SELECT o.id, o.order_key as orderKey, COALESCE(ro.actual_booking_date_start, o.booking_date_start) as bookingDate, o.total_price as totalPrice, o.assigned_staff_id as technicianId, o.created_staff_id as createdStaffId
     FROM \`order\` o
     LEFT JOIN report_order ro ON o.id = ro.order_id
     WHERE o.user_id = ? AND o.order_state = 'Completed'
     ORDER BY COALESCE(ro.actual_booking_date_start, o.booking_date_start) DESC`,
    customerId
  );

  // Completed service orders (excluding Fix, Log, Adjust warranty orders) for visit cycle & frequency
  const completedServiceOrders = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
    `SELECT o.id, o.order_key as orderKey, COALESCE(ro.actual_booking_date_start, o.booking_date_start) as bookingDate, o.total_price as totalPrice
     FROM \`order\` o
     LEFT JOIN report_order ro ON o.id = ro.order_id
     WHERE o.user_id = ? AND o.order_state = 'Completed'
       AND NOT EXISTS (
         SELECT 1 FROM order_service os_w
         WHERE os_w.order_id = o.id
           AND os_w.service_type IN ('Fix', 'Log', 'Adjust')
       )
     ORDER BY COALESCE(ro.actual_booking_date_start, o.booking_date_start) DESC`,
    customerId
  );

  const totalSpent = Math.round(completedOrders.reduce((sum, o) => sum + Number(o.totalPrice || 0), 0));
  const totalVisits = completedOrders.length;

  // 4. Calculate Average Visit Frequency (in days) based on genuine service orders
  let avgFrequency = 0;
  const frequencyOrders = completedServiceOrders.length > 1 ? completedServiceOrders : completedOrders;
  if (frequencyOrders.length > 1) {
    // Chronological order for calculating distance between consecutive dates
    const sortedBookingDates = [...frequencyOrders].map((o) => new Date(o.bookingDate).getTime()).sort((a, b) => a - b);
    let totalDays = 0;
    for (let i = 1; i < sortedBookingDates.length; i++) {
      totalDays += (sortedBookingDates[i] - sortedBookingDates[i - 1]) / (1000 * 60 * 60 * 24);
    }
    avgFrequency = Number((totalDays / (sortedBookingDates.length - 1)).toFixed(1));
  }

  // 4b. Fetch tips information from order_payment
  const completedOrderIds = completedOrders.map((o) => Number(o.id));
  const orderPaymentMap = new Map<number, { tips: number; debt: number; totalPaid: number }>();
  if (completedOrderIds.length > 0) {
    const orderPayments = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT order_id as orderId, tip_amount as tipAmount, paid_credit_amount as paidCredit, paid_cash_amount as paidCash, paid_credit_card_amount as paidCard, paid_bank_transfer_amount as paidBank, debt_amount as debt
      FROM \`order_payment\`
      WHERE order_id IN (${completedOrderIds.join(',')})
    `);
    orderPayments.forEach((op: SafeAny) => {
      const existing = orderPaymentMap.get(Number(op.orderId)) || { tips: 0, debt: 0, totalPaid: 0 };
      const paidSum =
        Number(op.paidCredit || 0) + Number(op.paidCash || 0) + Number(op.paidCard || 0) + Number(op.paidBank || 0);
      orderPaymentMap.set(Number(op.orderId), {
        tips: existing.tips + Number(op.tipAmount || 0),
        debt: existing.debt + Number(op.debt || 0),
        totalPaid: existing.totalPaid + paidSum,
      });
    });
  }

  let totalTips = 0;
  let tipCount = 0;
  completedOrders.forEach((o) => {
    const payInfo = orderPaymentMap.get(Number(o.id));
    if (payInfo && payInfo.tips > 0) {
      totalTips += payInfo.tips;
      tipCount += 1;
    }
  });
  const tipRate = totalVisits > 0 ? Number(((tipCount / totalVisits) * 100).toFixed(1)) : 0;
  const avgTip = tipCount > 0 ? Math.round(totalTips / tipCount) : 0;

  // 5. Fetch Combo Balances & Real Purchase Transactions
  const balanceSql = `
    WITH latest_combo AS (
      SELECT combo_sales.user_id, combo_sales.service_id, MAX(combo_sales.date_created) AS latest_date
      FROM (
        SELECT o3.date_created, osc3.service_id, o3.user_id
        FROM order_service_combo osc3
        JOIN \`order\` o3 ON osc3.order_id = o3.id
        LEFT JOIN service_price sp3 ON osc3.service_price_id = sp3.id
        WHERE o3.user_id = ? AND o3.order_state = 'Completed' AND osc3.total_price > 0
          AND (sp3.service_price_package_key IS NULL OR (
            LOWER(sp3.service_price_package_key) NOT LIKE '%single%'
            AND LOWER(sp3.service_price_package_key) NOT LIKE '%refill%'
            AND LOWER(sp3.service_price_package_key) NOT LIKE '%balance%'
          ))
        UNION ALL
        SELECT o3.date_created, os3.service_id, o3.user_id
        FROM order_service os3
        JOIN \`order\` o3 ON os3.order_id = o3.id
        LEFT JOIN service_price sp3 ON os3.service_price_id = sp3.id
        WHERE o3.user_id = ? AND o3.order_state = 'Completed' AND os3.total_price > 0
          AND (os3.user_service_type = 'combo' OR os3.service_group = 'combo')
          AND (sp3.service_price_package_key IS NULL OR (
            LOWER(sp3.service_price_package_key) NOT LIKE '%single%'
            AND LOWER(sp3.service_price_package_key) NOT LIKE '%refill%'
            AND LOWER(sp3.service_price_package_key) NOT LIKE '%balance%'
          ))
      ) combo_sales
      GROUP BY combo_sales.user_id, combo_sales.service_id
    )
    SELECT 
      CONCAT('osc_', osc.id) as id,
      osc.service_id as serviceId,
      osc.service_group as serviceGroup,
      CASE WHEN o.date_created = latest_combo.latest_date THEN COALESCE(usb.normal_count, 0) ELSE 0 END as normalCount,
      CASE WHEN o.date_created = latest_combo.latest_date THEN COALESCE(usb.retain_count, 0) ELSE 0 END as retainCount,
      usb.date_expired as dateExpired,
      o.date_created as dateCreated,
      s.service_key as serviceKey,
      COALESCE(sl.service_name, s.service_key) as serviceName,
      sp.normal_count as packageNormalCount,
      sp.service_price_package_key as packageKey,
      usb.total_normal_balance_amount as totalNormalBalanceAmount,
      usb.total_retain_balance_amount as totalRetainBalanceAmount,
      osc.total_price as packagePrice,
      up.full_name as creatorStaffName
    FROM order_service_combo osc
    JOIN \`order\` o ON osc.order_id = o.id
    LEFT JOIN service s ON osc.service_id = s.id
    LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
    LEFT JOIN service_price sp ON osc.service_price_id = sp.id
    LEFT JOIN (
      SELECT order_id, MAX(check_in_staff_id) as check_in_staff_id, MAX(check_out_staff_id) as check_out_staff_id
      FROM order_service
      GROUP BY order_id
    ) os_cc ON os_cc.order_id = o.id
    LEFT JOIN user_profile up ON COALESCE(os_cc.check_out_staff_id, os_cc.check_in_staff_id, o.created_staff_id) = up.user_id
    LEFT JOIN user_service_balance usb ON usb.user_id = o.user_id AND usb.service_id = osc.service_id AND usb.service_price_id = osc.service_price_id
    LEFT JOIN latest_combo ON latest_combo.user_id = o.user_id AND latest_combo.service_id = osc.service_id
    WHERE o.user_id = ? AND o.order_state = 'Completed' AND osc.total_price > 0
      AND (sp.service_price_package_key IS NULL OR (
        LOWER(sp.service_price_package_key) NOT LIKE '%single%'
        AND LOWER(sp.service_price_package_key) NOT LIKE '%refill%'
        AND LOWER(sp.service_price_package_key) NOT LIKE '%balance%'
      ))

    UNION ALL

    SELECT 
      CONCAT('os_', os.id) as id,
      os.service_id as serviceId,
      os.service_group as serviceGroup,
      CASE WHEN o.date_created = latest_combo.latest_date THEN COALESCE(usb.normal_count, 0) ELSE 0 END as normalCount,
      CASE WHEN o.date_created = latest_combo.latest_date THEN COALESCE(usb.retain_count, 0) ELSE 0 END as retainCount,
      usb.date_expired as dateExpired,
      o.date_created as dateCreated,
      s.service_key as serviceKey,
      COALESCE(sl.service_name, s.service_key) as serviceName,
      sp.normal_count as packageNormalCount,
      sp.service_price_package_key as packageKey,
      usb.total_normal_balance_amount as totalNormalBalanceAmount,
      usb.total_retain_balance_amount as totalRetainBalanceAmount,
      os.total_price as packagePrice,
      up.full_name as creatorStaffName
    FROM order_service os
    JOIN \`order\` o ON os.order_id = o.id
    LEFT JOIN service s ON os.service_id = s.id
    LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
    LEFT JOIN service_price sp ON os.service_price_id = sp.id
    LEFT JOIN user_profile up ON COALESCE(os.check_out_staff_id, os.check_in_staff_id, o.created_staff_id) = up.user_id
    LEFT JOIN user_service_balance usb ON usb.user_id = o.user_id AND usb.service_id = os.service_id AND usb.service_price_id = os.service_price_id
    LEFT JOIN latest_combo ON latest_combo.user_id = o.user_id AND latest_combo.service_id = os.service_id
    WHERE o.user_id = ? AND o.order_state = 'Completed'
      AND (os.user_service_type = 'combo' OR s.service_group = 'combo')
      AND os.total_price > 0
      AND (sp.service_price_package_key IS NULL OR (
        LOWER(sp.service_price_package_key) NOT LIKE '%single%'
        AND LOWER(sp.service_price_package_key) NOT LIKE '%refill%'
        AND LOWER(sp.service_price_package_key) NOT LIKE '%balance%'
      ))

    UNION ALL

    SELECT 
      CONCAT('usb_', usb.id) as id,
      usb.service_id as serviceId,
      usb.service_group as serviceGroup,
      usb.normal_count as normalCount,
      usb.retain_count as retainCount,
      usb.date_expired as dateExpired,
      usb.date_created as dateCreated,
      s.service_key as serviceKey,
      COALESCE(sl.service_name, s.service_key) as serviceName,
      sp.normal_count as packageNormalCount,
      sp.service_price_package_key as packageKey,
      usb.total_normal_balance_amount as totalNormalBalanceAmount,
      usb.total_retain_balance_amount as totalRetainBalanceAmount,
      sp.service_price as packagePrice,
      up.full_name as creatorStaffName
    FROM user_service_balance usb
    LEFT JOIN service s ON usb.service_id = s.id
    LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
    LEFT JOIN service_price sp ON usb.service_price_id = sp.id
    LEFT JOIN user_profile up ON COALESCE(usb.updated_staff_id, usb.created_staff_id) = up.user_id
    WHERE usb.user_id = ?
      AND NOT EXISTS (
        SELECT 1 FROM order_service_combo osc2 
        JOIN \`order\` o2 ON osc2.order_id = o2.id 
        LEFT JOIN service_price sp2 ON osc2.service_price_id = sp2.id
        WHERE o2.user_id = usb.user_id AND osc2.service_id = usb.service_id AND osc2.service_price_id = usb.service_price_id AND o2.order_state = 'Completed' AND osc2.total_price > 0
          AND (sp2.service_price_package_key IS NULL OR (
            LOWER(sp2.service_price_package_key) NOT LIKE '%single%'
            AND LOWER(sp2.service_price_package_key) NOT LIKE '%refill%'
            AND LOWER(sp2.service_price_package_key) NOT LIKE '%balance%'
          ))
      )
      AND NOT EXISTS (
        SELECT 1 FROM order_service os2 
        JOIN \`order\` o2 ON os2.order_id = o2.id 
        LEFT JOIN service_price sp2 ON os2.service_price_id = sp2.id
        WHERE o2.user_id = usb.user_id AND os2.service_id = usb.service_id AND os2.service_price_id = usb.service_price_id AND o2.order_state = 'Completed' AND os2.total_price > 0
          AND (os2.user_service_type = 'combo' OR os2.service_group = 'combo')
          AND (sp2.service_price_package_key IS NULL OR (
            LOWER(sp2.service_price_package_key) NOT LIKE '%single%'
            AND LOWER(sp2.service_price_package_key) NOT LIKE '%refill%'
            AND LOWER(sp2.service_price_package_key) NOT LIKE '%balance%'
          ))
      )
    ORDER BY dateCreated DESC
  `;
  const comboBalances = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
    balanceSql,
    customerId,
    customerId,
    customerId,
    customerId,
    customerId
  );

  // Fetch Gem Balance and transactions
  const gemBalanceRow = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
    `SELECT amount FROM user_balance WHERE user_id = ? AND currency_id = 3 LIMIT 1`,
    customerId
  );
  const gemBalance = gemBalanceRow.length > 0 ? Number(gemBalanceRow[0].amount) : 0;

  const gemTransactionsSql = `
    SELECT 
      ubt.id,
      ubt.method,
      ubt.amount,
      ubt.balance,
      ubt.description,
      ubt.template_id as templateId,
      ubt.date_created as dateCreated,
      up.full_name as staffName,
      o.booking_date_start as bookingDateStart,
      up_referred.full_name as referredName
    FROM user_balance_transaction ubt
    LEFT JOIN user_profile up ON ubt.created_staff_id = up.user_id
    LEFT JOIN \`order\` o ON 
      ubt.tracking_key IS NOT NULL AND 
      JSON_VALID(ubt.tracking_key) AND 
      o.id = CAST(JSON_UNQUOTE(JSON_EXTRACT(ubt.tracking_key, '$.order_id')) AS UNSIGNED)
    LEFT JOIN user_profile up_referred ON 
      ubt.tracking_key IS NOT NULL AND 
      JSON_VALID(ubt.tracking_key) AND 
      up_referred.user_id = CAST(JSON_UNQUOTE(JSON_EXTRACT(ubt.tracking_key, '$.user_id')) AS UNSIGNED)
    WHERE ubt.user_id = ? AND ubt.currency_id = 3
    ORDER BY ubt.date_created DESC
  `;
  const gemTransactions = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(gemTransactionsSql, customerId);

  // Fetch Referrer details (Who referred this customer)
  const referrerRow = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
    `SELECT 
       u.id, 
       up.full_name as name, 
       COALESCE(uc.phone_number, '') as phone
     FROM user u
     LEFT JOIN user_profile up ON u.id = up.user_id
     LEFT JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
     WHERE u.id = (SELECT referrer_user_id FROM user_profile WHERE user_id = ? LIMIT 1)
     LIMIT 1`,
    customerId
  );
  const referrer =
    referrerRow.length > 0
      ? {
          id: Number(referrerRow[0].id),
          name: referrerRow[0].name,
          phone: referrerRow[0].phone,
        }
      : null;

  // Fetch Referred Users list (Who this customer referred)
  const referredUsers = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
    `SELECT 
       u.id, 
       up.full_name as name, 
       COALESCE(uc.phone_number, '') as phone,
       u.date_created as dateCreated
     FROM user u
     LEFT JOIN user_profile up ON u.id = up.user_id
     LEFT JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
     WHERE up.referrer_user_id = ?
     ORDER BY u.id DESC`,
    customerId
  );

  // Fetch referral transactions for this user (where they acted as referrer)
  const referralTxs = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
    `SELECT amount, tracking_key FROM user_balance_transaction 
     WHERE user_id = ? AND template_id = 7 AND currency_id = 3`,
    customerId
  );

  // Map referred user ID to reward amount
  const rewardMap = new Map<number, number>();
  for (const tx of referralTxs) {
    try {
      if (tx.tracking_key) {
        const keyObj = JSON.parse(tx.tracking_key);
        const referredId = Number(keyObj.user_id);
        if (referredId) {
          rewardMap.set(referredId, Number(tx.amount));
        }
      }
    } catch {
      // ignore parsing error
    }
  }

  // Collapse duplicate contacts by user ID
  const friendsGrouped = new Map<number, SafeAny>();
  for (const ru of referredUsers) {
    const friendId = Number(ru.id);
    if (!friendId) continue;

    if (friendsGrouped.has(friendId)) {
      const existing = friendsGrouped.get(friendId);
      if (ru.phone && !existing.phone.includes(ru.phone)) {
        existing.phone = existing.phone ? `${existing.phone}, ${ru.phone}` : ru.phone;
      }
    } else {
      friendsGrouped.set(friendId, {
        id: friendId,
        name: ru.name || 'Khách hàng',
        phone: ru.phone || '',
        dateCreated: ru.dateCreated ? new Date(ru.dateCreated).toISOString() : null,
        rewardDiamonds: rewardMap.get(friendId) || 0,
      });
    }
  }

  const formattedReferred = Array.from(friendsGrouped.values());

  return {
    notFound: false as const,
    assigned,
    onlineConsultantName,
    row,
    elsaReservation,
    userContacts,
    completedOrders,
    completedServiceOrders,
    totalSpent,
    totalVisits,
    avgFrequency,
    orderPaymentMap,
    totalTips,
    tipRate,
    avgTip,
    comboBalances,
    gemBalance,
    gemTransactions,
    referrer,
    formattedReferred,
  };
}

function formatUtcDate(dateInput: SafeAny): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function formatGemDescription(trans: SafeAny): string {
  if (trans.description && trans.description.trim()) {
    return trans.description;
  }

  const tid = trans.templateId ? Number(trans.templateId) : null;
  const amt = Number(trans.amount || 0);

  switch (tid) {
    case 6:
      return 'Cám ơn đã sử dụng dịch vụ tại Wings (Lần đầu)';
    case 7:
      return trans.referredName
        ? `Thưởng giới thiệu bạn ${trans.referredName.trim()}`
        : 'Bạn vừa nhận được kim cương từ việc giới thiệu bạn';
    case 8:
      return trans.bookingDateStart
        ? `Thanh toán lịch hẹn ngày ${formatUtcDate(trans.bookingDateStart)}`
        : 'Bạn vừa sử dụng kim cương cho dịch vụ';
    case 12:
      return 'Đăng ký thành công chương trình giới thiệu nhận Kim Cương';
    case 17:
      return 'Trừ kim cương do khách hàng phản hồi cần điều chỉnh (Fix)';
    case 22:
    case 28:
      return trans.staffName ? `Nhận kim cương từ nhân viên ${trans.staffName}` : 'Nhận kim cương từ cửa hàng';
    case 29:
      return 'Chuyển kim cương cho tài khoản khác';
    case 58:
      return 'Mua gói Combo dịch vụ';
    case 60:
      if (trans.bookingDateStart) {
        return `Tích lũy từ lịch hẹn ngày ${formatUtcDate(trans.bookingDateStart)}`;
      }
      return 'Tích lũy từ lịch hẹn hoàn thành';
    case 91:
      return 'Trừ kim cương từ phản hồi khiếu nại';
    case 92:
    case 93:
      return 'Khấu trừ tài khoản quyết toán định kỳ';
    case 99:
      return 'Thưởng hoàn thành nhiệm vụ nhân viên';
    case 102:
      return 'Hoàn lại kim cương giao dịch';
    case 160:
      return 'Tham gia chương trình/game tích điểm';
    case 164:
      return 'Thưởng hoàn thành game tích điểm';
    case 168:
      return 'Thưởng khách hàng quay lại sớm';
    case 198:
      return 'Quà tặng chúc mừng sinh nhật';
    default:
      return amt < 0 ? 'Giao dịch trừ kim cương' : 'Tích lũy kim cương';
  }
}

export function formatDetailedGemTransactions(gemTransactions: SafeAny[]) {
  return gemTransactions.map((t) => ({
    id: Number(t.id),
    method: t.method,
    amount: Number(t.amount),
    balance: Number(t.balance),
    description: formatGemDescription(t),
    dateCreated: t.dateCreated ? new Date(t.dateCreated).toISOString() : null,
    staffName: t.staffName || 'Hệ thống',
  }));
}
