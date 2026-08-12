/**
 * Vietnam Timezone (Asia/Ho_Chi_Minh / UTC+7) Utilities
 */

export const VIETNAM_TZ = 'Asia/Ho_Chi_Minh';
export const VIETNAM_OFFSET = '+07:00';

/**
 * Converts any Date / ISO string / timestamp into an ISO string with explicit +07:00 timezone offset.
 * Example: 2026-08-30T20:00:00.000+07:00
 */
export function toVietnamISO(input: Date | string | number | null | undefined): string | null {
  if (!input) return null;
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return null;

  // `toISOString()` always serializes in UTC. Shift the instant before
  // serializing so the written date/time actually represents UTC+7, rather
  // than merely relabeling a UTC timestamp with a +07:00 suffix.
  const vietnamLocalTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return vietnamLocalTime.toISOString().replace('Z', VIETNAM_OFFSET);
}

/**
 * Formats date into YYYY-MM-DD string in Vietnam timezone.
 */
export function toVietnamDateString(input: Date | string | number | null | undefined): string | null {
  const iso = toVietnamISO(input);
  if (!iso) return null;
  return iso.split('T')[0];
}
