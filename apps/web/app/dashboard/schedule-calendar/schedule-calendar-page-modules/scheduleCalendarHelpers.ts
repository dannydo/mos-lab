import dayjs, { type Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import type { Appointment } from '@mos-lab/shared';
import { removeVietnameseTones } from '~/lib/utils/search';
import { isStaffOffOnDate } from '~/components/booking/constants';
import { getBranchBadgeInfo } from '../components/MultiDayColumnView';
import type {
  AppointmentFilters,
  BranchCounts,
  OffDayRescheduleCheckResult,
  ScheduleStatsSummary,
} from './scheduleCalendarTypes';

dayjs.extend(isoWeek);

export function computeBranchCounts(appointments: Appointment[]): BranchCounts {
  const counts: BranchCounts = { all: appointments.length, EP: 0, DT: 0, PXL: 0 };
  appointments.forEach((appt) => {
    const b = getBranchBadgeInfo(appt.storeId, appt.branchName, appt.branchCode);
    if (b.code === 'EP') counts.EP++;
    else if (b.code === 'DT') counts.DT++;
    else if (b.code === 'PXL') counts.PXL++;
  });
  return counts;
}

export function computeMaxCapacityPerDay(selectedBranch: string): number {
  if (selectedBranch === 'EP') return 25;
  if (selectedBranch === 'DT') return 20;
  if (selectedBranch === 'PXL') return 15;
  return 25;
}

export function computeDateRangeBounds(
  startDate: Dayjs,
  daysCount: number,
  dateRangePreset: string,
  customRange: [Dayjs, Dayjs] | null
): [Dayjs, Dayjs] {
  if (customRange) return customRange;

  if (dateRangePreset === 'today') {
    return [startDate.startOf('day'), startDate.endOf('day')];
  }
  if (dateRangePreset === 'next3') {
    return [startDate.startOf('day'), startDate.clone().add(2, 'day').endOf('day')];
  }
  if (dateRangePreset === 'next5') {
    return [startDate.startOf('day'), startDate.clone().add(4, 'day').endOf('day')];
  }
  if (dateRangePreset === 'next7') {
    return [startDate.startOf('day'), startDate.clone().add(6, 'day').endOf('day')];
  }
  if (dateRangePreset === 'thisWeek') {
    return [startDate.startOf('isoWeek'), startDate.endOf('isoWeek')];
  }
  if (dateRangePreset === 'thisMonth') {
    return [startDate.startOf('month'), startDate.endOf('month')];
  }
  return [
    startDate.startOf('day'),
    startDate
      .clone()
      .add(daysCount - 1, 'day')
      .endOf('day'),
  ];
}

export function filterScheduleAppointments(appointments: Appointment[], filters: AppointmentFilters): Appointment[] {
  const { selectedBranch, selectedStatus, selectedChannel, searchQuery } = filters;

  return appointments.filter((appt) => {
    if (selectedBranch !== 'all') {
      const b = getBranchBadgeInfo(appt.storeId, appt.branchName, appt.branchCode);
      if (b.code !== selectedBranch) return false;
    }

    if (selectedStatus !== 'all') {
      if (selectedStatus === 'Pending') {
        if (appt.orderState !== 'Pending' && appt.orderState !== 'New' && appt.orderState !== 'Confirmed') {
          return false;
        }
      } else if (selectedStatus === 'Missed') {
        if (appt.orderState !== 'Missed' && appt.orderState !== 'Cancelled') return false;
      } else if (appt.orderState !== selectedStatus) {
        return false;
      }
    }

    if (selectedChannel !== 'all' && appt.bookingChannel !== selectedChannel) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = removeVietnameseTones(searchQuery);
      if (q) {
        const legacyAppt = appt as Appointment & {
          userName?: string;
          phone?: string;
          packageName?: string;
          service?: string;
        };
        const searchTargets = [
          appt.customerName,
          legacyAppt.userName,
          appt.customerPhone,
          legacyAppt.phone,
          appt.serviceName,
          legacyAppt.packageName,
          legacyAppt.service,
          appt.technicianName,
          appt.bookerName,
          appt.bookingNote,
          appt.orderKey,
          appt.id,
          appt.branchName,
          appt.bookingChannel,
        ];

        const match = searchTargets.some((target) => {
          if (target === null || target === undefined) return false;
          return removeVietnameseTones(target).includes(q);
        });

        if (!match) return false;
      }
    }

    return true;
  });
}

export function computeScheduleStatsSummary(appointments: Appointment[]): ScheduleStatsSummary {
  const totalCount = appointments.length;
  const completedCount = appointments.filter((a) => a.orderState === 'Completed').length;
  const missedCount = appointments.filter((a) => a.orderState === 'Missed' || a.orderState === 'Cancelled').length;
  const pendingCount = totalCount - completedCount - missedCount;
  const totalEstRev = appointments.reduce(
    (sum, a) => sum + (a.totalPrice || (a as Appointment & { orderPrice?: number }).orderPrice || 0),
    0
  );

  return {
    totalCount,
    completedCount,
    missedCount,
    pendingCount,
    totalEstRev,
  };
}

export function resolveOffDayRescheduleCheck(appt: any, newDateTime?: string): OffDayRescheduleCheckResult {
  let targetDateStr: string | null = appt.targetBookingDate || appt.bookingDate || appt.bookingDateStart || null;
  let targetTimeStr: string | null = appt.targetBookingTime || appt.bookingTime || null;

  if (newDateTime) {
    const targetDay = dayjs(newDateTime);
    targetDateStr = targetDay.format('YYYY-MM-DD');
    targetTimeStr = targetDay.format('HH:mm');
  }

  const bDate = targetDateStr ? dayjs(targetDateStr) : dayjs();

  const assignedStaff = appt.technicianId
    ? {
        id: appt.technicianId,
        displayName: appt.technicianName || 'Trancy',
        offDays: appt.technicianOffDays || ['2'],
      }
    : appt.technicianName
      ? { displayName: appt.technicianName, offDays: ['2'] }
      : null;

  const isOff = assignedStaff ? isStaffOffOnDate(assignedStaff, bDate) : false;
  if (!isOff) {
    return {
      isOff: false,
      targetDateStr,
      targetTimeStr,
      nextWorkingDate: null,
    };
  }

  let nextDate = bDate.clone().add(1, 'day');
  for (let i = 0; i < 7; i++) {
    if (!assignedStaff || !isStaffOffOnDate(assignedStaff, nextDate)) break;
    nextDate = nextDate.add(1, 'day');
  }

  return {
    isOff: true,
    targetDateStr,
    targetTimeStr,
    nextWorkingDate: nextDate,
  };
}
