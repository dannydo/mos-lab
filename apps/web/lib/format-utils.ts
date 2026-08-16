/**
 * Shared utility functions for formatting and calculations.
 */

const VND_UNIT = '\u00A0đ';

/**
 * Formats a number as Vietnamese Dong (VND).
 * e.g., 1000000 -> "1.000.000 đ"
 */
export function formatVND(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0 đ';
  const rounded = Math.round(value);
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  })
    .format(rounded)
    .replace(/\s?₫/g, VND_UNIT);
}

/**
 * Formats a number compactly using M, B, K notation.
 * e.g., 22000000 -> "22M đ"
 *       1500000000 -> "1.5B đ"
 *       150000 -> "150K đ"
 */
export function formatCompactVND(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0 đ';
  const absVal = Math.abs(value);
  const suffix = VND_UNIT;
  if (absVal >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B${suffix}`;
  }
  if (absVal >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M${suffix}`;
  }
  if (absVal >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K${suffix}`;
  }
  return `${value}${suffix}`;
}

/**
 * Returns the compact branch code used in dense operational tables.
 */
export function formatStoreCode(store?: string | null): string {
  if (!store) return 'PXL';
  const normalized = String(store).toUpperCase().trim();
  if (normalized.includes('ESTELLA') || normalized === 'EP') return 'EP';
  if (normalized.includes('THAM') || normalized.includes('DE') || normalized === 'DT') return 'DT';
  if (normalized.includes('PXL') || normalized.includes('PHAN')) return 'PXL';
  return normalized;
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
