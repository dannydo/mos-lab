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

  it('renders today badge for todayDate and masks future days with dashes and Chưa tới', () => {
    const dataWithFuture: FinancialGoalDayBreakdown[] = [
      {
        date: '2026-11-16',
        dayOfWeek: 'T2',
        totalRevenue: 26_053_889,
        comboRevenue: 21_790_000,
        retailRevenue: 4_263_889,
        productRevenue: 0,
        cumulativeTotal: 285_151_782,
        orderCount: 24,
        isFuture: false,
      },
      {
        date: '2026-11-17',
        dayOfWeek: 'T3',
        totalRevenue: 0,
        comboRevenue: 0,
        retailRevenue: 0,
        productRevenue: 0,
        cumulativeTotal: 0,
        orderCount: 0,
        isFuture: true,
      },
      {
        date: '2026-11-18',
        dayOfWeek: 'T4',
        totalRevenue: 0,
        comboRevenue: 0,
        retailRevenue: 0,
        productRevenue: 0,
        cumulativeTotal: 0,
        orderCount: 0,
        isFuture: true,
      },
    ];

    render(
      <FinancialGoalDailyTable data={dataWithFuture} month="2026-11" todayDate="2026-11-16" includeVat={false} />
    );

    expect(screen.getByText('Hôm nay')).toBeDefined();
    expect(screen.getByText('1/3 ngày đã qua')).toBeDefined();
    expect(screen.getByText('285.151.782đ')).toBeDefined();
    expect(screen.getByText('24 đơn')).toBeDefined();
    expect(screen.getAllByText('Chưa tới')).toHaveLength(2);
    expect(screen.getAllByText('—')).toHaveLength(10);
  });
});
