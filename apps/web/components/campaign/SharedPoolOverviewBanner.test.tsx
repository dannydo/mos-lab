import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SharedPoolOverviewBanner } from './SharedPoolOverviewBanner';
import { SharedPoolOverviewStats } from '@mos-lab/shared';

// Mock ThemeContext
vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({
    themeMode: 'light',
  }),
}));

describe('SharedPoolOverviewBanner (MOS-FEAT-94)', () => {
  const mockOverview: SharedPoolOverviewStats = {
    activeBatchNumber: 1,
    totalBatches: 5,
    batchSize: 100,
    isPaused: false,
    batchTotal: 100,
    batchAvailable: 50,
    batchClaimed: 20,
    batchExploited: 15,
    batchRecycling: 10,
    batchBooked: 3,
    batchExcluded: 2,
    totalCustomers: 500,
    totalExploited: 15,
    totalRemaining: 485,
    percentRemaining: 97,
    warningLevel: 'NORMAL',
    warningMessage: '',
    burnRatePerHour: 10,
    estimatedHoursRemaining: 48,
  };

  it('renders "Lịch sử & Khôi phục" button when isAdmin is true and triggers callback', () => {
    const onOpenHistoryRecovery = vi.fn();
    const onAdvanceBatch = vi.fn();
    const onTogglePause = vi.fn();
    const onAddCustomers = vi.fn();
    const onSelectBatch = vi.fn();
    const onSelectPoolStatus = vi.fn();

    render(
      <SharedPoolOverviewBanner
        overview={mockOverview}
        loading={false}
        isAdmin={true}
        onAdvanceBatch={onAdvanceBatch}
        onTogglePause={onTogglePause}
        onAddCustomers={onAddCustomers}
        onOpenHistoryRecovery={onOpenHistoryRecovery}
        selectedBatch={1}
        onSelectBatch={onSelectBatch}
        selectedPoolStatus="ALL"
        onSelectPoolStatus={onSelectPoolStatus}
      />
    );

    const historyBtn = screen.getByText('Lịch sử & Khôi phục');
    expect(historyBtn).toBeDefined();

    fireEvent.click(historyBtn);
    expect(onOpenHistoryRecovery).toHaveBeenCalledTimes(1);
  });

  it('does not render "Lịch sử & Khôi phục" button when isAdmin is false', () => {
    const onOpenHistoryRecovery = vi.fn();

    render(
      <SharedPoolOverviewBanner
        overview={mockOverview}
        loading={false}
        isAdmin={false}
        onAdvanceBatch={vi.fn()}
        onTogglePause={vi.fn()}
        onAddCustomers={vi.fn()}
        onOpenHistoryRecovery={onOpenHistoryRecovery}
        selectedBatch={1}
        onSelectBatch={vi.fn()}
        selectedPoolStatus="ALL"
        onSelectPoolStatus={vi.fn()}
      />
    );

    expect(screen.queryByText('Lịch sử & Khôi phục')).toBeNull();
  });
});
