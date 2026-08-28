import { removeVietnameseTones } from '@mos-lab/shared';
import type { StatusType } from '~/components/ui';

export type HolidayWorkTabKey = 'coverage' | 'candidates' | 'roster' | 'ledger' | 'feedback';

export type HolidayBranchCoverageRow = {
  key: string;
  workDate: string;
  storeId: number | null;
  storeKey: string;
  shiftStart: string;
  shiftEnd: string;
  ccRequiredCount: number;
  cvRequiredCount: number;
  requiredCount: number;
  notes?: string;
};

export const HOLIDAY_ROSTER_STATUS_META: Record<string, { label: string; color: string; status: StatusType }> = {
  NOMINATED: { label: 'Đề cử', color: 'blue', status: 'processing' },
  SCHEDULED: { label: 'Đi làm', color: 'green', status: 'success' },
  HOLIDAY_OFF: { label: 'Nghỉ lễ', color: 'default', status: 'default' },
  BOOKED_OFF: { label: 'Book off', color: 'orange', status: 'orange' },
  CANCELLED: { label: 'Đã hủy', color: 'default', status: 'default' },
  PAYROLL_EXCEPTION: { label: 'Ngoại lệ', color: 'red', status: 'error' },
};

export const formatHolidayMoney = (value: number) => `${Math.round(value || 0).toLocaleString('vi-VN')} đ`;

export const holidayNormalizedIncludes = (value: unknown, search: string) =>
  removeVietnameseTones(String(value || '')).includes(removeVietnameseTones(search));
