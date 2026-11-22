import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { Appointment } from '@mos-lab/shared';
import type { DataColumnPriority } from '~/components/ui';

export type AppointmentTabKey = 'pending' | 'missed' | 'completed';
export type AppointmentViewMode = 'month' | 'week' | 'day';
export type MissedStatusFilter = 'ALL' | 'UNTAGGED' | 'FOLLOWUP' | 'RESOLVED';

export interface AppointmentColumnConfigItem {
  visible: boolean;
  width: number;
  label: string;
}

export type AppointmentColumnConfigMap = Record<string, AppointmentColumnConfigItem>;

export interface AppointmentSummaryStats {
  totalPending?: number;
  pendingValue?: number;
  totalMissed?: number;
  missedRate?: number;
  missedRatePct?: number;
  totalCompleted?: number;
  completedRevenue?: number;
  totalNetRev?: number;
  totalPlanned?: number;
  totalCheckin?: number;
  checkInRate?: number;
  baseSalary?: number;
  clientBonus?: number;
  doneBonus?: number;
  doneLevelCount?: number;
  missedBonus?: number;
  missedLevelRate?: number;
  tipBonus?: number;
  totalTips?: number;
  revBonus?: number;
  revLevelMin?: number;
  revLevelRate?: number;
  totalSalary?: number;
}

export const APPOINTMENT_PAGE_SIZE_OPTIONS = ['10', '20', '50', '100'];

export const DEFAULT_APPOINTMENT_COLUMN_CONFIG: AppointmentColumnConfigMap = {
  customerName: { visible: true, width: 220, label: 'Khách hàng' },
  appointmentTime: { visible: true, width: 150, label: 'Thời Gian Hẹn' },
  serviceName: { visible: true, width: 200, label: 'Dịch vụ chính' },
  totalPrice: { visible: true, width: 130, label: 'Giá trị ước tính' },
  netRevenue: { visible: true, width: 130, label: 'Doanh thu Net' },
  tipAmount: { visible: true, width: 120, label: 'Tiền tips' },
  bookingBonus: { visible: true, width: 130, label: 'Hoa hồng OC' },
  bookingChannel: { visible: true, width: 120, label: 'Kênh đặt lịch' },
  promotion: { visible: true, width: 150, label: 'Khuyến mãi' },
  bookingNote: { visible: true, width: 220, label: 'Ghi chú đặt lịch' },
  orderState: { visible: true, width: 120, label: 'Trạng thái' },
};

export const APPOINTMENT_COLUMN_PRIORITY: Record<string, DataColumnPriority> = {
  customerName: 'primary',
  appointmentTime: 'primary',
  orderState: 'primary',
  serviceName: 'secondary',
  totalPrice: 'secondary',
  action: 'primary',
  bookingNote: 'tertiary',
  promotion: 'tertiary',
  netRevenue: 'tertiary',
  tipAmount: 'tertiary',
  bookingBonus: 'tertiary',
  bookingChannel: 'tertiary',
};

const IN_SERVICE_ORDER_STATES = new Set(['CheckIn', 'ServiceCleaned', 'CheckOut']);
const COMPLETED_HIDDEN_COLUMNS = new Set(['totalPrice', 'bookingNote']);
const NON_COMPLETED_HIDDEN_COLUMNS = new Set(['netRevenue', 'tipAmount', 'bookingBonus', 'serviceName']);

export function isColumnVisibleInTab(columnKey: string, activeTab: AppointmentTabKey): boolean {
  if (activeTab === 'completed') {
    return !COMPLETED_HIDDEN_COLUMNS.has(columnKey);
  }
  return !NON_COMPLETED_HIDDEN_COLUMNS.has(columnKey);
}

export function buildAppointmentTableColumns(
  baseColumns: ColumnsType<Appointment>,
  columnConfig: AppointmentColumnConfigMap,
  onSaveColumnConfig: (nextConfig: AppointmentColumnConfigMap) => void
): ColumnsType<Appointment> {
  return baseColumns
    .filter((col) => {
      if (col.key === 'action' || col.key === 'stt') return true;
      const config = columnConfig[col.key as string];
      return config ? config.visible : true;
    })
    .map((col) => {
      const colKey = col.key as string;
      const config = columnConfig[colKey];
      const colWidth = config?.width || col.width || 150;

      return {
        ...col,
        width: colWidth,
        onHeaderCell: (column: SafeAny) => ({
          width: column.width,
          onResize: (newWidth: number) => {
            if (colKey && columnConfig[colKey]) {
              onSaveColumnConfig({
                ...columnConfig,
                [colKey]: {
                  ...columnConfig[colKey],
                  width: Math.round(newWidth),
                },
              });
            }
          },
        }),
      };
    });
}

export function getAppointmentRowClassName(record: Appointment): string {
  const isPast = record.bookingDateStart ? dayjs(record.bookingDateStart).isBefore(dayjs()) : false;
  const isCompleted = record.orderState === 'Completed';
  const isInService = IN_SERVICE_ORDER_STATES.has(record.orderState);

  if (isPast && !isCompleted && !isInService) {
    return 'bg-rose-50 dark:bg-rose-950/35';
  }
  if (!isCompleted && !isInService) {
    const isToday = record.bookingDateStart ? dayjs(record.bookingDateStart).isSame(dayjs(), 'day') : false;
    if (isToday) {
      return 'bg-amber-50 dark:bg-amber-950/30';
    }
    return '';
  }
  if (isInService) {
    return 'bg-sky-50 dark:bg-sky-950/35';
  }

  return '';
}
