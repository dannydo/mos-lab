import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import dayjs from 'dayjs';
import type { ResponsiveTier } from '@mos-lab/shared';
import { CvMobileShellHeader } from '../CvMobileShellHeader';
import CvXoayTab from '../CvXoayTab';
import CvTipTab from '../CvTipTab';
import CvThuNhapTab from '../CvThuNhapTab';
import { CvSpeedTab } from '../cv-speed/CvSpeedTab';
import CvKyLuatTab from '../CvKyLuatTab';
import { apiClient } from '~/lib/api-client';

let mockTier: ResponsiveTier = 'mobile';
let mockViewportSize = { width: 390, height: 844 };

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('~/lib/api-client', () => ({
  apiClient: {
    kpi: {
      getCvXoayReport: vi.fn(),
      getCvTipLeaderboard: vi.fn(),
      getCvTipRecords: vi.fn(),
      getCvPaystub: vi.fn(),
      getCvDiscipline: vi.fn(),
      getCvSeniorityConfig: vi.fn().mockResolvedValue([]),
      cvSpeed: {
        getMatrix: vi.fn(),
        getRanking: vi.fn(),
        getDetail: vi.fn(),
        predict: vi.fn(),
        seed: vi.fn(),
      },
    },
  },
}));

vi.mock('~/context/ThemeContext', () => ({
  useTheme: () => ({ themeMode: 'dark' }),
}));

vi.mock('~/hooks/useResponsiveTier', () => ({
  useResponsiveTier: () => mockTier,
  useViewportSize: () => mockViewportSize,
  getViewportSize: () => mockViewportSize,
}));

vi.mock('~/hooks/usePreviousReportPeriod', () => ({
  usePreviousReportPeriod: () => null,
}));

vi.mock('~/hooks/useTableConfig', () => ({
  useTableConfig: (_key: string, cols: unknown[]) => ({
    loading: false,
    columns: cols,
    rawConfig: [],
    configVisible: false,
    openConfig: vi.fn(),
    closeConfig: vi.fn(),
    saveConfig: vi.fn(),
    resetConfig: vi.fn(),
  }),
}));

