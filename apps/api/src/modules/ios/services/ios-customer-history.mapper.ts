import type mysql from 'mysql2/promise';
import type {
  IosCustomerDiamondTxnItem,
  IosCustomerHistoryResponse,
  IosCustomerHistoryServiceDetail,
  IosCustomerHistoryStaffRef,
  IosCustomerHistorySummary,
  IosCustomerHistoryVisitItem,
  SafeAny,
} from '@mos-lab/shared';
import { maskPhoneNumber } from '@mos-lab/shared';
import type { OrderHistoryLashHydration } from './ios-customer-history-lashes.helper.js';

const VN_TZ_OFFSET_MS = 7 * 60 * 60 * 1000;

export function buildEmptyCustomerHistoryResponse(customerId: number, error?: string): IosCustomerHistoryResponse {
  return {
    success: !error,
    customerId,
    customerName: 'Khách hàng',
    customerPhone: '',
    customerCode: null,
    summary: {
      totalSpent: 0,
      completedVisits: 0,
      totalBookings: 0,
      canceledBookings: 0,
      fixCount: 0,
      avgSpendPerVisit: 0,
      diamondBalance: 0,
      totalDiamondEarned: 0,
      totalDiamondUsed: 0,
      totalDebt: 0,
      lastVisitDate: null,
      firstVisitDate: null,
    },
    visits: [],
    payments: [],
    fixVisits: [],
    diamondTransactions: [],
    ...(error ? { error } : {}),
  };
}

function toVnDateParts(raw: Date | string | null | undefined): {
  iso: string;
  dateKey: string;
  dateDisplay: string;
  timeDisplay: string;
} {
  if (!raw) {
    return { iso: '', dateKey: '', dateDisplay: '--/--/----', timeDisplay: '--:--' };
  }
  const parsed = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    const str = String(raw);
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
    if (match) {
      const [, y, m, d, hh = '00', mm = '00'] = match;
      return {
        iso: str,
        dateKey: `${y}-${m}-${d}`,
        dateDisplay: `${d}/${m}/${y}`,
        timeDisplay: `${hh}:${mm}`,
      };
    }
    return { iso: str, dateKey: '', dateDisplay: str, timeDisplay: '--:--' };
  }
  const vn = new Date(parsed.getTime() + VN_TZ_OFFSET_MS);
  const y = vn.getUTCFullYear();
  const m = String(vn.getUTCMonth() + 1).padStart(2, '0');
  const d = String(vn.getUTCDate()).padStart(2, '0');
  const hh = String(vn.getUTCHours()).padStart(2, '0');
  const mm = String(vn.getUTCMinutes()).padStart(2, '0');
  return {
    iso: parsed.toISOString(),
    dateKey: `${y}-${m}-${d}`,
    dateDisplay: `${d}/${m}/${y}`,
    timeDisplay: `${hh}:${mm}`,
  };
}

export function formatDaysAgoLabel(dateKey: string, now: Date = new Date()): string {
  if (!dateKey) return '';
  const vnNow = new Date(now.getTime() + VN_TZ_OFFSET_MS);
  const todayUtcMs = Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate());
  const parts = dateKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return '';
  const targetUtcMs = Date.UTC(parts[0], parts[1] - 1, parts[2]);
  const diffDays = Math.round((todayUtcMs - targetUtcMs) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'Hôm Nay';
  if (diffDays > 0) return `${diffDays} ngày trước`;
  return `Còn ${Math.abs(diffDays)} ngày`;
}

export function mapOrderStateDisplay(orderState: string): {
  statusLabel: string;
  statusTone: IosCustomerHistoryVisitItem['statusTone'];
} {
  const s = String(orderState || '')
    .trim()
    .toLowerCase();
  if (s === 'completed') return { statusLabel: 'Hoàn thành', statusTone: 'completed' };
  if (s === 'checkin' || s === 'checkout' || s === 'processing') {
    return { statusLabel: s === 'checkout' ? 'Chờ quầy' : 'Đang phục vụ', statusTone: 'servicing' };
  }
  if (s === 'canceled' || s === 'cancelled' || s === 'cancel' || s === 'missed') {
    return { statusLabel: s === 'missed' ? 'Vắng mặt' : 'Đã huỷ', statusTone: 'canceled' };
  }
  if (s === 'new' || s === 'confirmed') {
    return { statusLabel: s === 'confirmed' ? 'Đã xác nhận' : 'Lịch mới', statusTone: 'upcoming' };
  }
  return { statusLabel: orderState || 'Khác', statusTone: 'upcoming' };
}

