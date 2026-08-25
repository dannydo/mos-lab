import type { UpdateBookingRequest } from '@mos-lab/shared';

export class BookingUpdateValidationError extends Error {}

export interface ExistingBookingUpdateState {
  storeId: number;
  technicianId: number | null;
  bookingDateStart: Date;
  bookingNote: string | null;
}

export interface ResolvedBookingUpdateFields {
  storeId: number;
  technicianId: number | null;
  bookingDate: string;
  bookingTime: string;
  bookingNote: string | null;
  currentBookingDateStart: string;
  isLockedScheduleUpdateRequested: boolean;
}

const hasOwn = (value: object, key: keyof UpdateBookingRequest): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const pad = (value: number): string => String(value).padStart(2, '0');

/**
 * Legacy MySQL DATETIME values are wall-clock values without a timezone. Prisma
 * exposes their numeric fields through UTC getters, so this formatter preserves
 * the exact database calendar time without applying the server machine timezone.
 */
export const formatLegacyBookingDateTime = (value: Date): string => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new BookingUpdateValidationError('Ngày giờ hiện tại của lịch hẹn không hợp lệ.');
  }

  return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())} ${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}:${pad(value.getUTCSeconds())}`;
};

const validateCalendarDate = (value: string): void => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BookingUpdateValidationError('Ngày đặt lịch phải có định dạng YYYY-MM-DD.');
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new BookingUpdateValidationError('Ngày đặt lịch không hợp lệ.');
  }
};

const validateBookingTime = (value: string): void => {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new BookingUpdateValidationError('Giờ đặt lịch phải có định dạng HH:mm.');
  }
};

export const resolveBookingUpdateFields = (
  current: ExistingBookingUpdateState,
  input: UpdateBookingRequest
): ResolvedBookingUpdateFields => {
  const currentBookingDateStart = formatLegacyBookingDateTime(current.bookingDateStart);
  const currentBookingDate = currentBookingDateStart.slice(0, 10);
  const currentBookingTime = currentBookingDateStart.slice(11, 16);

  const requestedStoreId = hasOwn(input, 'storeId') ? Number(input.storeId) : current.storeId;
  if (!Number.isSafeInteger(requestedStoreId) || requestedStoreId <= 0) {
    throw new BookingUpdateValidationError('Chi nhánh của lịch hẹn không hợp lệ.');
  }

  let technicianId = current.technicianId;
  if (hasOwn(input, 'technicianId')) {
    if (input.technicianId === null) {
      technicianId = null;
    } else {
      const requestedTechnicianId = Number(input.technicianId);
      if (!Number.isSafeInteger(requestedTechnicianId) || requestedTechnicianId <= 0) {
        throw new BookingUpdateValidationError('Chuyên viên của lịch hẹn không hợp lệ.');
      }
      technicianId = requestedTechnicianId;
    }
  }

  const bookingDate = hasOwn(input, 'bookingDate') ? String(input.bookingDate || '').trim() : currentBookingDate;
  const bookingTime = hasOwn(input, 'bookingTime') ? String(input.bookingTime || '').trim() : currentBookingTime;
  validateCalendarDate(bookingDate);
  validateBookingTime(bookingTime);

  const bookingNote = hasOwn(input, 'bookingNote')
    ? String(input.bookingNote || '').trim() || null
    : current.bookingNote || null;

  return {
    storeId: requestedStoreId,
    technicianId,
    bookingDate,
    bookingTime,
    bookingNote,
    currentBookingDateStart,
    isLockedScheduleUpdateRequested:
      hasOwn(input, 'storeId') || hasOwn(input, 'bookingDate') || hasOwn(input, 'bookingTime'),
  };
};

export const buildLegacyBookingWindow = (
  bookingDate: string,
  bookingTime: string,
  durationMinutes: number
): { bookingDateStart: string; bookingDateEnd: string } => {
  validateCalendarDate(bookingDate);
  validateBookingTime(bookingTime);

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new BookingUpdateValidationError('Thời lượng dịch vụ không hợp lệ.');
  }

  // Treat the timezone-free legacy wall clock as UTC solely for deterministic
  // duration arithmetic, then write the same wall-clock fields back to MySQL.
  const start = new Date(`${bookingDate}T${bookingTime}:00.000Z`);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  return {
    bookingDateStart: formatLegacyBookingDateTime(start),
    bookingDateEnd: formatLegacyBookingDateTime(end),
  };
};
