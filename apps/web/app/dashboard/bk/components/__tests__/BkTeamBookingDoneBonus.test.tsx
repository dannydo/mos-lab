import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { BkGameTeamBookingDoneBonusSummary } from '@mos-lab/shared';
import { DEFAULT_BK_TEAM_BOOKING_DONE_TIERS } from '@mos-lab/shared';
import BkTeamBookingDoneBonusConfigTable from '../BkTeamBookingDoneBonusConfigTable';
import BkTeamBookingDoneBonusPanel from '../BkTeamBookingDoneBonusPanel';
import BkTeamBookingDoneBonusDetailsDrawer from '../BkTeamBookingDoneBonusDetailsDrawer';

describe('BkTeamBookingDoneBonusConfigTable', () => {
  it('applies WINGS BOOKING RACE preset and renders auto baseline and editable tiers', () => {
    const handleChange = vi.fn();
    render(<BkTeamBookingDoneBonusConfigTable value={null} onChange={handleChange} />);

    expect(screen.getByText(/Thưởng Done khách lẻ theo mốc Booking Team \(0 mốc\)/i)).toBeInTheDocument();
    const presetBtn = screen.getByTestId('apply-wings-booking-race-preset-btn');
    fireEvent.click(presetBtn);

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        tiers: expect.arrayContaining([
          expect.objectContaining({ minBookings: 30, bonusPerDone: 5000 }),
          expect.objectContaining({ minBookings: 40, bonusPerDone: 7000 }),
          expect.objectContaining({ minBookings: 50, bonusPerDone: 10000 }),
        ]),
      })
    );
  });

  it('allows adding, editing, and removing tiers directly on UI', () => {
    const handleChange = vi.fn();
    render(
      <BkTeamBookingDoneBonusConfigTable
        value={{
          enabled: true,
          tiers: DEFAULT_BK_TEAM_BOOKING_DONE_TIERS,
        }}
        onChange={handleChange}
      />
    );

    expect(screen.getByText(/Dưới 30 Booking/i)).toBeInTheDocument();
    expect(screen.getByText('30 – 39 Booking')).toBeInTheDocument();
    expect(screen.getByText('40 – 49 Booking')).toBeInTheDocument();
    expect(screen.getByText('Từ 50 Booking')).toBeInTheDocument();

    const firstTierInput = screen.getByLabelText('Mốc Booking Team tối thiểu dòng 1');
    fireEvent.change(firstTierInput, { target: { value: '25' } });
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        tiers: expect.arrayContaining([expect.objectContaining({ minBookings: 25, bonusPerDone: 5000 })]),
      })
    );

    const addBtn = screen.getByRole('button', { name: /Thêm mốc Booking Team/i });
    fireEvent.click(addBtn);
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        tiers: expect.arrayContaining([expect.objectContaining({ minBookings: 60 })]),
      })
    );
  });
});