function buildPaymentMethodLabel(params: {
  cash: number;
  card: number;
  bank: number;
  diamondUsed: number;
  discountAmount: number;
  debtAmount: number;
  prepaidAmount: number;
  hasComboService: boolean;
}): string {
  const { cash, card, bank, diamondUsed, discountAmount, debtAmount, prepaidAmount, hasComboService } = params;
  const paid = cash + card + bank;
  const parts: string[] = [];
  if (bank > 0) parts.push('Chuyển khoản');
  if (card > 0) parts.push('Thẻ POS');
  if (cash > 0) parts.push('Tiền mặt');
  if (parts.length > 0) return parts.join(' + ');
  if (paid === 0 && (hasComboService || discountAmount > 0)) return 'Trừ Combo / Ưu đãi';
  if (paid === 0 && diamondUsed > 0) return 'Đổi Kim Cương';
  if (paid === 0 && prepaidAmount > 0) return 'Ví trả trước';
  if (debtAmount > 0) return 'Còn công nợ';
  return '0 đ';
}

function parseOrderIdFromTrackingKey(raw: string | null | undefined): number | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const id = Number(parsed?.order_id ?? parsed?.orderId ?? 0);
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    const match = String(raw).match(/"order_id"\s*:\s*(\d+)/);
    return match ? Number(match[1]) : null;
  }
}

