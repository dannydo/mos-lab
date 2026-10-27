import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CbLiveTelemetryWidget from '../components/CbLiveTelemetryWidget';
import CbDashboardPage from '../page';

const apiMocks = vi.hoisted(() => ({
  getCbLiveTelemetry: vi.fn(),
}));

vi.mock('../../../../lib/api-client', () => ({
  apiClient: {
    kpi: {
      getCbLiveTelemetry: apiMocks.getCbLiveTelemetry,
    },
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('Dashboard $CB Live Telemetry Pipeline (MOS-FEAT-156)', () => {
  const mockTelemetryData = {
    revenue: {
      comboSalesNet: 469054000,
      productSalesNet: 7638889,
      totalSalesNet: 476692889,
      comboOrderCount: 104,
      comboItemCount: 110,
      productOrderCount: 8,
      productItemCount: 8,
      comboAov: 4510135,
    },
    greenFunnel: {
      greenVisitsCount: 469,
      greenVisitsTarget: 540,
      greenComboOrdersCount: 46,
      closingRatePercent: 9.8,
      benchmarkRatePercent: 10.0,
      progressPercent: 86.9,
      status: 'BELOW_BENCHMARK' as const,
    },
    retention: {
      balanceDeductionVisitsCount: 844,
      targetVisits: 1000,
      repurchaseOrdersCount: 104,
      uniquePaxCount: 719,
      progressPercent: 84.4,
    },
    meta: {
      lastSyncAt: '2026-10-27T16:00:00.000Z',
      dateFrom: '2026-11-01',
      dateTo: '2026-11-30',
      month: '2026-11',
      isCurrentMonth: false,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getCbLiveTelemetry.mockResolvedValue(mockTelemetryData);
  });

  it('renders the 3 core live telemetry pipeline sections correctly', async () => {
    render(<CbLiveTelemetryWidget initialMonth="2026-11" />);

    // Header badge
    expect(screen.getByText(/\$CB LIVE TELEMETRY PIPELINE/i)).toBeInTheDocument();
    expect(screen.getByText(/100% Real-Time/i)).toBeInTheDocument();

    await waitFor(() => {
      // 1. Doanh số thực thu
      expect(screen.getByText(/1. Doanh Số Thực Thu \(Live\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Dòng tiền gói chưa VAT:/i)).toBeInTheDocument();
      expect(screen.getByText(/Dòng tiền sản phẩm chưa VAT:/i)).toBeInTheDocument();
      expect(screen.getByText(/AOV gói thời gian thực:/i)).toBeInTheDocument();

      // 2. Động cơ Vòng xanh
      expect(screen.getByText(/2. Động Cơ Vòng Xanh \(Live\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Lượt Done Vòng xanh:/i)).toBeInTheDocument();
      expect(screen.getByText(/Đơn gói chốt từ Vòng xanh:/i)).toBeInTheDocument();
      expect(screen.getByText(/% Tỷ lệ chốt Live:/i)).toBeInTheDocument();
      expect(screen.getByText(/9.8%/i)).toBeInTheDocument();

      // 3. Động cơ Dùng gói
      expect(screen.getByText(/3. Động Cơ Dùng Gói \(Live\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Lượt Done trừ số dư gói:/i)).toBeInTheDocument();
      expect(screen.getByText(/Đơn mua tiếp của khách dùng gói:/i)).toBeInTheDocument();
      expect(screen.getByText(/Số khách duy nhất \(Unique Pax\):/i)).toBeInTheDocument();
      expect(screen.getByText(/719 pax/i)).toBeInTheDocument();
    });
  });

  it('renders the Dashboard $CB page and its canon documentation banner', async () => {
    render(<CbDashboardPage />);

    expect(screen.getByRole('heading', { name: /Dashboard \$CB/i })).toBeInTheDocument();
    expect(screen.getByText(/QUY CHUẨN ĐƯỜNG TRUYỀN DỮ LIỆU \$CB LIVE \(KINH THÁNH WINGS MOS-002\)/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/1. Doanh Số Thực Thu \(Live\)/i)).toBeInTheDocument();
    });
  });
});
