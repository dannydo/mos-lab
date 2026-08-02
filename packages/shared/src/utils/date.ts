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
  try {
    const d = input instanceof Date ? input : new Date(input);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().replace('Z', VIETNAM_OFFSET);
  } catch (_) {
    return null;
  }
}

/**
 * Formats date into YYYY-MM-DD string in Vietnam timezone.
 */
export function toVietnamDateString(input: Date | string | number | null | undefined): string | null {
  const iso = toVietnamISO(input);
  if (!iso) return null;
  return iso.split('T')[0];
}
