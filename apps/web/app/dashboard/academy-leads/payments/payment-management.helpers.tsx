import dayjs from 'dayjs';
import { BanknoteArrowDown, CircleCheck, CircleDollarSign, Clock3 } from 'lucide-react';
import type {
  AcademyTalentPaymentManagementRow,
  AcademyTalentPaymentManagementStatus,
  AcademyTalentPaymentManagementSummary,
  AcademyTalentPaymentMethod,
  AcademyTalentPaymentTrace,
  SafeAny,
} from '@mos-lab/shared';
import { AppIcon, MetricGrid, StatusTag } from '../../../../components/ui';
import { formatVND } from '../../../../lib/format-utils';
import styles from './PaymentManagementPage.module.css';

export const PAGE_SIZE_OPTIONS = ['10', '20', '50', '100'];
export const PAGE_STORAGE_KEY = 'academy-payment-management:page';
export const PAGE_SIZE_STORAGE_KEY = 'academy-payment-management:page-size';
export const STATUS_STORAGE_KEY = 'academy-payment-management:status';
export const MONTH_STORAGE_KEY = 'academy-payment-management:month';
export const DEPOSIT_PRESET_VND = 1_000_000;

export const STATUS_OPTIONS: Array<{ value: AcademyTalentPaymentManagementStatus; label: string }> = [
  { value: 'ALL', label: 'Tất cả phiếu đã in' },
  { value: 'FOLLOW_UP', label: 'Cần follow-up sau cọc' },
  { value: 'DEPOSIT_RECEIVED', label: 'Đã cọc' },
  { value: 'PARTIALLY_PAID', label: 'Đã thu một phần' },
  { value: 'UNPAID', label: 'Chưa thu' },
  { value: 'PAID', label: 'Đã thu đủ' },
];

export function currentRole() {
  if (typeof window === 'undefined') return '';
  try {
    return String((JSON.parse(window.localStorage.getItem('mos_user') || '{}') as SafeAny).role || '').toLowerCase();
  } catch {
    return '';
  }
}

export function persistedNumber(key: string, fallback: number, accepted?: number[]) {
  if (typeof window === 'undefined') return fallback;
  const value = Number(window.localStorage.getItem(key));
  return Number.isFinite(value) && value > 0 && (!accepted || accepted.includes(value)) ? value : fallback;
}

export function persistedStatus(): AcademyTalentPaymentManagementStatus {
  if (typeof window === 'undefined') return 'FOLLOW_UP';
  const value = String(
    window.localStorage.getItem(STATUS_STORAGE_KEY) || 'FOLLOW_UP'
  ) as AcademyTalentPaymentManagementStatus;
  return STATUS_OPTIONS.some((option) => option.value === value) ? value : 'FOLLOW_UP';
}

export function persistedMonth() {
  if (typeof window === 'undefined') return dayjs().startOf('month');
  const value = window.localStorage.getItem(MONTH_STORAGE_KEY);
  const parsed = value ? dayjs(value, 'YYYY-MM', true) : null;
  return parsed?.isValid() ? parsed.startOf('month') : dayjs().startOf('month');
}

export function paymentStatusMeta(status: AcademyTalentPaymentManagementRow['paymentStatus']) {
  switch (status) {
    case 'PAID':
      return { label: 'Đã thu đủ', tone: 'success' as const };
    case 'DEPOSIT_RECEIVED':
      return { label: 'Đã cọc · follow-up', tone: 'warning' as const };
    case 'PARTIALLY_PAID':
      return { label: 'Đã thu một phần', tone: 'processing' as const };
    default:
      return { label: 'Chưa thu', tone: 'default' as const };
  }
}

export function paymentMethodLabel(method: AcademyTalentPaymentMethod) {
  return method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản';
}

export function dateLabel(value: string | null) {
  return value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—';
}

export function traceActorName(actor: AcademyTalentPaymentTrace['actors'][number]) {
  return actor.staff?.displayName || actor.recordedName || 'Chưa xác định';
}

export function paymentProgressPercent(totalPaidVnd: number, tuitionVnd: number) {
  if (tuitionVnd <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((totalPaidVnd / tuitionVnd) * 100)));
}

export function mobilePaymentCard(
  row: AcademyTalentPaymentManagementRow,
  onOpen: (row: AcademyTalentPaymentManagementRow) => void
) {
  const status = paymentStatusMeta(row.paymentStatus);
  return (
    <button type="button" className={styles.mobilePaymentCard} onClick={() => onOpen(row)}>
      <div className="flex items-start justify-between gap-2">
        <div className="grid min-w-0 gap-1">
          <strong>{row.lead.name}</strong>
          <div className="truncate text-xs opacity-70">{row.invoiceNumber}</div>
        </div>
        <StatusTag status={status.tone} label={status.label} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <span className="opacity-70">Đã nhận</span>
        <strong className="text-right tabular-nums">{formatVND(row.totalPaidVnd)}</strong>
        <span className="opacity-70">Còn lại</span>
        <strong className="text-right tabular-nums">{formatVND(row.remainingVnd)}</strong>
      </div>
    </button>
  );
}

export function PaymentSummaryMetrics({
  loading,
  monthLabel,
  summary,
}: {
  loading: boolean;
  monthLabel: string;
  summary: AcademyTalentPaymentManagementSummary | null;
}) {
  return (
    <MetricGrid
      className={styles.metricGrid}
      columns={4}
      items={[
        {
          key: 'revenue',
          title: `Đã thu · ${monthLabel}`,
          value: summary?.confirmedRevenueVnd || 0,
          format: 'vnd',
          icon: <AppIcon icon={BanknoteArrowDown} size="md" />,
          subValue: `CK: ${formatVND(summary?.confirmedBankTransferVnd || 0)} · TM: ${formatVND(summary?.confirmedCashVnd || 0)}`,
          loading,
        },
        {
          key: 'deposit',
          title: 'Cọc cần follow-up',
          value: summary?.depositFollowUpVnd || 0,
          format: 'vnd',
          icon: <AppIcon icon={Clock3} size="md" />,
          subValue: `${(summary?.depositFollowUpCount || 0).toLocaleString('vi-VN')} học viên`,
          loading,
        },
        {
          key: 'outstanding',
          title: 'Còn cần follow-up',
          value: summary?.outstandingFollowUpVnd || 0,
          format: 'vnd',
          icon: <AppIcon icon={CircleDollarSign} size="md" />,
          subValue: `${(summary?.outstandingFollowUpCount || 0).toLocaleString('vi-VN')} phiếu đã thu một phần`,
          loading,
        },
        {
          key: 'paid',
          title: 'Đã hoàn tất học phí',
          value: summary?.paidInFullCount || 0,
          format: 'number',
          icon: <AppIcon icon={CircleCheck} size="md" />,
          subValue: 'Phiếu đã được khóa',
          loading,
        },
      ]}
    />
  );
}
