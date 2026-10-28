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
          month: '2026-10',
          storeScope: 'DE_THAM_ESTELLA',
          comboSalesTarget: 450000000,
          productSalesTarget: 10000000,
          totalSalesTarget: 460000000,
          dailyPlanPace: 14838710,
          greenFunnelBookTarget: 780,
          greenFunnelDoneTarget: 540,
          greenFunnelConversionTarget: 10.0,
          packageUsageDoneTarget: 1000,
          repeatComboSalesTarget: 349000000,
          aovPackageUsageTarget: 5550000,
          daysInMonth: 31,
        },
        revenue: {
          comboSalesNet: 472849000,
          productSalesNet: 7638889,
          totalSalesNet: 480487889,
          comboOrderCount: 105,
          comboItemCount: 105,
          productOrderCount: 8,
          productItemCount: 8,
          comboAov: 4503324,
          comboAttainmentPercent: 105.1,
          productAttainmentPercent: 76.4,
          totalAttainmentPercent: 104.5,
          shortfallOrSurplus: 20487889,
        },
        greenFunnel: {
          greenVisitsCount: 478,
          greenVisitsTarget: 540,
          greenComboOrdersCount: 47,
          closingRatePercent: 9.8,
          benchmarkRatePercent: 10.0,
          progressPercent: 88.5,
          status: 'ON_TRACK',
          greenBookingsCount: 780,
        },
        retention: {
          balanceDeductionVisitsCount: 850,
          packageUsageNonGreenVisitsCount: 794,
          targetVisits: 1000,
          repurchaseOrdersCount: 55,
          repurchaseComboSalesNet: 301123000,
          uniquePaxCount: 720,
          progressPercent: 85.0,
        },
        attribution: {
          vongXanh: {
            sourceGroup: 'VONG_XANH',
            name: '1. Vòng Xanh',
            doneVisitsCount: 478,
            comboOrderCount: 47,
            comboItemCount: 47,
            comboSalesNet: 159776000,
            comboAov: 3399489,
          },
          dungGoiNgoaiVx: {
            sourceGroup: 'DUNG_GOI_NGOAI_VX',
            name: '2. Dùng Gói Ngoài VX',
            doneVisitsCount: 794,
            comboOrderCount: 55,
            comboItemCount: 55,
            comboSalesNet: 301123000,
            comboAov: 5474964,
          },
          leKhac: {
            sourceGroup: 'LE_KHAC',
            name: '3. Khách Lẻ Khác',
            doneVisitsCount: 50,
            comboOrderCount: 3,
            comboItemCount: 3,
            comboSalesNet: 11950000,
            comboAov: 3983333,
          },
          totalComboSalesNet: 472849000,
          totalComboOrderCount: 105,
          totalDoneVisitsCount: 1322,
          reconciliationStatus: 'MATCHED',
        },
        daily: [
          {
            date: '2026-10-15',
            displayDate: '15/10',
            comboSalesNet: 20600000,
            productSalesNet: 400000,
            totalSalesNet: 21000000,
            greenVisitsCount: 20,
            packageUsageVisitsCount: 36,
            varianceToPace: 6161290,
            cumulativeSales: 280000000,
            targetCumulativeSales: 222580645,
          },
        ],
        forecast: {
          last7DaysAvg: 18860000,
          last7DaysTotal: 132000000,
          remainingDays: 0,
          forecastTotal: 480487889,
          forecastPercent: 104.5,
          forecastVariance: 20487889,
          summaryFormula: 'Thực tế lũy kế: 480.5M • Vượt mục tiêu 20.5M',
          status: 'ON_TRACK',
        },
        meta: {
          lastSyncAt: new Date().toISOString(),
          dateFrom: '2026-10-01',
          dateTo: '2026-10-31',
          month: '2026-10',
          isCurrentMonth: true,
          periodState: 'in_progress',
          storeScope: 'DE_THAM_ESTELLA',
          pacingStatus: 'ĐÚNG TIẾN ĐỘ',
          uniquePaxPerVisit: 1.84,
          totalDoneVisits: 1322,
        },
      }),
      saveCbTargetConfig: vi.fn(),
      getCbDrilldown: vi.fn().mockResolvedValue([]),
    },
  },
}));

describe('$CB Sales Command Board (MOS-FEAT-156)', () => {
  it('renders the Sales Command Board and all core sections correctly including attribution', async () => {
    render(<CbLiveTelemetryWidget />);

    // Header and Status
    expect(await screen.findByText('$CB SALES COMMAND BOARD')).toBeInTheDocument();
    expect(screen.getByText('LIVE STREAMING')).toBeInTheDocument();

    // Top Cards
    expect(screen.getByText('DOANH SỐ GÓI')).toBeInTheDocument();
    expect(screen.getByText('SẢN PHẨM')).toBeInTheDocument();
    expect(screen.getByText('TỔNG DOANH SỐ')).toBeInTheDocument();
    expect(screen.getByText('NHỊP KẾ HOẠCH')).toBeInTheDocument();

    // Attribution Breakdown Card
    expect(screen.getByText(/Đối Soát Nguồn Doanh Số Gói/i)).toBeInTheDocument();
    expect(screen.getByText(/Khớp 100% Ba Nguồn Gói/i)).toBeInTheDocument();

    // Middle Sections
    expect(screen.getByText('Vòng Xanh')).toBeInTheDocument();
    expect(screen.getByText('Khách Đang Dùng Gói')).toBeInTheDocument();

    // Daily & Forecast
    expect(screen.getByText('Phân Tích Theo Ngày')).toBeInTheDocument();
    expect(screen.getByText('Dự Báo Chốt Tháng')).toBeInTheDocument();

    // Bottom Bar
    expect(screen.getByText(/Khách Hàng Duy Nhất/i)).toBeInTheDocument();
    expect(screen.getByText('Cảnh Báo Nhịp')).toBeInTheDocument();
  });

  it('renders the Dashboard $CB page and canon banner', async () => {
    render(<CbDashboardPage />);
    expect(await screen.findByText('$CB SALES COMMAND BOARD')).toBeInTheDocument();
    expect(screen.getByText(/Kinh Thánh Wings MOS-002/i)).toBeInTheDocument();
  });
});
