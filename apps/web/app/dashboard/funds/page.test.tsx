import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import FundsManagementPage from './page';

const { mockFundsApi } = vi.hoisted(() => {
  const mockOverviewData = {
    id: 'fund-telesale-card',
    code: 'TELESALE_CARD',
    name: 'Quỹ Nạp Card Telesale',
    currentBalance: 970000,
    maxQuota: 1000000,
    unitQuota: 30000,
    alertThresholdPercent: 80,
    toleranceMode: 'STRICT' as const,
    toleranceAmount: 20000,
    status: 'ACTIVE' as const,
    isLowBalance: false,
    usedAmount: 30000,
    usedPercent: 3,
    roles: [
      {
        id: 'role-holder',
        fundId: 'fund-telesale-card',
        roleKey: 'HOLDER',
        roleName: 'Thủ Quỹ (Nạp Card & Báo Cáo)',
        permissions: ['CREATE_EXPENSE'],
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
    ],
    assignments: [
      {
        id: 'assign-holder',
        fundId: 'fund-telesale-card',
        roleKey: 'HOLDER',
        staffId: 2,
        staffName: 'Bích Phượng',
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
    ],
    currentPeriod: {
      id: 'period-1',
      fundId: 'fund-telesale-card',
      periodName: 'Kỳ Tháng 10/2026',
      startDate: '2026-10-01T00:00:00.000Z',
      endDate: '2026-10-31T23:59:59.000Z',
      openingBalance: 1000000,
      totalIncome: 1000000,
      totalExpense: 30000,
      systemBalance: 970000,
      status: 'OPEN' as const,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
    recentTransactions: [
      {
        id: 'tx-1',
        fundId: 'fund-telesale-card',
        type: 'EXPENSE' as const,
        amount: 30000,
        balanceBefore: 1000000,
        balanceAfter: 970000,
        description: 'Nạp cước Viettel 30k cho Telesale',
        status: 'COMPLETED' as const,
        beneficiaryStaffName: 'Nguyễn Văn A',
        beneficiaryPhone: '0987654321',
        telco: 'VIETTEL',
        receiptUrls: [],
        actorStaffId: 2,
        actorStaffName: 'Bích Phượng',
        createdAt: '2026-10-28T09:00:00.000Z',
      },
    ],
    pendingProposals: [],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };

  const mockFundsList = [
    {
      ...mockOverviewData,
      roles: [],
      assignments: [],
    },
  ];

  const mockFundsApi = {
    list: vi.fn().mockResolvedValue({ success: true, data: mockFundsList }),
    getOverview: vi.fn().mockResolvedValue({ success: true, data: mockOverviewData }),
    recordExpense: vi.fn(),
    createProposal: vi.fn(),
    approveProposal: vi.fn(),
    disburseProposal: vi.fn(),
    reconcileAndLockPeriod: vi.fn(),
    updateConfig: vi.fn(),
  };

  return { mockFundsApi };
});

vi.mock('~/lib/api-client', () => ({
  apiClient: { funds: mockFundsApi },
  default: { funds: mockFundsApi },
}));

describe('FundsManagementPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders fund overview, balance, and tabs correctly', async () => {
    render(<FundsManagementPage />);

    expect(screen.getByText('Quản Lý Quỹ Hoạt Động Nội Bộ (mOS Fund Master)')).toBeDefined();

    await waitFor(() => {
      expect(screen.getAllByText(/970\.000/).length).toBeGreaterThan(0);
      expect(screen.getByText('Kỳ Tháng 10/2026')).toBeDefined();
      expect(screen.getByText('Nạp cước Viettel 30k cho Telesale')).toBeDefined();
    });
  });
});
