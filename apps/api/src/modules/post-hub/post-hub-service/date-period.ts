import type { SocialPostPeriodQuery } from '@mos-lab/shared';

/** Parses DD/MM/YYYY [HH:mm[:ss]] in ICT (+07:00) into a UTC Date, rejecting calendar rollovers. */
export function parseSocialPostSheetDateTime(value: string, fieldName: string): Date {
  const match = String(value || '')
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);

  if (!match) {
    throw new Error(`${fieldName} must be DD/MM/YYYY HH:mm:ss, received "${value}"`);
  }

  const [, dayValue, monthValue, yearValue, hourValue = '0', minuteValue = '0', secondValue = '0'] = match;
  const day = Number(dayValue);
  const month = Number(monthValue);
  const year = Number(yearValue);
  const hour = Number(hourValue);
  const minute = Number(minuteValue);
  const second = Number(secondValue);
  const localDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  if (
    !Number.isFinite(localDate.getTime()) ||
    day < 1 ||
    month < 1 ||
    month > 12 ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    localDate.getUTCFullYear() !== year ||
    localDate.getUTCMonth() !== month - 1 ||
    localDate.getUTCDate() !== day
  ) {
    throw new Error(`${fieldName} is invalid, received "${value}"`);
  }

  return new Date(Date.UTC(year, month - 1, day, hour - 7, minute, second));
}

export function getDateBounds(dateFrom?: string, dateTo?: string) {
  const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (dateFrom && !isDate(dateFrom)) throw new Error('dateFrom must use YYYY-MM-DD');
  if (dateTo && !isDate(dateTo)) throw new Error('dateTo must use YYYY-MM-DD');
  if (dateFrom && dateTo && dateFrom > dateTo) throw new Error('dateFrom cannot be after dateTo');

  return {
    ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00+07:00`) } : {}),
    ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59+07:00`) } : {}),
  };
}

function formatUtcCalendarDate(value: Date): string {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
}

function parseCalendarDate(value: string): Date {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error('anchorDate must use YYYY-MM-DD');

  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new Error('anchorDate is invalid');
  }
  return parsed;
}

/** Uses the Monday–Sunday business calendar around an ICT posting-date anchor. */
export function resolveSocialPostPeriodBounds(query: SocialPostPeriodQuery): { dateFrom?: string; dateTo?: string } {
  if (!query.period && !query.anchorDate) return {};
  if (!query.period || !query.anchorDate) throw new Error('period and anchorDate must be provided together');

  const anchor = parseCalendarDate(query.anchorDate);
  if (query.period === 'DAY') {
    return { dateFrom: query.anchorDate, dateTo: query.anchorDate };
  }
  if (query.period === 'WEEK') {
    const daysSinceMonday = (anchor.getUTCDay() + 6) % 7;
    const start = new Date(anchor);
    start.setUTCDate(anchor.getUTCDate() - daysSinceMonday);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    return { dateFrom: formatUtcCalendarDate(start), dateTo: formatUtcCalendarDate(end) };
  }
  if (query.period === 'MONTH') {
    const start = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
    const end = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0));
    return { dateFrom: formatUtcCalendarDate(start), dateTo: formatUtcCalendarDate(end) };
  }
  throw new Error('period must be DAY, WEEK, or MONTH');
}

export function getIctDateKey(value: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(value)
      .map(({ type, value: partValue }) => [type, partValue])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}
