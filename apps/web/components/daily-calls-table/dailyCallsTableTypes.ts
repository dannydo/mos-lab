import type { Dayjs } from 'dayjs';
import type { DailyCallEntry, Staff } from '@mos-lab/shared';
import type { StatusType } from '~/components/ui';

export type DailyCallsScope = 'all' | 'me' | 'nyc';

export interface DailyCallsTableProps {
  initialScope?: DailyCallsScope;
  isDrawerMode?: boolean;
}

export interface DailyCallsStoredUser {
  id?: number;
  role?: string;
  displayName?: string;
}

export type DailyCallAssignedStaff = NonNullable<DailyCallEntry['customer']>['assignedStaff'];

export interface DailyCallsColumnBuildOptions {
  onOpenCustomer: (customerId: number) => void;
  onMakeCall: (phone: string, name?: string, customerId?: number, avatar?: string) => void;
  onOpenQaDrawer: (omicallLogId: number) => void;
}

export interface DurationBadgePresentation {
  label: string;
  className: string;
}

export interface CallStatusMeta {
  status: StatusType;
  label: string;
}

export interface HappyCallButtonMeta {
  text: string;
  type: 'primary' | 'default';
  className: string;
}

export interface DailyCallsToolbarProps {
  selectedDate: Dayjs;
  scope: DailyCallsScope;
  isAdmin: boolean;
  staffList: Staff[];
  selectedStaffId: string;
  loading: boolean;
  onPrevDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  onDateChange: (date: Dayjs | null) => void;
  onScopeChange: (scope: DailyCallsScope) => void;
  onStaffChange: (staffId: string) => void;
  onOpenConfig: () => void;
  onRefresh: () => void;
}
