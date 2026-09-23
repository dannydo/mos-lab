import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BkGameEditModal from './BkGameEditModal';
import { BkGame } from '@mos-lab/shared';

const apiMocks = vi.hoisted(() => ({
  updateGame: vi.fn(),
}));

vi.mock('~/lib/api-client', () => ({
  apiClient: {
    bk: {
      updateGame: apiMocks.updateGame,
    },
  },
}));

describe('BkGameEditModal', () => {
  const mockGame: BkGame = {
    id: 3,
    title: '[BK_LÔNG][T9] CUỘC ĐUA KỲ THÚ',
    description: 'Thi đua săn booking',
    gameType: 'INDIVIDUAL',
    metricType: 'BOOKINGS',
    status: 'ACTIVE',
    startDate: '2026-09-22T08:00:00.000Z',
    endDate: '2026-09-30T22:00:00.000Z',
    allowedBookingChannels: ['GB'],
    targetScore: 50,
    entryFee: 0,
    rewardPool: 1000000,
    rewardDescription: 'Top 1 nhận 1 triệu',
    penaltyDescription: 'Bao trà sữa',
    winnerCriteria: 'TOP_1',
    createdByStaffId: 1,
    createdAt: '2026-09-22T08:00:00.000Z',
    updatedAt: '2026-09-22T08:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.updateGame.mockResolvedValue({
      success: true,
      game: { ...mockGame, allowedBookingChannels: ['GB', 'FB'] },
    });
  });

  it('renders modal with initial values and submits updated allowedBookingChannels', async () => {
    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    render(
      <BkGameEditModal
        open={true}
        game={mockGame}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    expect(screen.getByText(/Chỉnh Sửa Game: \[BK_LÔNG\]\[T9\] CUỘC ĐUA KỲ THÚ/)).toBeInTheDocument();

    // Click "Tất cả kênh"
    const allChannelsBtn = screen.getByTestId('edit-quick-all-channels-btn');
    fireEvent.click(allChannelsBtn);

    // Click "Lưu Thay Đổi"
    const saveBtn = screen.getByRole('button', { name: /Lưu Thay Đổi/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(apiMocks.updateGame).toHaveBeenCalledTimes(1);
      const [gameId, payload] = apiMocks.updateGame.mock.calls[0];
      expect(gameId).toBe(3);
      expect(payload.allowedBookingChannels).toEqual([]);
      expect(handleSuccess).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
