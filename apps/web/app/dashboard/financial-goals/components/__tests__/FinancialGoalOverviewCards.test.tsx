import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FinancialGoalOverviewCards } from '../FinancialGoalOverviewCards';
import { FinancialGoalsOverview } from '@mos-lab/shared';

const mockOverview: FinancialGoalsOverview = {
  month: '2026-11',
  daysInMonth: 30,
  workDaysElapsed: 15,
  workDaysRemaining: 15,
  periodStatus: 'IN_PROGRESS',
  pacingRatio: 0.5,
  isConfigured: true,
  config: {
    month: '2026-11',
    totalRevenueTarget: 850_000_000,
    comboRevenueTarget: 550_000_000,
    retailRevenueTarget: 250_000_000,
    productRevenueTarget: 50_000_000,
  },
  kpiMain: {
    key: 'total',
    label: 'Tổng Doanh Thu',
    target: 850_000_000,
    actual: 450_000_000,
    percent: 52.9,
    gap: 25_000_000,
    remaining: 400_000_000,
    surplus: 0,
    isAchieved: false,
    pacingStatus: 'ON_TRACK',
    pacingStatusLabel: 'Đúng nhịp',
    dailyRequired: 26_666_667,
    sharePercent: 100,
  },
  kpiSub: {
    combo: {
      key: 'combo',
      label: 'Doanh Thu Combo',
      target: 550_000_000,
      actual: 300_000_000,
      percent: 54.5,
      gap: 25_000_000,
      remaining: 250_000_000,
      surplus: 0,
      isAchieved: false,
      pacingStatus: 'ON_TRACK',
      pacingStatusLabel: 'Đúng nhịp',
      dailyRequired: 16_666_667,
      sharePercent: 66.7,
    },
    retail: {
      key: 'retail',
      label: 'Doanh Thu Khách Lẻ',
      target: 250_000_000,
      actual: 120_000_000,
      percent: 48.0,
      gap: -5_000_000,
      remaining: 130_000_000,
      surplus: 0,
      isAchieved: false,
      pacingStatus: 'BEHIND',
      pacingStatusLabel: 'Chậm nhịp',
      dailyRequired: 8_666_667,
      sharePercent: 26.7,
    },
    product: {
      key: 'product',
      label: 'Doanh Thu Sản Phẩm',
      target: 50_000_000,
      actual: 30_000_000,
      percent: 60.0,
      gap: 5_000_000,
      remaining: 20_000_000,
      surplus: 0,
      isAchieved: false,
      pacingStatus: 'AHEAD',
      pacingStatusLabel: 'Vượt nhịp',
      dailyRequired: 1_333_333,
      sharePercent: 6.7,
    },
  },
  dailyBreakdown: [],
};

describe('FinancialGoalOverviewCards', () => {
  it('renders main total KPI card with correct targets and actuals', () => {
    render(<FinancialGoalOverviewCards overview={mockOverview} />);

    expect(screen.getByText(/Tổng Doanh Thu Tháng 11\/2026/i)).toBeDefined();
    expect(screen.getByText('450.000.000đ')).toBeDefined();
    expect(screen.getByText(/\/ 850.000.000đ/i)).toBeDefined();
    expect(screen.getAllByText('52.9%').length).toBeGreaterThan(0);
  });

  it('renders all three component KPI cards', () => {
    render(<FinancialGoalOverviewCards overview={mockOverview} />);

    expect(screen.getByText('Doanh Thu Combo')).toBeDefined();
    expect(screen.getByText('300.000.000đ')).toBeDefined();

    expect(screen.getByText('Doanh Thu Khách Lẻ')).toBeDefined();
    expect(screen.getByText('120.000.000đ')).toBeDefined();

    expect(screen.getByText('Doanh Thu Sản Phẩm')).toBeDefined();
    expect(screen.getByText('30.000.000đ')).toBeDefined();
  });
});
