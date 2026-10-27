import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CbLiveTelemetryWidget from '../components/CbLiveTelemetryWidget';
import CbDashboardPage from '../page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock theme context
vi.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({
    themeMode: 'dark',
    toggleTheme: vi.fn(),
  }),
}));

// Mock api client
vi.mock('../../../../lib/api-client', () => ({
  apiClient: {
    kpi: {
      getCbLiveTelemetry: vi.fn().mockResolvedValue({
        targets: {
          configured: true,
          month: '2026-11',
          storeScope: 'DE_THAM_ESTELLA',
          comboSalesTarget: 550000000,
          productSalesTarget: 10000000,
          totalSalesTarget: 560000000,
          dailyPlanPace: 18666667,
          greenFunnelBookTarget: 780,
          greenFunnelDoneTarget: 540,
          greenFunnelConversionTarget: 10.0,
          packageUsageDoneTarget: 1000,
          repeatComboSalesTarget: 349000000,
          aovPackageUsageTarget: 5550000,
          daysInMonth: 30,
        },
        revenue: {
          comboSalesNet: 275000000,
          productSalesNet: 5000000,
          totalSalesNet: 280000000,
          comboOrderCount: 60,
          comboItemCount: 60,
          productOrderCount: 10,
          productItemCount: 10,
          comboAov: 4583333,
          comboAttainmentPercent: 50.0,
          productAttainmentPercent: 50.0,
          totalAttainmentPercent: 50.0,
          shortfallOrSurplus: -280000000,
        },
        greenFunnel: {
          greenVisitsCount: 270,
          greenVisitsTarget: 540,
          greenComboOrdersCount: 27,
          closingRatePercent: 10.0,
          benchmarkRatePercent: 10.0,
          progressPercent: 50.0,
          status: 'ON_TRACK',
          greenBookingsCount: 780,
        },
        retention: {
          balanceDeductionVisitsCount: 500,
          targetVisits: 1000,
          repurchaseOrdersCount: 32,
          repurchaseComboSalesNet: 175000000,
          uniquePaxCount: 620,
          progressPercent: 50.0,
        },
        daily: [
          {
            date: '2026-11-15',
            displayDate: '15/11',
            comboSalesNet: 20600000,
            productSalesNet: 400000,
            totalSalesNet: 21000000,
            greenVisitsCount: 20,
            packageUsageVisitsCount: 36,
            varianceToPace: 2333333,
            cumulativeSales: 280000000,
            targetCumulativeSales: 280000000,
          },
        ],
        forecast: {
          last7DaysAvg: 18860000,
          last7DaysTotal: 132000000,
          remainingDays: 15,
          forecastTotal: 563000000,
          forecastPercent: 100.5,
          forecastVariance: 3000000,
          summaryFormula: '7 ngày qua: 132M • TB 18.86M/ngày; 280M đã đạt + 15 ngày x 18.86M',
          status: 'ON_TRACK',
        },
        meta: {
          lastSyncAt: new Date().toISOString(),
          dateFrom: '2026-11-01',
          dateTo: '2026-11-30',
          month: '2026-11',
          isCurrentMonth: true,
          storeScope: 'DE_THAM_ESTELLA',
          pacingStatus: 'ĐÚNG TIẾN ĐỘ',
          uniquePaxPerVisit: 1.29,
          totalDoneVisits: 800,
        },
      }),
      saveCbTargetConfig: vi.fn(),
      getCbDrilldown: vi.fn().mockResolvedValue([]),
    },
  },
}));

describe('$CB Sales Command Board (MOS-FEAT-156)', () => {
  it('renders the Sales Command Board and all core sections correctly', async () => {
    render(<CbLiveTelemetryWidget />);

    // Header and Status
    expect(await screen.findByText('$CB SALES COMMAND BOARD')).toBeInTheDocument();
    expect(screen.getByText('LIVE STREAMING')).toBeInTheDocument();

    // Top Cards
    expect(screen.getByText('DOANH SỐ GÓI')).toBeInTheDocument();
    expect(screen.getByText('SẢN PHẨM')).toBeInTheDocument();
    expect(screen.getByText('TỔNG DOANH SỐ')).toBeInTheDocument();
    expect(screen.getByText('NHỊP KẾ HOẠCH')).toBeInTheDocument();

    // Middle Sections
    expect(screen.getByText('Vòng Xanh')).toBeInTheDocument();
    expect(screen.getByText('Khách Đang Dùng Gói')).toBeInTheDocument();

    // Daily & Forecast
    expect(screen.getByText('Phân Tích Theo Ngày')).toBeInTheDocument();
    expect(screen.getByText('Dự Báo Chốt Tháng')).toBeInTheDocument();

    // Bottom Bar
    expect(screen.getByText('Khách Hàng Duy Nhất')).toBeInTheDocument();
    expect(screen.getByText('Cảnh Báo Nhịp')).toBeInTheDocument();
  });

  it('renders the Dashboard $CB page and canon banner', async () => {
    render(<CbDashboardPage />);
    expect(await screen.findByText('$CB SALES COMMAND BOARD')).toBeInTheDocument();
    expect(screen.getByText(/Kinh Thánh Wings MOS-002/i)).toBeInTheDocument();
  });
});
