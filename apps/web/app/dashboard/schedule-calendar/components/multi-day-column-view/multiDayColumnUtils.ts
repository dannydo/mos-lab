import dayjs from 'dayjs';
import { Appointment, shouldMaskCustomerPhone } from '@mos-lab/shared';
import type { AppointmentWithLegacyFields, BranchBadgeInfo, CapacityBadgeInfo } from './types';

export const HOURS_RANGE = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
] as const;

export const MINUTE_SLOTS = ['00', '15', '30', '45'] as const;

export const DEFAULT_WORKING_KTV_COUNT = 14;
export const DEFAULT_CAPACITY_MULTIPLIER = 5;

// Some legacy appointments do not expose an `id`. Keep their React identity
// deterministic so a calendar refresh does not remount every card/popover.
export function getAppointmentKey(appointment: Appointment): string {
  const legacyAppointment = appointment as AppointmentWithLegacyFields;
  const fallback = [
    appointment.customerId ?? legacyAppointment.userId ?? 'customer',
    appointment.bookingDateStart ?? legacyAppointment.appointmentTime ?? 'appointment',
    appointment.serviceName ?? 'service',
  ].join('-');

  return String(appointment.id ?? legacyAppointment.orderId ?? fallback);
}

export function getAppointmentOrderId(appointment: Appointment): string | number | undefined {
  const legacyAppointment = appointment as AppointmentWithLegacyFields;
  return appointment.id || legacyAppointment.orderId;
}

export function getAppointmentCustomerId(appointment: Appointment): number | undefined {
  const legacyAppointment = appointment as AppointmentWithLegacyFields;
  const rawId = appointment.customerId || legacyAppointment.userId;
  return rawId !== undefined ? Number(rawId) : undefined;
}

export function getAppointmentPrice(appointment: Appointment): number {
  const legacyAppointment = appointment as AppointmentWithLegacyFields;
  return appointment.totalPrice || legacyAppointment.orderPrice || 0;
}

export function getAppointmentDisplayFields(appointment: Appointment, fallbackHour: string) {
  const legacyAppointment = appointment as AppointmentWithLegacyFields;
  return {
    customerName: appointment.customerName || legacyAppointment.userName || 'Khách hàng',
    phone: appointment.customerPhone || legacyAppointment.phone || '',
    service: appointment.serviceName || legacyAppointment.packageName || 'Lịch dịch vụ',
    timeFormatted: appointment.bookingDateStart ? dayjs(appointment.bookingDateStart).format('HH:mm') : fallbackHour,
  };
}

export function isSameDraggedAppointment(draggedAppt: Appointment | null, appt: Appointment): boolean {
  if (!draggedAppt) return false;
  if (draggedAppt.id && appt.id && draggedAppt.id === appt.id) return true;
  const draggedOrderId = (draggedAppt as AppointmentWithLegacyFields).orderId;
  const apptOrderId = (appt as AppointmentWithLegacyFields).orderId;
  return Boolean(draggedOrderId && apptOrderId && draggedOrderId === apptOrderId);
}

export function getBranchBadgeInfo(
  storeId?: number | null,
  branchName?: string,
  branchCode?: string | null
): BranchBadgeInfo {
  const name = branchName || '';
  const codeFromCatalog = branchCode?.trim().toUpperCase();
  if (codeFromCatalog) {
    if (codeFromCatalog === 'PXL' || codeFromCatalog === 'ACADEMY_PXL') {
      return {
        code: codeFromCatalog,
        label: name || codeFromCatalog,
        bgClass: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700/60',
      };
    }
    if (codeFromCatalog === 'DT' || codeFromCatalog === 'ACA-DT') {
      return {
        code: codeFromCatalog,
        label: name || codeFromCatalog,
        bgClass: 'bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-300 dark:border-orange-700/60',
      };
    }
    if (codeFromCatalog === 'EP') {
      return {
        code: codeFromCatalog,
        label: name || codeFromCatalog,
        bgClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-300 dark:border-purple-700/60',
      };
    }
    return {
      code: codeFromCatalog,
      label: name || codeFromCatalog,
      bgClass: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700/60',
    };
  }
  const sId = storeId ? Number(storeId) : 0;
  if (sId === 2 || sId === 9 || name.toLowerCase().includes('phan xích long') || name.toLowerCase().includes('pxl')) {
    return {
      code: 'PXL',
      label: 'Phan Xích Long',
      bgClass: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700/60',
    };
  }
  if (
    sId === 6 ||
    sId === 1 ||
    sId === 3 ||
    name.toLowerCase().includes('đề thám') ||
    name.toLowerCase().includes('de tham')
  ) {
    return {
      code: 'DT',
      label: 'Đề Thám',
      bgClass: 'bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-300 dark:border-orange-700/60',
    };
  }
  return {
    code: 'EP',
    label: 'Estella Place',
    bgClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-300 dark:border-purple-700/60',
  };
}

