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
});
