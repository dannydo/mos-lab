import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { CcLeaderboardEntry, ResponsiveTier } from '@mos-lab/shared';
import CcThuNhapTab from '../CcThuNhapTab';
import CcTipTab from '../CcTipTab';
import CcDiamondTab from '../CcDiamondTab';
import CcGameTab from '../CcGameTab';
import CcLeaderboardCard from '../CcLeaderboardCard';
import { apiClient } from '~/lib/api-client';

let mockTier: ResponsiveTier = 'mobile';
let mockViewportSize = { width: 390, height: 844 };

vi.mock('~/lib/api-client', () => ({
  apiClient: {
    kpi: {
      getCcPaystub: vi.fn(),
      getCcDiamondData: vi.fn(),
      getCcTipLeaderboard: vi.fn(),
      getCcTipRecords: vi.fn(),
    },
  },
}));

vi.mock('~/context/ThemeContext', () => ({
  useTheme: () => ({ themeMode: 'dark' }),
}));

vi.mock('~/hooks/useResponsiveTier', () => ({
  useResponsiveTier: () => mockTier,
  useViewportSize: () => mockViewportSize,
}));

describe('CC Report Apple iOS Portrait Mobile Tabs', () => {
  beforeEach(() => {
    mockTier = 'mobile';
    mockViewportSize = { width: 390, height: 844 };
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders Apple Wallet summary, compact Thu Nhập card with % Bán Combo + 1.5x Wheel Cap impact, and opens Bottom Sheet on tap', async () => {
    vi.mocked(apiClient.kpi.getCcPaystub).mockResolvedValue({
      data: [
        {
          consultantId: 10,
          displayName: 'Diễm Hương',
          store: 'DT',
          hourlyWage: 3_400_000,
          rawCcXoayBonus: 860_000,
          ccXoayBonus: 809_850,
          ccXoayHoldBonus: 50_150,
          monthlyDailyBonus: 539_900,
          maxWheelBonusAllowed: 809_850,
          wheelCapPercent: 159,
          capStatus: 'HARDCAPPED',
          comboProductBonus: 539_900,
          comboCount: 12,
          greenVisits: 50,
          greenComboConversionRate: 24,
          productCount: 3,
          ccTipBonus: 1_900_000,
          diamondBonus: 0,
          minigameBonus: 0,
          holidayBasePay: 0,
          holidayPremiumPay: 0,
          holidayPayrollAddition: 0,
          extraSupport: 0,
          trainingMentorshipBonus: 0,
          totalIncome: 6_649_750,
        },
      ],
      summary: {
        totalHourlyWage: 3_400_000,
        totalCcXoayBonus: 809_850,
        totalComboProductBonus: 539_900,
        totalMinigameBonus: 0,
        totalCcTipBonus: 1_900_000,
        totalExtraSupport: 0,
        totalTrainingMentorshipBonus: 0,
        totalHolidayBasePay: 0,
        totalHolidayPremiumPay: 0,
        totalHolidayPayrollAddition: 0,
        grandTotalIncome: 6_649_750,
      },
    } as any);
    vi.mocked(apiClient.kpi.getCcDiamondData).mockResolvedValue({ data: [] } as any);

    const { container } = render(<CcThuNhapTab />);

    await waitFor(() => {
      expect(screen.getByTestId('cc-income-mobile-summary')).toBeInTheDocument();
    });

    expect(screen.getByTestId('cc-income-mobile-summary').textContent).toContain('% Combo đội: 24%');
    expect(screen.getByText(/Phiếu thu nhập · 1/)).toBeInTheDocument();
    expect(screen.getByText('Diễm Hương')).toBeInTheDocument();
    expect(container.querySelector('[data-cc-income-combo-rate="24"]')?.textContent).toBe('24%');
    expect(container.querySelector('[data-cc-income-wheel-cap="HARDCAPPED"]')?.textContent).toContain('Trần 1.5×');
    // 0đ extra streams (Kim cương / Phụ cấp lễ x3) are hidden on the summary card
    expect(screen.queryByText(/Phụ cấp lễ x3/)).toBeNull();

    fireEvent.click(screen.getByText('Diễm Hương').closest('button')!);
    await waitFor(() => {
      expect(screen.getByTestId('cc-income-mobile-detail-sheet')).toBeInTheDocument();
    });
    const impactCard = screen.getByTestId('cc-income-combo-wheel-impact');
    expect(impactCard.textContent).toContain('24%');
    expect(impactCard.textContent).toContain('Đạt trần 1.5×');
    expect(screen.getByText('Phiếu đầy đủ')).toBeInTheDocument();
  });

  it('renders Apple Wallet Tip summary, Apple Fitness CC Tip card, hides desktop table, and opens Bottom Sheet on tap', async () => {
    vi.mocked(apiClient.kpi.getCcTipLeaderboard).mockResolvedValue({
      leaderboard: [
        {
          rank: 1,
          consultantId: 22,
          displayName: 'Thục Nghi',
          store: 'DT',
          totalVisits: 100,
          tippedVisits: 25,
          tipRatePercent: 25,
          totalCustomerTipAmount: 5_000_000,
          totalCcTipBonus: 1_000_000,
          targetCompletionRate: 100,
        },
      ],
      summary: {
        totalVisits: 100,
        tippedVisits: 25,
        nonTippedVisits: 75,
        tipRatePercent: 25,
        totalCustomerTip: 5_000_000,
        totalCcTipBonus: 1_000_000,
      },
    } as any);
    vi.mocked(apiClient.kpi.getCcTipRecords).mockResolvedValue({
      data: [
        {
          orderId: 901,
          serviceId: 12,
          checkinTime: '2026-11-24 10:30:00',
          clientName: 'Chị Lan',
          store: 'DT',
          serviceName: 'Classic 120 sợi',
          ccInName: 'Thục Nghi',
          ccOutName: 'Thục Nghi',
          consultantName: 'CV Mi',
          totalCustomerTip: 200_000,
          ccTipAmount: 40_000,
          ccTipPercentage: 20,
          tipStatus: 'Tipped',
        },
      ],
      total: 1,
      summary: {
        totalVisits: 100,
        tippedVisits: 25,
        nonTippedVisits: 75,
        tipRatePercent: 25,
        totalCustomerTip: 5_000_000,
        totalCcTipBonus: 1_000_000,
      },
    } as any);

    const { container } = render(<CcTipTab />);

    await waitFor(() => {
      expect(screen.getByTestId('cc-tip-mobile-summary')).toBeInTheDocument();
      expect(screen.getByText(/Xếp hạng Tip · 1/)).toBeInTheDocument();
      expect(container.querySelector('[data-cc-tip-rate="25"]')?.textContent).toBe('25%');
    });

    const tipRateEl = container.querySelector('[data-cc-tip-rate="25"]');

    // Desktop detail table card must be hidden on portrait
    expect(screen.queryByText('Bảng Xếp Hạng Báo Cáo CC Thưởng Tip - Tip Leaderboard')).toBeNull();

    fireEvent.click(tipRateEl!.closest('button')!);
    await waitFor(() => {
      expect(screen.getByTestId('cc-tip-mobile-detail-sheet')).toBeInTheDocument();
    });
    expect(screen.getByTestId('cc-tip-mobile-detail-sheet').textContent).toContain('Chị Lan');
  });

  it('renders Apple Wallet Kim Cương summary, collapsible rules pill, and Game mobile cards on iPhone Portrait', async () => {
    vi.mocked(apiClient.kpi.getCcDiamondData).mockResolvedValue({
      data: [
        {
          rank: 1,
          ccId: '33',
          tenCc: 'Yến Vy',
          tongKhach: 100,
          soKhachDiamond: 5,
          thuongDiamond: 40_000,
          datDieuKien: true,
        },
      ],
    } as any);

    render(<CcDiamondTab />);

    await waitFor(() => {
      expect(screen.getByTestId('cc-diamond-mobile-summary')).toBeInTheDocument();
      expect(screen.getByText(/Kim Cương · 1 CC/)).toBeInTheDocument();
      expect(screen.getByText('✓ 5.0%')).toBeInTheDocument();
    });
    expect(screen.queryByText('Từ 6 khách')).toBeNull();

    fireEvent.click(screen.getByText('Thể lệ ≥3%'));
    expect(screen.getByText('Từ 6 khách')).toBeInTheDocument();

    render(<CcGameTab />);
    expect(screen.getByTestId('cc-game-mobile-view')).toBeInTheDocument();
  });

  it('renders flat Apple Fitness Xoay leaderboard cards and invokes mobile sheet callback on tap', () => {
    const onInspect = vi.fn();
    const entry: CcLeaderboardEntry = {
      rank: 1,
      consultantId: 77,
      displayName: 'Quang Khải',
      store: 'EP',
      level: 8,
      totalCheckins: 45,
      totalServices: 60,
      totalPointsAccu: 750,
      totalConsultantBonus: 520_000,
      targetCompletionRate: 80,
      monthlyDailyBonus: 400_000,
      monthlyWheelBonus: 520_000,
      maxWheelBonusAllowed: 600_000,
      wheelCapPercent: 130,
      capStatus: 'WARNING',
    };

    render(<CcLeaderboardCard leaderboard={[entry]} onInspectConsultantMobile={onInspect} />);

    expect(screen.queryByText('CC Leaderboard')).toBeNull();
    expect(screen.getByText(/Xếp hạng Xoay · 1/)).toBeInTheDocument();
    expect(screen.getByText('130% trần 1.5×')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Quang Khải').closest('button')!);
    expect(onInspect).toHaveBeenCalledWith(entry);
  });
});
