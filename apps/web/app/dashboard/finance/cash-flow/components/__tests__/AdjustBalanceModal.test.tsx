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

  it('renders only current balance, single new balance input (VNĐ), and Save/Cancel buttons', () => {
    render(
      <AdjustBalanceModal
        open={true}
        onCancel={vi.fn()}
        accounts={mockAccounts}
        currentBalance={400000000}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText('Cài đặt / Điều chỉnh số dư')).toBeInTheDocument();
    expect(screen.getByText('Số dư hiện tại')).toBeInTheDocument();
    expect(screen.getByText(/400[.,]000[.,]000 VNĐ/)).toBeInTheDocument();
    expect(screen.getByText('Số dư mới (VNĐ)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lưu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hủy' })).toBeInTheDocument();

    // Verify per-account details, cash/bank tags, and safety thresholds are removed
    expect(screen.queryByText('Quỹ tiền mặt Hội sở Wings')).not.toBeInTheDocument();
    expect(screen.queryByText('Tiền mặt')).not.toBeInTheDocument();
    expect(screen.queryByText('Ngân hàng')).not.toBeInTheDocument();
    expect(screen.queryByText(/Ngưỡng an toàn/i)).not.toBeInTheDocument();
  });

  it('submits updated total balance when "Lưu" is clicked and preserves safety thresholds', async () => {
    const handleSuccess = vi.fn();
    const handleCancel = vi.fn();

    render(
      <AdjustBalanceModal
        open={true}
        onCancel={handleCancel}
        accounts={mockAccounts}
        currentBalance={400000000}
        onSuccess={handleSuccess}
      />
    );

    const input = screen.getByPlaceholderText('Nhập giá trị số dư mới');
    fireEvent.change(input, { target: { value: '800000000' } });

    const saveBtn = screen.getByRole('button', { name: 'Lưu' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(apiMocks.batchUpdateBalances).toHaveBeenCalledTimes(1);
      const items = apiMocks.batchUpdateBalances.mock.calls[0][0];
      expect(items).toHaveLength(2);
      const totalSubmitted = items.reduce((sum: number, item: any) => sum + item.currentBalance, 0);
      expect(totalSubmitted).toBe(800000000);
      expect(items[0].minSafetyThreshold).toBe(20000000);
      expect(items[1].minSafetyThreshold).toBe(100000000);
      expect(handleSuccess).toHaveBeenCalledTimes(1);
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });
  });
});
