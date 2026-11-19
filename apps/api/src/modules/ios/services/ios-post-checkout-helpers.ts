import mysql from 'mysql2/promise';
import { FastifyInstance } from 'fastify';
import {
  getVietnamDateYmd,
  IosCheckoutStaffOption,
  IosPaymentBreakdown,
  IosPaymentMethod,
  IosPostCheckoutSnapshot,
  isCcRole,
  isIosSyntheticSimBookingId,
  normalizeCvFeatherRole,
  resolveNormalizedPaymentBreakdown,
  SafeAny,
} from '@mos-lab/shared';
import { INITIAL_BOOKINGS } from '../mock-data.js';
import { getLegacyPool } from './db-pools.js';
import { computeBookingFinancials, resolveStaffAvatar } from './ios-bookings-formatters.js';
import { SettleLegacyOrderBridgeDeps } from './ios-legacy-bridge.service.js';
import { BookingOverrideRecord } from './ios-overrides.service.js';
import { resolveCheckoutOverridePromotions } from './ios-promotions.service.js';

const FALLBACK_CHECKOUT_STAFF: IosCheckoutStaffOption[] = [
  { staffId: 13783, name: 'Khanh Cao', tier: 'CVL', storeId: 6, branchCode: 'DT' },
  { staffId: 46272, name: 'Thảo Ly', tier: 'CVL', storeId: 6, branchCode: 'DT' },
  { staffId: 37790, name: 'Diễm Hương', tier: 'CC', storeId: 6, branchCode: 'DT' },
  { staffId: 34295, name: 'Thục Nghi', tier: 'CC', storeId: 16, branchCode: 'EP' },
  { staffId: 51540, name: 'Bảo Hân', tier: 'CC', storeId: 16, branchCode: 'EP' },
];

function sortCheckoutStaffOptions(list: IosCheckoutStaffOption[], storeId?: number): IosCheckoutStaffOption[] {
  const tierRank: Record<'CVL' | 'CVLL' | 'CC', number> = { CVL: 0, CVLL: 1, CC: 2 };
  return [...list].sort((a, b) => {
    if (storeId && storeId > 0) {
      const aMatch = Number(a.storeId) === Number(storeId) ? 0 : 1;
      const bMatch = Number(b.storeId) === Number(storeId) ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
    }
    if (tierRank[a.tier] !== tierRank[b.tier]) return tierRank[a.tier] - tierRank[b.tier];
    return a.name.localeCompare(b.name, 'vi');
  });
}

/**
 * List staff eligible to be selected as Checkout owner (CVL, CVLL, CC) for post-checkout adjustment.
 */
