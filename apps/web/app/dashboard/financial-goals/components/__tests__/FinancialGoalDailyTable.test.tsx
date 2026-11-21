import React from 'react';
import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FinancialGoalDailyTable } from '../FinancialGoalDailyTable';
import { FinancialGoalDayBreakdown } from '@mos-lab/shared';

const mockDailyData: FinancialGoalDayBreakdown[] = [
  {
    date: '2026-11-01',
    dayOfWeek: 'CN',
    totalRevenue: 33_691_680,
    comboRevenue: 26_298_000,
    retailRevenue: 7_393_680,
    productRevenue: 0,
    cumulativeTotal: 33_691_680,
    orderCount: 64,
  },
];

const fullMonthData: FinancialGoalDayBreakdown[] = Array.from({ length: 30 }, (_, idx) => {
  const day = String(idx + 1).padStart(2, '0');
  return {
    date: `2026-11-${day}`,
    dayOfWeek: 'T2',
    totalRevenue: 1_000_000,
    comboRevenue: 500_000,
    retailRevenue: 500_000,
    productRevenue: 0,
    cumulativeTotal: (idx + 1) * 1_000_000,
    orderCount: 2,
  };
});

describe('FinancialGoalDailyTable', () => {
  it('renders table with VAT ON badge', () => {
    render(<FinancialGoalDailyTable data={mockDailyData} month="2026-11" includeVat={true} />);

    expect(screen.getByText(/Tiến Độ Doanh Thu Từng Ngày \(Tháng 2026-11\)/i)).toBeDefined();
    expect(screen.getByText('Đã gồm 8% VAT')).toBeDefined();
    expect(screen.getByText('01/11')).toBeDefined();
  });

  it('renders table with VAT OFF badge', () => {
    render(<FinancialGoalDailyTable data={mockDailyData} month="2026-11" includeVat={false} />);

    expect(screen.getByText('Chưa VAT')).toBeDefined();
  });

  it('allows changing page size from 15 to 31 rows per page (MOS-BUG-246)', () => {
    render(<FinancialGoalDailyTable data={fullMonthData} month="2026-11" includeVat={true} />);

    expect(screen.getByText('15/11')).toBeDefined();
    expect(screen.queryByText('16/11')).toBeNull();

    const sizeChanger = document.querySelector('.ant-pagination-options-size-changer .ant-select-selector');
    expect(sizeChanger).not.toBeNull();
    fireEvent.mouseDown(sizeChanger!);

    const option31 = screen.getByText(/31\s*\//);
    fireEvent.click(option31);

    expect(screen.getByText('30/11')).toBeDefined();
  });
});
