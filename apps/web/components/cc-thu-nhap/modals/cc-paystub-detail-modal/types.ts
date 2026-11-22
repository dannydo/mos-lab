import type dayjs from 'dayjs';
import type { CcPaystubRecord } from '@mos-lab/shared';

export type FormatHoursToHoursMinutesFn = (hrs: number, compact?: boolean) => string;

export interface CcPaystubDetailModalProps {
  open: boolean;
  onCancel: () => void;
  selectedRecord: CcPaystubRecord | null;
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  onOpenAllowanceModal: () => void;
  onDeleteAllowance: (allowanceId: number | string) => void;
  formatHoursToHoursMinutes?: FormatHoursToHoursMinutesFn;
}

export interface SocialSecuritySubItem {
  label: string;
  amount: number;
}