describe('BkTeamBookingDoneBonusPanel & BkTeamBookingDoneBonusDetailsDrawer', () => {
  const mockSummary: BkGameTeamBookingDoneBonusSummary = {
    config: {
      enabled: true,
      tiers: DEFAULT_BK_TEAM_BOOKING_DONE_TIERS,
      timeWindowStart: '08:00',
      timeWindowEnd: '17:00',
    },
    effectiveTimeWindow: '08:00 - 17:00',
    todayDate: '2026-11-20',
    todayTeamBookings: 42,
    todayTierLabel: '40–49 Booking',
    todayBonusPerDone: 7000,
    todaySingleDone: 6,
    todayTotalBonus: 42000,
    nextTierMinBookings: 50,
    nextTierBonusPerDone: 10000,
    bookingsToNextTier: 8,
    totalSingleDone: 9,
    totalComboDoneExcluded: 2,
    totalBonus: 57000,
    staffTotals: [
      { staffId: 101, staffName: 'Ngọc Điệp', singleDoneCount: 6, totalBonus: 36000 },
      { staffId: 102, staffName: 'Bích Phượng', singleDoneCount: 3, totalBonus: 21000 },
    ],
    dailyResults: [
      {
        date: '2026-11-19',
        dateLabel: 'Thứ Năm, 19/11',
        teamBookings: 33,
        tierLabel: '30–39 Booking',
        matchedMinBookings: 30,
        bonusPerDone: 5000,
        totalSingleDone: 3,
        totalComboDoneExcluded: 1,
        totalDayBonus: 15000,
        isToday: false,
        isFuture: false,
        staffBreakdown: [
          {
            staffId: 101,
            staffName: 'Ngọc Điệp',
            singleDoneCount: 3,
            comboDoneExcludedCount: 1,
            bonusPerDone: 5000,
            totalBonus: 15000,
          },
          {
            staffId: 102,
            staffName: 'Bích Phượng',
            singleDoneCount: 0,
            comboDoneExcludedCount: 0,
            bonusPerDone: 5000,
            totalBonus: 0,
          },
        ],
      },
      {
        date: '2026-11-20',
        dateLabel: 'Thứ Sáu, 20/11',
        teamBookings: 42,
        tierLabel: '40–49 Booking',
        matchedMinBookings: 40,
        bonusPerDone: 7000,
        totalSingleDone: 6,
        totalComboDoneExcluded: 1,
        totalDayBonus: 42000,
        isToday: true,
        isFuture: false,
        staffBreakdown: [
          {
            staffId: 101,
            staffName: 'Ngọc Điệp',
            singleDoneCount: 3,
            comboDoneExcludedCount: 1,
            bonusPerDone: 7000,
            totalBonus: 21000,
          },
          {
            staffId: 102,
            staffName: 'Bích Phượng',
            singleDoneCount: 3,
            comboDoneExcludedCount: 0,
            bonusPerDone: 7000,
            totalBonus: 21000,
          },
        ],
      },
    ],
    records: [
      {
        id: 1,
        gameId: 9,
        orderId: 88001,
        orderKey: 'WL-88001',
        staffId: 101,
        staffName: 'Ngọc Điệp',
        customerName: 'Chị Thảo',
        rewardDate: '2026-11-20',
        teamBookings: 42,
        tierLabel: '40–49 Booking',
        bonusPerDone: 7000,
        bonusAmount: 7000,
        orderCompletedAt: '2026-11-20T09:15:00.000Z',
        createdAt: '2026-11-20T09:20:00.000Z',
      },
    ],
  };

  it('displays today team bookings, achieved tier, booker retail done, and switches daily history on click', () => {
    const handleOpenDrawer = vi.fn();
    render(
      <BkTeamBookingDoneBonusPanel
        summary={mockSummary}
        onOpenDetailsDrawer={handleOpenDrawer}
        lastUpdatedAt={new Date('2026-11-20T11:12:44+07:00')}
      />
    );

    expect(screen.getByText('Thưởng Done Khách Lẻ Theo Mốc Booking Team')).toBeInTheDocument();
    expect(screen.getByTestId('team-booking-done-live-indicator')).toHaveTextContent(/Live/i);
    expect(screen.getByText('42 Booking')).toBeInTheDocument();
    expect(screen.getByText(/Mốc đạt: 40–49 Booking/i)).toBeInTheDocument();
    expect(screen.getAllByText('7.000 đ').length).toBeGreaterThan(0);
    expect(screen.getByText('+57.000 đ')).toBeInTheDocument();
    expect(screen.getByText('Ngọc Điệp')).toBeInTheDocument();
    expect(screen.getByText('Bích Phượng')).toBeInTheDocument();

    // Switch to historical day 2026-11-19
    fireEvent.click(screen.getByTestId('team-booking-done-day-2026-11-19'));
    expect(screen.getByText('33 Booking')).toBeInTheDocument();
    expect(screen.getByText(/Mốc đạt: 30–39 Booking/i)).toBeInTheDocument();
    expect(screen.getAllByText('5.000 đ').length).toBeGreaterThan(0);

    // Open audit drawer
    fireEvent.click(screen.getByRole('button', { name: /Đối soát chi tiết/i }));
    expect(handleOpenDrawer).toHaveBeenCalledWith(null, null);
  });

  it('renders order-level records in BkTeamBookingDoneBonusDetailsDrawer', () => {
    render(
      <BkTeamBookingDoneBonusDetailsDrawer
        open={true}
        onClose={vi.fn()}
        gameTitle="WINGS BOOKING RACE"
        gameId={9}
        summary={mockSummary}
      />
    );

    expect(
      screen.getByText(/Đối Soát Thưởng Done Khách Lẻ Theo Mốc Booking Team – WINGS BOOKING RACE/i)
    ).toBeInTheDocument();
    expect(screen.getByText('WL-88001')).toBeInTheDocument();
    expect(screen.getByText('Chị Thảo')).toBeInTheDocument();
  });
});
