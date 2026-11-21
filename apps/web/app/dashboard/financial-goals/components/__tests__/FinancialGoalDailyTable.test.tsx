import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

const generateMockDays = (count: number, month = '2026-10'): FinancialGoalDayBreakdown[] => {
  return Array.from({ length: count }, (_, i) => {
    const day = String(i + 1).padStart(2, '0');
    return {
      date: `${month}-${day}`,
      dayOfWeek: 'T2',
      totalRevenue: 10_000_000,
      comboRevenue: 6_000_000,
      retailRevenue: 3_000_000,
      productRevenue: 1_000_000,
      cumulativeTotal: 10_000_000 * (i + 1),
      orderCount: 20,
    };
  });
};

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

  it('renders default 15 items when given 31 days of data', () => {
    const data31 = generateMockDays(31, '2026-10');
    const { container } = render(<FinancialGoalDailyTable data={data31} month="2026-10" includeVat={true} />);

    const rows = container.querySelectorAll('.ant-table-tbody tr.ant-table-row');
    expect(rows.length).toBe(15);
    expect(screen.getByText('01/10')).toBeDefined();
    expect(screen.getByText('15/10')).toBeDefined();
    expect(screen.queryByText('16/10')).toBeNull();
  });

  it('navigates to page 2 and displays corresponding days', () => {
    const data31 = generateMockDays(31, '2026-10');
    const { container } = render(<FinancialGoalDailyTable data={data31} month="2026-10" includeVat={true} />);

    const page2Btn = container.querySelector('.ant-pagination-item-2');
    expect(page2Btn).toBeTruthy();
    if (page2Btn) {
      fireEvent.click(page2Btn);
      const rows = container.querySelectorAll('.ant-table-tbody tr.ant-table-row');
      expect(rows.length).toBe(15);
      expect(screen.getByText('16/10')).toBeDefined();
      expect(screen.getByText('30/10')).toBeDefined();
      expect(screen.queryByText('01/10')).toBeNull();
    }
  });

  it('resets to page 1 when month changes', () => {
    const dataOct = generateMockDays(31, '2026-10');
    const dataNov = generateMockDays(30, '2026-11');

    const { container, rerender } = render(
      <FinancialGoalDailyTable data={dataOct} month="2026-10" includeVat={true} />
    );

    const page2Btn = container.querySelector('.ant-pagination-item-2');
    if (page2Btn) {
      fireEvent.click(page2Btn);
      expect(screen.getByText('16/10')).toBeDefined();
    }

    // Change month
    rerender(<FinancialGoalDailyTable data={dataNov} month="2026-11" includeVat={true} />);

    expect(screen.getByText('01/11')).toBeDefined();
    expect(screen.queryByText('16/11')).toBeNull();
  });

  it('switches page size to 31 / trang via pagination options', () => {
    const data31 = generateMockDays(31, '2026-10');
    const { container } = render(<FinancialGoalDailyTable data={data31} month="2026-10" includeVat={true} />);

    const sizeChanger = container.querySelector('.ant-pagination-options-size-changer .ant-select-selector');
    expect(sizeChanger).toBeTruthy();

    if (sizeChanger) {
      fireEvent.mouseDown(sizeChanger);
      const option31 = document.querySelector('.ant-select-item-option[title="31 / trang"]');
      if (option31) {
        fireEvent.click(option31);
        const rows = container.querySelectorAll('.ant-table-tbody tr.ant-table-row');
        expect(rows.length).toBe(31);
        expect(screen.getByText('01/10')).toBeDefined();
        expect(screen.getByText('31/10')).toBeDefined();
      }
    }
  });
});
