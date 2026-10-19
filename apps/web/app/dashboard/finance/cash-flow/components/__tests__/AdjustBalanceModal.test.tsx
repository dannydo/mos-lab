import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdjustBalanceModal } from '../AdjustBalanceModal';
import type { CashAccount } from '@mos-lab/shared';

const apiMocks = vi.hoisted(() => ({
  updateAccount: vi.fn(),
  batchUpdateBalances: vi.fn(),
}));

vi.mock('~/lib/api-client', () => ({
  apiClient: {
    cashFlow: {
      updateAccount: apiMocks.updateAccount,
      batchUpdateBalances: apiMocks.batchUpdateBalances,
    },
  },
}));

describe('AdjustBalanceModal', () => {
  const mockAccounts: CashAccount[] = [
    {
      id: 1,
      code: 'CASH_MAIN',
      name: 'Quỹ tiền mặt Hội sở Wings',
      accountType: 'CASH',
      initialBalance: 50000000,
      currentBalance: 50000000,
      minSafetyThreshold: 20000000,
      isActive: true,
      notes: 'Quỹ tiền mặt',
    },
    {
      id: 2,
      code: 'BANK_VCB',
      name: 'Vietcombank - TK Công ty Chính',
      accountType: 'BANK',
      accountNumber: '0071000888999',
      bankName: 'Vietcombank',
      initialBalance: 350000000,
      currentBalance: 350000000,
      minSafetyThreshold: 100000000,
      isActive: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.updateAccount.mockResolvedValue({ success: true, data: mockAccounts[0] });
    apiMocks.batchUpdateBalances.mockResolvedValue({ success: true, data: mockAccounts });
  });

  it('renders modal with account information and live balance calculation', () => {
    render(
      <AdjustBalanceModal
        open={true}
        onCancel={vi.fn()}
        accounts={mockAccounts}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText('Cài Đặt / Điều Chỉnh Số Dư Hiện Tại')).toBeInTheDocument();
    expect(screen.getByText('Quỹ tiền mặt Hội sở Wings')).toBeInTheDocument();
    expect(screen.getAllByText(/400[.,]000[.,]000/).length).toBeGreaterThanOrEqual(1); // 50M + 350M = 400M
  });

  it('submits batch update when "Lưu tất cả số dư" is clicked', async () => {
    const handleSuccess = vi.fn();
    const handleCancel = vi.fn();

    render(
      <AdjustBalanceModal
        open={true}
        onCancel={handleCancel}
        accounts={mockAccounts}
        onSuccess={handleSuccess}
      />
    );

    const saveBtn = screen.getByRole('button', { name: /Lưu tất cả số dư/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(apiMocks.batchUpdateBalances).toHaveBeenCalledTimes(1);
      const items = apiMocks.batchUpdateBalances.mock.calls[0][0];
      expect(items).toHaveLength(2);
      expect(items[0].id).toBe(1);
      expect(items[0].currentBalance).toBe(50000000);
      expect(items[1].id).toBe(2);
      expect(items[1].currentBalance).toBe(350000000);
      expect(handleSuccess).toHaveBeenCalledTimes(1);
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });
  });

  it('switches to single mode and submits single account adjustment', async () => {
    const handleSuccess = vi.fn();
    const handleCancel = vi.fn();

    render(
      <AdjustBalanceModal
        open={true}
        onCancel={handleCancel}
        accounts={mockAccounts}
        initialSelectedAccountId={1}
        onSuccess={handleSuccess}
      />
    );

    // Switch to "Điều chỉnh theo từng quỹ"
    const singleModeTab = screen.getByText('Điều chỉnh theo từng quỹ');
    fireEvent.click(singleModeTab);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Lưu cập nhật số dư/i })).toBeInTheDocument();
    });

    const saveSingleBtn = screen.getByRole('button', { name: /Lưu cập nhật số dư/i });
    fireEvent.click(saveSingleBtn);

    await waitFor(() => {
      expect(apiMocks.updateAccount).toHaveBeenCalledTimes(1);
      const [accId, payload] = apiMocks.updateAccount.mock.calls[0];
      expect(accId).toBe(1);
      expect(payload.currentBalance).toBe(50000000);
      expect(handleSuccess).toHaveBeenCalledTimes(1);
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });
  });
});
