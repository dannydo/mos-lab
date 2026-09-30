import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpiOverviewCards } from './KpiOverviewCards';
import { TelesaleTargetOverview } from '@mos-lab/shared';

const mockOverview: TelesaleTargetOverview = {
  month: '2026-10',
  updatedAt: '2026-10-06T12:00:00Z',
  teamMonth: {
    doneTarget: 450,
    doneActual: 180,
    comboLiveDoneActual: 20,
    bookTarget: 650,
    bookActual: 240,
    workDaysTotal: 26,
    workDaysElapsed: 10,
    workDaysRemaining: 16,
    periodStatus: 'IN_PROGRESS',
    pacingStatus: 'ON_TRACK',
    pacingStatusLabel: 'Đúng nhịp',
    expectedProgressRate: 0.3846,
    expectedDone: 173,
    expectedBook: 250,
    gapDone: 7,
    gapBook: -10,
    remainingDone: 270,
    remainingBook: 410,
    dailyRequiredDone: 16.9,
    dailyRequiredBook: 25.6,
    pacingDaysElapsed: 10,
    pacingDaysTotal: 26,
    pacingRatio: 1.04,
    isPacingOnTrack: true,
  },
  teamDaily: {
    date: '2026-10-10',
    doneTarget: 18,
    doneActual: 15,
    comboLiveDoneActual: 2,
    bookTarget: 25,
    bookActual: 20,
  },
  staffTargets: [
    {
      legacyStaffId: 52454,
      name: 'Phượng',
      doneTarget: 150,
      doneActual: 70,
      doneToday: 5,
      comboLiveDoneActual: 8,
      comboLiveDoneToday: 1,
      callTargetDaily: 40,
      callActualToday: 35,
      pickupActualToday: 20,
      revenueActual: 79905480,
      expectedDone: 58,
      gapDone: 12,
      remainingDone: 80,
      dailyRequiredDone: 5.0,
      progressStatus: 'AHEAD',
      progressStatusLabel: 'Vượt tiến độ',
    },
    {
      legacyStaffId: 52086,
      name: 'Kiều',
      doneTarget: 100,
      doneActual: 38,
      doneToday: 2,
      comboLiveDoneActual: 5,
      comboLiveDoneToday: 0,
      callTargetDaily: 40,
      callActualToday: 30,
      pickupActualToday: 18,
      revenueActual: 20506920,
      expectedDone: 38,
      gapDone: 0,
      remainingDone: 62,
      dailyRequiredDone: 3.9,
      progressStatus: 'ON_TRACK',
      progressStatusLabel: 'Đúng tiến độ',
    },
    {
      legacyStaffId: 32268,
      name: 'Điệp',
      doneTarget: 100,
      doneActual: 25,
      doneToday: 1,
      comboLiveDoneActual: 3,
      comboLiveDoneToday: 0,
      callTargetDaily: 40,
      callActualToday: 25,
      pickupActualToday: 15,
      revenueActual: 16293480,
      expectedDone: 38,
      gapDone: -13,
      remainingDone: 75,
      dailyRequiredDone: 4.7,
      progressStatus: 'BEHIND',
      progressStatusLabel: 'Chậm tiến độ',
    },
  ],
  dailyAction: {
    callTargetPerStaff: 40,
    bookTargetPerDay: 25,
    totalCallsToday: 90,
    totalBookingsToday: 20,
  },
  workSchedule: {
    morning: { timeRange: '08:00 - 12:00', title: 'Ca sáng', subTitle: 'Gọi khách hàng', isActive: true },
    afternoon: { timeRange: '13:00 - 17:00', title: 'Ca chiều', subTitle: 'Chốt lịch', isActive: false },
  },
  pipelineStages: [],
};

describe('KpiOverviewCards - MOS-BUG-72 Individual KPI (Done)', () => {
  it('renders individual KPI cards with new metrics and excludes Call/Tổng', () => {
    render(<KpiOverviewCards overview={mockOverview} />);

    // 1. Header
    expect(screen.getByText(/KPI Cá Nhân \(Done\)/i)).toBeInTheDocument();

    // 2. Staff Names and today counts
    expect(screen.getByText('Phượng')).toBeInTheDocument();
    expect(screen.getByText('+5 hôm nay')).toBeInTheDocument();

    expect(screen.getByText('Kiều')).toBeInTheDocument();
    expect(screen.getByText('+2 hôm nay')).toBeInTheDocument();

    expect(screen.getByText('Điệp')).toBeInTheDocument();
    expect(screen.getByText('+1 hôm nay')).toBeInTheDocument();

    // 3. Status Badges
    expect(screen.getByText('Vượt tiến độ')).toBeInTheDocument();
    expect(screen.getByText('Đúng tiến độ')).toBeInTheDocument();
    expect(screen.getByText('Chậm tiến độ')).toBeInTheDocument();

    // 4. Gap KPI
    expect(screen.getByText('Gap: +12 Done')).toBeInTheDocument();
    expect(screen.getByText('Gap: 0 Done')).toBeInTheDocument();
    expect(screen.getByText('Gap: -13 Done')).toBeInTheDocument();

    // 5. Done counts
    expect(screen.getByText('70')).toBeInTheDocument();
    expect(screen.getByText('/ 150 Done')).toBeInTheDocument();

    // 6. Remaining and Daily required
    expect(screen.getByText(/80 Done/)).toBeInTheDocument();
    expect(screen.getByText(/5\/ngày/)).toBeInTheDocument();

    // 7. Revenue
    expect(screen.getByText(/79\.905\.480đ/)).toBeInTheDocument();
    expect(screen.getByText(/20\.506\.920đ/)).toBeInTheDocument();
    expect(screen.getByText(/16\.293\.480đ/)).toBeInTheDocument();

    // 8. Combo
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    // 9. Staff Call and Staff Tổng must NOT be present in card body
    expect(screen.queryByText(/Call:/i)).toBeNull();
    expect(screen.queryByText(/^Tổng:\s*\d+$/i)).not.toBeInTheDocument();
    // 10. Combo must be present for all 3 staff
    expect(screen.getAllByText(/Combo:/i).length).toBe(3);
  });
});
