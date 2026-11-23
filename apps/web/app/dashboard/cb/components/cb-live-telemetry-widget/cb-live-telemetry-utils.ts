import type { CbDailyRecord } from '@mos-lab/shared';
import type {
  CbCumulativeChartData,
  CbCumulativeChartPoint,
  CbDailyTotals,
  CbDailyViewMode,
  CbStoreScope,
} from './cb-live-telemetry-types';

export const CB_MONTH_OPTIONS: { value: string; label: string }[] = [
  { value: '2026-10', label: 'Tháng 10/2026 (Dữ liệu nền)' },
  { value: '2026-11', label: 'Tháng 11/2026 (Kế hoạch $CB)' },
  { value: '2026-12', label: 'Tháng 12/2026' },
];

export const CB_STORE_SCOPE_OPTIONS: { value: CbStoreScope; label: string }[] = [
  { value: 'DE_THAM_ESTELLA', label: 'Đề Thám + Estella' },
  { value: 'DE_THAM', label: 'Đề Thám (ID 6)' },
  { value: 'ESTELLA', label: 'Estella (ID 16)' },
  { value: 'ALL', label: 'Toàn hệ thống' },
];

export const CB_CHART_GUIDE_VALUES = [0, 140, 280, 420, 560] as const;

export function formatVnd(val?: number): string {
  if (val === undefined || val === null || isNaN(val)) return '0 đ';
  return new Intl.NumberFormat('vi-VN').format(Math.round(val)) + ' đ';
}

export function formatMillions(val?: number, decimals = 1): string {
  if (val === undefined || val === null || isNaN(val)) return '0M';
  const m = val / 1_000_000;
  if (m === 0) return '0M';
  if (Number.isInteger(m)) return `${m}M`;
  return `${m.toFixed(decimals).replace('.', ',')}M`;
}

export function formatMonthSubtitle(selectedMonth: string): string {
  if (selectedMonth === '2026-11') return 'THÁNG 11/2026 ($CB)';
  if (selectedMonth === '2026-10') return 'THÁNG 10/2026 (DỮ LIỆU THỰC TẾ NỀN)';
  return selectedMonth;
}

export function formatStoreScopeLabel(storeScope: CbStoreScope): string {
  if (storeScope === 'DE_THAM_ESTELLA') return 'ĐỀ THÁM + ESTELLA';
  if (storeScope === 'DE_THAM') return 'ĐỀ THÁM';
  if (storeScope === 'ESTELLA') return 'ESTELLA';
  return 'TẤT CẢ CHI NHÁNH';
}

export function getDisplayedDailyRecords(
  daily: CbDailyRecord[] | undefined,
  dailyViewMode: CbDailyViewMode
): CbDailyRecord[] {
  if (!daily) return [];
  if (dailyViewMode === 'ALL_MONTH') {
    return daily;
  }
  const reversed = [...daily].reverse();
  const activeIndex = reversed.findIndex((d) => d.totalSalesNet > 0);
  const startIndex = activeIndex >= 0 ? activeIndex : 0;
  const slice = reversed.slice(startIndex, startIndex + 7).reverse();
  return slice.length > 0 ? slice : daily.slice(0, 7);
}

export function computeDailyTotals(records: CbDailyRecord[]): CbDailyTotals {
  return records.reduce(
    (acc, r) => {
      acc.combo += r.comboSalesNet || 0;
      acc.product += r.productSalesNet || 0;
      acc.total += r.totalSalesNet || 0;
      acc.greenVisits += r.greenVisitsCount || 0;
      acc.packageUsageVisits += r.packageUsageVisitsCount || 0;
      return acc;
    },
    { combo: 0, product: 0, total: 0, greenVisits: 0, packageUsageVisits: 0 }
  );
}

export function buildCumulativeChartData(
  daily?: CbDailyRecord[],
  totalSalesTarget?: number,
  totalSalesNet?: number
): CbCumulativeChartData {
  if (!daily) {
    return { actualPath: '', planPath: '', maxVal: 560_000_000, points: [] };
  }

  const resolvedTarget = totalSalesTarget || 560_000_000;
  const maxVal = Math.max(resolvedTarget, (totalSalesNet || 0) * 1.1);
  const width = 420;
  const height = 150;
  const padding = 20;

  const daysCount = daily.length;
  const xStep = (width - padding * 2) / Math.max(1, daysCount - 1);

  const planPath = `M ${padding} ${height - padding} L ${width - padding} ${
    height - padding - (resolvedTarget / maxVal) * (height - padding * 2)
  }`;

  const actualPoints: CbCumulativeChartPoint[] = [];
  let path = '';
  daily.forEach((d, idx) => {
    const x = padding + idx * xStep;
    const y = height - padding - (d.cumulativeSales / maxVal) * (height - padding * 2);
    if (idx === 0) {
      path += `M ${x} ${y}`;
    } else {
      path += ` L ${x} ${y}`;
    }
    actualPoints.push({ x, y, val: d.cumulativeSales, day: d.displayDate });
  });

  return { actualPath: path, planPath, maxVal, points: actualPoints };
}
