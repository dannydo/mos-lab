import type { FastifyInstance } from 'fastify';
import { calculateComboBonus, CvPlusComboDetail, CvPlusRewardSnapshot, SafeAny } from '@mos-lab/shared';
import { ComboRecognitionService } from '../../customers/services/combo-recognition.service.js';
import {
  buildExcludeOtherMenteeTrainingOrderSql,
  buildIsMenteeTrainingWindowSql,
  CvlTrainingMentorshipService,
} from '../../kpi/services/cvl-training-mentorship.service.js';
import { getCareerConfig } from './career-config.service.js';
import {
  buildCheckoutAttributionSqlCondition,
  CvRewardCalculationMode,
  resolveBranchInfo,
  resolveCvTipSplitFromRows,
} from './career-helpers.js';

function resolveRewardDateRange(targetMonthOrRange?: string | { startStr: string; endStr: string }) {
  let month: string;
  let startStr: string;
  let endStr: string;
  let rangeStartDate: string;
  let rangeEndDate: string;
  let isCustomRange = false;

  if (typeof targetMonthOrRange === 'object' && targetMonthOrRange?.startStr && targetMonthOrRange?.endStr) {
    isCustomRange = true;
    startStr = targetMonthOrRange.startStr.includes(' ')
      ? targetMonthOrRange.startStr
      : `${targetMonthOrRange.startStr} 00:00:00`;
    endStr = targetMonthOrRange.endStr.includes(' ')
      ? targetMonthOrRange.endStr
      : `${targetMonthOrRange.endStr} 23:59:59`;
    month = startStr.substring(0, 7);
    rangeStartDate = startStr.slice(0, 10);
    rangeEndDate = endStr.slice(0, 10);
  } else {
    month = (targetMonthOrRange as string) || '';
    if (!month) {
      const now = new Date();
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const y = prevDate.getFullYear();
      const m = String(prevDate.getMonth() + 1).padStart(2, '0');
      month = `${y}-${m}`;
    }

    startStr = `${month}-01 00:00:00`;
    const [yStr, mStr] = month.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const nextMonthDate = new Date(y, m, 1);
    const nextY = nextMonthDate.getFullYear();
    const nextM = String(nextMonthDate.getMonth() + 1).padStart(2, '0');
    endStr = `${nextY}-${nextM}-01 00:00:00`;
    rangeStartDate = `${month}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    rangeEndDate = `${month}-${String(lastDay).padStart(2, '0')}`;
  }

  return {
    month,
    startStr,
    endStr,
    rangeStartDate,
    rangeEndDate,
    endOp: isCustomRange ? '<=' : '<',
  };
}

async function persistCvPlusRewardSnapshot(
  fastify: FastifyInstance,
  targetLegacyStaffId: number,
  month: string,
  snapshot: CvPlusRewardSnapshot
) {
  try {
    await fastify.prisma.crm.crmStaffCvPlusRewardSnapshot.upsert({
      where: {
        staffId_month: {
          staffId: targetLegacyStaffId,
          month,
        },
      },
      update: {
        totalOrders: snapshot.totalOrders,
        workingDays: snapshot.workingDays,
        workingHours: snapshot.workingHours,
        comboLiveOrders: snapshot.comboLiveOrders,
        notComboLiveOrders: snapshot.notComboLiveOrders,
        comboSoldCount: snapshot.comboSoldCount,
        selfComboRate: snapshot.selfComboRate,
        isTargetHit: snapshot.isTargetHit,
        isPenalized: snapshot.isPenalized,
        baseWageCv: snapshot.baseWageCv,
        baseWageCvPlus: snapshot.baseWageCvPlus,
        tipCv: snapshot.tipCv,
        tipCvPlus: snapshot.tipCvPlus,
        comboBonusTotal: snapshot.comboBonusTotal,
        productBonusTotal: snapshot.productBonusTotal,
        totalCvIncome: snapshot.totalCvIncome,
        totalCvPlusIncome: snapshot.totalCvPlusIncome,
        deltaGain: snapshot.deltaGain,
        deltaPercentage: snapshot.deltaPercentage,
        breakdownJson: JSON.stringify(snapshot.comboDetails),
      },
      create: {
        staffId: targetLegacyStaffId,
        month,
        totalOrders: snapshot.totalOrders,
        workingDays: snapshot.workingDays,
        workingHours: snapshot.workingHours,
        comboLiveOrders: snapshot.comboLiveOrders,
        notComboLiveOrders: snapshot.notComboLiveOrders,
        comboSoldCount: snapshot.comboSoldCount,
        selfComboRate: snapshot.selfComboRate,
        isTargetHit: snapshot.isTargetHit,
        isPenalized: snapshot.isPenalized,
        baseWageCv: snapshot.baseWageCv,
        baseWageCvPlus: snapshot.baseWageCvPlus,
        tipCv: snapshot.tipCv,
        tipCvPlus: snapshot.tipCvPlus,
        comboBonusTotal: snapshot.comboBonusTotal,
        productBonusTotal: snapshot.productBonusTotal,
        totalCvIncome: snapshot.totalCvIncome,
        totalCvPlusIncome: snapshot.totalCvPlusIncome,
        deltaGain: snapshot.deltaGain,
        deltaPercentage: snapshot.deltaPercentage,
        breakdownJson: JSON.stringify(snapshot.comboDetails),
      },
    });
  } catch (err) {
    fastify.log.error({ err, targetLegacyStaffId, month }, 'Failed to persist CVL snapshot');
  }
}

/**
 * Tính toán chi tiết quyền lợi CVL (lương giờ tăng, 90% tip, thưởng combo bậc thang)
 * và áp dụng chế tài ngưỡng 20% NOT COMBO LIVE theo Kinh Thánh mOS.
 */
export async function calculateCvPlusRewardsForStaff(
  fastify: FastifyInstance,
  staffId: number,
  targetMonthOrRange?: string | { startStr: string; endStr: string },
  persist = false,
  options?: { mode?: CvRewardCalculationMode }
): Promise<CvPlusRewardSnapshot> {
  const mode: CvRewardCalculationMode = options?.mode || 'SIMULATION';
  const checkoutAttributionSql = buildCheckoutAttributionSqlCondition(mode);
  const config = await getCareerConfig(fastify);
  const cvReq = config.cvToCvPlus || config.cvToCc;

  const { month, startStr, endStr, rangeStartDate, rangeEndDate, endOp } = resolveRewardDateRange(targetMonthOrRange);

  // 1. Resolve staff & legacy IDs
  const crmStaff = await fastify.prisma.crm.crmStaff.findFirst({
    where: {
      OR: [{ id: staffId }, { legacyStaffId: staffId }],
    },
  });

  const targetLegacyStaffId = crmStaff?.legacyStaffId || staffId;
  let staffName = crmStaff?.displayName;
  let staffPhone = crmStaff?.phone;
  let branchId = 6;

  try {
    const legacyProfiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `SELECT up.full_name, up.client_store_id, uc.phone_number 
         FROM user_profile up 
         LEFT JOIN user_contact uc ON uc.user_id = up.user_id AND uc.is_disabled = 0
         WHERE up.user_id = ? 
         ORDER BY uc.id DESC 
         LIMIT 1`,
      targetLegacyStaffId
    );
    if (legacyProfiles && legacyProfiles.length > 0) {
      if (!staffName) staffName = legacyProfiles[0].full_name;
      if (!staffPhone) staffPhone = legacyProfiles[0].phone_number;
      if (legacyProfiles[0].client_store_id) branchId = Number(legacyProfiles[0].client_store_id);
    }
  } catch (err) {
    fastify.log.warn({ err, targetLegacyStaffId }, 'Could not fetch legacy profile for CVL calculation');
  }

  const branchName = resolveBranchInfo(branchId).branchName;
  const safeLegacyStaffId = Math.floor(Number(targetLegacyStaffId || 0));
  const allActiveTrainingPairs =
    mode === 'ACTUAL_PAYROLL'
      ? await CvlTrainingMentorshipService.getActivePairsForRange(fastify, rangeStartDate, rangeEndDate)
      : [];
  const menteeTrainingPairs = allActiveTrainingPairs.filter((p) => p.menteeLegacyStaffId === safeLegacyStaffId);
  const effectiveCheckoutAttributionSql =
    mode === 'ACTUAL_PAYROLL' && menteeTrainingPairs.length > 0 && safeLegacyStaffId > 0
      ? `(${checkoutAttributionSql} OR (os.assigned_staff_id = ${safeLegacyStaffId} AND ${buildIsMenteeTrainingWindowSql(menteeTrainingPairs, 'o.booking_date_start')}))`
      : checkoutAttributionSql;
  const excludeOtherMenteeTrainingSql =
    mode === 'ACTUAL_PAYROLL'
      ? buildExcludeOtherMenteeTrainingOrderSql(
          allActiveTrainingPairs,
          safeLegacyStaffId,
          'o.id',
          'o.booking_date_start'
        )
      : '';

  // 2. Query completed orders for this staff
  const orders = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
    `
      SELECT os.id as order_service_id, os.order_id, o.user_id as client_id, o.booking_date_start
      FROM order_service os
      JOIN \`order\` o ON o.id = os.order_id
      WHERE os.assigned_staff_id = ?
        AND o.order_state = 'Completed'
        AND o.booking_date_start >= ?
        AND o.booking_date_start ${endOp} ?
      `,
    targetLegacyStaffId,
    startStr,
    endStr
  );

  const uniqueOrders = new Map<number, SafeAny>();
  for (const o of orders) {
    if (!uniqueOrders.has(Number(o.order_id))) {
      uniqueOrders.set(Number(o.order_id), o);
    }
  }
  const totalOrders = uniqueOrders.size;
  const orderIds = Array.from(uniqueOrders.keys());

  // 3. Classify COMBO_LIVE vs NOT_COMBO_LIVE at booking time
  const liveMap = await ComboRecognitionService.getBookingComboLiveStatesByOrderIds(fastify, orderIds);
  let comboLiveOrders = 0;
  let notComboLiveOrders = 0;
  for (const [, isLive] of liveMap.entries()) {
    if (isLive) comboLiveOrders++;
    else notComboLiveOrders++;
  }

  // 4. Query Combos sold by this staff (Kinh Thánh mOS Điều răn CV-002: Ai Checkout người đó được nhận thưởng Combo theo thang CVL)
  const combos = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
    `
      SELECT 
        osc.id,
        osc.order_id,
        osc.total_price,
        o.id as order_code,
        o.booking_date_start,
        os.assigned_staff_id,
        os.check_in_staff_id,
        os.check_out_staff_id,
        up.full_name as client_name,
        COALESCE(sl.service_name, s.service_key, 'Gói combo') AS combo_name
      FROM order_service_combo osc
      JOIN \`order\` o ON o.id = osc.order_id
      JOIN order_service os ON os.order_id = osc.order_id AND ${effectiveCheckoutAttributionSql}
      LEFT JOIN user_profile up ON up.user_id = o.user_id
      LEFT JOIN service s ON s.id = osc.service_id
      LEFT JOIN service_language sl ON sl.service_id = osc.service_id AND sl.language_id = 1
      WHERE o.order_state = 'Completed'
        AND o.booking_date_start >= ?
        AND o.booking_date_start ${endOp} ?
        AND osc.total_price > 0
        ${excludeOtherMenteeTrainingSql}
      GROUP BY osc.id
      ORDER BY o.booking_date_start ASC, osc.id ASC
      `,
    targetLegacyStaffId,
    targetLegacyStaffId,
    startStr,
    endStr
  );

  // Kinh Thánh mOS Điều răn CV-002 (v2.8.0): Nếu khách mua 2 (hoặc nhiều) gói Combo cùng 1 lúc trong cùng 1 đơn (order_id),
  // cộng gộp tổng tiền các gói trong đơn đó lại trước rồi mới áp công thức thưởng 1 lần duy nhất (<2M = 50K, mỗi 1M kế tiếp = +50K).
  const combosByOrderId = new Map<number, SafeAny[]>();
  for (const c of combos) {
    const orderId = Number(c.order_id);
    const group = combosByOrderId.get(orderId) || [];
    group.push(c);
    combosByOrderId.set(orderId, group);
  }

  const comboDetails: CvPlusComboDetail[] = [];
  for (const [orderId, group] of combosByOrderId.entries()) {
    const sortedItems = [...group].sort((a, b) => Number(b.total_price || 0) - Number(a.total_price || 0));
    const comboItems = sortedItems.map((item: SafeAny) => ({
      comboName: String(item.combo_name),
      price: Number(item.total_price || 0),
    }));
    const price = comboItems.reduce((sum, item) => sum + item.price, 0);
    const bonus = calculateComboBonus(price, cvReq);
    const first = group[0];
    comboDetails.push({
      orderId,
      orderCode: String(first.order_code),
      orderDate: String(first.booking_date_start),
      customerName: first.client_name ? String(first.client_name) : undefined,
      comboName: comboItems.map((item) => item.comboName).join(' + '),
      price,
      bonus,
      comboCount: comboItems.length,
      comboItems,
    });
  }

  const rawComboBonusTotal = comboDetails.reduce((sum, c) => sum + c.bonus, 0);
  const comboSoldCount = comboDetails.length;

  // Self combo conversion rate on NOT_COMBO_LIVE customer segment (Kinh Thánh mOS Điều răn CV-002)
  // Quy tắc:
  // - Mẫu số: CHỈ ĐẾM NHỮNG KHÁCH HÀNG KHÔNG PHẢI COMBO LIVE (notComboLiveOrders).
  // - Tử số: TẤT CẢ COMBO BÁN ĐƯỢC (cả khách không combo lẫn khách combo live gia hạn đều được cộng dồn).
  let selfComboRate: number;
  let isTargetHit: boolean;

  if (notComboLiveOrders > 0) {
    selfComboRate = comboSoldCount / notComboLiveOrders;
    const minComboTarget = cvReq.minSelfComboRate ?? 0.2;
    isTargetHit = selfComboRate >= minComboTarget;
  } else {
    // Khi không có khách Not Combo Live nào (notComboLiveOrders = 0):
    if (comboSoldCount > 0) {
      // Chuyên viên xuất sắc bán được combo cho khách combo live -> Đạt 100% chỉ tiêu
      selfComboRate = 1.0;
      isTargetHit = true;
    } else {
      // 0 khách tiềm năng và 0 combo bán được -> Miễn trừ chế tài (không phạt oan)
      selfComboRate = 0;
      isTargetHit = true;
    }
  }
  const isPenalized = !isTargetHit;

  // 5. Query Tips (tách theo tip_percentage từ staff_tip để tránh nhân trùng 9/7 trên dòng đã 90%/80%)
  const [tipRows, transferredTipMap] = await Promise.all([
    fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `
        SELECT st.tip_amount, st.tip_percentage
        FROM staff_tip st
        JOIN \`order\` o ON o.id = st.order_id
        WHERE st.user_id = ?
          AND o.order_state = 'Completed'
          AND o.booking_date_start >= ?
          AND o.booking_date_start ${endOp} ?
        `,
      targetLegacyStaffId,
      startStr,
      endStr
    ),
    mode === 'ACTUAL_PAYROLL' && menteeTrainingPairs.length > 0
      ? CvlTrainingMentorshipService.queryTransferredCcTipsByMentee(
          fastify,
          menteeTrainingPairs,
          rangeStartDate,
          rangeEndDate
        )
      : Promise.resolve(new Map<number, number>()),
  ]);
  const tipSplit = resolveCvTipSplitFromRows(tipRows, mode);
  const transferredTrainingCcTip = transferredTipMap.get(safeLegacyStaffId) || 0;
  const tipCv = tipSplit.tipCv;
  const tipCvPlus = tipSplit.tipCvPlus + transferredTrainingCcTip;

  // 6. Query Shifts & Working Hours
  const shiftRes = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
    `
      SELECT COUNT(DISTINCT DATE(o.booking_date_start)) as work_days
      FROM \`order\` o
      JOIN order_service os ON os.order_id = o.id
      WHERE os.assigned_staff_id = ?
        AND o.order_state = 'Completed'
        AND o.booking_date_start >= ?
        AND o.booking_date_start ${endOp} ?
      `,
    targetLegacyStaffId,
    startStr,
    endStr
  );
  const workingDays = Number(shiftRes[0]?.work_days) || 0;
  const workingHours = workingDays * 8;

  // 7. Base Wages & Incomes
  const cvBaseHourly = cvReq?.hourlyWage ? Math.max(0, cvReq.hourlyWage - 2000) : 25000;
  const cvPlusBaseHourly = cvReq?.hourlyWage ?? 27000;
  const baseWageCv = workingHours * cvBaseHourly;

  // 6.5. Query Products / Serums sold by this staff (Dưỡng mi Yeppeum per Kinh Thánh mOS CV-002: Ai Checkout người đó được nhận)
  let rawProductBonusTotal = 0;
  try {
    const productRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `
        SELECT 
          op.id,
          op.order_id,
          op.total_price,
          op.quantity,
          os.assigned_staff_id,
          os.check_out_staff_id,
          COALESCE(pl.product_name, p.product_sku, 'Sản phẩm') as product_name
        FROM order_product op
        JOIN \`order\` o ON o.id = op.order_id
        JOIN order_service os ON os.order_id = op.order_id AND ${effectiveCheckoutAttributionSql}
        LEFT JOIN product p ON p.id = op.product_id
        LEFT JOIN product_language pl ON pl.product_id = op.product_id AND pl.language_id = 1
        WHERE o.order_state = 'Completed'
          AND o.booking_date_start >= ?
          AND o.booking_date_start ${endOp} ?
          ${excludeOtherMenteeTrainingSql}
        GROUP BY op.id
        `,
      targetLegacyStaffId,
      targetLegacyStaffId,
      startStr,
      endStr
    );

    const serumOrigBonus = cvReq?.serumOriginalPriceBonus ?? 100000;
    const serumDiscBonus = cvReq?.serumDiscountedPriceBonus ?? 50000;
    const serumDeepDiscBonus = cvReq?.serumDeepDiscountPriceBonus ?? 10000;
    const serumFreeBonus = cvReq?.serumFreePriceBonus ?? 1000;

    for (const pr of productRows) {
      const qty = Number(pr.quantity) || 1;
      const pricePerUnit = (Number(pr.total_price) || 0) / qty;
      // Quy chế Dưỡng Mi Yeppeum (Kinh Thánh mOS Điều răn CV-002 cập nhật theo Danny):
      // 1.1M (Giá gốc) -> 100K (100.000đ)
      // Giảm giá < 50% (> 550.000đ) -> 50K (50.000đ)
      // Giảm >= 50% (<= 550.000đ & > 0đ) -> 10K (10.000đ)
      // Free (0đ) -> 1K (1.000đ)
      let itemBonus = serumFreeBonus;
      if (pricePerUnit >= 1000000) {
        itemBonus = serumOrigBonus;
      } else if (pricePerUnit > 550000) {
        itemBonus = serumDiscBonus;
      } else if (pricePerUnit > 0) {
        itemBonus = serumDeepDiscBonus;
      } else {
        itemBonus = serumFreeBonus;
      }
      rawProductBonusTotal += itemBonus * qty;
    }
  } catch (prodErr) {
    fastify.log.warn({ prodErr, targetLegacyStaffId }, 'Could not calculate product bonuses for CVL');
  }

  // Penalty enforcement rule:
  // If selfComboRate < minComboTarget, maintain CV base hourly wage (no +2k increase) and forfeit combo/product bonus.
  const baseWageCvPlus = isPenalized ? baseWageCv : workingHours * cvPlusBaseHourly;
  const comboBonusTotal = isPenalized ? 0 : rawComboBonusTotal;
  const productBonusTotal = isPenalized ? 0 : rawProductBonusTotal;

  const totalCvIncome = baseWageCv + tipCv;
  const totalCvPlusIncome = baseWageCvPlus + tipCvPlus + comboBonusTotal + productBonusTotal;
  const deltaGain = totalCvPlusIncome - totalCvIncome;
  const deltaPercentage = totalCvIncome > 0 ? deltaGain / totalCvIncome : 0;

  const snapshot: CvPlusRewardSnapshot = {
    staffId: targetLegacyStaffId,
    staffName: staffName || 'Chuyên Viên',
    staffPhone: staffPhone || undefined,
    branchId,
    branchName,
    month,
    totalOrders,
    workingDays,
    workingHours,
    comboLiveOrders,
    notComboLiveOrders,
    comboSoldCount,
    selfComboRate: Math.round(selfComboRate * 1000) / 1000,
    isTargetHit,
    isPenalized,
    baseWageCv,
    baseWageCvPlus,
    tipCv,
    tipCvPlus,
    comboBonusTotal,
    productBonusTotal,
    totalCvIncome,
    totalCvPlusIncome,
    deltaGain,
    deltaPercentage: Math.round(deltaPercentage * 1000) / 1000,
    comboDetails,
  };

  // 8. Persist if requested
  if (persist) {
    await persistCvPlusRewardSnapshot(fastify, targetLegacyStaffId, month, snapshot);
  }

  return snapshot;
}