export async function listIosCheckoutEligibleStaff(
  fastify: FastifyInstance | null,
  storeId?: number
): Promise<IosCheckoutStaffOption[]> {
  if (!fastify) {
    return sortCheckoutStaffOptions(FALLBACK_CHECKOUT_STAFF, storeId);
  }

  try {
    const [crmStaffs, progressions, ccTeamMembers] = await Promise.all([
      fastify.prisma.crm.crmStaff.findMany({
        where: { isActive: true, legacyStaffId: { not: null } },
        select: { id: true, legacyStaffId: true, displayName: true, role: true, avatarUrl: true },
      }),
      fastify.prisma.crm.crmCareerProgression.findMany({
        select: { staffId: true, currentRole: true },
      }),
      fastify.prisma.crm.crmTeamMember
        .findMany({
          where: { isActive: true, team: { code: 'CC' } },
          select: { crmStaffId: true, legacyStaffId: true },
        })
        .catch(() => [] as Array<{ crmStaffId: number | null; legacyStaffId: number }>),
    ]);

    const progByStaffId = new Map<number, string>();
    for (const p of progressions) {
      progByStaffId.set(Number(p.staffId), String(p.currentRole || ''));
    }
    const ccStaffIds = new Set<number>();
    const ccLegacyIds = new Set<number>();
    for (const m of ccTeamMembers) {
      if (m.crmStaffId) ccStaffIds.add(Number(m.crmStaffId));
      if (m.legacyStaffId) ccLegacyIds.add(Number(m.legacyStaffId));
    }

    const legacyIds = Array.from(new Set(crmStaffs.map((s) => Number(s.legacyStaffId || 0)).filter((id) => id > 0)));

    const legacyMap = new Map<number, { storeId?: number; avatar?: string; fullName?: string }>();
    if (legacyIds.length > 0) {
      try {
        const legacyRows = await fastify.prisma.legacy.user_profile.findMany({
          where: { user_id: { in: legacyIds } },
          select: { user_id: true, client_store_id: true, avatar: true, full_name: true },
        });
        for (const r of legacyRows) {
          legacyMap.set(Number(r.user_id), {
            storeId: r.client_store_id ? Number(r.client_store_id) : undefined,
            avatar: resolveStaffAvatar(r.avatar),
            fullName: r.full_name || undefined,
          });
        }
      } catch {
        // Legacy lookup is optional in isolated envs
      }
    }

    const byLegacyId = new Map<number, IosCheckoutStaffOption>();
    for (const s of crmStaffs) {
      const legacyId = Number(s.legacyStaffId || 0);
      if (legacyId <= 0) continue;
      const progRole = progByStaffId.get(Number(s.id));
      const featherTier = normalizeCvFeatherRole(progRole) || normalizeCvFeatherRole(s.role);
      let tier: 'CVL' | 'CVLL' | 'CC' | null = null;
      if (featherTier === 'CVLL') tier = 'CVLL';
      else if (featherTier === 'CVL') tier = 'CVL';
      else if (isCcRole(s.role) || ccStaffIds.has(Number(s.id)) || ccLegacyIds.has(legacyId)) tier = 'CC';
      if (!tier) continue;

      const legacyMeta = legacyMap.get(legacyId);
      const effStoreId = legacyMeta?.storeId;
      byLegacyId.set(legacyId, {
        staffId: legacyId,
        name: String(s.displayName || legacyMeta?.fullName || `Nhân sự #${legacyId}`),
        tier,
        storeId: effStoreId,
        branchCode: effStoreId === 16 ? 'EP' : effStoreId === 6 ? 'DT' : undefined,
        avatar: s.avatarUrl || legacyMeta?.avatar,
      });
    }

    if (byLegacyId.size === 0) {
      return sortCheckoutStaffOptions(FALLBACK_CHECKOUT_STAFF, storeId);
    }
    return sortCheckoutStaffOptions(Array.from(byLegacyId.values()), storeId);
  } catch {
    return sortCheckoutStaffOptions(FALLBACK_CHECKOUT_STAFF, storeId);
  }
}

export interface HydratedLiveBaseline {
  orderState?: string;
  bookingDateYmd?: string;
  customerId?: number;
  servicePrice?: number;
  serviceName?: string;
  upgradePrice?: number;
  assignedStaffId?: number;
  assignedStaffName?: string;
  checkInStaffId?: number;
  checkInStaffName?: string;
  checkOutStaffId?: number;
  checkOutStaffName?: string;
  paidTotal?: number;
  paymentMethod?: IosPaymentMethod;
  paymentBreakdown?: IosPaymentBreakdown;
  tipAmount?: number;
  diamondUsed?: number;
}