export function buildCustomerHistoryPayload(params: {
  customerId: number;
  profileRow?: mysql.RowDataPacket;
  rawPhone: string;
  canViewPhone: boolean;
  diamondBalance: number;
  orderRows: mysql.RowDataPacket[];
  paymentRows: mysql.RowDataPacket[];
  serviceRows: mysql.RowDataPacket[];
  comboRows: mysql.RowDataPacket[];
  productRows: mysql.RowDataPacket[];
  diamondTxnRows: mysql.RowDataPacket[];
  lashHydrationByOrder?: Map<number, OrderHistoryLashHydration>;
  now: Date;
}): IosCustomerHistoryResponse {
  const {
    customerId,
    profileRow,
    rawPhone,
    canViewPhone,
    diamondBalance,
    orderRows,
    paymentRows,
    serviceRows,
    comboRows,
    productRows,
    diamondTxnRows,
    lashHydrationByOrder,
    now,
  } = params;

  const paymentByOrder = new Map<
    number,
    {
      cash: number;
      card: number;
      bank: number;
      diamondUsed: number;
      discount: number;
      prepaid: number;
      debt: number;
      tip: number;
    }
  >();
  for (const p of paymentRows) {
    const oid = Number(p.order_id);
    const cur = paymentByOrder.get(oid) || {
      cash: 0,
      card: 0,
      bank: 0,
      diamondUsed: 0,
      discount: 0,
      prepaid: 0,
      debt: 0,
      tip: 0,
    };
    cur.cash += Number(p.paid_cash_amount || 0);
    cur.card += Number(p.paid_credit_card_amount || 0);
    cur.bank += Number(p.paid_bank_transfer_amount || 0);
    cur.diamondUsed += Number(p.paid_credit_amount || 0);
    cur.discount += Number(p.discount_amount || 0);
    cur.prepaid += Number(p.prepaid_amount || 0);
    cur.debt += Number(p.debt_amount || 0);
    cur.tip += Number(p.tip_amount || 0);
    paymentByOrder.set(oid, cur);
  }

  const servicesByOrder = new Map<number, IosCustomerHistoryServiceDetail[]>();
  const staffByOrder = new Map<number, Map<number, IosCustomerHistoryStaffRef>>();

  const addStaffRef = (orderId: number, idRaw: SafeAny, nameRaw: SafeAny, avatarRaw: SafeAny) => {
    const id = Number(idRaw || 0);
    const name = String(nameRaw || '').trim();
    if (!id || !name) return;
    if (!staffByOrder.has(orderId)) staffByOrder.set(orderId, new Map());
    const map = staffByOrder.get(orderId)!;
    if (!map.has(id)) {
      map.set(id, { id, name, avatar: avatarRaw ? String(avatarRaw) : null });
    }
  };

  for (const s of serviceRows) {
    const oid = Number(s.order_id);
    if (!servicesByOrder.has(oid)) servicesByOrder.set(oid, []);
    const sType = String(s.service_type || '').toUpperCase();
    const uType = String(s.user_service_type || '').toUpperCase();
    const svcName = String(s.service_name || '').trim() || 'Dịch vụ';
    const isFix = sType === 'FIX' || uType === 'FIX' || /\bfix\b|sửa\s*mi/i.test(svcName);
    const isComboUsed = Boolean(s.user_service_balance_transaction_id) || uType === 'COMBO';
    servicesByOrder.get(oid)!.push({
      name: svcName,
      serviceType: s.service_type ? String(s.service_type) : null,
      price: Number(s.total_price || 0),
      isFix,
      isComboUsed,
    });
    addStaffRef(oid, s.assigned_staff_id, s.assigned_staff_name, s.assigned_staff_avatar);
    addStaffRef(oid, s.check_in_staff_id, s.check_in_staff_name, s.check_in_staff_avatar);
    addStaffRef(oid, s.check_out_staff_id, s.check_out_staff_name, s.check_out_staff_avatar);
  }

  for (const c of comboRows) {
    const oid = Number(c.order_id);
    if (!servicesByOrder.has(oid)) servicesByOrder.set(oid, []);
    const qty = Number(c.quantity || 1);
    const baseName = String(c.service_name || '').trim() || 'Gói Combo';
    servicesByOrder.get(oid)!.push({
      name: qty > 1 ? `${baseName} (×${qty})` : baseName,
      serviceType: 'COMBO',
      price: Number(c.total_price || 0),
      isFix: false,
      isComboUsed: false,
    });
  }

  for (const pr of productRows) {
    const oid = Number(pr.order_id);
    if (!servicesByOrder.has(oid)) servicesByOrder.set(oid, []);
    const qty = Number(pr.quantity || 1);
    const baseName = String(pr.product_name || '').trim() || 'Sản phẩm';
    servicesByOrder.get(oid)!.push({
      name: qty > 1 ? `${baseName} (×${qty})` : baseName,
      serviceType: 'PRODUCT',
      price: Number(pr.total_price || 0),
      isFix: false,
      isComboUsed: false,
    });
  }

  const orderMetaById = new Map<number, { branchName: string }>();
  const diamondByOrder = new Map<number, { earned: number; used: number }>();
  const diamondTransactions: IosCustomerDiamondTxnItem[] = [];

  for (const r of orderRows) {
    orderMetaById.set(Number(r.order_id), {
      branchName: String(r.branch_name || '').trim() || 'Wings Store',
    });
  }

  let totalDiamondEarned = 0;
  let totalDiamondUsed = 0;

  for (const tx of diamondTxnRows) {
    const amt = Number(tx.amount || 0);
    const linkedOrderId = parseOrderIdFromTrackingKey(tx.tracking_key ? String(tx.tracking_key) : null);
    if (amt > 0) totalDiamondEarned += amt;
    if (amt < 0) totalDiamondUsed += Math.abs(amt);

    if (linkedOrderId) {
      const cur = diamondByOrder.get(linkedOrderId) || { earned: 0, used: 0 };
      if (amt > 0) cur.earned += amt;
      else if (amt < 0) cur.used += Math.abs(amt);
      diamondByOrder.set(linkedOrderId, cur);
    }

    const parts = toVnDateParts(tx.date_created);
    diamondTransactions.push({
      id: Number(tx.id),
      orderId: linkedOrderId,
      amount: amt,
      balanceAfter: Number(tx.balance || 0),
      dateCreated: parts.iso,
      dateDisplay: parts.dateDisplay,
      timeDisplay: parts.timeDisplay,
      daysAgoLabel: formatDaysAgoLabel(parts.dateKey, now),
      note: tx.description ? String(tx.description).trim() : null,
      branchName: linkedOrderId ? orderMetaById.get(linkedOrderId)?.branchName || null : null,
      type: amt > 0 ? 'EARN' : amt < 0 ? 'SPEND' : 'ADJUST',
    });
  }

  const visits: IosCustomerHistoryVisitItem[] = orderRows.map((o) => {
    const oid = Number(o.order_id);
    const parts = toVnDateParts(o.booking_date_start || o.date_created);
    const state = String(o.order_state || '');
    const stateDisplay = mapOrderStateDisplay(state);
    const svcs = servicesByOrder.get(oid) || [];
    const staffRefs = Array.from(staffByOrder.get(oid)?.values() || []);
    const pay = paymentByOrder.get(oid) || {
      cash: 0,
      card: 0,
      bank: 0,
      diamondUsed: 0,
      discount: 0,
      prepaid: 0,
      debt: 0,
      tip: 0,
    };
    const diam = diamondByOrder.get(oid) || { earned: 0, used: 0 };
    const paidAmount = Math.max(0, Math.round(pay.cash + pay.card + pay.bank));
    const diamondUsed = Math.max(pay.diamondUsed, diam.used);
    const hasComboService = svcs.some((s) => s.isComboUsed);
    const isFixOrder = svcs.some((s) => s.isFix) || /\bfix\b/i.test(String(o.booking_note || ''));
    const hydration = lashHydrationByOrder?.get(oid);
    const serviceName =
      svcs.length > 0 ? svcs.map((s) => s.name).join(' + ') : String(o.booking_note || '').trim() || `Lịch hẹn #${oid}`;

    return {
      orderId: oid,
      orderNumber: `#${oid}`,
      bookingDateStart: parts.iso,
      dateDisplay: parts.dateDisplay,
      timeDisplay: parts.timeDisplay,
      daysAgoLabel: formatDaysAgoLabel(parts.dateKey, now),
      orderState: state,
      statusLabel: stateDisplay.statusLabel,
      statusTone: stateDisplay.statusTone,
      serviceName,
      services: svcs,
      isFixOrder,
      bookingNote: o.booking_note ? String(o.booking_note).trim() || null : null,
      branchId: o.client_store_id ? Number(o.client_store_id) : null,
      branchName: String(o.branch_name || '').trim() || 'Wings Store',
      staffNames: staffRefs.map((s) => s.name),
      staffAvatars: staffRefs,
      diamondEarned: diam.earned,
      diamondUsed,
      totalPrice: Math.max(0, Math.round(Number(o.total_price || 0))),
      paidAmount,
      discountAmount: Math.max(0, Math.round(pay.discount)),
      prepaidAmount: Math.max(0, Math.round(pay.prepaid)),
      debtAmount: Math.max(0, Math.round(pay.debt)),
      tipAmount: Math.max(0, Math.round(pay.tip)),
      paymentMethodLabel: buildPaymentMethodLabel({
        cash: pay.cash,
        card: pay.card,
        bank: pay.bank,
        diamondUsed,
        discountAmount: pay.discount,
        debtAmount: pay.debt,
        prepaidAmount: pay.prepaid,
        hasComboService,
      }),
      ...(hydration?.photos ? { photos: hydration.photos } : {}),
      ...(hydration?.underPhotos ? { underPhotos: hydration.underPhotos } : {}),
      ...(hydration?.underServiceName ? { underServiceName: hydration.underServiceName } : {}),
      ...(hydration?.lashSpecs ? { lashSpecs: hydration.lashSpecs } : {}),
    };
  });

  const completedVisitsList = visits.filter((v) => v.statusTone === 'completed');
  const canceledBookings = visits.filter((v) => v.statusTone === 'canceled').length;
  const payments = visits.filter(
    (v) =>
      v.statusTone === 'completed' ||
      v.paidAmount > 0 ||
      v.debtAmount > 0 ||
      v.diamondUsed > 0 ||
      v.discountAmount > 0 ||
      v.prepaidAmount > 0
  );
  const fixVisits = visits.filter((v) => v.isFixOrder);
  const totalSpent = completedVisitsList.reduce((sum, v) => sum + v.paidAmount, 0);
  const totalDebt = visits.reduce((sum, v) => sum + v.debtAmount, 0);
  const completedCount = completedVisitsList.length;

  const rawName = String(
    profileRow?.full_name ||
      `${profileRow?.last_name || ''} ${profileRow?.first_name || ''}`.trim() ||
      `Khách hàng #${customerId}`
  ).trim();
  const customerPhone = canViewPhone ? rawPhone : rawPhone ? maskPhoneNumber(rawPhone) : '';

  const summary: IosCustomerHistorySummary = {
    totalSpent,
    completedVisits: completedCount,
    totalBookings: visits.length,
    canceledBookings,
    fixCount: fixVisits.length,
    avgSpendPerVisit: completedCount > 0 ? Math.round(totalSpent / completedCount) : 0,
    diamondBalance,
    totalDiamondEarned,
    totalDiamondUsed,
    totalDebt,
    lastVisitDate: completedVisitsList[0]?.dateDisplay || visits[0]?.dateDisplay || null,
    firstVisitDate:
      completedVisitsList[completedVisitsList.length - 1]?.dateDisplay ||
      visits[visits.length - 1]?.dateDisplay ||
      null,
  };

  return {
    success: true,
    customerId,
    customerName: rawName,
    customerPhone,
    customerCode: profileRow?.passcode ? String(profileRow.passcode) : null,
    summary,
    visits,
    payments,
    fixVisits,
    diamondTransactions,
  };
}
