import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { IosSimulationAttemptSummary } from '@mos-lab/shared';
import { SimulationAttemptEditModal } from '../SimulationAttemptEditModal';
import { IosSimulationHistorySheet } from '../IosSimulationHistorySheet';

vi.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({
    themeMode: 'dark',
    themeId: 'luxury-gold',
    coreThemeId: 'luxury-gold',
    toggleTheme: vi.fn(),
    availableCoreThemes: [],
    setCoreThemeId: vi.fn(),
  }),
}));

const MOCK_ATTEMPT: IosSimulationAttemptSummary = {
  attemptId: 'sim-att-101',
  attemptNumber: 1,
  bookingId: 771121,
  orderNumber: '771121',
  customerId: 50021,
  customerName: 'Ngọc Phạm',
  staffId: 46272,
  createdAt: new Date().toISOString(),
  sourceAction: 'COMPLETE_ORDER',
  statusAtSnapshot: 'DONE',
  serviceName: 'Classic 1D',
  servicePrice: 550000,
  selectedStyle: 'Natural',
  selectedComboName: 'Gói 3 Lần (Tiết kiệm)',
  selectedComboPrice: 1170000,
  selectedUnderComboName: null,
  selectedUnderComboPrice: 0,
  upsellProducts: [{ productName: 'Serum Dưỡng Mi Wings', quantity: 1, totalPrice: 299000 }],
  upsellTotal: 299000,
  promotionName: null,
  promotionDiscountAmount: 0,
  grandTotal: 2019000,
  tipAmount: 0,
  tipActorShare: 0,
  comboBonusAmount: 50000,
  serumBonusAmount: 20000,
  cvRotationPoints: 2,
  totalEstimatedReward: 125000,
  elapsedSeconds: 2700,
  notes: 'Kịch bản ban đầu',
};

describe('SimulationAttemptEditModal & IosSimulationHistorySheet Contract (MOS-FEAT-228)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with prefilled attempt values', () => {
    render(
      <SimulationAttemptEditModal
        isOpen={true}
        onClose={vi.fn()}
        attempt={MOCK_ATTEMPT}
        bookingId={771121}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText(/Chỉnh sửa Kịch bản · Phương án #1/i)).toBeDefined();
    expect(screen.getByDisplayValue('Kịch bản ban đầu')).toBeDefined();
    expect(screen.getByText('Khách hàng: Ngọc Phạm · Dịch vụ: Classic 1D')).toBeDefined();
  });

  it('updates form fields and calls onSave with recalculated totals', async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    render(
      <SimulationAttemptEditModal
        isOpen={true}
        onClose={handleClose}
        attempt={MOCK_ATTEMPT}
        bookingId={771121}
        onSave={handleSave}
      />
    );

    // Edit notes
    const notesInput = screen.getByDisplayValue('Kịch bản ban đầu');
    fireEvent.change(notesInput, { target: { value: 'Kịch bản đã sửa - Combo VIP' } });

    // Select style Katun
    const katunBtn = screen.getByRole('button', { name: 'Katun' });
    fireEvent.click(katunBtn);

    // Click Tip 50k
    const tip50kBtn = screen.getByRole('button', { name: '50k' });
    fireEvent.click(tip50kBtn);

    // Submit form
    const saveBtn = screen.getByRole('button', { name: /Lưu kịch bản/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledTimes(1);
    });

    const callPayload = handleSave.mock.calls[0][1];
    expect(callPayload.bookingId).toBe(771121);
    expect(callPayload.notes).toBe('Kịch bản đã sửa - Combo VIP');
    expect(callPayload.selectedStyle).toBe('Katun');
    expect(callPayload.tipAmount).toBe(50000);
    expect(handleClose).toHaveBeenCalled();
  });

  it('calls onApplyToWorkspace when clicking Nạp vào bàn làm việc', () => {
    const handleApply = vi.fn();
    const handleClose = vi.fn();

    render(
      <SimulationAttemptEditModal
        isOpen={true}
        onClose={handleClose}
        attempt={MOCK_ATTEMPT}
        bookingId={771121}
        onSave={vi.fn()}
        onApplyToWorkspace={handleApply}
      />
    );

    const applyBtn = screen.getByRole('button', { name: /Nạp vào bàn làm việc/i });
    fireEvent.click(applyBtn);

    expect(handleClose).toHaveBeenCalled();
    expect(handleApply).toHaveBeenCalledTimes(1);
    expect(handleApply.mock.calls[0][0].attemptId).toBe('sim-att-101');
  });

  it('renders Chỉnh sửa kịch bản button on each attempt card in IosSimulationHistorySheet', () => {
    render(
      <IosSimulationHistorySheet
        isOpen={true}
        onClose={vi.fn()}
        attempts={[MOCK_ATTEMPT]}
        booking={{ id: 771121, customerName: 'Ngọc Phạm' } as any}
      />
    );

    const editBtn = screen.getByRole('button', { name: /Chỉnh sửa kịch bản PA #1/i });
    expect(editBtn).toBeDefined();

    // Click edit button opens SimulationAttemptEditModal
    fireEvent.click(editBtn);
    expect(screen.getByText(/Chỉnh sửa Kịch bản · Phương án #1/i)).toBeDefined();
  });

  it('renders Tạo & Chỉnh sửa kịch bản mới button when attempts is empty and opens edit modal', () => {
    render(
      <IosSimulationHistorySheet
        isOpen={true}
        onClose={vi.fn()}
        attempts={[]}
        booking={{ id: 771121, customerName: 'Ngọc Phạm' } as any}
      />
    );

    expect(screen.getByText(/Chưa có phương án được lưu/i)).toBeDefined();
    const createBtn = screen.getByRole('button', { name: /Tạo & Chỉnh sửa kịch bản mới/i });
    expect(createBtn).toBeDefined();

    fireEvent.click(createBtn);
    expect(screen.getByText(/Chỉnh sửa Kịch bản · Phương án #1/i)).toBeDefined();
  });
});
