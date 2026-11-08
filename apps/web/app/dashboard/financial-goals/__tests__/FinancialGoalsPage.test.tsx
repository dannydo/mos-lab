import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FinancialGoalsPage from '../page';
import { apiClient } from '../../../../lib/api-client';
import { FinancialGoalsOverview } from '@mos-lab/shared';

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => ({
    get: (param: string) => (param === 'month' ? '2026-11' : null),
  }),
}));

const mockOverview: FinancialGoalsOverview = {
  month: '2026-11',
  daysInMonth: 30,
  workDaysElapsed: 7,
  workDaysRemaining: 23,
  periodStatus: 'IN_PROGRESS',
  pacingRatio: 0.23,
  isConfigured: true,
  includeVat: true,
  config: {
    month: '2026-11',
    totalRevenueTarget: 900_000_000,
    comboRevenueTarget: 575_000_000,
    retailRevenueTarget: 275_000_000,
    productRevenueTarget: 50_000_000,
  },
  kpiMain: {
    key: 'total',
    label: 'Tổng Doanh Thu',
    target: 900_000_000,
    actual: 149_119_720,
    percent: 16.6,
    gap: -57_880_280,
    remaining: 750_880_280,
    surplus: 0,
    isAchieved: false,
    pacingStatus: 'BEHIND',
    pacingStatusLabel: 'Chậm nhịp',
    dailyRequired: 32_646_969,
    sharePercent: 100,
  },
  kpiSub: {
    combo: {
      key: 'combo',
      label: 'Doanh Thu Combo',
      target: 575_000_000,
      actual: 92_075_200,
      percent: 16.0,
      gap: -40_174_800,
      remaining: 482_924_800,
      surplus: 0,
      isAchieved: false,
      pacingStatus: 'BEHIND',
      pacingStatusLabel: 'Chậm nhịp',
      dailyRequired: 20_996_730,
      sharePercent: 61.7,
    },
    retail: {
      key: 'retail',
      label: 'Doanh Thu Khách Lẻ',
      target: 275_000_000,
      actual: 51_544_520,
      percent: 18.7,
      gap: -11_705_480,
      remaining: 223_455_480,
      surplus: 0,
      isAchieved: false,
      pacingStatus: 'BEHIND',
      pacingStatusLabel: 'Chậm nhịp',
      dailyRequired: 9_715_456,
      sharePercent: 34.6,
    },
    product: {
      key: 'product',
      label: 'Doanh Thu Sản Phẩm',
      target: 50_000_000,
      actual: 5_500_000,
      percent: 11.0,
      gap: -6_000_000,
      remaining: 44_500_000,
      surplus: 0,
      isAchieved: false,
      pacingStatus: 'BEHIND',
      pacingStatusLabel: 'Chậm nhịp',
      dailyRequired: 1_934_783,
      sharePercent: 3.7,
    },
  },
  dailyBreakdown: [
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
  ],
};

describe('FinancialGoalsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.spyOn(apiClient.financialGoals, 'getMonths').mockResolvedValue(['2026-11', '2026-10']);
    vi.spyOn(apiClient.financialGoals, 'getOverview').mockResolvedValue(mockOverview);
  });

  it('renders page with default VAT ON state and displays 149.119.720đ', async () => {
    render(<FinancialGoalsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Mục Tiêu Tài Chính – Tháng 11\/2026/i)).toBeDefined();
    });

    // Check VAT 8% toggle
    expect(screen.getByRole('switch', { name: /bật hoặc bỏ thuế vat 8%/i })).toBeDefined();
    expect(screen.getByText('Bật')).toBeDefined();

    // Check gross actuals
    expect(screen.getByText('149.119.720đ')).toBeDefined();
    expect(screen.getAllByText('Đã gồm 8% VAT').length).toBeGreaterThanOrEqual(1);
  });

  it('toggles VAT OFF when user clicks the VAT toggle switch', async () => {
    const mockOverviewWithoutVat: FinancialGoalsOverview = {
      ...mockOverview,
      includeVat: false,
      kpiMain: {
        ...mockOverview.kpiMain,
        actual: 138_073_815,
      },
    };

    const getOverviewSpy = vi
      .spyOn(apiClient.financialGoals, 'getOverview')
      .mockResolvedValueOnce(mockOverview)
      .mockResolvedValueOnce(mockOverviewWithoutVat);

    render(<FinancialGoalsPage />);

    await waitFor(() => {
      expect(screen.getByText('149.119.720đ')).toBeDefined();
    });

    const vatToggle = screen.getByRole('switch', { name: /bật hoặc bỏ thuế vat 8%/i });
    expect(vatToggle.getAttribute('aria-checked')).toBe('true');

    // Click toggle to turn OFF VAT
    fireEvent.click(vatToggle);

    await waitFor(() => {
      expect(getOverviewSpy).toHaveBeenCalledWith('2026-11', false);
      expect(localStorage.getItem('financial_goals_include_vat')).toBe('false');
      expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('vat=false'));
    });
  });
});
