import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpiStatsCard } from '../components/KpiStatsCard';
import { RevenueHistoryModal } from '../components/RevenueHistoryModal';
import { CustomerDetailModals } from '../../customer-detail-drawer/CustomerDetailModals';

vi.mock('../../../context/ThemeContext', () => ({
  useTheme: () => ({ themeMode: 'dark' }),
}));

vi.mock('../../../hooks/useResponsiveTier', () => ({
  useResponsiveTier: () => 'desktop',
}));

describe('CustomerDetail tip visibility (MOS-FEAT-267)', () => {
  const sampleStats = {
    totalSpent: 1540000,
    totalVisits: 2,
    avgFrequency: 30,
    gemBalance: 150,
    totalTips: 100000,
    tipRate: 50,
    avgTip: 100000,
  };

  it('hides the Tips KPI card when canViewTipHistory is false and shows it when true', () => {
    const { rerender } = render(
      <KpiStatsCard
        stats={sampleStats}
        themeMode="dark"
        canViewTipHistory={false}
        onOpenGemModal={vi.fn()}
        onOpenTipModal={vi.fn()}
        onOpenRevenueModal={vi.fn()}
      />
    );

    expect(screen.queryByTestId('customer-kpi-tips-card')).toBeNull();
    expect(screen.queryByText('Tips')).toBeNull();
    expect(screen.getByText('Kim Cương')).toBeDefined();

    rerender(
      <KpiStatsCard
        stats={sampleStats}
        themeMode="dark"
        canViewTipHistory={true}
        onOpenGemModal={vi.fn()}
        onOpenTipModal={vi.fn()}
        onOpenRevenueModal={vi.fn()}
      />
    );

    expect(screen.getByTestId('customer-kpi-tips-card')).toBeDefined();
    expect(screen.getByText('Tips')).toBeDefined();
    expect(screen.getByText(/50%/)).toBeDefined();
  });

  it('omits the Tip column from RevenueHistoryModal unless canViewTipHistory is true', () => {
    const txs = [
      {
        id: 8001,
        orderKey: 'ORD-8001',
        bookingDate: '2026-10-07T07:00:00.000+07:00',
        totalPrice: 770000,
        tipAmount: 50000,
        debtAmount: 0,
        technicianName: 'Minh Anh',
        ccOutName: 'Quang Khải',
        services: [{ name: 'Hyperlight 770', price: 770000 }],
        combos: [],
        products: [],
      },
    ];

    const { rerender } = render(
      <RevenueHistoryModal
        open={true}
        onCancel={vi.fn()}
        customer={{ id: 33732, name: 'Thanh' }}
        revenueTransactions={txs}
        canViewTipHistory={false}
        modalWidth={900}
        handleModalDragStart={vi.fn()}
      />
    );

    expect(screen.queryByRole('columnheader', { name: 'Tip' })).toBeNull();
    expect(screen.queryByText('50.000 đ')).toBeNull();

    rerender(
      <RevenueHistoryModal
        open={true}
        onCancel={vi.fn()}
        customer={{ id: 33732, name: 'Thanh' }}
        revenueTransactions={txs}
        canViewTipHistory={true}
        modalWidth={900}
        handleModalDragStart={vi.fn()}
      />
    );

    expect(screen.getByRole('columnheader', { name: 'Tip' })).toBeDefined();
    expect(screen.getByText('50.000 đ')).toBeDefined();
  });

  it('blocks TipHistoryModal rendering in CustomerDetailModals when canViewTipHistory is false', async () => {
    const { rerender } = render(
      <CustomerDetailModals
        themeMode="dark"
        customer={{ id: 33732, name: 'Thanh' }}
        detailData={{
          tipTransactions: [
            {
              id: 8001,
              orderKey: 'ORD-8001',
              bookingDate: '2026-10-07T07:00:00.000+07:00',
              tipAmount: 50000,
              technicianName: 'Minh Anh',
              ccOutName: 'Quang Khải',
              totalPrice: 770000,
            },
          ],
        }}
        comboBalances={[]}
        editForm={{}}
        rescheduleModalVisible={false}
        selectedBookingForReschedule={null}
        onCloseRescheduleModal={vi.fn()}
        rescheduleAlert={null}
        onCloseRescheduleAlert={vi.fn()}
        isGemModalOpen={false}
        onCloseGemModal={vi.fn()}
        gemModalWidth={700}
        handleGemModalDragStart={vi.fn()}
        isTipModalOpen={true}
        canViewTipHistory={false}
        onCloseTipModal={vi.fn()}
        tipModalWidth={700}
        handleTipModalDragStart={vi.fn()}
        isRevenueModalOpen={false}
        onCloseRevenueModal={vi.fn()}
        revenueModalWidth={900}
        handleRevenueModalDragStart={vi.fn()}
        isComboModalOpen={false}
        onCloseComboModal={vi.fn()}
        modalWidth={700}
        handleModalDragStart={vi.fn()}
        isEditModalOpen={false}
        onCloseEditModal={vi.fn()}
        onSaveEdit={vi.fn()}
        saveLoading={false}
        isNoteModalOpen={false}
        onCloseNoteModal={vi.fn()}
        bookingWizardOpen={false}
        onCloseBookingWizard={vi.fn()}
        onRefreshAllDetails={vi.fn(async () => {})}
      />
    );

    expect(screen.queryByText(/Lịch sử giao dịch Tips/i)).toBeNull();

    rerender(
      <CustomerDetailModals
        themeMode="dark"
        customer={{ id: 33732, name: 'Thanh' }}
        detailData={{
          tipTransactions: [
            {
              id: 8001,
              orderKey: 'ORD-8001',
              bookingDate: '2026-10-07T07:00:00.000+07:00',
              tipAmount: 50000,
              technicianName: 'Minh Anh',
              ccOutName: 'Quang Khải',
              totalPrice: 770000,
            },
          ],
        }}
        comboBalances={[]}
        editForm={{}}
        rescheduleModalVisible={false}
        selectedBookingForReschedule={null}
        onCloseRescheduleModal={vi.fn()}
        rescheduleAlert={null}
        onCloseRescheduleAlert={vi.fn()}
        isGemModalOpen={false}
        onCloseGemModal={vi.fn()}
        gemModalWidth={700}
        handleGemModalDragStart={vi.fn()}
        isTipModalOpen={true}
        canViewTipHistory={true}
        onCloseTipModal={vi.fn()}
        tipModalWidth={700}
        handleTipModalDragStart={vi.fn()}
        isRevenueModalOpen={false}
        onCloseRevenueModal={vi.fn()}
        revenueModalWidth={900}
        handleRevenueModalDragStart={vi.fn()}
        isComboModalOpen={false}
        onCloseComboModal={vi.fn()}
        modalWidth={700}
        handleModalDragStart={vi.fn()}
        isEditModalOpen={false}
        onCloseEditModal={vi.fn()}
        onSaveEdit={vi.fn()}
        saveLoading={false}
        isNoteModalOpen={false}
        onCloseNoteModal={vi.fn()}
        bookingWizardOpen={false}
        onCloseBookingWizard={vi.fn()}
        onRefreshAllDetails={vi.fn(async () => {})}
      />
    );

    expect(await screen.findByText(/Lịch sử giao dịch Tips/i)).toBeDefined();
  });
});
