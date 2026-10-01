import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SharedPoolStaffPerformanceCard } from './SharedPoolStaffPerformanceCard';
import { CampaignStaffPerformanceResponse } from '@mos-lab/shared';

// Mock ThemeContext
vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({
    themeMode: 'light',
  }),
}));

describe('SharedPoolStaffPerformanceCard', () => {
  const mockPerformance: CampaignStaffPerformanceResponse = {
    campaignId: 31,
    campaignName: 'GỌI LÀ DÍNH – CHỐT LÀ ĐỈNH',
    startDate: '2026-09-30T17:00:00.000Z',
    endDate: '2026-10-30T17:00:00.000Z',
    totalMembers: 4,
    items: [
      {
        staffId: 70,
        staffName: 'Thanh Vũ',
        avatarUrl: null,
        exploitedCount: 32,
        pickupCount: 16,
        bookedCount: 1,
        conversionRate: 3.1,
        claimedCount: 33,
      },
      {
        staffId: 18,
        staffName: 'Ngọc Điệp',
        avatarUrl: null,
        exploitedCount: 36,
        pickupCount: 26,
        bookedCount: 0,
        conversionRate: 0.0,
        claimedCount: 36,
      },
      {
        staffId: 22,
        staffName: 'Bích Phượng',
        avatarUrl: null,
        exploitedCount: 34,
        pickupCount: 19,
        bookedCount: 0,
        conversionRate: 0.0,
        claimedCount: 35,
      },
      {
        staffId: 71,
        staffName: 'Thuý Kiều',
        avatarUrl: null,
        exploitedCount: 31,
        pickupCount: 16,
        bookedCount: 0,
        conversionRate: 0.0,
        claimedCount: 32,
      },
    ],
    summary: {
      totalExploited: 133,
      totalPickup: 77,
      totalBooked: 1,
      avgConversionRate: 0.8,
    },
  };

  it('renders nothing when performance data is null or empty', () => {
    const { container } = render(<SharedPoolStaffPerformanceCard performance={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders staff performance title, summary bar, and all 4 staff members', () => {
    render(<SharedPoolStaffPerformanceCard performance={mockPerformance} />);

    // Section title
    expect(screen.getByText('KẾT QUẢ KHAI THÁC THEO NHÂN VIÊN')).toBeInTheDocument();
    expect(screen.getByText('4 nhân sự')).toBeInTheDocument();

    // Summary bar values
    expect(screen.getByText('133')).toBeInTheDocument(); // totalExploited
    expect(screen.getByText('77')).toBeInTheDocument(); // totalPickup
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(2); // totalBooked and staff bookedCount
    expect(screen.getByText('0.8%')).toBeInTheDocument(); // avgConversionRate

    // Staff names
    expect(screen.getByText('Thanh Vũ')).toBeInTheDocument();
    expect(screen.getByText('Ngọc Điệp')).toBeInTheDocument();
    expect(screen.getByText('Bích Phượng')).toBeInTheDocument();
    expect(screen.getByText('Thuý Kiều')).toBeInTheDocument();

    // Thanh Vũ metrics
    expect(screen.getByText('32')).toBeInTheDocument(); // exploited
    expect(screen.getByText('3.1%')).toBeInTheDocument(); // conversion rate
    expect(screen.getByText('👑 Top 1')).toBeInTheDocument(); // rank badge
  });

  it('triggers onSelectStaff when a member card is clicked', () => {
    const onSelectStaff = vi.fn();
    render(
      <SharedPoolStaffPerformanceCard
        performance={mockPerformance}
        selectedStaffId="70"
        onSelectStaff={onSelectStaff}
      />
    );

    const thanhVuCard = screen.getByText('Thanh Vũ').closest('div[class*="rounded-xl"]');
    expect(thanhVuCard).toBeInTheDocument();

    if (thanhVuCard) {
      fireEvent.click(thanhVuCard);
      expect(onSelectStaff).toHaveBeenCalledWith('70');
    }
  });
});
