import type {
  HolidayCoverageRequirement,
  HolidayLedgerStatus,
  HolidayPayrollAdjustment,
  HolidayPayrollLedgerEntry,
  HolidayPeriodStatus,
  HolidayPeriodSummary,
  HolidayRosterEntry,
  StaffPerformanceEventStatus,
} from '@mos-lab/shared';
import type { StatusType } from '~/components/ui';
import {
  holidayNormalizedIncludes,
  type HolidayBranchCoverageRow,
  type HolidayWorkTabKey,
} from '../components/holidayWorkPresentation';

export const PAGE_STATE_KEY = 'mos_holiday_work_table_state_v1';
export const ACTIVE_TAB_KEY = 'mos_holiday_work_active_tab_v1';

export type HolidayWorkPageState = Record<HolidayWorkTabKey, { current: number; pageSize: number }>;
export type HolidayConfirmAction = 'publish' | 'lock' | null;

export const DEFAULT_HOLIDAY_PAGE_STATE: HolidayWorkPageState = {
  coverage: { current: 1, pageSize: 10 },
  candidates: { current: 1, pageSize: 20 },
  roster: { current: 1, pageSize: 20 },
  ledger: { current: 1, pageSize: 20 },
  feedback: { current: 1, pageSize: 20 },
};

export const ATTENDANCE_SOURCE_LABELS: Record<HolidayPayrollLedgerEntry['attendanceSource'], string> = {
  REPORT_STAFF_WORKING_MINUTE: 'report_staff.working_minute',
  STAFF_DAY_OFF_APPROVED: 'Leave đã duyệt',
  HOLIDAY_ROSTER_POLICY: 'Roster / chính sách lễ',
};

export const PERIOD_STATUS_TYPE_MAP: Record<HolidayPeriodStatus, StatusType> = {
  DRAFT: 'gold',
  PUBLISHED: 'processing',
  PAYROLL_LOCKED: 'success',
};

export const LEDGER_STATUS_TYPE_MAP: Record<HolidayLedgerStatus, StatusType> = {
  READY: 'processing',
  EXCEPTION: 'error',
  LOCKED: 'success',
  ADJUSTMENT: 'processing',
};

export const EVENT_STATUS_TYPE_MAP: Record<StaffPerformanceEventStatus, StatusType> = {
  PENDING: 'gold',
  VERIFIED: 'success',
  REJECTED: 'error',
};

export function filterHolidayRows<T extends object>(rows: T[], fields: Array<keyof T>, searchQuery: string): T[] {
  if (!searchQuery) return rows;
  return rows.filter((row) => fields.some((field) => holidayNormalizedIncludes(row[field], searchQuery)));
}

export function groupHolidayBranchCoverage(coverage: HolidayCoverageRequirement[]): HolidayBranchCoverageRow[] {
  const grouped = new Map<string, HolidayBranchCoverageRow>();
  coverage.forEach((row) => {
    if (row.teamCode !== 'CC' && row.teamCode !== 'CV') return;
    const key = [row.workDate, row.storeKey, row.shiftStart, row.shiftEnd].join('|');
    const current = grouped.get(key) || {
      key,
      workDate: row.workDate,
      storeId: row.storeId || null,
      storeKey: row.storeKey,
      shiftStart: row.shiftStart,
      shiftEnd: row.shiftEnd,
      ccRequiredCount: 0,
      cvRequiredCount: 0,
      requiredCount: 0,
      notes: row.notes || undefined,
    };
    if (row.teamCode === 'CC') current.ccRequiredCount = row.requiredCount;
    if (row.teamCode === 'CV') current.cvRequiredCount = row.requiredCount;
    current.requiredCount = current.ccRequiredCount + current.cvRequiredCount;
    current.notes ||= row.notes || undefined;
    grouped.set(key, current);
  });
  return [...grouped.values()];
}

export function buildAdjustmentByLedger(adjustments: HolidayPayrollAdjustment[]): Map<number, number> {
  const result = new Map<number, number>();
  adjustments.forEach((item) => {
    result.set(item.ledgerId, (result.get(item.ledgerId) || 0) + item.amount);
  });
  return result;
}

export function getUnresolvedHolidayExceptionCount(
  summary: HolidayPeriodSummary | undefined,
  roster: HolidayRosterEntry[],
  ledger: HolidayPayrollLedgerEntry[]
): number {
  return (
    summary?.payrollExceptions ??
    roster.filter((row) => row.status === 'PAYROLL_EXCEPTION').length +
      ledger.filter((row) => row.ledgerStatus === 'EXCEPTION').length
  );
}
