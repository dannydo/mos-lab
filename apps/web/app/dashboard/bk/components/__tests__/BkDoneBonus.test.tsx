import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BkDoneBonusConfigTable from '../BkDoneBonusConfigTable';
import BkDoneBonusDetailsDrawer from '../BkDoneBonusDetailsDrawer';
import type { BkGameDetailResponse, BkGameDoneBonusRule } from '@mos-lab/shared';
import { DEFAULT_BK_LASH_LIFT_BONUS_RULES } from '@mos-lab/shared';

describe('BkDoneBonusConfigTable', () => {
  it('renders correctly and applies LASH LIFT preset', () => {
    const handleChange = vi.fn();
    render(<BkDoneBonusConfigTable value={[]} onChange={handleChange} />);

    expect(screen.getByText(/Cấu hình Bonus theo từng Booking Done/i)).toBeInTheDocument();
    const presetBtn = screen.getByRole('button', { name: /Áp dụng mẫu LASH LIFT/i });
    expect(presetBtn).toBeInTheDocument();
    fireEvent.click(presetBtn);

    expect(handleChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ serviceName: 'LASH LIFT', bonusAmount: 99000 }),
        expect.objectContaining({ serviceName: 'LASH LIFT', bonusAmount: 35000 }),
        expect.objectContaining({ serviceName: 'LASH LIFT', bonusAmount: 15000 }),
        expect.objectContaining({ serviceName: 'LASH LIFT', bonusAmount: 1000 }),
      ])
    );
  });

  it('allows adding a new rule row', () => {
    const handleChange = vi.fn();
    const initialRules: BkGameDoneBonusRule[] = [
      {
        id: 'r1',
        serviceName: 'LASH LIFT',
        conditionType: 'EXACT_PAY',
        minPaid: 990000,
        maxPaid: 990000,
        bonusAmount: 99000,
      },
    ];

    render(<BkDoneBonusConfigTable value={initialRules} onChange={handleChange} />);

    const addBtn = screen.getByRole('button', { name: /Thêm dòng cấu hình Bonus/i });
    fireEvent.click(addBtn);

    expect(handleChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        initialRules[0],
        expect.objectContaining({ serviceName: 'LASH LIFT', conditionType: 'EXACT_PAY' }),
      ])
    );
  });
});

describe('BkDoneBonusDetailsDrawer', () => {
  const mockGameDetail: BkGameDetailResponse = {
    game: {
      id: 1,
      title: 'Game Test Done Bonus',
      gameType: 'INDIVIDUAL',
      metricType: 'DONE',
      startDate: '2026-10-01T00:00:00.000Z',
      endDate: '2026-10-31T23:59:59.000Z',
      status: 'ACTIVE',
      entryFee: 0,
      rewardPool: 500000,
      winnerCriteria: 'TOP_1',
      createdByStaffId: 10,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      doneBonusConfig: DEFAULT_BK_LASH_LIFT_BONUS_RULES,
    },
    leaderboard: [
      {
        id: 1,
        gameId: 1,
        staffId: 101,
        staffName: 'Thanh Vũ',
        score: 10,
        rank: 1,
        betAmount: 0,
        rewardAmount: 0,
        status: 'ACTIVE',
        doneBookingsCount: 2,
        totalDoneBonus: 134000,
      },
    ],
    doneBonuses: [
      {
        id: 1,
        gameId: 1,
        orderId: 12345,
        staffId: 101,
        staffName: 'Thanh Vũ',
        serviceId: 2,
        serviceName: 'LASH LIFT NÂNG CẤP',
        originalPrice: 990000,
        discountAmount: 0,
        actualPaid: 990000,
        conditionApplied: 'Nguyên giá 990,000đ',
        bonusAmount: 99000,
        orderCompletedAt: '2026-10-12T10:00:00.000Z',
        createdAt: '2026-10-12T10:05:00.000Z',
      },
      {
        id: 2,
        gameId: 1,
        orderId: 12346,
        staffId: 101,
        staffName: 'Thanh Vũ',
        serviceId: 2,
        serviceName: 'LASH LIFT NÂNG CẤP',
        originalPrice: 990000,
        discountAmount: 297000,
        actualPaid: 693000,
        conditionApplied: 'Khuyến mãi 30%',
        bonusAmount: 35000,
        orderCompletedAt: '2026-10-12T14:00:00.000Z',
        createdAt: '2026-10-12T14:05:00.000Z',
      },
    ],
    doneBonusesSummary: {
      totalDoneBookings: 2,
      totalDoneBonus: 134000,
      staffBonuses: [
        {
          staffId: 101,
          staffName: 'Thanh Vũ',
          doneCount: 2,
          totalBonus: 134000,
        },
      ],
    },
    stats: {
      totalParticipants: 1,
      totalTeams: 0,
      totalScore: 10,
      leaderScore: 10,
      timeRemainingSeconds: 3600,
      isExpired: false,
    },
    scoringRule: {
      metricType: 'DONE',
      label: 'Đơn Done',
      shortLabel: 'DONE',
      unit: 'đơn',
      formula: '1 đơn hoàn tất = 1 điểm',
      description: 'Ghi nhận đơn hoàn tất',
      dataSource: 'order_service',
      notes: '',
    },
  };

  it('renders drawer with metrics and records', () => {
    const handleClose = vi.fn();
    render(
      <BkDoneBonusDetailsDrawer
        open={true}
        onClose={handleClose}
        gameDetail={mockGameDetail}
      />
    );

    expect(screen.getByText(/Chi Tiết Thưởng Bonus \/ Done – Game Test Done Bonus/i)).toBeInTheDocument();
    expect(screen.getByText('#12345')).toBeInTheDocument();
    expect(screen.getByText('#12346')).toBeInTheDocument();
    expect(screen.getAllByText('Thanh Vũ').length).toBeGreaterThan(0);
  });
});
