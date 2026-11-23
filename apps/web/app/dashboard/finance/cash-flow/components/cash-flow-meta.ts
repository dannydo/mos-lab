import type { CashFlowPriority, CashFlowStatus } from '@mos-lab/shared';

export const CASH_FLOW_CATEGORY_NAMES: Record<string, string> = {
  REVENUE_SERVICE: 'Doanh thu Dịch vụ',
  REVENUE_PRODUCT: 'Bán lẻ Sản phẩm',
  REVENUE_ACADEMY: 'Học phí Academy',
  REVENUE_OTHER: 'Thu nhập khác',
  SALARY: 'Lương & Thù lao',
  RENT: 'Thuê mặt bằng',
  SUPPLIER_MATERIAL: 'Vật tư & NCC',
  TAX: 'Thuế (TNDN & GTGT)',
  TRANSACTION_FEE: 'Phí giao dịch / POS',
  OPEX: 'Chi phí vận hành',
  OTHER: 'Chi phí khác',
};

export const CASH_FLOW_PRIORITY_META: Record<CashFlowPriority, { label: string; badgeClass: string; desc: string }> = {
  CRITICAL: {
    label: 'Bắt buộc / Khẩn cấp',
    badgeClass:
      'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800',
    desc: 'Lương, mặt bằng, thuế đến hạn - không thể hoãn',
  },
  HIGH: {
    label: 'Thiết yếu / Ưu tiên cao',
    badgeClass:
      'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
    desc: 'Vật tư phục vụ khách, tiền điện mạng',
  },
  MEDIUM: {
    label: 'Bình thường',
    badgeClass:
      'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
    desc: 'Bảo trì định kỳ, văn phòng phẩm',
  },
  LOW: {
    label: 'Có thể hoãn',
    badgeClass:
      'bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400 border border-slate-200 dark:border-slate-800',
    desc: 'Trang trí, nâng cấp decor khi dòng tiền dồi dào',
  },
};

export const CASH_FLOW_STATUS_META: Record<CashFlowStatus, { label: string; badgeClass: string }> = {
  PENDING: {
    label: 'Chờ duyệt / Dự kiến',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  },
  APPROVED: {
    label: 'Đã duyệt chi',
    badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  },
  PAID: {
    label: 'Đã thanh toán',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  },
  COLLECTED: {
    label: 'Đã thu tiền',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  },
  OVERDUE: {
    label: 'Trễ hạn',
    badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
  },
  DEFERRED: {
    label: 'Tạm hoãn chi',
    badgeClass: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
  },
  CANCELLED: {
    label: 'Đã hủy',
    badgeClass: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500',
  },
};