export function getCapacityBadge(count: number, maxCap: number): CapacityBadgeInfo {
  const safeMaxCap = maxCap > 0 ? maxCap : 1;
  const percentage = Math.min(100, Math.round((count / safeMaxCap) * 100));
  if (percentage >= 85) {
    return {
      label: 'Quá tải / Kín',
      status: 'error',
      strokeColor: 'rgba(239, 68, 68, 1)',
      progressStatus: 'exception',
      percentage,
    };
  }
  if (percentage >= 65) {
    return {
      label: 'Đông khách',
      status: 'warning',
      strokeColor: 'rgba(245, 158, 11, 1)',
      progressStatus: 'active',
      percentage,
    };
  }
  return {
    label: 'Bình thường',
    status: 'success',
    strokeColor: 'rgba(16, 185, 129, 1)',
    progressStatus: 'normal',
    percentage,
  };
}

export function groupAppointmentsByDay(
  appointments: Appointment[],
  daysList: dayjs.Dayjs[]
): Record<string, Appointment[]> {
  const map: Record<string, Appointment[]> = {};
  daysList.forEach((d) => {
    map[d.format('YYYY-MM-DD')] = [];
  });

  appointments.forEach((appt) => {
    if (!appt.bookingDateStart) return;
    const apptDay = dayjs(appt.bookingDateStart).format('YYYY-MM-DD');
    if (map[apptDay]) {
      map[apptDay].push(appt);
    }
  });

  return map;
}

export function getSubSlotAppointments(
  dayAppts: Appointment[],
  targetHourNum: number,
  minTarget: number
): Appointment[] {
  return dayAppts.filter((a) => {
    if (!a.bookingDateStart) return false;
    const d = dayjs(a.bookingDateStart);
    if (d.hour() !== targetHourNum) return false;
    const m = d.minute();
    return m >= minTarget && m < minTarget + 15;
  });
}

export function checkIsMaskedPhoneRole(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem('mos_user');
    if (stored) {
      const user = JSON.parse(stored);
      return shouldMaskCustomerPhone(user?.role);
    }
  } catch {
    return false;
  }
  return false;
}

export interface AppointmentStatusMeta {
  popoverStatusLabel: string;
  tooltipTitle: string;
  cardSurfaceClass: string;
  iconKind: 'completed' | 'pendingCheckout' | 'servicing' | 'missed' | 'pending';
}

export function getAppointmentStatusMeta(orderState?: string): AppointmentStatusMeta {
  const isCompleted = orderState === 'Completed';
  const isPendingCheckout = orderState === 'CheckOut' || orderState === 'ServiceCompleted';
  const isServicing = orderState === 'ServiceCleaned' || orderState === 'ServiceEnd';
  const isPrep = orderState === 'Preparation' || orderState === 'ServiceStart';
  const isCheckInConsult = orderState === 'CheckIn' || orderState === 'Consultation';
  const isCancelled = orderState === 'Cancelled';
  const isMissed = orderState === 'Missed';

  const popoverStatusLabel = isCompleted
    ? '✅ Hoàn thành (Đã tính tiền)'
    : isPendingCheckout
      ? '💳 Xong DV (Chờ checkout)'
      : isServicing
        ? '💅 Đang nối mi'
        : isPrep
          ? '🤝 Chuẩn bị / Rước khách'
          : isCheckInConsult
            ? '💬 Đã check-in / Tư vấn'
            : isCancelled
              ? '🚫 Đã hủy (Booker/Admin)'
              : isMissed
                ? '⏰ Missed (Bỏ lỡ)'
                : '🕒 Chờ check-in';

  const tooltipTitle = isCompleted
    ? '✅ Đã hoàn thành (đã tính tiền)'
    : isPendingCheckout
      ? '💳 Đã nối xong — Chờ CC checkout / tính tiền'
      : isServicing
        ? '🔵 Đang phục vụ / Nối mi'
        : isMissed
          ? '❌ Đã hủy / Bỏ lỡ'
          : '🕒 Lịch hẹn chờ khách check-in';

  const cardSurfaceClass = isCompleted
    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
    : isPendingCheckout
      ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800/70 text-purple-900 dark:text-purple-200 shadow-xs'
      : isServicing
        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800/60 text-blue-900 dark:text-blue-200'
        : isMissed
          ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
          : 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 text-slate-800 dark:text-slate-200';

  const iconKind: AppointmentStatusMeta['iconKind'] = isCompleted
    ? 'completed'
    : isPendingCheckout
      ? 'pendingCheckout'
      : isServicing
        ? 'servicing'
        : isMissed
          ? 'missed'
          : 'pending';

  return { popoverStatusLabel, tooltipTitle, cardSurfaceClass, iconKind };
}
