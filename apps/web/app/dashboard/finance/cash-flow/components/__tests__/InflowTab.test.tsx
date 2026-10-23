import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InflowTab } from '../InflowTab';
import type { CashFlowEntry, CashFlowInflowBreakdown } from '@mos-lab/shared';

describe('InflowTab', () => {
  const mockBreakdown: CashFlowInflowBreakdown = {
    wingsLashesAchieved: 120000000,
    wingsLashesProjectedAdditional: 30000000,
    wingsLashesTotalProjected: 150000000,
    academyExpectedInflow: 25000000,
    otherProjectsExpectedInflow: 15000000,
    totalExpectedInflow: 70000000, // 30M + 25M + 15M (không cộng 120M đã đạt)
  };

  const mockInflowItems: CashFlowEntry[] = [
    {
      id: 1,
      flowType: 'INFLOW',
      category: 'REVENUE_ACADEMY',
      title: 'Học phí khoá Master Nối mi K15',
      description: 'Học viên Nguyễn Lan Anh',
      amount: 25000000,
      hasVat: false,
      vatRate: 0,
      vatAmount: 0,
      totalAmount: 25000000,
      priority: 'MEDIUM',
      status: 'PENDING',
      expectedDate: '2026-10-28',
      storeId: 6,
      isRecurring: false,
    },
    {
      id: 2,
      flowType: 'INFLOW',
      category: 'REVENUE_OTHER',
      title: 'Đợt thanh toán 1',
      projectName: 'Dự án Cà phê Wings',
      amount: 15000000,
      hasVat: false,
      vatRate: 0,
      vatAmount: 0,
      totalAmount: 15000000,
      priority: 'MEDIUM',
      status: 'PENDING',
      expectedDate: '2026-10-30',
      storeId: null,
      isRecurring: false,
    },
  ];

  const categoryNames = {
    REVENUE_SERVICE: 'Doanh thu Dịch vụ',
    REVENUE_ACADEMY: 'Học phí Academy',
    REVENUE_OTHER: 'Thu nhập khác',
  };

  const statusMeta = {
    PENDING: { label: 'Chờ thu / Dự kiến', badgeClass: 'bg-amber-50 text-amber-700' },
    APPROVED: { label: 'Đã duyệt', badgeClass: 'bg-blue-50 text-blue-700' },
    PAID: { label: 'Đã thanh toán', badgeClass: 'bg-emerald-50 text-emerald-700' },
    COLLECTED: { label: 'Đã thu tiền', badgeClass: 'bg-emerald-50 text-emerald-700' },
    OVERDUE: { label: 'Trễ hạn', badgeClass: 'bg-rose-50 text-rose-700' },
    DEFERRED: { label: 'Tạm hoãn', badgeClass: 'bg-neutral-100 text-neutral-600' },
    CANCELLED: { label: 'Đã hủy', badgeClass: 'bg-neutral-100 text-neutral-500' },
  };

  it('renders 4 concise inflow metric cards according to MOS-FEAT-136 requirements', () => {
    const onOpenModal = vi.fn();
    render(
      <InflowTab
        inflowItems={mockInflowItems}
        entriesLoading={false}
        inflowBreakdown={mockBreakdown}
        onUpdateStatus={vi.fn()}
        onDeleteEntry={vi.fn()}
        onOpenIncomeModal={onOpenModal}
        categoryNames={categoryNames}
        statusMeta={statusMeta as any}
      />
    );

    // 1. Wings Lashes card
    expect(screen.getByText('Wings Lashes')).toBeInTheDocument();
    expect(screen.getByText('Live MOS')).toBeInTheDocument();
    expect(screen.getByText('120.000.000đ')).toBeInTheDocument();
    expect(screen.getByText('+30.000.000đ')).toBeInTheDocument();
    expect(screen.getByText('150.000.000đ')).toBeInTheDocument();

    // 2. Wings Academy card
    expect(screen.getByText('Wings Academy')).toBeInTheDocument();
    expect(screen.getAllByText('+25.000.000đ').length).toBeGreaterThanOrEqual(1);

    // 3. Dự án khác card
    expect(screen.getByText('Dự án khác')).toBeInTheDocument();
    expect(screen.getAllByText('+15.000.000đ').length).toBeGreaterThanOrEqual(1);

    // 4. Tổng dự kiến Thu card
    expect(screen.getByText('Tổng dự kiến Thu')).toBeInTheDocument();
    expect(screen.getByText('+70.000.000đ')).toBeInTheDocument();
    expect(
      screen.getByText('* Chỉ tính phần dự kiến phát sinh từ hiện tại đến cuối kỳ, không cộng doanh thu đã đạt.')
    ).toBeInTheDocument();
  });

  it('triggers quick modal opening for Academy and Other Projects', () => {
    const onOpenModal = vi.fn();
    render(
      <InflowTab
        inflowItems={mockInflowItems}
        entriesLoading={false}
        inflowBreakdown={mockBreakdown}
        onUpdateStatus={vi.fn()}
        onDeleteEntry={vi.fn()}
        onOpenIncomeModal={onOpenModal}
        categoryNames={categoryNames}
        statusMeta={statusMeta as any}
      />
    );

    const btnAcademy = screen.getByRole('button', { name: /Nhập dự kiến Academy/i });
    fireEvent.click(btnAcademy);
    expect(onOpenModal).toHaveBeenCalledWith('REVENUE_ACADEMY');

    const btnProject = screen.getByRole('button', { name: /Nhập dự kiến Dự án/i });
    fireEvent.click(btnProject);
    expect(onOpenModal).toHaveBeenCalledWith('REVENUE_OTHER');
  });

  it('renders project name badge for other projects in the table', () => {
    render(
      <InflowTab
        inflowItems={mockInflowItems}
        entriesLoading={false}
        inflowBreakdown={mockBreakdown}
        onUpdateStatus={vi.fn()}
        onDeleteEntry={vi.fn()}
        onOpenIncomeModal={vi.fn()}
        categoryNames={categoryNames}
        statusMeta={statusMeta as any}
      />
    );

    expect(screen.getByText('Dự án Cà phê Wings')).toBeInTheDocument();
    expect(screen.getByText('Học phí khoá Master Nối mi K15')).toBeInTheDocument();
  });
});
