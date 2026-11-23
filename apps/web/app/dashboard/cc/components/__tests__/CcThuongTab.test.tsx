import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import CcThuongTab from '../CcThuongTab';
import { apiClient } from '~/lib/api-client';

vi.mock('~/lib/api-client', () => ({
  apiClient: {
    gamification: {
      getDailySalesBonusConsultants: vi.fn(),
    },
  },
}));

vi.mock('~/context/ThemeContext', () => ({
  useTheme: () => ({ themeMode: 'dark' }),
}));

vi.mock('~/hooks/useResponsiveTier', () => ({
  useResponsiveTier: () => 'desktop',
}));

describe('CcThuongTab Projected Sales (MOS-BUG-118)', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('calculates projectedSingleSales and projectedTotalSales consistent with combo + single + product', async () => {
    const mockApiResponse = {
      data: [
        {
          id: 1,
          date: '2026-10-15',
          user_id: 10,
          consultant_name: 'CC Test',
          store_code: 'DT',
          combo_count: 5,
          green_combo_count: 4,
          combo_sales: 100_000_000,
          product_count: 2,
          product_sales: 10_000_000,
          single_sales: 50_000_000,
          debt_collected: 0,
          vat: 0,
          debt: 0,
          total_sales: 110_000_000,
          commission_rate_percent: 2,
          daily_bonus: 2_000_000,
          green_visits: 10,
          total_visits: 20,
        },
      ],
      total: 1,
      summary: {
        totalComboSales: 100_000_000,
        totalProductSales: 10_000_000,
        totalSingleSales: 50_000_000,
        totalSales: 160_000_000,
        totalCcBonus: 2_000_000,
        projectedComboSales: 200_000_000,
        projectedProductSales: 20_000_000,
        projectedSingleSales: 100_000_000,
        projectedTotalSales: 320_000_000,
        projectedCcBonus: 4_000_000,
        elapsedRatioPercent: 50.0,
      },
      activeStaff: [{ userId: 10, displayName: 'CC Test' }],
    };

    vi.mocked(apiClient.gamification.getDailySalesBonusConsultants).mockResolvedValue(mockApiResponse as any);

    render(<CcThuongTab includeVat={false} />);

    await waitFor(() => {
      expect(screen.getAllByText(/Doanh Thu Combo/).length).toBeGreaterThan(0);
    });
    expect(screen.getByText(/Doanh Thu Single/)).toBeInTheDocument();
    expect(screen.getByText(/∑ Doanh Thu/)).toBeInTheDocument();

    // Check forecast texts: Combo 200M + Single 100M + Product 20M = Total 320M
    expect(screen.getByText(/~\s*200M/)).toBeInTheDocument();
    expect(screen.getByText(/~\s*100M/)).toBeInTheDocument();
    expect(screen.getByText(/~\s*20M/)).toBeInTheDocument();
    expect(screen.getByText(/~\s*320M/)).toBeInTheDocument();
  });

  it('uses canonical actual Gross/Net revenue on KPI cards & leaderboard without double-VAT while preserving CC bonus base (MOS-BUG-253)', async () => {
    const mockApiResponse = {
      data: [
        {
          id: '2026-11-15_10_DT',
          date: '2026-11-15',
          user_id: 10,
          consultant_name: 'CC A',
          store_code: 'DT',
          combo_count: 3,
          green_combo_count: 2,
          combo_sales: 80_000_000,
          product_count: 1,
          product_sales: 5_000_000,
          single_sales: 40_000_000,
          debt_collected: 0,
          vat: 0,
          debt: 0,
          total_sales: 85_000_000,
          commission_rate_percent: 2,
          daily_bonus: 1_700_000,
          green_visits: 5,
          total_visits: 10,
          actual_combo_gross: 150_000_000,
          actual_combo_net: 138_888_889,
          actual_product_gross: 8_000_000,
          actual_product_net: 7_407_407,
          actual_single_gross: 60_000_000,
          actual_single_net: 55_555_556,
        },
        {
          id: '2026-11-15_11_EP',
          date: '2026-11-15',
          user_id: 11,
          consultant_name: 'CC B',
          store_code: 'EP',
          combo_count: 2,
          green_combo_count: 2,
          combo_sales: 50_000_000,
          product_count: 1,
          product_sales: 2_000_000,
          single_sales: 30_000_000,
          debt_collected: 0,
          vat: 0,
          debt: 0,
          total_sales: 52_000_000,
          commission_rate_percent: 1.5,
          daily_bonus: 780_000,
          green_visits: 4,
          total_visits: 8,
          actual_combo_gross: 93_140_555,
          actual_combo_net: 86_241_255,
          actual_product_gross: 2_000_000,
          actual_product_net: 1_851_852,
          actual_single_gross: 40_000_000,
          actual_single_net: 37_037_037,
        },
      ],
      total: 2,
      summary: {
        totalComboSales: 130_000_000,
        totalProductSales: 7_000_000,
        totalSingleSales: 70_000_000,
        totalSales: 207_000_000,
        totalCcBonus: 2_480_000,
        actualComboGross: 243_140_555,
        actualComboNet: 225_130_144,
        actualProductGross: 10_000_000,
        actualProductNet: 9_259_259,
        actualSingleGross: 100_000_000,
        actualSingleNet: 92_592_593,
        actualTotalGross: 353_140_555,
        actualTotalNet: 326_981_996,
        projectedActualComboGross: 243_140_555,
        projectedActualProductGross: 10_000_000,
        projectedActualSingleGross: 100_000_000,
        projectedActualTotalGross: 353_140_555,
        projectedCcBonus: 2_480_000,
        elapsedRatioPercent: 100,
      },
      activeStaff: [
        { userId: 10, displayName: 'CC A' },
        { userId: 11, displayName: 'CC B' },
      ],
    };

    vi.mocked(apiClient.gamification.getDailySalesBonusConsultants).mockResolvedValue(mockApiResponse as any);

    render(<CcThuongTab includeVat />);

    await waitFor(() => {
      expect(screen.getByText('150.000.000 đ')).toBeInTheDocument();
    });

    // Leaderboard rows display exact canonical Gross Combo & Single (summing to 243.140.555đ & 100.000.000đ)
    expect(screen.getByText('93.140.555 đ')).toBeInTheDocument();
    expect(screen.getByText('Single: 60.000.000 đ')).toBeInTheDocument();
    expect(screen.getByText('Single: 40.000.000 đ')).toBeInTheDocument();
    // Top KPI cards display 243.1M đ (Combo), 10M đ (Product), 100M đ (Single), 353.1M đ (Total)
    expect(screen.getAllByText(/^243\.1M\s*đ$/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^10M\s*đ$/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^100M\s*đ$/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^353\.1M\s*đ$/).length).toBeGreaterThan(0);
    // Bonus payout stays strictly on Net bonus-qualifying sales (unchanged by VAT toggle or actual single/CVL revenue)
    expect(screen.getAllByText('+1.700.000 đ').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+780.000 đ').length).toBeGreaterThan(0);
    expect(screen.getAllByText('91.800.000 đ').length).toBeGreaterThan(0);
  });

  it('displays exact canonical Net revenue when VAT 8% is toggled OFF (MOS-BUG-253)', async () => {
    const mockApiResponse = {
      data: [
        {
          id: '2026-11-15_10_DT',
          date: '2026-11-15',
          user_id: 10,
          consultant_name: 'CC A',
          store_code: 'DT',
          combo_count: 3,
          green_combo_count: 2,
          combo_sales: 80_000_000,
          product_count: 1,
          product_sales: 5_000_000,
          single_sales: 40_000_000,
          debt_collected: 0,
          vat: 0,
          debt: 0,
          total_sales: 85_000_000,
          commission_rate_percent: 2,
          daily_bonus: 1_700_000,
          green_visits: 5,
          total_visits: 10,
          actual_combo_gross: 150_000_000,
          actual_combo_net: 138_888_889,
          actual_product_gross: 8_000_000,
          actual_product_net: 7_407_407,
          actual_single_gross: 60_000_000,
          actual_single_net: 55_555_556,
        },
      ],
      total: 1,
      summary: {
        totalComboSales: 80_000_000,
        totalProductSales: 5_000_000,
        totalSingleSales: 40_000_000,
        totalSales: 125_000_000,
        totalCcBonus: 1_700_000,
        actualComboGross: 150_000_000,
        actualComboNet: 138_888_889,
        actualProductGross: 8_000_000,
        actualProductNet: 7_407_407,
        actualSingleGross: 60_000_000,
        actualSingleNet: 55_555_556,
        actualTotalGross: 218_000_000,
        actualTotalNet: 201_851_852,
        projectedActualComboNet: 138_888_889,
        projectedActualProductNet: 7_407_407,
        projectedActualSingleNet: 55_555_556,
        projectedActualTotalNet: 201_851_852,
        projectedCcBonus: 1_700_000,
        elapsedRatioPercent: 100,
      },
      activeStaff: [{ userId: 10, displayName: 'CC A' }],
    };

    vi.mocked(apiClient.gamification.getDailySalesBonusConsultants).mockResolvedValue(mockApiResponse as any);

    render(<CcThuongTab includeVat={false} />);

    await waitFor(() => {
      expect(screen.getByText('138.888.889 đ')).toBeInTheDocument();
    });
    expect(screen.getByText('Single: 55.555.556 đ')).toBeInTheDocument();
    expect(screen.getAllByText(/^138\.9M\s*đ$/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^55\.6M\s*đ$/).length).toBeGreaterThan(0);
  });
});
