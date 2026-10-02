import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TeamSelectModal } from './TeamSelectModal';
import { TelesaleTargetOverview } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';

vi.mock('../../../../lib/api-client', () => ({
  apiClient: {
    teams: {
      list: vi.fn(),
    },
    telesaleTarget: {
      selectTeam: vi.fn(),
    },
  },
}));

const mockOverview: TelesaleTargetOverview = {
  month: '2026-10',
  teamCode: 'BK_TELESALES',
  teamName: 'Telesales',
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
  staffTargets: [],
  dailyAction: {
    callTargetPerStaff: 83,
    pickupTargetPerStaff: 25,
    bookTargetPerDay: 25,
    totalCallsToday: 100,
    totalBookingsToday: 20,
  },
  workSchedule: {
    morning: { timeRange: '08:00 - 12:00', title: 'Ca sáng', subTitle: 'Phễu', isActive: true },
    afternoon: { timeRange: '13:00 - 17:00', title: 'Ca chiều', subTitle: 'Phễu', isActive: false },
  },
  pipelineStages: [],
};

const mockTeamsResponse = {
  departments: [{ id: 1, code: 'SALES', name: 'Phòng Sales', isActive: true }],
  teams: [
    {
      id: 4,
      code: 'BK_TELESALES',
      name: 'Telesales',
      description: 'Đội ngũ tư vấn đặt lịch và telesales',
      isActive: true,
      memberCount: 5,
      activeStaffIds: [48791, 32268, 50670, 52598, 52648],
      children: [],
    },
    {
      id: 5,
      code: 'BK_CS',
      name: 'Customer Service (CS)',
      description: 'Chăm sóc khách hàng và phản hồi',
      isActive: true,
      memberCount: 2,
      activeStaffIds: [43554, 52454],
      children: [],
    },
  ],
};

describe('TeamSelectModal (MOS-BUG-93)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.teams.list as any).mockResolvedValue(mockTeamsResponse);
    (apiClient.telesaleTarget.selectTeam as any).mockResolvedValue({ success: true });
  });

  it('renders modal with title, principle description, and loads teams list', async () => {
    render(
      <TeamSelectModal
        open={true}
        onClose={vi.fn()}
        currentMonth="2026-10"
        overview={mockOverview}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText(/Chọn Đội Nhóm Áp Dụng Cho War Room/i)).toBeInTheDocument();
    expect(screen.getByText(/Nguyên tắc nguồn nhân sự War Room:/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(apiClient.teams.list).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Chọn Đội nhóm/i)).toBeInTheDocument();
    });
  });

  it('submits selected team and calls onSuccess callback', async () => {
    const onSuccessMock = vi.fn();
    const onCloseMock = vi.fn();

    render(
      <TeamSelectModal
        open={true}
        onClose={onCloseMock}
        currentMonth="2026-10"
        overview={mockOverview}
        onSuccess={onSuccessMock}
      />
    );

    await waitFor(() => {
      expect(apiClient.teams.list).toHaveBeenCalledTimes(1);
    });

    const submitBtn = screen.getByRole('button', { name: /Áp dụng cho War Room/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(apiClient.telesaleTarget.selectTeam).toHaveBeenCalledWith({
        month: '2026-10',
        teamCode: 'BK_TELESALES',
      });
      expect(onSuccessMock).toHaveBeenCalledTimes(1);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });
});