describe('CV Report Apple iOS Portrait Mobile Tabs', () => {
  const dateRange: [dayjs.Dayjs, dayjs.Dayjs] = [dayjs('2026-11-01'), dayjs('2026-11-30')];

  beforeEach(() => {
    mockTier = 'mobile';
    mockViewportSize = { width: 390, height: 844 };
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders CvMobileShellHeader, hides period controls on Speed tab, and opens period drawer', () => {
    const onTabChange = vi.fn();
    const tabs = [
      { key: 'xoay', label: 'Xoay', icon: <span /> },
      { key: 'speed', label: 'Tốc Độ', icon: <span /> },
    ];

    const { rerender } = render(
      <CvMobileShellHeader
        viewMode="month"
        referenceDate={dayjs('2026-11-25')}
        periodLabel="Tháng 11/2026"
        activeTab="xoay"
        tabs={tabs}
        hidePeriodControls={false}
        onViewModeChange={vi.fn()}
        onNavigate={vi.fn()}
        onValueChange={vi.fn()}
        onTabChange={onTabChange}
      />
    );

    expect(screen.getByText('Báo cáo CV')).toBeInTheDocument();
    expect(screen.getByTestId('cv-mobile-period-controls')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Tốc Độ'));
    expect(onTabChange).toHaveBeenCalledWith('speed');

    rerender(
      <CvMobileShellHeader
        viewMode="month"
        referenceDate={dayjs('2026-11-25')}
        periodLabel="Tháng 11/2026"
        activeTab="speed"
        tabs={tabs}
        hidePeriodControls
        onViewModeChange={vi.fn()}
        onNavigate={vi.fn()}
        onValueChange={vi.fn()}
        onTabChange={onTabChange}
      />
    );
    expect(screen.queryByTestId('cv-mobile-period-controls')).toBeNull();
  });

  it('renders Apple Wallet Xoay summary + card, hides wide detail table on Portrait, and opens Bottom Sheet on tap', async () => {
    vi.mocked(apiClient.kpi.getCvXoayReport).mockResolvedValue({
      data: [
        {
          orderServiceId: 501,
          checkin: '2026-11-24 10:15:00',
          checkinTime: '10:15:00',
          clientName: 'Chị Mai',
          store: 'DT',
          serviceName: 'Classic 120 sợi',
          serviceType: 'Normal',
          techName: 'Ngọc Anh',
          techLevel: 3,
          techBonus: 25_000,
          pointsAccu: 145,
          techPoints: 40,
          ccInName: 'Diễm Hương',
          ccOutName: 'Diễm Hương',
          classPts: 10,
          fanPts: 10,
          typePts: 10,
          lashPts: 10,
          designPts: 0,
          colorPts: 0,
        },
      ],
      total: 1,
      summary: { totalServices: 1, totalBonus: 25_000, totalPoints: 40 },
    });

    render(<CvXoayTab dateRange={dateRange} comparisonMode="month" />);

    await waitFor(() => {
      expect(screen.getByTestId('cv-xoay-mobile-summary')).toBeInTheDocument();
    });

    expect(screen.queryByText('Bảng Báo Cáo Chi Tiết Ca Làm Chuyên Viên (CV Xoay)')).toBeNull();
    expect(screen.getByText('Ngọc Anh')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Ngọc Anh').closest('button')!);
    await waitFor(() => {
      expect(screen.getByTestId('cv-xoay-mobile-detail-sheet')).toBeInTheDocument();
    });
    expect(screen.getByTestId('cv-xoay-mobile-detail-sheet').textContent).toContain('Chị Mai');
  });

  it('renders Apple Wallet Tip summary + card, hides detail table on Portrait, and opens Bottom Sheet on tap', async () => {
    vi.mocked(apiClient.kpi.getCvTipLeaderboard).mockResolvedValue({
      leaderboard: [
        {
          rank: 1,
          technicianId: 12,
          displayName: 'Bảo Trân',
          store: 'EP',
          totalVisits: 40,
          tippedVisits: 12,
          tipRatePercent: 30,
          totalCustomerTipAmount: 2_000_000,
          totalCvTipBonus: 1_400_000,
          targetCompletionRate: 100,
        },
      ],
      summary: {
        totalCvTipBonus: 1_400_000,
        totalCustomerTip: 2_000_000,
        avgTipRatePercent: 30,
        totalTippedVisits: 12,
        totalVisits: 40,
      },
    });
    vi.mocked(apiClient.kpi.getCvTipRecords).mockResolvedValue({
      data: [
        {
          orderId: 801,
          serviceId: 1,
          checkinTime: '2026-11-24 14:00:00',
          clientId: 77,
          clientName: 'Chị Thảo',
          store: 'EP',
          serviceName: 'Volume 100 sợi',
          techName: 'Bảo Trân',
          totalCustomerTip: 100_000,
          cvTipAmount: 70_000,
          cvTipPercentage: 70,
          tipStatus: 'Tipped',
        },
      ],
      total: 1,
      summary: {
        totalVisits: 40,
        tippedVisits: 12,
        nonTippedVisits: 28,
        tipRatePercent: 30,
        totalCustomerTip: 2_000_000,
        totalCvTipBonus: 1_400_000,
      },
    });

    const { container } = render(<CvTipTab dateRange={dateRange} comparisonMode="month" />);

    await waitFor(() => {
      expect(screen.getByTestId('cv-tip-mobile-summary')).toBeInTheDocument();
    });

    expect(screen.queryByText('Chi Tiết Ca Làm Nhận Tip CV')).toBeNull();
    expect(container.querySelector('[data-cv-tip-rate="30"]')?.textContent).toBe('30%');

    fireEvent.click(screen.getByText('Bảo Trân').closest('button')!);
    await waitFor(() => {
      expect(screen.getByTestId('cv-tip-mobile-detail-sheet').textContent).toContain('Chị Thảo');
    });
  });

  it('renders Apple Thu Nhập Wallet + CVL Combo unlock card and 3 quick action buttons in Bottom Sheet', async () => {
    vi.mocked(apiClient.kpi.getCvPaystub).mockResolvedValue({
      data: [
        {
          staffId: 37,
          staffName: 'Thảo Ly',
          store: 'DT',
          totalWorkHours: 160,
          hourlyRate: 30_000,
          hourlyWage: 4_800_000,
          cvXoayBonus: 1_200_000,
          cvTipBonus: 900_000,
          seniorityBonus: 240_000,
          holidayWorkedDays: 0,
          holidayWorkedHours: 0,
          holidayPaidLeaveDays: 0,
          holidayPaidLeaveHours: 0,
          holidayWorkedBasePay: 0,
          holidayPaidLeavePay: 0,
          holidayBasePay: 0,
          holidayPremiumPay: 0,
          holidayTotalValue: 0,
          holidayPayrollAddition: 0,
          holidayPaystubAdjustment: 0,
          holidayPayrollExceptionCount: 0,
          totalIncome: 7_140_000,
          netIncome: 7_140_000,
          serviceCount: 42,
          isCvPlus: true,
          cvPlusBreakdown: {
            isCvPlus: true,
            targetComboRate: 0.15,
            actualComboRate: 0.2,
            comboLiveOrders: 10,
            notComboLiveOrders: 20,
            combosSoldCount: 4,
            isUnlocked: true,
            deltaHourlyWage: 320_000,
            deltaTipBonus: 200_000,
            comboBonusTotal: 400_000,
            serumBonusTotal: 0,
            totalAdditionalIncome: 920_000,
          },
        },
      ],
      total: 1,
      summary: {
        totalHourlyWage: 4_800_000,
        totalCvXoayBonus: 1_200_000,
        totalCvTipBonus: 900_000,
        totalSeniorityBonus: 240_000,
        totalHolidayBasePay: 0,
        totalHolidayPremiumPay: 0,
        totalHolidayPayrollAddition: 0,
        grandTotalIncome: 7_140_000,
      },
    });

    const { container } = render(<CvThuNhapTab dateRange={dateRange} comparisonMode="month" />);

    await waitFor(() => {
      expect(screen.getByTestId('cv-income-mobile-summary')).toBeInTheDocument();
    });

    expect(container.querySelector('[data-cvl-combo-rate="20"]')?.textContent).toBe('20%/15%');
    expect(screen.getByText('✓ Mở khóa +2k/h & gói')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Thảo Ly').closest('button')!);
    await waitFor(() => {
      expect(screen.getByTestId('cv-income-mobile-detail-sheet')).toBeInTheDocument();
    });
    expect(screen.getByTestId('cv-income-cvl-combo-card')).toBeInTheDocument();
    expect(screen.getByText('Phiếu lương')).toBeInTheDocument();
    expect(screen.getByText('Giờ làm')).toBeInTheDocument();
    expect(screen.getByText('Lộ trình')).toBeInTheDocument();
  });

  it('renders Speed tab Segmented Control defaulting to Xếp hạng and switches cleanly', async () => {
    vi.mocked(apiClient.kpi.cvSpeed.getMatrix).mockResolvedValue({ data: [], updatedAt: '' } as any);
    vi.mocked(apiClient.kpi.cvSpeed.getRanking).mockResolvedValue([
      {
        rank: 1,
        staffId: 99,
        staffName: 'Minh Thư',
        predictedTime: 48,
        speedRating: 'fast',
        confidence: 'high',
        sampleSize: 25,
        trend: 'improving',
      } as any,
    ]);

    render(<CvSpeedTab />);

    const seg = screen.getByTestId('cv-speed-mobile-segmented');
    expect(seg).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Minh Thư')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Dự đoán ETA'));
    expect(screen.getByText('CHỌN CHUYÊN VIÊN (CV):')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Ma trận'));
    expect(screen.getByText('Tính lại')).toBeInTheDocument();
  });

  it('renders Discipline tab Apple Wallet summary without raw feather emoji', async () => {
    vi.mocked(apiClient.kpi.getCvDiscipline).mockResolvedValue({
      data: [
        {
          staffId: 37,
          legacyUserId: 13783,
          staffName: 'Khanh Cao',
          avatar: null,
          store: 'DT',
          isCvPlus: true,
          lateCount: 1,
          lateMinutes: 10,
          earlyCount: 0,
          earlyMinutes: 0,
          urgentOffCount: 0,
          otherPenaltyCount: 0,
          totalViolations: 1,
          finedBananaAmount: 1,
          violations: [],
        },
      ],
      summary: {
        totalLateRecords: 1,
        totalLateMinutes: 10,
        totalEarlyRecords: 0,
        totalEarlyMinutes: 0,
        totalUrgentOffs: 0,
        totalOtherPenalties: 0,
        totalFinedBananas: 1,
        totalStaffWithViolations: 1,
        totalStaffCount: 1,
      },
      dateFrom: '2026-11-01',
      dateTo: '2026-11-30',
    });

    const { container } = render(<CvKyLuatTab dateRange={dateRange} selectedStore="ALL" />);

    await waitFor(() => {
      expect(screen.getByTestId('cv-discipline-mobile-summary')).toBeInTheDocument();
    });

    expect(container.textContent).not.toContain('🪶');
    expect(screen.getByText('Khanh Cao')).toBeInTheDocument();
  });

  it('renders Desktop tables instead of Portrait cards on iPhone Landscape (844x390)', async () => {
    mockViewportSize = { width: 844, height: 390 };
    vi.mocked(apiClient.kpi.getCvXoayReport).mockResolvedValue({
      data: [],
      total: 0,
      summary: { totalServices: 0, totalBonus: 0, totalPoints: 0 },
    });

    render(<CvXoayTab dateRange={dateRange} comparisonMode="month" />);

    await waitFor(() => {
      expect(screen.getByText('Bảng Báo Cáo Chi Tiết Ca Làm Chuyên Viên (CV Xoay)')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('cv-xoay-mobile-summary')).toBeNull();
  });
});
