import type dayjs from 'dayjs';
import type { Appointment } from '@mos-lab/shared';

export interface WorkingStaffSummary {
  id: number;
  name: string;
  branchName?: string;
  branchCode?: string;
  shift?: string;
  bookedCount?: number;
  doneCount?: number;
  avgDurationMinutes?: {
    normalAvg?: number;
    retainAvg?: number;
    removalAvg?: number;
    overallAvg?: number;
  };
}

export interface OffStaffSummary {
  id: number;
  name: string;
  branchName?: string;
  branchCode?: string;
  reason: string;
  type?: string;
}

export interface DailyCapacityEntry {
  workingKtvCount: number;
  maxCapacity: number;
  workingStaffList?: WorkingStaffSummary[];
  offStaffList?: OffStaffSummary[];
}

export interface MultiDayColumnViewProps {
  loading: boolean;
  startDate: dayjs.Dayjs;
  daysCount?: number; // 3, 5, or 7 days
  appointments: Appointment[];
  maxCapacityPerDay?: number; // Default e.g. 25 slots
  dailyCapacities?: Record<string, DailyCapacityEntry>;
  onSelectSlot?: (date: dayjs.Dayjs, hour: string) => void;
  onViewCustomerDetail?: (customerId: number) => void;
  onReschedule?: (appointment: Appointment, newDateStr?: string) => void;
}

export type AppointmentWithLegacyFields = Appointment & {
  orderId?: string | number;
  userId?: string | number;
  orderPrice?: number;
  userName?: string;
  phone?: string;
  packageName?: string;
  appointmentTime?: string;
};

export interface BranchBadgeInfo {
  code: string;
  label: string;
  bgClass: string;
}

export interface CapacityBadgeInfo {
  label: string;
  status: 'error' | 'warning' | 'success';
  strokeColor: string;
  progressStatus: 'exception' | 'active' | 'normal';
  percentage: number;
}
