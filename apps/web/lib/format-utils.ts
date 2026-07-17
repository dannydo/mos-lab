/**
 * Shared utility functions for formatting and calculations.
 */

/**
 * Formats a number as Vietnamese Dong (VND).
 * e.g., 1000000 -> "1.000.000 đ"
 */
export function formatVND(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0 đ';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  })
    .format(value)
    .replace(/\s?₫/g, ' đ');
}

/**
 * Formats duration in seconds into a readable string.
 * e.g., 125 -> "02:05" or "02m 05s" depending on style
 */
export function formatDuration(sec: number | null | undefined): string {
  if (sec === null || sec === undefined) return '-';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Safely calculates percentage and returns formatted string with "%" or raw number.
 */
export function getPercent(value: number | null | undefined, total: number | null | undefined): number {
  if (!total || !value) return 0;
  return Math.round((value / total) * 100);
}
