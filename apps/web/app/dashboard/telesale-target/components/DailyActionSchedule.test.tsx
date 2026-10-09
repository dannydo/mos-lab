import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { DailyActionSchedule } from './DailyActionSchedule';
import { TelesaleTargetOverview } from '@mos-lab/shared';

describe('DailyActionSchedule fireworks toggle', () => {
  const mockOverview = {
    teamMonth: {
      year: 2026,
      month: 10,
      totalTeamRevenueTarget: 100000000,
      totalTeamRevenueActual: 50000000,
      totalTeamBookTarget: 500,
      totalTeamBookActual: 250,
      totalTeamCheckinTarget: 400,
      totalTeamCheckinActual: 200,
      totalTeamDoneTarget: 350,
      totalTeamDoneActual: 180,
      monthProgressPercent: 50,
      workingDaysPassed: 8,
      workingDaysRemaining: 18,
      totalWorkingDays: 26,
    },
    teamDaily: {
      date: '2026-10-09',
      dayOfWeek: 'Thứ 6',
      bookTarget: 25,
      bookActual: 22,
      doneTarget: 18,
      doneActual: 18,
      checkinTarget: 18,
      checkinActual: 18,
      revenueTarget: 5000000,
      revenueActual: 4500000,
      callActual: 364,
      pickupActual: 132,
    },
    dailyAction: {
      date: '2026-10-09',
      teamCallTarget: 360,
      teamCallActual: 364, // >= 100% (101.1%)
      teamCallPercent: 101.1,
      teamPickupTarget: 216,
      teamPickupActual: 132,
      teamPickupPercent: 61.1,
      totalCallsToday: 364,
      callTargetPerStaff: 90,
      pickupTargetPerStaff: 54,
    },
    staffTargets: [
      {
        legacyStaffId: 1,
        name: 'Bích Phượng',
        avatarUrl: null,
        doneTarget: 100,
        doneActual: 50,
        doneToday: 5,
        bookToday: 5,
        callTargetDaily: 90,
        callActualToday: 101,
        pickupActualToday: 28,
        pickupTargetDaily: 54,
        isWorkingToday: true,
      },
    ],
    pipelineStages: [],
    todayBookList: [],
    todayCheckinList: [],
    todayLiveEvents: [],
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('does NOT render canvas fireworks when fireworksEnabled is explicitly false', () => {
    const { container } = render(
      <DailyActionSchedule overview={mockOverview as unknown as TelesaleTargetOverview} fireworksEnabled={false} />
    );

    // Canvas elements should not be present when fireworks are disabled
    const canvases = container.querySelectorAll('canvas');
    expect(canvases).toHaveLength(0);
  });

  it('renders canvas fireworks when fireworksEnabled is true and teamCallPercent >= 100', () => {
    const { container } = render(
      <DailyActionSchedule overview={mockOverview as unknown as TelesaleTargetOverview} fireworksEnabled={true} />
    );

    // RealisticCardFireworks renders a canvas element when active
    const canvases = container.querySelectorAll('canvas');
    expect(canvases.length).toBeGreaterThan(0);
  });

  it('reactively turns off fireworks when mos:tv-settings-updated is fired with fireworksEnabled: false', () => {
    const { container } = render(<DailyActionSchedule overview={mockOverview as unknown as TelesaleTargetOverview} />);

    // Initially with default true, canvas is present
    expect(container.querySelectorAll('canvas').length).toBeGreaterThan(0);

    // User toggles off fireworks in settings popover
    act(() => {
      window.dispatchEvent(new CustomEvent('mos:tv-settings-updated', { detail: { fireworksEnabled: false } }));
    });

    // Fireworks canvas should immediately disappear
    expect(container.querySelectorAll('canvas')).toHaveLength(0);
  });
});
