import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import FundsManagementPage from './page';

const { mockFundsApi } = vi.hoisted(() => {
  const mockFundsApi = {
    list: vi.fn(),
    getOverview: vi.fn(),
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

describe('FundsManagementPage Component (MOS-BUG-174 Step 1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders clean empty state with 0 funds and no mock Telesale fund when API returns empty list', async () => {
    mockFundsApi.list.mockResolvedValueOnce({ success: true, data: [] });

    render(<FundsManagementPage />);

    // 1. Header title & subtitle
    expect(screen.getByText('Quản Lý Quỹ Hoạt Động Nội Bộ')).toBeDefined();

    // 2. Empty state card appears
    await waitFor(() => {
      expect(screen.getByText('Chưa có quỹ hoạt động nào')).toBeDefined();
      expect(
        screen.getByText(/Hiện tại chưa có quỹ hoạt động nội bộ nào được khởi tạo/i)
      ).toBeDefined();
    });

    // 3. Action button [+ Tạo Quỹ Mới] is available
    const createButtons = screen.getAllByRole('button', { name: /Tạo Quỹ Mới/i });
    expect(createButtons.length).toBeGreaterThan(0);

    // 4. Invariant: Mock "Quỹ Nạp Card Telesale" MUST NOT exist
    expect(screen.queryByText('Quỹ Nạp Card Telesale')).toBeNull();
    expect(screen.queryByText('TELESALE_CARD')).toBeNull();
  });

  it('renders fund list table with standardized columns when funds exist', async () => {
    const mockFundData = [
      {
        id: 'fund-real-ops',
        code: 'OPS_MARKETING',
        name: 'Quỹ Marketing & Sự Kiện',
        description: 'Ngân sách phục vụ workshop và chiến dịch quảng cáo',
        currentBalance: 5000000,
        maxQuota: 10000000,
        unitQuota: 500000,
        alertThresholdPercent: 80,
        toleranceMode: 'STRICT' as const,
        toleranceAmount: 50000,
        status: 'ACTIVE' as const,
        isLowBalance: false,
        usedAmount: 5000000,
        usedPercent: 50,
        currentPeriod: {
          id: 'period-nov',
          fundId: 'fund-real-ops',
          periodName: 'Kỳ Tháng 11/2026',
          startDate: '2026-11-01T00:00:00.000Z',
          endDate: '2026-11-30T23:59:59.000Z',
          openingBalance: 10000000,
          closingBalance: null,
          totalIncome: 10000000,
          totalExpense: 5000000,
          systemBalance: 5000000,
          status: 'OPEN' as const,
          createdAt: '2026-11-01T00:00:00.000Z',
          updatedAt: '2026-11-01T00:00:00.000Z',
        },
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z',
      },
    ];

    mockFundsApi.list.mockResolvedValueOnce({ success: true, data: mockFundData });

    render(<FundsManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Quỹ Marketing & Sự Kiện')).toBeDefined();
      expect(screen.getByText('OPS_MARKETING')).toBeDefined();
      expect(screen.getByText('Kỳ Tháng 11/2026')).toBeDefined();
      expect(screen.getAllByText(/5\.000\.000/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/10\.000\.000/).length).toBeGreaterThan(0);
    });

    // Verify table headers
    expect(screen.getByRole('columnheader', { name: 'Tên quỹ' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'Mã quỹ' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'Hạn mức' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'Số dư hiện tại' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'Trạng thái' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'Thao tác' })).toBeDefined();
  });

  it('opens preview modal when clicking Tạo Quỹ Mới', async () => {
    mockFundsApi.list.mockResolvedValueOnce({ success: true, data: [] });

    render(<FundsManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Chưa có quỹ hoạt động nào')).toBeDefined();
    });

    const createBtn = screen.getAllByRole('button', { name: /Tạo Quỹ Mới/i })[0];
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText('Thiết Lập Quỹ Hoạt Động Nội Bộ Mới')).toBeDefined();
      expect(
        screen.getByText(/Bước 2: Form Khởi Tạo & Quản Trị Quỹ Động/i)
      ).toBeDefined();
    });
  });
});
