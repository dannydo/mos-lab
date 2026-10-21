import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import { formatRelativeTime } from './date-utils';

describe('formatRelativeTime', () => {
  it('returns empty string for null, undefined, or empty values', () => {
    expect(formatRelativeTime(null)).toBe('');
    expect(formatRelativeTime(undefined)).toBe('');
    expect(formatRelativeTime('')).toBe('');
    expect(formatRelativeTime('invalid-date-string')).toBe('');
  });

  it('formats recent events (<45s) as "vừa xong" or "ngay bây giờ"', () => {
    const past20s = dayjs().subtract(20, 'second');
    expect(formatRelativeTime(past20s)).toBe('vừa xong');

    const future20s = dayjs().add(20, 'second');
    expect(formatRelativeTime(future20s)).toBe('ngay bây giờ');
  });

  it('formats minutes correctly', () => {
    const past5m = dayjs().subtract(5, 'minute');
    expect(formatRelativeTime(past5m)).toBe('5 phút trước');

    const future15m = dayjs().add(15, 'minute');
    expect(formatRelativeTime(future15m)).toBe('sau 15 phút');
  });

  it('formats hours correctly', () => {
    const past2h = dayjs().subtract(2, 'hour');
    expect(formatRelativeTime(past2h)).toBe('2 giờ trước');

    const future4h = dayjs().add(4, 'hour');
    expect(formatRelativeTime(future4h)).toBe('sau 4 giờ');
  });

  it('formats days correctly', () => {
    const past3d = dayjs().subtract(3, 'day');
    expect(formatRelativeTime(past3d)).toBe('3 ngày trước');

    const future5d = dayjs().add(5, 'day');
    expect(formatRelativeTime(future5d)).toBe('sau 5 ngày');
  });

  it('formats months and years correctly', () => {
    const past2months = dayjs().subtract(65, 'day');
    expect(formatRelativeTime(past2months)).toBe('2 tháng trước');

    const future400days = dayjs().add(400, 'day');
    expect(formatRelativeTime(future400days)).toBe('sau 1 năm');
  });

  it('never throws even when passed unusual types or corrupted objects', () => {
    expect(() => formatRelativeTime(NaN as unknown as number)).not.toThrow();
    expect(formatRelativeTime(NaN as unknown as number)).toBe('');
  });
});