export async function fetchLiveBaselineIfNeeded(
  bookingId: number,
  current: BookingOverrideRecord,
  isSimulationMode: boolean,
  bridgeDepsOverride?: Partial<SettleLegacyOrderBridgeDeps>
): Promise<HydratedLiveBaseline | null> {
  if (isSimulationMode || isIosSyntheticSimBookingId(bookingId)) {
    return null;
  }
  const demoSeed = INITIAL_BOOKINGS.find((b) => Number(b.id) === bookingId);
  if (demoSeed) {
    return {
      orderState: current.orderState || (demoSeed.status === 'DONE' ? 'Completed' : undefined),
      customerId: demoSeed.customerId,
      servicePrice: demoSeed.servicePrice,
      serviceName: demoSeed.serviceName,
      upgradePrice: demoSeed.upgradePrice,
      assignedStaffId: demoSeed.assignedStaffId,
      assignedStaffName: demoSeed.assignedStaffName,
      checkInStaffId: demoSeed.checkInStaffId,
      checkInStaffName: demoSeed.checkInStaffName,
      checkOutStaffId: demoSeed.checkOutStaffId,
      checkOutStaffName: demoSeed.checkOutStaffName,
      paidTotal: demoSeed.billing?.grandTotal,
      paymentMethod: demoSeed.billing?.paymentMethod,
      paymentBreakdown: demoSeed.billing?.paymentBreakdown,
      tipAmount: demoSeed.billing?.tipAmount,
      diamondUsed: demoSeed.billing?.diamondUsed,
    };
  }

  let pool: mysql.Pool;
  try {
    pool = (bridgeDepsOverride?.getPool || getLegacyPool)();
  } catch {
    return null;
  }

  try {
    const [orderRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT o.id, o.user_id, o.order_state, o.total_price, o.booking_date_start,
              os.assigned_staff_id, os.check_in_staff_id, os.check_out_staff_id, os.upgrade_price,
              sl.service_name,
              up_a.full_name AS assigned_name,
              up_i.full_name AS check_in_name,
              up_o.full_name AS check_out_name
       FROM \`order\` o
       LEFT JOIN order_service os ON os.order_id = o.id
       LEFT JOIN service_language sl ON sl.service_id = os.service_id AND sl.language_id = 1
       LEFT JOIN user_profile up_a ON up_a.user_id = os.assigned_staff_id
       LEFT JOIN user_profile up_i ON up_i.user_id = os.check_in_staff_id
       LEFT JOIN user_profile up_o ON up_o.user_id = os.check_out_staff_id
       WHERE o.id = ?
       ORDER BY os.id ASC
       LIMIT 1`,
      [bookingId]
    );
    if (!orderRows || orderRows.length === 0) return null;
    const r = orderRows[0];
    const [payRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT paid_cash_amount, paid_credit_card_amount, paid_bank_transfer_amount,
              paid_credit_amount, tip_amount
       FROM order_payment WHERE order_id = ? LIMIT 1`,
      [bookingId]
    );
    const p = payRows?.[0];
    const cash = Number(p?.paid_cash_amount || 0);
    const pos = Number(p?.paid_credit_card_amount || 0);
    const vietqr = Number(p?.paid_bank_transfer_amount || 0);
    const paidTotal = cash + pos + vietqr;
    const normalized = resolveNormalizedPaymentBreakdown(paidTotal, undefined, {
      cashAmount: cash,
      posAmount: pos,
      vietqrAmount: vietqr,
    });
    const bookingDateYmd = r.booking_date_start ? getVietnamDateYmd(new Date(String(r.booking_date_start))) : undefined;
    return {
      orderState: r.order_state ? String(r.order_state) : undefined,
      bookingDateYmd,
      customerId: Number(r.user_id || 0) || undefined,
      servicePrice: Number(r.total_price || 0) || undefined,
      serviceName: r.service_name ? String(r.service_name) : undefined,
      upgradePrice: Number(r.upgrade_price || 0) || 0,
      assignedStaffId: Number(r.assigned_staff_id || 0) || undefined,
      assignedStaffName: r.assigned_name ? String(r.assigned_name) : undefined,
      checkInStaffId: Number(r.check_in_staff_id || 0) || undefined,
      checkInStaffName: r.check_in_name ? String(r.check_in_name) : undefined,
      checkOutStaffId: Number(r.check_out_staff_id || 0) || undefined,
      checkOutStaffName: r.check_out_name ? String(r.check_out_name) : undefined,
      ...(p ? { paidTotal, paymentMethod: normalized.paymentMethod, paymentBreakdown: normalized.breakdown } : {}),
      ...(p ? { tipAmount: Number(p.tip_amount || 0), diamondUsed: Number(p.paid_credit_amount || 0) } : {}),
    };
  } catch {
    return null;
  }
}

export function buildSnapshot(params: {
  override: BookingOverrideRecord;
  servicePrice: number;
  upgradePrice: number;
  serviceName: string;
  assignedStaffId: number;
  checkInStaffId: number;
  checkOutStaffId: number;
  checkOutStaffName: string;
  checkOutStaffTier: string;
  isComboLive: boolean;
  hasUnderMink: boolean;
  underMinkServiceType?: 'Normal' | 'Retain';
  hasUnderMinkCombo: boolean;
  isTrainingCvlOrder: boolean;
  forcedPaymentMethod?: IosPaymentMethod;
  forcedPaymentBreakdown?: IosPaymentBreakdown;
}): {
  snapshot: IosPostCheckoutSnapshot;
  billing: SafeAny;
  resolvedPromos: ReturnType<typeof resolveCheckoutOverridePromotions>;
} {
  const { override } = params;
  const resolvedPromos = resolveCheckoutOverridePromotions(override, {});
  const resolvedCartProducts = resolvedPromos.cartProducts || [];
  const financials = computeBookingFinancials({
    servicePrice: params.servicePrice,
    upgradePrice: params.upgradePrice,
    serviceName: params.serviceName,
    isComboLive: params.isComboLive,
    hasUnderMink: params.hasUnderMink,
    underMinkServiceType: params.underMinkServiceType,
    hasUnderMinkCombo: params.hasUnderMinkCombo,
    selectedCombo: override.selectedCombo ?? null,
    selectedUnderCombo: override.selectedUnderCombo ?? null,
    comboRedemption: override.comboRedemption ?? null,
    cartProducts: resolvedCartProducts,
    overrideBilling: {
      ...(override.billing || {}),
      ...(params.forcedPaymentMethod ? { paymentMethod: params.forcedPaymentMethod } : {}),
      ...(params.forcedPaymentBreakdown ? { paymentBreakdown: params.forcedPaymentBreakdown } : {}),
    },
    assignedStaffId: params.assignedStaffId,
    checkInStaffId: params.checkInStaffId,
    checkOutStaffId: params.checkOutStaffId,
    activeStaffId: params.checkOutStaffId,
    isTrainingCvlOrder: params.isTrainingCvlOrder,
    promotionId: resolvedPromos.promotionId,
    appliedPromotion: resolvedPromos.appliedPromotion,
    servicePromotion: resolvedPromos.servicePromotion,
    comboPromotion: resolvedPromos.comboPromotion,
    underComboPromotion: resolvedPromos.underComboPromotion,
  });

  const isCheckoutCc = String(params.checkOutStaffTier || '').toUpperCase() === 'CC' && !params.isTrainingCvlOrder;
  const cartSummary =
    resolvedCartProducts.length > 0
      ? resolvedCartProducts.map((p) => `${p.productName} x${p.quantity}`).join(', ')
      : 'Không có sản phẩm';

  const snapshot: IosPostCheckoutSnapshot = {
    checkOutStaffId: params.checkOutStaffId,
    checkOutStaffName: params.checkOutStaffName,
    checkOutStaffTier: params.checkOutStaffTier,
    selectedComboName: override.selectedCombo?.name || null,
    selectedComboPrice: Number(override.selectedCombo?.price || 0),
    selectedUnderComboName: override.selectedUnderCombo?.name || null,
    selectedUnderComboPrice: Number(override.selectedUnderCombo?.price || 0),
    selectedUpperComboBalanceId: override.selectedUpperComboBalanceId ?? null,
    selectedUnderComboBalanceId: override.selectedUnderComboBalanceId ?? null,
    skipUpperCombo: Boolean(override.skipUpperCombo),
    skipUnderCombo: Boolean(override.skipUnderCombo),
    redeemedUpperComboName: override.comboRedemption?.comboName || null,
    redeemedUnderComboName: null,
    todaySingleServiceWaived: override.selectedCombo
      ? override.selectedCombo.todaySingleServiceWaived !== false
      : undefined,
    cartProductsSummary: cartSummary,
    productTotal: financials.billing.productTotal,
    serviceTotal: financials.billing.serviceTotal,
    subtotal: financials.billing.subtotal,
    vatAmount: financials.billing.vatAmount,
    tipAmount: financials.billing.tipAmount,
    diamondUsed: financials.billing.diamondUsed,
    grandTotal: financials.billing.grandTotal,
    paymentMethod: financials.billing.paymentMethod,
    paymentBreakdown: financials.billing.paymentBreakdown,
    comboBonusAmount: isCheckoutCc ? 0 : financials.cvRewardBreakdown.comboBonusAmount,
    serumBonusAmount: isCheckoutCc ? 0 : financials.cvRewardBreakdown.serumBonusAmount,
    checkOutTipShareAmount: financials.billing.tipCheckOutShare,
  };

  return { snapshot, billing: financials.billing, resolvedPromos };
}
