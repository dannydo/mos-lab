import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
